# TypeScript examples

## Vercel AI SDK

A chat request to Abliteration.ai using the [Vercel AI SDK](https://ai-sdk.dev) and its [OpenAI-compatible provider](https://ai-sdk.dev/providers/openai-compatible-providers). It sends the same prompt as the Go and Java samples.

### Quick start

Requires **Node.js 22 or newer**.

```bash
cd typescript
npm ci
export ABLITERATION_API_KEY=ak_your_key_here
npm run ai-sdk         # full reply
npm run ai-sdk:stream  # reply as it arrives
```

Only the answer is printed; the model's reasoning is hidden.

### Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `ABLITERATION_API_KEY` | Required | API key; export it in your shell |
| `ABLITERATION_BASE_URL` | `https://api.abliteration.ai/v1` | OpenAI-compatible base URL, including `/v1` |
| `ABLITERATION_MODEL` | `abliterated-model` | Model ID |

### How it works

`ai-sdk.ts` points the AI SDK's OpenAI-compatible provider at abliteration.ai and sends one request:

- `createOpenAICompatible` with the base URL and key, and `includeUsage` so streamed replies report token usage.
- `.chatModel(...)` calls the Chat Completions endpoint, like every other sample in this repo.
- `maxOutputTokens: 8192` leaves room for the model to reason before it answers.
- `generateText` returns the whole reply; `streamText` returns it as it arrives.

The streamed reply reads `fullStream` rather than `textStream` so that a failed request, such as a wrong key, stops with its real error. `onError: () => {}` turns off the AI SDK's default, which prints the full error object and carries on.

### Common errors

- **Missing key:** export `ABLITERATION_API_KEY`; this example does not load `.env` files.
- **API key is invalid, expired, or revoked:** create a new key in the abliteration.ai dashboard.
- **404:** include `/v1` in the base URL and check the model ID.

### Checks

```bash
npm run typecheck
npm test
```

Tests run against a local fake server, so they need no API key and make no paid requests.
