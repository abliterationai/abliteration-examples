import { createModels, createProvider, envApiKeyAuth, type Model } from "@earendil-works/pi-ai";
import { openAICompletionsApi } from "@earendil-works/pi-ai/api/openai-completions.lazy";

const baseUrl = process.env.ABLITERATION_BASE_URL || "https://api.abliteration.ai/v1";

export const model: Model<"openai-completions"> = {
  id: process.env.ABLITERATION_MODEL || "abliterated-model",
  name: "Abliteration",
  provider: "abliteration",
  api: "openai-completions",
  baseUrl,
  reasoning: true,
  input: ["text", "image"],
  contextWindow: 262144,
  maxTokens: 4096,
  cost: { input: 1, output: 3, cacheRead: 0.1, cacheWrite: 0 },
  compat: {
    maxTokensField: "max_tokens",
    supportsDeveloperRole: false,
    supportsStore: false,
    supportsReasoningEffort: false,
  },
};

export const models = createModels();
models.setProvider(createProvider({
  id: model.provider,
  name: "Abliteration",
  baseUrl,
  auth: { apiKey: envApiKeyAuth("Abliteration API key", ["ABLITERATION_API_KEY"]) },
  models: [model],
  api: openAICompletionsApi(),
}));
