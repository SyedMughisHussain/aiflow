"use server"

import { requireUser } from "@/lib/auth-guard"
import {
  listConversationsForUser,
  createConversation,
  getConversationMessages,
  sendMessage,
  chatMessageInputSchema,
  ConversationNotFoundError,
  UsageLimitExceededError,
  type ChatMessageDTO as ServiceChatMessage,
} from "@/lib/chat-service"

export interface ConversationSummaryDTO {
  id: string
  title: string | null
  updatedAt: string
}

export interface ChatMessageDTO {
  id: string
  role: "USER" | "ASSISTANT" | "SYSTEM"
  content: string
  createdAt: string
}

function toMessageDTO(message: ServiceChatMessage): ChatMessageDTO {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
  }
}

export async function listConversations(): Promise<ConversationSummaryDTO[]> {
  const user = await requireUser()
  const chats = await listConversationsForUser(user.id)
  return chats.map((chat) => ({
    id: chat.id,
    title: chat.title,
    updatedAt: chat.updatedAt.toISOString(),
  }))
}

export async function startConversation(): Promise<ConversationSummaryDTO> {
  const user = await requireUser()
  const chat = await createConversation(user.id)
  return { id: chat.id, title: chat.title, updatedAt: chat.updatedAt.toISOString() }
}

export type LoadConversationMessagesResult =
  | { ok: true; messages: ChatMessageDTO[] }
  | { ok: false; error: string }

export async function loadConversationMessages(
  chatId: string
): Promise<LoadConversationMessagesResult> {
  const user = await requireUser()

  try {
    const messages = await getConversationMessages(user.id, chatId)
    return { ok: true, messages: messages.map(toMessageDTO) }
  } catch (err) {
    if (err instanceof ConversationNotFoundError) {
      return { ok: false, error: "Conversation not found." }
    }
    console.error("Failed to load conversation", err)
    return { ok: false, error: "Something went wrong while loading this conversation." }
  }
}

export type SendChatMessageResult =
  | {
      ok: true
      userMessage: ChatMessageDTO
      assistantMessage: ChatMessageDTO
      conversation: ConversationSummaryDTO
    }
  | { ok: false; error: string }

export async function sendChatMessage(
  chatId: string,
  content: string
): Promise<SendChatMessageResult> {
  const user = await requireUser()

  const parsed = chatMessageInputSchema.safeParse({ content })
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid message." }
  }

  try {
    const result = await sendMessage(user.id, chatId, parsed.data)
    return {
      ok: true,
      userMessage: toMessageDTO(result.userMessage),
      assistantMessage: toMessageDTO(result.assistantMessage),
      conversation: {
        id: result.conversation.id,
        title: result.conversation.title,
        updatedAt: result.conversation.updatedAt.toISOString(),
      },
    }
  } catch (err) {
    if (err instanceof ConversationNotFoundError) {
      return { ok: false, error: "Conversation not found." }
    }
    if (err instanceof UsageLimitExceededError) {
      return {
        ok: false,
        error: `You've reached your monthly limit of ${err.limit} generations. Upgrade your plan to continue.`,
      }
    }

    console.error("AI chat failed", err)
    return {
      ok: false,
      error: "Something went wrong while sending your message. Please try again.",
    }
  }
}
