export const AUTO_CHAT_MODEL_ID = "auto";
export const DEFAULT_LOCAL_CHAT_MODEL = "qwen3:8b";
export const DEFAULT_REMOTE_CHAT_MODEL = "qwen-plus-2025-07-28";
export const DEFAULT_VISION_CHAT_MODEL = "minicpm-v:8b";
export const DEFAULT_CHAT_MODEL = AUTO_CHAT_MODEL_ID;

export const titleModel = {
  id: "mistral/mistral-small",
  name: "Mistral Small",
  provider: "mistral",
  description: "Fast model for title generation",
  gatewayOrder: ["mistral"],
};

export type ModelCapabilities = {
  tools: boolean;
  vision: boolean;
  reasoning: boolean;
};

export type ChatModel = {
  id: string;
  name: string;
  provider: string;
  description: string;
  gatewayOrder?: string[];
  reasoningEffort?: "none" | "minimal" | "low" | "medium" | "high";
};

export const chatModels: ChatModel[] = [
  {
    id: AUTO_CHAT_MODEL_ID,
    name: "Auto",
    provider: "Smart Router",
    description: "Automatically routes text and image requests to the best available model",
  },
  {
    id: "qvq-max-2025-03-25",
    name: "QVQ Max 2025-03-25",
    provider: "Alibaba",
    description: "Hosted multimodal reasoning model for harder visual analysis tasks",
  },
  {
    id: "qwen-math-turbo",
    name: "Qwen Math Turbo",
    provider: "Alibaba",
    description: "Hosted math-specialized model for formulas, proofs, and problem solving",
  },
  {
    id: DEFAULT_REMOTE_CHAT_MODEL,
    name: "Qwen Plus 2025-07-28",
    provider: "Alibaba",
    description: "Hosted Qwen model via DashScope for stronger general chat and tool use",
  },
  {
    id: "qwen-vl-plus-latest",
    name: "Qwen VL Plus Latest",
    provider: "Alibaba",
    description: "Hosted vision-language model for cloud image understanding",
  },
  {
    id: "minicpm-v:8b",
    name: "MiniCPM-V (8B Local)",
    provider: "Ollama",
    description: "Local vision model for image understanding and OCR",
  },
  {
    id: "qwen3:8b",
    name: "Qwen 3 (8B Local)",
    provider: "Ollama",
    description: "Fast local model for everyday chat and coding",
  },
  {
    id: "deepseek-r1:8b",
    name: "DeepSeek R1 (8B Local)",
    provider: "Ollama",
    description: "Local reasoning model for more deliberate problem solving",
  },
];

export const LOCAL_CHAT_MODEL_IDS = new Set(
  chatModels
    .filter((model) => model.provider === "Ollama")
    .map((model) => model.id)
);

export const DASHSCOPE_CHAT_MODEL_IDS = new Set(
  chatModels
    .filter((model) => model.provider === "Alibaba")
    .map((model) => model.id)
);

export const THINK_TAG_REASONING_MODEL_IDS = new Set([
  "qwen3:8b",
  "deepseek-r1:8b",
]);

export function isDashScopeConfigured() {
  return Boolean(
    process.env.DASHSCOPE_API_KEY ??
      process.env.ALIBABA_API_KEY ??
      process.env.QWEN_API_KEY ??
      (process.env.DASHSCOPE_BASE_URL ? process.env.OPENAI_API_KEY : undefined)
  );
}

export async function getCapabilities(): Promise<
  Record<string, ModelCapabilities>
> {
  return Object.fromEntries(
    chatModels.map((model) => [
      model.id,
      model.id === AUTO_CHAT_MODEL_ID
        ? {
            tools: true,
            vision: true,
            reasoning: true,
          }
      : model.id === "qvq-max-2025-03-25"
        ? {
            tools: false,
            vision: true,
            reasoning: true,
          }
      : model.id === "qwen-math-turbo"
        ? {
            tools: false,
            vision: false,
            reasoning: false,
          }
      : model.id === DEFAULT_REMOTE_CHAT_MODEL
        ? {
            tools: true,
            vision: false,
            reasoning: false,
          }
      : model.id === "qwen-vl-plus-latest"
        ? {
            tools: false,
            vision: true,
            reasoning: false,
          }
      : model.id === "minicpm-v:8b"
        ? {
            tools: false,
            vision: true,
            reasoning: false,
          }
        : model.id === "qwen3:8b"
          ? {
              tools: true,
              vision: false,
              reasoning: true,
            }
        : model.id === "deepseek-r1:8b"
          ? {
              tools: false,
              vision: false,
              reasoning: true,
            }
          : {
              tools: true,
              vision: false,
              reasoning: false,
            },
    ])
  );
}

export const isDemo = process.env.IS_DEMO === "1";

type GatewayModel = {
  id: string;
  name: string;
  type?: string;
  tags?: string[];
};

export type GatewayModelWithCapabilities = ChatModel & {
  capabilities: ModelCapabilities;
};

export async function getAllGatewayModels(): Promise<
  GatewayModelWithCapabilities[]
> {
  try {
    const res = await fetch("https://ai-gateway.vercel.sh/v1/models", {
      next: { revalidate: 86_400 },
    });
    if (!res.ok) {
      return [];
    }

    const json = await res.json();
    return (json.data ?? [])
      .filter((model: GatewayModel) => model.type === "language")
      .map((model: GatewayModel) => ({
        id: model.id,
        name: model.name,
        provider: model.id.split("/")[0],
        description: "",
        capabilities: {
          tools: model.tags?.includes("tool-use") ?? false,
          vision: model.tags?.includes("vision") ?? false,
          reasoning: model.tags?.includes("reasoning") ?? false,
        },
      }));
  } catch {
    return [];
  }
}

export function getActiveModels(): ChatModel[] {
  return chatModels.filter((model) => {
    if (DASHSCOPE_CHAT_MODEL_IDS.has(model.id)) {
      return isDashScopeConfigured();
    }

    return true;
  });
}

export const allowedModelIds = new Set(chatModels.map((model) => model.id));

export const modelsByProvider = getActiveModels().reduce(
  (acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push(model);
    return acc;
  },
  {} as Record<string, ChatModel[]>
);
