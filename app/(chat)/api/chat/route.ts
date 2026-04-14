import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

// 核心魔法：使用官方的 OpenAI 客户端，但把请求地址指向本地的 Ollama 端口
const ollama = createOpenAI({
  baseURL: 'http://localhost:11434/v1',
  apiKey: 'ollama', // 本地运行不需要真实的 API Key，但 SDK 要求必须有值，所以随便填一个
});

export const maxDuration = 30;

export async function POST(req: Request) {
  // 解析前端界面传过来的聊天记录
  const { messages } = await req.json();

  // 调用本地的 Ollama 模型
  const result = await streamText({
    model: ollama('qwen3:8b'), // ⚠️ 如果你用的不是 qwen2.5:7b，请修改这里
    messages,
  });

  // 根据你的版本报错提示，采用老版本的流式返回方法
  return result.toTextStreamResponse();
}