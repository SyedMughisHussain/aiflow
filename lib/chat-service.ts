import { z } from "zod"

import { db } from "@/lib/db"
import { generateChatReply } from "@/lib/ai"
import { reserveUsageSlot, releaseUsageSlot, recordUsage, UsageLimitExceededError } from "@/lib/usage"
import { truncate } from "@/lib/utils"

export { UsageLimitExceededError }

const MAX_HISTORY_MESSAGES = 20
const TITLE_MAX_LENGTH = 60

export class ConversationNotFoundError extends Error {
  constructor() {
    super("Conversation not found.")
    this.name = "ConversationNotFoundError"
  }
}

export const chatMessageInputSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Message can't be empty.")
    .max(4000, "Message must be under 4000 characters."),
})

export type ChatMessageInput = z.infer<typeof chatMessageInputSchema>

export interface ConversationSummary {
  id: string
  title: string | null
  updatedAt: Date
}

export interface ChatMessageDTO {
  id: string
  role: "USER" | "ASSISTANT" | "SYSTEM"
  content: string
  createdAt: Date
}

export interface SendMessageResult {
  userMessage: ChatMessageDTO
  assistantMessage: ChatMessageDTO
  conversation: ConversationSummary
  tokensUsed: number
}

export async function listConversationsForUser(userId: string): Promise<ConversationSummary[]> {
  return db.chat.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, updatedAt: true },
  })
}

export async function createConversation(userId: string): Promise<ConversationSummary> {
  const chat = await db.chat.create({ data: { userId } })
  return { id: chat.id, title: chat.title, updatedAt: chat.updatedAt }
}

async function requireOwnedChat(userId: string, chatId: string) {
  const chat = await db.chat.findUnique({ where: { id: chatId } })
  if (!chat || chat.userId !== userId) {
    throw new ConversationNotFoundError()
  }
  return chat
}

export async function getConversationMessages(
  userId: string,
  chatId: string
): Promise<ChatMessageDTO[]> {
  await requireOwnedChat(userId, chatId)

  return db.chatMessage.findMany({
    where: { chatId },
    orderBy: { createdAt: "asc" },
    select: { id: true, role: true, content: true, createdAt: true },
  })
}

export async function sendMessage(
  userId: string,
  chatId: string,
  input: ChatMessageInput
): Promise<SendMessageResult> {
  const chat = await requireOwnedChat(userId, chatId)

  await reserveUsageSlot(userId)

  try {
    const priorMessages = await db.chatMessage.findMany({
      where: { chatId },
      orderBy: { createdAt: "asc" },
      take: MAX_HISTORY_MESSAGES,
    })

    const userMessage = await db.chatMessage.create({
      data: { chatId, role: "USER", content: input.content },
    })

    const history = [...priorMessages, userMessage]
      .filter((message) => message.role !== "SYSTEM")
      .map((message) => ({
        role: message.role === "ASSISTANT" ? ("assistant" as const) : ("user" as const),
        content: message.content,
      }))

    const result = await generateChatReply(history)

    const assistantMessage = await db.chatMessage.create({
      data: {
        chatId,
        role: "ASSISTANT",
        content: result.content,
        tokensUsed: result.tokensUsed,
      },
    })

    const updatedChat = await db.chat.update({
      where: { id: chatId },
      data: { title: chat.title ?? truncate(input.content, TITLE_MAX_LENGTH) },
    })

    await recordUsage(userId, result.tokensUsed)

    return {
      userMessage,
      assistantMessage,
      conversation: {
        id: updatedChat.id,
        title: updatedChat.title,
        updatedAt: updatedChat.updatedAt,
      },
      tokensUsed: result.tokensUsed,
    }
  } catch (err) {
    await releaseUsageSlot(userId)
    throw err
  }
}
