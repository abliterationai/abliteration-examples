import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";

const apiKey = process.env.ABLITERATION_API_KEY;
if (!apiKey) {
  console.error("Set ABLITERATION_API_KEY in .env or your shell before running.");
  process.exit(1);
}

const baseURL = process.env.ABLITERATION_BASE_URL || "https://api.abliteration.ai/v1";
const model = process.env.ABLITERATION_MODEL || "abliterated-model";
const stream = process.env.STREAM === "1";

const llm = new ChatOpenAI({
  model,
  apiKey,
  temperature: 0.6,
  configuration: { baseURL },
});

function contentToText(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part?.text) return part.text;
        return "";
      })
      .join("");
  }
  return "";
}

async function main() {
  const prompt =
    "In one sentence, explain why abliteration.ai works as an uncensored, OpenAI-compatible chat endpoint.";

  if (stream) {
    const chunks = await llm.stream(prompt);
    process.stdout.write("Streaming response:\n");
    for await (const chunk of chunks) {
      const text = contentToText(chunk.message?.content ?? chunk.content ?? "");
      if (text) process.stdout.write(text);
    }
    process.stdout.write("\n-- done --\n");
    return;
  }

  const message = await llm.invoke(prompt);
  console.log("Non-streaming response:\n" + contentToText(message.content));
}

main().catch((err) => {
  console.error("LangChain request failed", err);
  process.exit(1);
});
