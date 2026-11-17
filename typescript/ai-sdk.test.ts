import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer, type ServerResponse } from "node:http";
import { test, type TestContext } from "node:test";

const usage = { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 };
const base = { id: "test", created: 1, model: "abliterated-model" };

function reply(response: ServerResponse, content: string) {
  response.writeHead(200, { "Content-Type": "application/json" });
  response.end(JSON.stringify({
    ...base, object: "chat.completion", usage,
    choices: [{ index: 0, message: { role: "assistant", reasoning_content: "private reasoning", content }, finish_reason: "stop" }],
  }));
}

function stream(response: ServerResponse, chunks: string[]) {
  const event = (choice: object, extra = {}) =>
    `data: ${JSON.stringify({ ...base, object: "chat.completion.chunk", choices: [{ index: 0, finish_reason: null, ...choice }], ...extra })}\n\n`;
  response.writeHead(200, { "Content-Type": "text/event-stream" });
  response.write(event({ delta: { role: "assistant", reasoning_content: "private reasoning" } }));
  for (const content of chunks) response.write(event({ delta: { content } }));
  response.write(event({ delta: {}, finish_reason: "stop" }, { usage }));
  response.end("data: [DONE]\n\n");
}

async function runAgainst(t: TestContext, file: string, env: NodeJS.ProcessEnv, respond: (body: any, response: ServerResponse) => void) {
  const bodies: any[] = [];
  const server = createServer(async (request, response) => {
    let raw = "";
    for await (const chunk of request) raw += chunk;
    bodies.push(JSON.parse(raw));
    respond(bodies.at(-1), response);
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => { server.closeAllConnections(); server.close(); });
  const { port } = server.address() as { port: number };

  const child = spawn(process.execPath, ["--import", "tsx", file], {
    env: { ...process.env, ...env, ABLITERATION_API_KEY: "test-key", ABLITERATION_BASE_URL: `http://127.0.0.1:${port}/v1` },
  });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", chunk => { stdout += chunk; });
  child.stderr.on("data", chunk => { stderr += chunk; });
  const [code] = await once(child, "close");
  return { code, stdout, stderr, bodies };
}

test("plain reply", async t => {
  const result = await runAgainst(t, "ai-sdk.ts", { STREAM: "0" }, (_body, response) => reply(response, "A plain answer."));
  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.stdout, "Non-streaming response:\nA plain answer.\nUsage — prompt: 10, completion: 5, total: 15 tokens\n");
});

test("streamed reply hides reasoning", async t => {
  const result = await runAgainst(t, "ai-sdk.ts", { STREAM: "1" }, (_body, response) => stream(response, ["A streamed", " answer."]));
  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.stdout, "Streaming response:\nA streamed answer.\n-- done --\nUsage — prompt: 10, completion: 5, total: 15 tokens\n");
});
