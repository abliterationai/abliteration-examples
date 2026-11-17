import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const completion = {
  id: "test-completion", object: "chat.completion.chunk", created: 1, model: "abliterated-model",
};

function sendAnswer(response: ServerResponse, text: string, finishReason: "stop" | "length" | null = "stop") {
  response.writeHead(200, { "Content-Type": "text/event-stream" });
  response.write(`data: ${JSON.stringify({
    ...completion,
    choices: [{ index: 0, delta: { role: "assistant", reasoning_content: "private reasoning", content: text }, finish_reason: null }],
  })}\n\n`);
  if (finishReason) {
    response.write(`data: ${JSON.stringify({
      ...completion,
      choices: [{ index: 0, delta: {}, finish_reason: finishReason }],
      usage: {
        prompt_tokens: 10, completion_tokens: 5, total_tokens: 15,
        prompt_tokens_details: { cached_tokens: 4, cache_write_tokens: 2 },
      },
    })}\n\n`);
    response.end("data: [DONE]\n\n");
  }
}

async function fixture(handler: (request: IncomingMessage, response: ServerResponse) => void) {
  const directory = await mkdtemp(join(tmpdir(), "abliteration-pi-"));
  const server = createServer(handler);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  return {
    env: {
      ...process.env,
      ABLITERATION_API_KEY: "test-key",
      ABLITERATION_BASE_URL: `http://127.0.0.1:${address.port}/v1`,
      ABLITERATION_MODEL: "abliterated-model",
      SESSION_FILE: join(directory, "session.sqlite"),
      REQUEST_ID: "test-request",
      STREAM: "0",
    },
    async close() {
      server.closeAllConnections();
      const closed = once(server, "close");
      server.close();
      await closed;
      await rm(directory, { recursive: true, force: true });
    },
  };
}

function run(env: NodeJS.ProcessEnv) {
  const child = spawn(process.execPath, ["--import", "tsx", "chat.ts"], { env, timeout: 15000 });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", chunk => { stdout += chunk; });
  child.stderr.on("data", chunk => { stderr += chunk; });
  const exited = once(child, "close").then(([code]) => ({ code, stdout, stderr }));
  return { child, exited };
}

test("reopening a completed request prints the stored answer without paying for another request", { timeout: 20000 }, async () => {
  let requests = 0;
  const local = await fixture((request, response) => {
    assert.equal(request.url, "/v1/chat/completions");
    requests++;
    sendAnswer(response, "A persisted answer.");
  });
  try {
    const first = await run(local.env).exited;
    const second = await run({ ...local.env, STREAM: "1" }).exited;
    assert.equal(first.code, 0, first.stderr);
    assert.equal(second.code, 0, second.stderr);
    assert.match(first.stdout, /Usage — prompt: 10, completion: 5, total: 15 tokens/);
    assert.match(first.stdout, /Non-streaming response:\nA persisted answer\./);
    assert.match(second.stdout, /A persisted answer\.\n-- done --/);
    assert.doesNotMatch(first.stdout + second.stdout, /private reasoning/);
    assert.equal(first.stdout.match(/Submission: (\S+)/)?.[1], second.stdout.match(/Submission: (\S+)/)?.[1]);
    assert.equal(requests, 1);
    if (process.platform !== "win32") {
      assert.equal((await stat(local.env.SESSION_FILE!)).mode & 0o777, 0o600);
    }
  } finally {
    await local.close();
  }
});

test("an incomplete provider stream fails instead of printing a success marker", { timeout: 20000 }, async () => {
  let requests = 0;
  const local = await fixture((_request, response) => {
    if (requests++ > 0) {
      response.writeHead(401, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ error: { message: "Unauthorized", type: "authentication_error" } }));
      return;
    }
    sendAnswer(response, "An unfinished answer", null);
    response.end();
  });
  try {
    const result = await run({ ...local.env, STREAM: "1" }).exited;
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /Request failed:/);
    assert.doesNotMatch(result.stdout, /-- done --/);
  } finally {
    await local.close();
  }
});

test("an answer cut off by the token budget fails and is left out of the next question", { timeout: 20000 }, async () => {
  const sent: string[] = [];
  const local = await fixture(async (request, response) => {
    let body = "";
    for await (const chunk of request) body += chunk;
    sent.push(body);
    if (sent.length === 1) sendAnswer(response, "Cut off", "length");
    else sendAnswer(response, "A full answer.");
  });
  try {
    for (const stream of ["0", "1"]) {
      const result = await run({ ...local.env, STREAM: stream }).exited;
      assert.equal(result.code, 1);
      assert.match(result.stderr, /The model did not finish its answer: length/);
      assert.doesNotMatch(result.stdout, /-- done --|Non-streaming response:/);
    }
    assert.equal(sent.length, 1);
    const next = await run({ ...local.env, REQUEST_ID: "next-question" }).exited;
    assert.equal(next.code, 0, next.stderr);
    assert.match(next.stdout, /A full answer\./);
    assert.doesNotMatch(sent[1], /Cut off/);
  } finally {
    await local.close();
  }
});

test("a killed process resumes its submission rather than adding a second user input", { timeout: 30000 }, async () => {
  let requests = 0;
  const { promise: received, resolve: firstRequest } = Promise.withResolvers<void>();
  const local = await fixture(async (request, response) => {
    let body = "";
    for await (const chunk of request) body += chunk;
    const payload = JSON.parse(body);
    assert.equal(payload.messages.filter((message: { role: string }) => message.role === "user").length, 1);
    requests++;
    if (requests === 1) {
      sendAnswer(response, "Interrupted", null);
      firstRequest();
    } else {
      sendAnswer(response, "Recovered answer.");
    }
  });
  const first = run({ ...local.env, STREAM: "1" });
  try {
    await Promise.race([received, first.exited.then(result => {
      throw new Error(`Process exited before sending a request: ${result.stderr}`);
    })]);
    first.child.kill("SIGKILL");
    const interrupted = await first.exited;
    const recovered = await run(local.env).exited;
    assert.equal(recovered.code, 0, recovered.stderr);
    assert.match(recovered.stdout, /Recovered answer\./);
    assert.equal(interrupted.stdout.match(/Submission: (\S+)/)?.[1], recovered.stdout.match(/Submission: (\S+)/)?.[1]);
    assert.equal(requests, 2);
  } finally {
    first.child.kill();
    await first.exited;
    await local.close();
  }
});
