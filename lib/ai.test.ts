import { describe, expect, it, vi, beforeEach } from "vitest"

const createMock = vi.fn()

vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(function OpenAIMock() {
    return { chat: { completions: { create: createMock } } }
  }),
}))

const { generateContent, composeUserPrompt, generateRewrite, generateChatReply } = await import(
  "@/lib/ai"
)

beforeEach(() => {
  createMock.mockReset()
  process.env.GROQ_API_KEY = "test-key"
})

describe("composeUserPrompt", () => {
  it("includes the tone line only when a tone is provided", () => {
    expect(
      composeUserPrompt({ type: "BLOG_POST", topic: "Cats", instructions: "Keep it short" })
    ).toBe("Topic: Cats\nInstructions: Keep it short")

    expect(
      composeUserPrompt({
        type: "BLOG_POST",
        topic: "Cats",
        instructions: "Keep it short",
        tone: "Playful",
      })
    ).toBe("Topic: Cats\nInstructions: Keep it short\nTone: Playful")
  })
})

describe("generateContent", () => {
  it("throws a clear error when the API key is not configured", async () => {
    delete process.env.GROQ_API_KEY

    await expect(
      generateContent({ type: "BLOG_POST", topic: "Cats", instructions: "Write 100 words" })
    ).rejects.toThrow("AI provider is not configured")
  })

  it("sends the composed prompt and returns the generated content", async () => {
    createMock.mockResolvedValue({
      model: "llama-3.3-70b-versatile",
      choices: [{ message: { content: "  Generated content  " } }],
      usage: { total_tokens: 42 },
    })

    const result = await generateContent({
      type: "PRODUCT_DESCRIPTION",
      topic: "Wireless headphones",
      instructions: "Highlight battery life",
      tone: "Friendly",
    })

    expect(result).toEqual({
      content: "Generated content",
      model: "llama-3.3-70b-versatile",
      tokensUsed: 42,
    })

    const call = createMock.mock.calls[0][0]
    expect(call.messages[1].content).toContain("Topic: Wireless headphones")
    expect(call.messages[1].content).toContain("Tone: Friendly")
  })

  it("defaults tokensUsed to 0 when usage information is missing", async () => {
    createMock.mockResolvedValue({
      model: "llama-3.3-70b-versatile",
      choices: [{ message: { content: "Content" } }],
      usage: undefined,
    })

    const result = await generateContent({
      type: "EMAIL",
      topic: "Launch",
      instructions: "Announce it",
    })

    expect(result.tokensUsed).toBe(0)
  })

  it("throws when the provider returns an empty response", async () => {
    createMock.mockResolvedValue({
      model: "llama-3.3-70b-versatile",
      choices: [{ message: { content: "   " } }],
      usage: {},
    })

    await expect(
      generateContent({ type: "AD_COPY", topic: "Sale", instructions: "20% off" })
    ).rejects.toThrow("empty response")
  })
})

describe("generateRewrite", () => {
  it("sends the rewrite system prompt for the mode and the source text as the user message", async () => {
    createMock.mockResolvedValue({
      model: "openai/gpt-oss-120b",
      choices: [{ message: { content: "Rewritten text" } }],
      usage: { total_tokens: 30 },
    })

    const result = await generateRewrite({ mode: "SHORTEN", text: "A very long paragraph." })

    expect(result).toEqual({
      content: "Rewritten text",
      model: "openai/gpt-oss-120b",
      tokensUsed: 30,
    })

    const call = createMock.mock.calls[0][0]
    expect(call.messages[0].role).toBe("system")
    expect(call.messages[1]).toEqual({
      role: "user",
      content: expect.stringContaining("A very long paragraph."),
    })
  })

  it("uses a different system prompt for each mode", async () => {
    createMock.mockResolvedValue({
      model: "openai/gpt-oss-120b",
      choices: [{ message: { content: "x" } }],
      usage: {},
    })

    await generateRewrite({ mode: "FRIENDLY", text: "Hello" })
    const friendlyPrompt = createMock.mock.calls[0][0].messages[0].content

    await generateRewrite({ mode: "PROFESSIONAL", text: "Hello" })
    const professionalPrompt = createMock.mock.calls[1][0].messages[0].content

    expect(friendlyPrompt).not.toBe(professionalPrompt)
  })

  it("throws when the provider returns an empty response", async () => {
    createMock.mockResolvedValue({
      model: "openai/gpt-oss-120b",
      choices: [{ message: { content: "   " } }],
      usage: {},
    })

    await expect(generateRewrite({ mode: "IMPROVE", text: "Hello" })).rejects.toThrow(
      "empty response"
    )
  })
})

describe("generateChatReply", () => {
  it("prepends the assistant system prompt to the conversation history", async () => {
    createMock.mockResolvedValue({
      model: "openai/gpt-oss-120b",
      choices: [{ message: { content: "Hi there" } }],
      usage: { total_tokens: 12 },
    })

    const result = await generateChatReply([
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi!" },
      { role: "user", content: "How are you?" },
    ])

    expect(result).toEqual({
      content: "Hi there",
      model: "openai/gpt-oss-120b",
      tokensUsed: 12,
    })

    const call = createMock.mock.calls[0][0]
    expect(call.messages[0].role).toBe("system")
    expect(call.messages.slice(1)).toEqual([
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi!" },
      { role: "user", content: "How are you?" },
    ])
  })

  it("throws when the provider returns an empty response", async () => {
    createMock.mockResolvedValue({
      model: "openai/gpt-oss-120b",
      choices: [{ message: { content: "" } }],
      usage: {},
    })

    await expect(generateChatReply([{ role: "user", content: "Hi" }])).rejects.toThrow(
      "empty response"
    )
  })
})
