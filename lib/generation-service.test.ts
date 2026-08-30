import { describe, expect, it, vi, beforeEach } from "vitest"

vi.mock("@/lib/db", () => ({
  db: {
    generation: {
      create: vi.fn(),
    },
  },
}))

vi.mock("@/lib/ai", () => ({
  generateContent: vi.fn(),
  composeUserPrompt: vi.fn((input: { topic: string }) => `Topic: ${input.topic}`),
  generateRewrite: vi.fn(),
  composeRewritePrompt: vi.fn((text: string) => `Rewrite the following text:\n\n${text}`),
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
const { generateContent, generateRewrite } = await import("@/lib/ai")
const { reserveUsageSlot, releaseUsageSlot, recordUsage } = await import("@/lib/usage")
const {
  createWriterGeneration,
  createRewriteGeneration,
  UsageLimitExceededError,
  writerInputSchema,
  rewriteInputSchema,
} = await import("@/lib/generation-service")

beforeEach(() => {
  vi.resetAllMocks()
})

describe("createWriterGeneration", () => {
  it("throws UsageLimitExceededError without calling the AI provider when the limit is reached", async () => {
    vi.mocked(reserveUsageSlot).mockRejectedValue(new UsageLimitExceededError(50))

    await expect(
      createWriterGeneration("user_1", {
        type: "BLOG_POST",
        topic: "Cats",
        instructions: "Write 100 words",
      })
    ).rejects.toThrow(UsageLimitExceededError)

    expect(generateContent).not.toHaveBeenCalled()
    expect(db.generation.create).not.toHaveBeenCalled()
    expect(recordUsage).not.toHaveBeenCalled()
    expect(releaseUsageSlot).not.toHaveBeenCalled()
  })

  it("releases the reserved slot and rethrows when the AI provider fails", async () => {
    vi.mocked(reserveUsageSlot).mockResolvedValue(undefined)
    vi.mocked(generateContent).mockRejectedValue(new Error("provider unavailable"))

    await expect(
      createWriterGeneration("user_1", {
        type: "BLOG_POST",
        topic: "Cats",
        instructions: "Write 100 words",
      })
    ).rejects.toThrow("provider unavailable")

    expect(db.generation.create).not.toHaveBeenCalled()
    expect(recordUsage).not.toHaveBeenCalled()
    expect(releaseUsageSlot).toHaveBeenCalledWith("user_1")
  })

  it("generates, saves, and records usage on the happy path", async () => {
    vi.mocked(reserveUsageSlot).mockResolvedValue(undefined)
    vi.mocked(generateContent).mockResolvedValue({
      content: "Generated blog post",
      model: "llama-3.3-70b-versatile",
      tokensUsed: 88,
    })
    vi.mocked(db.generation.create).mockResolvedValue({
      id: "gen_1",
      userId: "user_1",
      type: "BLOG_POST",
      prompt: "Topic: Cats",
      content: "Generated blog post",
      model: "llama-3.3-70b-versatile",
      tokensUsed: 88,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never)

    const result = await createWriterGeneration("user_1", {
      type: "BLOG_POST",
      topic: "Cats",
      instructions: "Write 100 words",
    })

    expect(db.generation.create).toHaveBeenCalledWith({
      data: {
        userId: "user_1",
        type: "BLOG_POST",
        prompt: "Topic: Cats",
        content: "Generated blog post",
        model: "llama-3.3-70b-versatile",
        tokensUsed: 88,
      },
    })
    expect(recordUsage).toHaveBeenCalledWith("user_1", 88)
    expect(releaseUsageSlot).not.toHaveBeenCalled()
    expect(result).toEqual({ id: "gen_1", content: "Generated blog post", tokensUsed: 88 })
  })
})

describe("writerInputSchema", () => {
  it("rejects a topic that is too short", () => {
    const result = writerInputSchema.safeParse({
      type: "BLOG_POST",
      topic: "Hi",
      instructions: "Write something",
    })
    expect(result.success).toBe(false)
  })

  it("rejects instructions that are too short", () => {
    const result = writerInputSchema.safeParse({
      type: "BLOG_POST",
      topic: "Remote work",
      instructions: "Hi",
    })
    expect(result.success).toBe(false)
  })

  it("rejects an unsupported content type", () => {
    const result = writerInputSchema.safeParse({
      type: "SEO_META",
      topic: "Remote work",
      instructions: "Write something",
    })
    expect(result.success).toBe(false)
  })

  it("accepts a missing or empty tone since it's optional", () => {
    const withoutTone = writerInputSchema.safeParse({
      type: "BLOG_POST",
      topic: "Remote work",
      instructions: "Write something useful",
    })
    expect(withoutTone.success).toBe(true)

    const withEmptyTone = writerInputSchema.safeParse({
      type: "BLOG_POST",
      topic: "Remote work",
      instructions: "Write something useful",
      tone: "",
    })
    expect(withEmptyTone.success).toBe(true)
  })

  it("accepts valid input with a tone", () => {
    const result = writerInputSchema.safeParse({
      type: "EMAIL",
      topic: "Product launch",
      instructions: "Announce the new feature",
      tone: "Excited",
    })
    expect(result.success).toBe(true)
  })
})

describe("createRewriteGeneration", () => {
  it("throws UsageLimitExceededError without calling the AI provider when the limit is reached", async () => {
    vi.mocked(reserveUsageSlot).mockRejectedValue(new UsageLimitExceededError(50))

    await expect(
      createRewriteGeneration("user_1", { mode: "SHORTEN", text: "A very long paragraph." })
    ).rejects.toThrow(UsageLimitExceededError)

    expect(generateRewrite).not.toHaveBeenCalled()
    expect(db.generation.create).not.toHaveBeenCalled()
    expect(recordUsage).not.toHaveBeenCalled()
    expect(releaseUsageSlot).not.toHaveBeenCalled()
  })

  it("releases the reserved slot and rethrows when the AI provider fails", async () => {
    vi.mocked(reserveUsageSlot).mockResolvedValue(undefined)
    vi.mocked(generateRewrite).mockRejectedValue(new Error("provider unavailable"))

    await expect(
      createRewriteGeneration("user_1", { mode: "SHORTEN", text: "A very long paragraph." })
    ).rejects.toThrow("provider unavailable")

    expect(db.generation.create).not.toHaveBeenCalled()
    expect(recordUsage).not.toHaveBeenCalled()
    expect(releaseUsageSlot).toHaveBeenCalledWith("user_1")
  })

  it("rewrites, saves, and records usage on the happy path", async () => {
    vi.mocked(reserveUsageSlot).mockResolvedValue(undefined)
    vi.mocked(generateRewrite).mockResolvedValue({
      content: "Shortened text",
      model: "openai/gpt-oss-120b",
      tokensUsed: 40,
    })
    vi.mocked(db.generation.create).mockResolvedValue({
      id: "gen_2",
      userId: "user_1",
      type: "REWRITE",
      prompt: "Rewrite the following text:\n\nA very long paragraph.",
      content: "Shortened text",
      model: "openai/gpt-oss-120b",
      tokensUsed: 40,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never)

    const result = await createRewriteGeneration("user_1", {
      mode: "SHORTEN",
      text: "A very long paragraph.",
    })

    expect(db.generation.create).toHaveBeenCalledWith({
      data: {
        userId: "user_1",
        type: "REWRITE",
        prompt: "Rewrite the following text:\n\nA very long paragraph.",
        content: "Shortened text",
        model: "openai/gpt-oss-120b",
        tokensUsed: 40,
      },
    })
    expect(recordUsage).toHaveBeenCalledWith("user_1", 40)
    expect(releaseUsageSlot).not.toHaveBeenCalled()
    expect(result).toEqual({ id: "gen_2", content: "Shortened text", tokensUsed: 40 })
  })
})

describe("rewriteInputSchema", () => {
  it("rejects text that is too short", () => {
    const result = rewriteInputSchema.safeParse({ mode: "IMPROVE", text: "Hi" })
    expect(result.success).toBe(false)
  })

  it("rejects an unsupported mode", () => {
    const result = rewriteInputSchema.safeParse({ mode: "CASUAL", text: "A valid piece of text." })
    expect(result.success).toBe(false)
  })

  it("accepts valid input", () => {
    const result = rewriteInputSchema.safeParse({
      mode: "PROFESSIONAL",
      text: "A valid piece of text to rewrite.",
    })
    expect(result.success).toBe(true)
  })
})
