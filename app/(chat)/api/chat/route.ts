import { geolocation, ipAddress } from "@vercel/functions";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
  stepCountIs,
  streamText,
  tool,
} from "ai";
import { checkBotId } from "botid/server";
import { after } from "next/server";
import { createResumableStreamContext } from "resumable-stream";
import { z } from "zod";
import { auth, type UserType } from "@/app/(auth)/auth";
import { entitlementsByUserType } from "@/lib/ai/entitlements";
import {
  AUTO_CHAT_MODEL_ID,
  allowedModelIds,
  chatModels,
  DEFAULT_CHAT_MODEL,
  DEFAULT_LOCAL_CHAT_MODEL,
  DEFAULT_REMOTE_CHAT_MODEL,
  DEFAULT_VISION_CHAT_MODEL,
  getActiveModels,
  getCapabilities,
  isDashScopeConfigured,
} from "@/lib/ai/models";
import { type RequestHints, systemPrompt } from "@/lib/ai/prompts";
import { createDocument } from "@/lib/ai/tools/create-document";
import { editDocument } from "@/lib/ai/tools/edit-document";
import { getWeather } from "@/lib/ai/tools/get-weather";
import { requestSuggestions } from "@/lib/ai/tools/request-suggestions";
import { updateDocument } from "@/lib/ai/tools/update-document";
import { isProductionEnvironment } from "@/lib/constants";
import { getLanguageModel } from "@/lib/ai/providers";
import {
  createStreamId,
  deleteChatById,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  saveChat,
  saveMessages,
  updateMessage,
} from "@/lib/db/queries";
import type { DBMessage } from "@/lib/db/schema";
import { ChatbotError } from "@/lib/errors";
import { checkIpRateLimit } from "@/lib/ratelimit";
import type { Attachment, ChatMessage } from "@/lib/types";
import {
  convertToUIMessages,
  generateUUID,
  getTextFromMessage,
} from "@/lib/utils";
import { type PostRequestBody, postRequestBodySchema } from "./schema";

export const maxDuration = 60;

function getStreamContext() {
  try {
    return createResumableStreamContext({ waitUntil: after });
  } catch {
    return null;
  }
}


function createChatTitle(message: ChatMessage) {
  const text = getTextFromMessage(message).replace(/\s+/g, " ").trim();

  if (!text) {
    return "New conversation";
  }

  if (text.length <= 48) {
    return text;
  }

  return `${text.slice(0, 45).trimEnd()}...`;
}

function getLastUserMessage(messages: ChatMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];

    if (message.role === "user") {
      return message;
    }
  }

  return null;
}

function messageHasImageAttachment(message: ChatMessage | null) {
  return (
    message?.parts.some(
      (part) => part.type === "file" && part.mediaType.startsWith("image/")
    ) ?? false
  );
}

function resolveChatModelSelection({
  requestedModelId,
  messages,
}: {
  requestedModelId: string;
  messages: ChatMessage[];
}) {
  const activeModelIds = new Set(getActiveModels().map((model) => model.id));
  const normalizedModelId = activeModelIds.has(requestedModelId)
    ? requestedModelId
    : DEFAULT_CHAT_MODEL;

  if (normalizedModelId !== AUTO_CHAT_MODEL_ID) {
    return normalizedModelId;
  }

  if (messageHasImageAttachment(getLastUserMessage(messages))) {
    return DEFAULT_VISION_CHAT_MODEL;
  }

  return isDashScopeConfigured()
    ? DEFAULT_REMOTE_CHAT_MODEL
    : DEFAULT_LOCAL_CHAT_MODEL;
}

function getMessageAttachments(message: ChatMessage): Attachment[] {
  return message.parts.flatMap((part) => {
    if (part.type !== "file") {
      return [];
    }

    return [
      {
        name: String(
          ("filename" in part ? part.filename : undefined) ??
            ("name" in part ? part.name : undefined) ??
            "file"
        ),
        url: part.url,
        contentType: part.mediaType,
      },
    ];
  });
}

