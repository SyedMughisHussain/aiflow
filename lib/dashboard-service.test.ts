import { describe, expect, it, vi, beforeEach } from "vitest"

vi.mock("@/lib/db", () => ({
  db: {
    generation: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    chatMessage: {
      count: vi.fn(),
    },
    aIUsage: {
      findUnique: vi.fn(),
    },
  },
}))

const { db } = await import("@/lib/db")
const { getRecentActivity, getGenerationHistory, getDashboardStats, HISTORY_PAGE_SIZE } = await import(
  "@/lib/dashboard-service"
)

beforeEach(() => {
  vi.resetAllMocks()
})

function generationRow(overrides: Partial<{
  id: string
  type: string
  prompt: string
  tokensUsed: number | null
  createdAt: Date
}> = {}) {
  return {
    id: "gen_1",
    type: "BLOG_POST",
    prompt: "Write a short blog intro about sustainable packaging",
    tokensUsed: 150,
    createdAt: new Date("2026-08-20T10:00:00Z"),
    ...overrides,
  }
}

describe("getRecentActivity", () => {
  it("maps generations to history items, truncating long prompts into titles", async () => {
    vi.mocked(db.generation.findMany).mockResolvedValue([
      generationRow({ prompt: "x".repeat(80) }),
    ] as never)

    const items = await getRecentActivity("user_1")

    expect(items).toHaveLength(1)
    expect(items[0].title).toHaveLength(60)
    expect(items[0].title.endsWith("…")).toBe(true)
    expect(items[0].tool).toBe("writer")
  })

  it("labels a REWRITE generation as the rewrite tool", async () => {
    vi.mocked(db.generation.findMany).mockResolvedValue([
      generationRow({ type: "REWRITE" }),
    ] as never)

    const items = await getRecentActivity("user_1")

    expect(items[0].tool).toBe("rewrite")
  })

  it("defaults tokensUsed to 0 when null", async () => {
    vi.mocked(db.generation.findMany).mockResolvedValue([
      generationRow({ tokensUsed: null }),
    ] as never)

    const items = await getRecentActivity("user_1")

    expect(items[0].tokensUsed).toBe(0)
  })

  it("returns an empty array when the user has no generations", async () => {
    vi.mocked(db.generation.findMany).mockResolvedValue([] as never)

    expect(await getRecentActivity("user_1")).toEqual([])
  })
})

describe("getGenerationHistory", () => {
  it("paginates and reports total pages", async () => {
    vi.mocked(db.generation.count).mockResolvedValue(25)
    vi.mocked(db.generation.findMany).mockResolvedValue([generationRow()] as never)

    const result = await getGenerationHistory("user_1", 2)

    expect(result.page).toBe(2)
    expect(result.totalPages).toBe(Math.ceil(25 / HISTORY_PAGE_SIZE))
    expect(db.generation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user_1" }, skip: HISTORY_PAGE_SIZE, take: HISTORY_PAGE_SIZE })
    )
  })

  it("clamps a non-positive page to 1", async () => {
    vi.mocked(db.generation.count).mockResolvedValue(0)
    vi.mocked(db.generation.findMany).mockResolvedValue([] as never)

    const result = await getGenerationHistory("user_1", -3)

    expect(result.page).toBe(1)
    expect(result.totalPages).toBe(1)
  })
})

describe("getDashboardStats", () => {
  it("aggregates total generations, monthly chat messages, and monthly tokens used", async () => {
    vi.mocked(db.generation.count).mockResolvedValue(12)
    vi.mocked(db.chatMessage.count).mockResolvedValue(5)
    vi.mocked(db.aIUsage.findUnique).mockResolvedValue({ tokensUsed: 4200 } as never)

    const stats = await getDashboardStats("user_1")

    expect(stats).toEqual({
      totalGenerations: 12,
      chatMessagesThisMonth: 5,
      tokensUsedThisMonth: 4200,
    })
    expect(db.chatMessage.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ chat: { userId: "user_1" } }) })
    )
  })

  it("defaults tokensUsedThisMonth to 0 when there is no usage row", async () => {
    vi.mocked(db.generation.count).mockResolvedValue(0)
    vi.mocked(db.chatMessage.count).mockResolvedValue(0)
    vi.mocked(db.aIUsage.findUnique).mockResolvedValue(null)

    const stats = await getDashboardStats("user_1")

    expect(stats.tokensUsedThisMonth).toBe(0)
  })
})
