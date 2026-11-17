import { BACKGROUND_CONTEXT } from "@earendil-works/chord/context";
import type { AssistantMessage } from "@earendil-works/pi-ai";
import { AssistantEntry, createRegistry, defineExtension, GenerationTask, Harness, hook, LiveDoc } from "@earendil-works/pi-durable";
import { openNodeSqliteStorage } from "@earendil-works/pi-durable/storage/sqlite/node";
import { model, models } from "./abliteration.js";

function textOf(message: Pick<AssistantMessage, "content"> | undefined): string {
  return message?.content.filter(block => block.type === "text").map(block => block.text).join("") || "";
}

const rejectCutOffAnswers = defineExtension({
  name: "reject-cut-off-answers",
  hooks: [hook(GenerationTask, {
    afterResponse(message) {
      if (message.stopReason === "length") {
        message.stopReason = "error";
        message.errorMessage = "The model did not finish its answer: length";
      }
    },
  })],
});

async function main() {
  if (!process.env.ABLITERATION_API_KEY) {
    throw new Error("Set ABLITERATION_API_KEY in your environment before running.");
  }

  process.umask(0o077);
  const context = BACKGROUND_CONTEXT;
  const registry = createRegistry();
  registry.install(rejectCutOffAnswers);
  const stream = process.env.STREAM === "1";
  const harness = await Harness.open(
    await openNodeSqliteStorage(process.env.SESSION_FILE || "./session.sqlite"),
    { models, registry },
    context,
  );

  try {
    const conversation = await harness.root(context);
    await conversation.configure({
      model: { provider: model.provider, modelId: model.id },
      instructions: "You are abliteration.ai, concise and direct.",
    }, context);
    let printed = "";
    function printProgress(text: string) {
      if (!text.startsWith(printed)) {
        process.stdout.write("\n-- response restarted --\n");
        printed = "";
      }
      process.stdout.write(text.slice(printed.length));
      printed = text;
    }

    const watch = stream ? await harness.watchDoc(LiveDoc, conversation.id, context) : undefined;
    if (stream) {
      if (!watch) throw new Error("The conversation has no live state to watch.");
      console.log("Streaming response:");
      if (watch.value.generation?.message) printProgress(textOf(watch.value.generation.message));
      watch.start(async call => {
        if (call.kind === "value" && call.value.generation?.message) {
          printProgress(textOf(call.value.generation.message));
        }
      });
    }

    const submission = await conversation.submit({
      type: "input",
      content: "Give me one sentence on why abliteration.ai is an uncensored OpenAI-compatible API.",
      requestId: process.env.REQUEST_ID || "abliteration-demo-1",
    }, context);

    console.log(`Submission: ${submission.id}`);
    const settled = await submission.wait(context);
    await watch?.stop();
    if (settled.status !== "done" || settled.type !== "input") {
      throw new Error(`Submission did not complete: ${JSON.stringify(settled)}`);
    }
    const answer = await conversation.commit(tx => tx.entry(AssistantEntry, settled.answer), context);
    const message = answer?.model?.[0];
    if (message?.role !== "assistant") throw new Error("The completed submission has no stored answer.");
    if (message.stopReason !== "stop") {
      throw new Error(`The model did not finish its answer: ${message.stopReason}`);
    }
    if (stream) {
      printProgress(textOf(message));
      process.stdout.write("\n-- done --\n");
    } else {
      console.log("Non-streaming response:\n" + textOf(message));
    }
    const promptTokens = message.usage.input + message.usage.cacheRead + message.usage.cacheWrite;
    console.log(`Usage — prompt: ${promptTokens}, completion: ${message.usage.output}, total: ${message.usage.totalTokens} tokens`);
  } finally {
    await harness.close(context);
  }
}

main().catch(error => {
  console.error(`Request failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