function toDbMessage(chatId: string, message: ChatMessage): DBMessage {
  return {
    id: message.id,
    role: message.role,
    parts: message.parts,
    createdAt: new Date(),
    attachments: getMessageAttachments(message),
    chatId,
  };
}

function getRepoInfoTool() {
  return tool({
    description:
      "Get GitHub repository metadata and exact star count for an owner/repo pair.",
    inputSchema: z.object({
      owner: z.string(),
      repo: z.string(),
    }),
    execute: async ({ owner, repo }) => {
      try {
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
          headers: { "User-Agent": "ai-chatbot" },
        });

        if (!response.ok) {
          return {
            name: `${owner}/${repo}`,
            description: "Repository not found",
            stars: 0,
          };
        }

        const data = await response.json();

        return {
          name: String(data.full_name ?? `${owner}/${repo}`),
          description: String(data.description ?? "No description"),
          stars: Number(data.stargazers_count ?? 0),
        };
      } catch {
        return {
          name: `${owner}/${repo}`,
          description: "Failed to fetch repository information",
          stars: 0,
        };
      }
    },
  });
}

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch {
    return new ChatbotError("bad_request:api").toResponse();
  }

  try {
    const { id, message, messages, selectedChatModel, selectedVisibilityType } =
      requestBody;

    const [, session] = await Promise.all([
      checkBotId().catch(() => null),
      auth(),
    ]);

    if (!session?.user) {
      return new ChatbotError("unauthorized:chat").toResponse();
    }

    const requestedChatModel = allowedModelIds.has(selectedChatModel)
      ? selectedChatModel
      : DEFAULT_CHAT_MODEL;

    await checkIpRateLimit(ipAddress(request));

    const userType: UserType = session.user.type;
    const messageCount = await getMessageCountByUserId({
      id: session.user.id,
      differenceInHours: 1,
    });

    if (messageCount > entitlementsByUserType[userType].maxMessagesPerHour) {
      return new ChatbotError("rate_limit:chat").toResponse();
    }

    const isToolApprovalFlow = Boolean(messages);

    const chat = await getChatById({ id });
    let messagesFromDb: DBMessage[] = [];
    let initialTitle: string | null = null;

    if (chat) {
      if (chat.userId !== session.user.id) {
        return new ChatbotError("forbidden:chat").toResponse();
      }

      messagesFromDb = await getMessagesByChatId({ id });
    } else if (message?.role === "user") {
      initialTitle = createChatTitle(message);

      await saveChat({
        id,
        userId: session.user.id,
        title: initialTitle,
        visibility: selectedVisibilityType,
      });
    } else {
      return new ChatbotError("not_found:chat").toResponse();
    }

    let uiMessages: ChatMessage[];

    if (isToolApprovalFlow && messages) {
      const dbMessages = convertToUIMessages(messagesFromDb);
      const approvalStates = new Map(
        messages.flatMap(
          (currentMessage) =>
            currentMessage.parts
              ?.filter(
                (part: Record<string, unknown>) =>
                  part.state === "approval-responded" ||
                  part.state === "output-denied"
              )
              .map((part: Record<string, unknown>) => [
                String(part.toolCallId ?? ""),
                part,
              ]) ?? []
        )
      );

      uiMessages = dbMessages.map((currentMessage) => ({
        ...currentMessage,
        parts: currentMessage.parts.map((part) => {
          if (
            "toolCallId" in part &&
            approvalStates.has(String(part.toolCallId))
          ) {
            return { ...part, ...approvalStates.get(String(part.toolCallId)) };
          }

          return part;
        }),
      })) as ChatMessage[];
    } else {
      uiMessages = [
        ...convertToUIMessages(messagesFromDb),
        message as ChatMessage,
      ];
    }

    const { longitude, latitude, city, country } = geolocation(request);
    const requestHints: RequestHints = {
      longitude,
      latitude,
      city,
      country,
    };

    if (message?.role === "user") {
      await saveMessages({
        messages: [toDbMessage(id, message)],
      });
    }

    const chatModel = resolveChatModelSelection({
      requestedModelId: requestedChatModel,
      messages: uiMessages,
    });

    const modelCapabilities = await getCapabilities();
    const capabilities = modelCapabilities[chatModel];
    const isReasoningModel = capabilities?.reasoning === true;
    const supportsTools = capabilities?.tools === true;
    const modelMessages = await convertToModelMessages(uiMessages);
    const modelConfig = chatModels.find((currentModel) => currentModel.id === chatModel);

    const stream = createUIMessageStream({
      originalMessages: isToolApprovalFlow ? uiMessages : undefined,
      execute: async ({ writer: dataStream }) => {
        if (initialTitle) {
          dataStream.write({ type: "data-chat-title", data: initialTitle });
        }

        const result = streamText({
          model: getLanguageModel(chatModel),
          system: `${systemPrompt({
            requestHints,
            supportsTools,
          })}\n\nWhen answering, use the same language as the user.\nWhen the user asks about a GitHub repository, stars, repo metadata, or provides an owner/repo pair, call getRepoInfo before answering and include the exact star count when available.`,
          messages: modelMessages,
          stopWhen: stepCountIs(5),
          experimental_activeTools: supportsTools
            ? [
                "getWeather",
                "getRepoInfo",
                "createDocument",
                "editDocument",
                "updateDocument",
                "requestSuggestions",
              ]
            : [],
          toolChoice: "auto",
          tools: {
            getWeather,
            getRepoInfo: getRepoInfoTool(),
            createDocument: createDocument({
              session,
              dataStream,
              modelId: chatModel,
            }),
            editDocument: editDocument({ dataStream, session }),
            updateDocument: updateDocument({
              session,
              dataStream,
              modelId: chatModel,
            }),
            requestSuggestions: requestSuggestions({
              session,
              dataStream,
              modelId: chatModel,
            }),
          },
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: "stream-text",
          },
          ...(modelConfig?.reasoningEffort
            ? {
                providerOptions: {
                  openai: { reasoningEffort: modelConfig.reasoningEffort },
                },
              }
            : {}),
        });

        dataStream.merge(
          result.toUIMessageStream({ sendReasoning: isReasoningModel })
        );
      },
      generateId: generateUUID,
      onFinish: async ({ messages: finishedMessages }) => {
        if (isToolApprovalFlow) {
          for (const finishedMessage of finishedMessages) {
            const existingMessage = uiMessages.find(
              (currentMessage) => currentMessage.id === finishedMessage.id
            );

            if (existingMessage) {
              await updateMessage({
                id: finishedMessage.id,
                parts: finishedMessage.parts,
              });
            } else {
              await saveMessages({
                messages: [toDbMessage(id, finishedMessage)],
              });
            }
          }

          return;
        }

        if (finishedMessages.length > 0) {
          await saveMessages({
            messages: finishedMessages.map((finishedMessage) =>
              toDbMessage(id, finishedMessage)
            ),
          });
        }
      },
      onError: () => {
        return "Oops, an error occurred!";
      },
    });

    return createUIMessageStreamResponse({
      stream,
      async consumeSseStream({ stream: sseStream }) {
        if (!process.env.REDIS_URL) {
          return;
        }

        try {
          const streamContext = getStreamContext();

          if (streamContext) {
            const streamId = generateId();

            await createStreamId({ streamId, chatId: id });
            await streamContext.createNewResumableStream(streamId, () => sseStream);
          }
        } catch {
          // Non-critical: chat can continue without resumable stream support.
        }
      },
    });
  } catch (error) {
    const vercelId = request.headers.get("x-vercel-id");

    if (error instanceof ChatbotError) {
      return error.toResponse();
    }

    console.error("Unhandled error in chat API:", error, { vercelId });
    return new ChatbotError("offline:chat").toResponse();
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new ChatbotError("bad_request:api").toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  const chat = await getChatById({ id });

  if (chat?.userId !== session.user.id) {
    return new ChatbotError("forbidden:chat").toResponse();
  }

  const deletedChat = await deleteChatById({ id });

  return Response.json(deletedChat, { status: 200 });
}
