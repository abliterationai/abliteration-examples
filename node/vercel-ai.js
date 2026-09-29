import "dotenv/config";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText, streamText } from "ai";

const apiKey = process.env.ABLITERATION_API_KEY;
if (!apiKey) {
  console.error("Set ABLITERATION_API_KEY in .env or your shell before running.");
  process.exit(1);
}

const baseURL = process.env.ABLITERATION_BASE_URL || "https://api.abliteration.ai/v1";
const model = process.env.ABLITERATION_MODEL || "abliterated-model";
const stream = process.env.STREAM === "1";

const openai = createOpenAI({
  apiKey,
  baseURL,
});

async function main() {
  const prompt =
    "Give me one upbeat sentence that sells abliteration.ai as an OpenAI-compatible, uncensored endpoint.";

  if (stream) {
    const result = streamText({
      model: openai(model),
      prompt,
    });
    process.stdout.write("Streaming response:\n");
    for await (const text of result.textStream) {
      process.stdout.write(text);
    }
    process.stdout.write("\n-- done --\n");
    console.log("Usage:", await result.usage);
    return;
  }

  const { text, usage } = await generateText({
    model: openai(model),
    prompt,
  });

  console.log("Non-streaming response:\n" + text);
  if (usage) console.log("Usage:", usage);
}

main().catch((err) => {
  console.error("Vercel AI SDK request failed", err);
  process.exit(1);
});
