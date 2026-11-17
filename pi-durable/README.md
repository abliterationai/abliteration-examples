# TypeScript example using Pi Durable

A persistent chat conversation using [Pi Durable](https://github.com/earendil-works/pi/tree/main/packages/durable) and Abliteration.ai's OpenAI-compatible Chat Completions endpoint. Unlike the plain Node example, this sample stores its conversation and submission in SQLite so you can reopen them after the process exits.

## Quick start

Requires **Node.js 22.19.0 or newer**. Pi Durable is experimental; its dependencies and the lockfile are pinned to version 1.5.2.

```bash
cd pi-durable
npm ci
export ABLITERATION_API_KEY=ak_your_key_here
npm start
```

The sample prints a submission ID, the answer text, and token usage. It hides reasoning content. To display the answer as it arrives instead:

```bash
REQUEST_ID=stream-demo npm run stream
```

Both modes use a streaming provider request internally. `STREAM=1` watches the harness's live state; ordinary mode prints only the completed answer. Interrupted/retried output may restart, in which case the sample prints `-- response restarted --`. It only prints `-- done --` after a successful streaming submission.

## Persistence and recovery

```bash
npm start
npm start
```

Both commands use `./session.sqlite` and request ID `abliteration-demo-1`. After success, the second invocation prints the same stored answer and submission ID **without another model request**. To send a new input in the same conversation:

```bash
REQUEST_ID=second-question npm start
```

To try crash recovery, start with a fresh request ID, kill the process while it is generating, and rerun the **same command**:

```bash
REQUEST_ID=recovery-demo npm start
```

The admitted input is not submitted twice. An interrupted model request can be retried, potentially incurring another API charge; submission deduplication is not exactly-once provider execution. A submission that has already failed remains failed: after fixing its cause, use a new request ID.

Only one process should drive a session file at a time. The database contains prompts and answers in plaintext. The sample creates it readable only by your user; a database from an older run keeps its permissions, so keep it private. SQLite's WAL mode protects against process crashes, not every power/host failure. Live progress can lag persistence by up to the harness's default one-second flush interval.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `ABLITERATION_API_KEY` | Required | API key; export it in your shell |
| `ABLITERATION_BASE_URL` | `https://api.abliteration.ai/v1` | OpenAI-compatible base URL, including `/v1` |
| `ABLITERATION_MODEL` | `abliterated-model` | Model ID |
| `STREAM` | Off | Set to `1` to display live answer text |
| `SESSION_FILE` | `./session.sqlite` | Conversation database; choose a new path for a fresh conversation |
| `REQUEST_ID` | `abliteration-demo-1` | Reuse to recover/replay an input; change for a new input |

`abliteration.ts` uses the default model's `/v1/models` metadata: a 262,144-token context, text/image input, and estimated prices of $1/M input, $3/M output, and $0.10/M cached input tokens. The example limits each response to 4,096 output tokens. If you select a different model or compatible server, update its context, modalities, and prices in that file too. These are client estimates, not billing guarantees.

Changing the model updates the existing conversation's agent configuration; it does not replace an already completed answer with the same request ID. When editing the prompt, use a new request ID as well.

## Reuse the provider

From another TypeScript file in this directory:

```typescript
import { model, models } from "./abliteration.js";

const answer = await models.complete(model, {
  messages: [{ role: "user", content: "Hello!", timestamp: Date.now() }],
});
if (answer.stopReason === "error" || answer.stopReason === "aborted") {
  throw new Error(answer.errorMessage || answer.stopReason);
}
for (const block of answer.content) {
  if (block.type === "text") console.log(block.text);
}
```

The provider explicitly uses `openai-completions` with `max_tokens`, not OpenAI's newer Responses API. No filesystem or shell tools are registered. See Pi's [custom-provider documentation](https://github.com/earendil-works/pi/blob/main/packages/ai/README.md#custom-providers) and [persistence documentation](https://github.com/earendil-works/pi/blob/main/packages/durable/README.md#persist-and-resume).

## Common errors

- **Missing key:** export `ABLITERATION_API_KEY`; this example does not load `.env` files.
- **401/403:** verify the key and account access, then retry with a new `REQUEST_ID` if the submission has already failed.
- **404:** include `/v1` in the base URL and verify the model ID.
- **Database locked:** stop the other process using the same `SESSION_FILE`.
- **The model did not finish its answer: length:** the answer hit the 4,096-token limit. The sample counts this as a failed submission and leaves the cut-off text out of later questions. Ask again with a new `REQUEST_ID`, or raise `maxTokens` in `abliteration.ts`.
- **Same answer again:** this is intentional deduplication; change `REQUEST_ID` for a new API request.

## Checks

```bash
npm run typecheck
npm test
```

Tests use a local HTTP fixture and temporary SQLite files; no API key or paid requests are required. They cover completed-request replay, reasoning suppression, incomplete-stream and token-limit failures, and process-crash recovery without duplicating the user input.
