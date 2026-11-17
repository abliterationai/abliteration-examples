import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText, streamText, type LanguageModelUsage } from "ai";

const abliteration = createOpenAICompatible({
  name: "abliteration",
  baseURL: process.env.ABLITERATION_BASE_URL || "https://api.abliteration.ai/v1",
  apiKey: process.env.ABLITERATION_API_KEY,
  includeUsage: true,
});

const request = {
  model: abliteration.chatModel(process.env.ABLITERATION_MODEL || "abliterated-model"),
  system: "You are abliteration.ai, concise and direct.",
  prompt: "Give me one sentence on why abliteration.ai is an uncensored OpenAI-compatible API.",
  temperature: 0.6,
  maxOutputTokens: 8192,
};

function printUsage(usage: LanguageModelUsage) {
  console.log(`Usage — prompt: ${usage.inputTokens}, completion: ${usage.outputTokens}, total: ${usage.totalTokens} tokens`);
}

async function main() {
  if (!process.env.ABLITERATION_API_KEY) {
    throw new Error("Set ABLITERATION_API_KEY in your environment before running.");
  }

  if (process.env.STREAM !== "1") {
    const { text, usage } = await generateText(request);
    console.log("Non-streaming response:\n" + text.trim());
    printUsage(usage);
    return;
  }

  const result = streamText({ ...request, onError: () => {} });
  console.log("Streaming response:");
  for await (const part of result.fullStream) {
    if (part.type === "text-delta") process.stdout.write(part.text);
    if (part.type === "error") throw part.error;
  }
  console.log("\n-- done --");
  printUsage(await result.usage);
}

main().catch(error => {
  console.error(`Request failed: ${error.message}`);
  process.exitCode = 1;
});
