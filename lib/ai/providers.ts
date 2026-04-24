import { createOpenAI } from "@ai-sdk/openai";
import {
  customProvider,
  extractReasoningMiddleware,
  gateway,
  wrapLanguageModel,
} from "ai";
import { isTestEnvironment } from "../constants";
import {
  DASHSCOPE_CHAT_MODEL_IDS,
  LOCAL_CHAT_MODEL_IDS,
  THINK_TAG_REASONING_MODEL_IDS,
  titleModel,
} from "./models";

export const myProvider = isTestEnvironment
  ? (() => {
      const { chatModel, titleModel } = require("./models.mock");
      return customProvider({
        languageModels: {
          "chat-model": chatModel,
          "title-model": titleModel,
        },
      });
    })()
  : null;

// Local Ollama models use an OpenAI-compatible endpoint. Override these
// variables in `.env.local` if Ollama is hosted on a different machine
// or behind a proxy.
const ollama = createOpenAI({
  apiKey: process.env.OLLAMA_API_KEY ?? "ollama",
  baseURL: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1",
  name: "ollama",
});

function getDashScopeApiKey() {
  return (
    process.env.DASHSCOPE_API_KEY ??
    process.env.ALIBABA_API_KEY ??
    process.env.QWEN_API_KEY ??
    (process.env.DASHSCOPE_BASE_URL ? process.env.OPENAI_API_KEY : undefined)
  );
}

const dashscope = createOpenAI({
  apiKey: getDashScopeApiKey(),
  baseURL:
    process.env.DASHSCOPE_BASE_URL ??
    "https://dashscope.aliyuncs.com/compatible-mode/v1",
  name: "dashscope",
});

function withThinkTagReasoning<T>(model: T): T {
  return wrapLanguageModel({
    model: model as never,
    middleware: extractReasoningMiddleware({ tagName: "think" }),
  }) as T;
}

export function getLanguageModel(modelId: string) {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel(modelId);
  }

  // Models listed in `LOCAL_CHAT_MODEL_IDS` are resolved through Ollama.
  // Everything else falls back to the Vercel AI Gateway routing.
  if (LOCAL_CHAT_MODEL_IDS.has(modelId)) {
    const model = ollama.chat(modelId);
    return THINK_TAG_REASONING_MODEL_IDS.has(modelId)
      ? withThinkTagReasoning(model)
      : model;
  }

  if (DASHSCOPE_CHAT_MODEL_IDS.has(modelId)) {
    if (!getDashScopeApiKey()) {
      throw new Error(
        "DashScope API key is not configured for Alibaba Qwen models."
      );
    }

    return dashscope.chat(modelId);
  }

  return gateway.languageModel(modelId);
}

export function getTitleModel() {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel("title-model");
  }

  // Title generation stays on the gateway model so local chat model changes
  // do not affect the summarization/title experience.
  return gateway.languageModel(titleModel.id);
}
