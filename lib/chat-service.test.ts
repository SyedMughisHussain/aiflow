import { describe, expect, it, vi, beforeEach } from "vitest"

vi.mock("@/lib/db", () => ({
  db: {
    chat: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    chatMessage: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}))

vi.mock("@/lib/ai", () => ({
  generateChatReply: vi.fn(),
}))

vi.mock("@/lib/usage", async () => {
  const actual = await vi.importActual<typeof import("@/lib/usage")>("@/lib/usage")
  return {
    ...actual,
    reserveUsageSlot: vi.fn(),
    releaseUsageSlot: vi.fn(),
    recordUsage: vi.fn(),
  }
})

const { db } = await import("@/lib/db")
const { generateChatReply } = await import("@/lib/ai")
const { reserveUsageSlot, releaseUsageSlot, recordUsage, UsageLimitExceededError } = await import(
  "@/lib/usage"
)
const {
  listConversationsForUser,
  createConversation,
  getConversationMessages,
  sendMessage,
  chatMessageInputSchema,
  ConversationNotFoundError,
} = await import("@/lib/chat-service")

beforeEach(() => {
  vi.resetAllMocks()
})

type CreateChatMessageArgs = {
  data: {
    chatId: string
    role: "USER" | "ASSISTANT" | "SYSTEM"
    content: string
    tokensUsed?: number | null
  }
}

function asCreateArgs(args: unknown): CreateChatMessageArgs {
  return args as CreateChatMessageArgs
}

describe("listConversationsForUser", () => {
  it("only queries conversations belonging to the given user", async () => {
    vi.mocked(db.chat.findMany).mockResolvedValue([] as never)

    await listConversationsForUser("user_1")

    expect(db.chat.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user_1" } })
    )
  })
})

describe("createConversation", () => {
  it("creates a conversation owned by the given user", async () => {
    vi.mocked(db.chat.create).mockResolvedValue({
      id: "chat_1",
      title: null,
      updatedAt: new Date(),
    } as never)

    const result = await createConversation("user_1")

    expect(db.chat.create).toHaveBeenCalledWith({ data: { userId: "user_1" } })
    expect(result.id).toBe("chat_1")
  })
})

describe("getConversationMessages", () => {
  it("throws ConversationNotFoundError when the chat does not exist", async () => {
    vi.mocked(db.chat.findUnique).mockResolvedValue(null)

    await expect(getConversationMessages("user_1", "chat_1")).rejects.toThrow(
      ConversationNotFoundError
    )
    expect(db.chatMessage.findMany).not.toHaveBeenCalled()
  })

  it("throws ConversationNotFoundError when the chat belongs to a different user", async () => {
    vi.mocked(db.chat.findUnique).mockResolvedValue({
      id: "chat_1",
      userId: "someone_else",
      title: null,
    } as never)

    await expect(getConversationMessages("user_1", "chat_1")).rejects.toThrow(
      ConversationNotFoundError
    )
    expect(db.chatMessage.findMany).not.toHaveBeenCalled()
  })

  it("returns the messages when the chat belongs to the user", async () => {
    vi.mocked(db.chat.findUnique).mockResolvedValue({
      id: "chat_1",
      userId: "user_1",
      title: "Hello",
    } as never)
    vi.mocked(db.chatMessage.findMany).mockResolvedValue([
      { id: "msg_1", role: "USER", content: "Hi", createdAt: new Date() },
    ] as never)

    const result = await getConversationMessages("user_1", "chat_1")

    expect(result).toHaveLength(1)
  })
})

describe("sendMessage", () => {
  it("throws ConversationNotFoundError when the chat belongs to a different user, without checking usage or calling the AI provider", async () => {
    vi.mocked(db.chat.findUnique).mockResolvedValue({
      id: "chat_1",
      userId: "someone_else",
      title: null,
    } as never)

    await expect(sendMessage("user_1", "chat_1", { content: "Hello" })).rejects.toThrow(
      ConversationNotFoundError
    )

    expect(reserveUsageSlot).not.toHaveBeenCalled()
    expect(generateChatReply).not.toHaveBeenCalled()
    expect(db.chatMessage.create).not.toHaveBeenCalled()
  })

  it("throws UsageLimitExceededError without persisting any message when the limit is reached", async () => {
    vi.mocked(db.chat.findUnique).mockResolvedValue({
      id: "chat_1",
      userId: "user_1",
      title: null,
    } as never)
    vi.mocked(reserveUsageSlot).mockRejectedValue(new UsageLimitExceededError(50))

    await expect(sendMessage("user_1", "chat_1", { content: "Hello" })).rejects.toThrow(
      UsageLimitExceededError
    )

    expect(generateChatReply).not.toHaveBeenCalled()
    expect(db.chatMessage.create).not.toHaveBeenCalled()
    expect(recordUsage).not.toHaveBeenCalled()
    expect(releaseUsageSlot).not.toHaveBeenCalled()
  })

  it("releases the reserved slot and rethrows when the AI provider fails", async () => {
    vi.mocked(db.chat.findUnique).mockResolvedValue({
      id: "chat_1",
      userId: "user_1",
      title: null,
    } as never)
    vi.mocked(reserveUsageSlot).mockResolvedValue(undefined)
    vi.mocked(db.chatMessage.findMany).mockResolvedValue([] as never)
    vi.mocked(db.chatMessage.create).mockImplementation((async (args: unknown) => {
      const { data } = asCreateArgs(args)
      return { id: "msg_new_user", ...data, createdAt: new Date() }
    }) as never)
    vi.mocked(generateChatReply).mockRejectedValue(new Error("provider unavailable"))

    await expect(sendMessage("user_1", "chat_1", { content: "Hello" })).rejects.toThrow(
      "provider unavailable"
    )

    expect(recordUsage).not.toHaveBeenCalled()
    expect(releaseUsageSlot).toHaveBeenCalledWith("user_1")
  })

  it("persists the user and assistant messages, sends prior history to the AI, and records usage", async () => {
    vi.mocked(db.chat.findUnique).mockResolvedValue({
      id: "chat_1",
      userId: "user_1",
      title: null,
    } as never)
    vi.mocked(reserveUsageSlot).mockResolvedValue(undefined)
    vi.mocked(db.chatMessage.findMany).mockResolvedValue([
      { id: "msg_1", chatId: "chat_1", role: "USER", content: "Hi", createdAt: new Date() },
      {
        id: "msg_2",
        chatId: "chat_1",
        role: "ASSISTANT",
        content: "Hello!",
        createdAt: new Date(),
      },
    ] as never)
    vi.mocked(db.chatMessage.create).mockImplementation((async (args: unknown) => {
      const { data } = asCreateArgs(args)
      return {
        id: data.role === "USER" ? "msg_new_user" : "msg_new_assistant",
        chatId: data.chatId,
        role: data.role,
        content: data.content,
        tokensUsed: data.tokensUsed ?? null,
        createdAt: new Date(),
      }
    }) as never)
    vi.mocked(generateChatReply).mockResolvedValue({
      content: "I'm doing well, thanks!",
      model: "openai/gpt-oss-120b",
      tokensUsed: 25,
    })
    const updatedAt = new Date()
    vi.mocked(db.chat.update).mockResolvedValue({
      id: "chat_1",
      title: "How are you?",
      updatedAt,
    } as never)

    const result = await sendMessage("user_1", "chat_1", { content: "How are you?" })

    expect(result.conversation).toEqual({ id: "chat_1", title: "How are you?", updatedAt })

    expect(generateChatReply).toHaveBeenCalledWith([
      { role: "user", content: "Hi" },
      { role: "assistant", content: "Hello!" },
      { role: "user", content: "How are you?" },
    ])
    expect(db.chatMessage.create).toHaveBeenNthCalledWith(1, {
      data: { chatId: "chat_1", role: "USER", content: "How are you?" },
    })
    expect(db.chatMessage.create).toHaveBeenNthCalledWith(2, {
      data: {
        chatId: "chat_1",
        role: "ASSISTANT",
        content: "I'm doing well, thanks!",
        tokensUsed: 25,
      },
    })
    expect(recordUsage).toHaveBeenCalledWith("user_1", 25)
    expect(result.tokensUsed).toBe(25)
    expect(result.assistantMessage.content).toBe("I'm doing well, thanks!")
  })

  it("derives a conversation title from the first message when the chat has none yet", async () => {
    vi.mocked(db.chat.findUnique).mockResolvedValue({
      id: "chat_1",
      userId: "user_1",
      title: null,
    } as never)
    vi.mocked(reserveUsageSlot).mockResolvedValue(undefined)
    vi.mocked(db.chatMessage.findMany).mockResolvedValue([] as never)
    vi.mocked(db.chatMessage.create).mockImplementation((async (args: unknown) => {
      const { data } = asCreateArgs(args)
      return { id: "msg_new", ...data, createdAt: new Date() }
    }) as never)
    vi.mocked(generateChatReply).mockResolvedValue({
      content: "Hi there!",
      model: "openai/gpt-oss-120b",
      tokensUsed: 10,
    })
    vi.mocked(db.chat.update).mockResolvedValue({} as never)

    await sendMessage("user_1", "chat_1", { content: "What's the capital of France?" })

    expect(db.chat.update).toHaveBeenCalledWith({
      where: { id: "chat_1" },
      data: { title: "What's the capital of France?" },
    })
  })

  it("keeps the existing conversation title when one is already set", async () => {
    vi.mocked(db.chat.findUnique).mockResolvedValue({
      id: "chat_1",
      userId: "user_1",
      title: "Existing title",
    } as never)
    vi.mocked(reserveUsageSlot).mockResolvedValue(undefined)
    vi.mocked(db.chatMessage.findMany).mockResolvedValue([] as never)
    vi.mocked(db.chatMessage.create).mockImplementation((async (args: unknown) => {
      const { data } = asCreateArgs(args)
      return { id: "msg_new", ...data, createdAt: new Date() }
    }) as never)
    vi.mocked(generateChatReply).mockResolvedValue({
      content: "Reply",
      model: "openai/gpt-oss-120b",
      tokensUsed: 5,
    })
    vi.mocked(db.chat.update).mockResolvedValue({} as never)

    await sendMessage("user_1", "chat_1", { content: "Another message" })

    expect(db.chat.update).toHaveBeenCalledWith({
      where: { id: "chat_1" },
      data: { title: "Existing title" },
    })
  })
})

describe("chatMessageInputSchema", () => {
  it("rejects empty content", () => {
    expect(chatMessageInputSchema.safeParse({ content: "  " }).success).toBe(false)
  })

  it("rejects content over the length limit", () => {
    expect(
      chatMessageInputSchema.safeParse({ content: "a".repeat(4001) }).success
    ).toBe(false)
  })

  it("accepts valid content", () => {
    expect(chatMessageInputSchema.safeParse({ content: "Hello there" }).success).toBe(true)
  })
})
