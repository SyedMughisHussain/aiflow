import { describe, expect, it, vi, beforeEach } from "vitest"

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    subscription: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    generation: {
      count: vi.fn(),
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
  },
}))

const { db } = await import("@/lib/db")
const {
  getAdminMetrics,
  getAdminUsers,
  getAdminSubscriptions,
  getAdminUsageStats,
  parsePageParam,
} = await import("@/lib/admin-service")

beforeEach(() => {
  vi.resetAllMocks()
})

describe("parsePageParam", () => {
  it("defaults to page 1 when no value is given", () => {
    expect(parsePageParam(undefined)).toBe(1)
  })

  it("parses a valid numeric string", () => {
    expect(parsePageParam("3")).toBe(3)
  })

  it("takes the first value when given an array", () => {
    expect(parsePageParam(["2", "5"])).toBe(2)
  })

  it.each(["0", "-1", "abc", ""])("falls back to page 1 for invalid input %s", (value) => {
    expect(parsePageParam(value)).toBe(1)
  })

  it("floors a fractional page number", () => {
    expect(parsePageParam("2.9")).toBe(2)
  })
})

describe("getAdminMetrics", () => {
  it("aggregates totals from users, subscriptions, and generations", async () => {
    vi.mocked(db.user.count).mockResolvedValue(42)
    vi.mocked(db.generation.groupBy).mockResolvedValueOnce([{ userId: "u1" }, { userId: "u2" }] as never)
    vi.mocked(db.subscription.count).mockResolvedValue(7)
    vi.mocked(db.generation.count).mockResolvedValueOnce(500).mockResolvedValueOnce(30)

    const metrics = await getAdminMetrics()

    expect(metrics).toEqual({
      totalUsers: 42,
      activeUsers: 2,
      proSubscribers: 7,
      totalGenerations: 500,
      monthlyGenerations: 30,
    })
    expect(db.subscription.count).toHaveBeenCalledWith({
      where: { status: { in: ["ACTIVE", "TRIALING"] } },
    })
  })
})

describe("getAdminUsers", () => {
  it("returns paginated users with computed status and subscription", async () => {
    vi.mocked(db.user.count).mockResolvedValue(1)
    vi.mocked(db.user.findMany).mockResolvedValue([
      {
        id: "user_1",
        name: "Jordan Lee",
        email: "jordan@example.com",
        role: "USER",
        createdAt: new Date("2026-01-01"),
        subscription: { status: "ACTIVE" },
      },
    ] as never)
    vi.mocked(db.generation.groupBy).mockResolvedValue([{ userId: "user_1" }] as never)

    const result = await getAdminUsers({ page: 1 })

    expect(result).toEqual({
      items: [
        {
          id: "user_1",
          name: "Jordan Lee",
          email: "jordan@example.com",
          role: "USER",
          createdAt: new Date("2026-01-01"),
          status: "active",
          subscriptionStatus: "ACTIVE",
        },
      ],
      page: 1,
      pageSize: 10,
      totalCount: 1,
      totalPages: 1,
    })
  })

  it("marks a user with no recent generations as inactive and defaults to the FREE plan", async () => {
    vi.mocked(db.user.count).mockResolvedValue(1)
    vi.mocked(db.user.findMany).mockResolvedValue([
      {
        id: "user_2",
        name: null,
        email: "quiet@example.com",
        role: "USER",
        createdAt: new Date("2026-01-01"),
        subscription: null,
      },
    ] as never)
    vi.mocked(db.generation.groupBy).mockResolvedValue([] as never)

    const result = await getAdminUsers({ page: 1 })

    expect(result.items[0].status).toBe("inactive")
    expect(result.items[0].subscriptionStatus).toBe("FREE")
  })

  it("filters by a search query across name and email", async () => {
    vi.mocked(db.user.count).mockResolvedValue(0)
    vi.mocked(db.user.findMany).mockResolvedValue([] as never)

    await getAdminUsers({ query: "jordan", page: 1 })

    expect(db.user.count).toHaveBeenCalledWith({
      where: {
        OR: [
          { name: { contains: "jordan", mode: "insensitive" } },
          { email: { contains: "jordan", mode: "insensitive" } },
        ],
      },
    })
  })
})

describe("getAdminSubscriptions", () => {
  it("derives the plan from subscription status and never exposes raw Stripe IDs", async () => {
    vi.mocked(db.subscription.count).mockResolvedValue(2)
    vi.mocked(db.subscription.findMany).mockResolvedValue([
      {
        id: "sub_1",
        status: "ACTIVE",
        stripeCurrentPeriodEnd: new Date("2026-09-01"),
        cancelAtPeriodEnd: false,
        user: { name: "Jordan Lee", email: "jordan@example.com" },
      },
      {
        id: "sub_2",
        status: "CANCELED",
        stripeCurrentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        user: { name: null, email: "free@example.com" },
      },
    ] as never)

    const result = await getAdminSubscriptions({ page: 1 })

    expect(result.items).toEqual([
      {
        id: "sub_1",
        userName: "Jordan Lee",
        userEmail: "jordan@example.com",
        plan: "PRO",
        status: "ACTIVE",
        currentPeriodEnd: new Date("2026-09-01"),
        cancelAtPeriodEnd: false,
      },
      {
        id: "sub_2",
        userName: null,
        userEmail: "free@example.com",
        plan: "FREE",
        status: "CANCELED",
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      },
    ])
    expect(result.totalCount).toBe(2)
    expect(db.subscription.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          id: true,
          status: true,
          stripeCurrentPeriodEnd: true,
          cancelAtPeriodEnd: true,
        }),
      })
    )
    const selectArg = vi.mocked(db.subscription.findMany).mock.calls[0][0]?.select
    expect(selectArg).not.toHaveProperty("stripeCustomerId")
    expect(selectArg).not.toHaveProperty("stripeSubscriptionId")
  })
})

describe("getAdminUsageStats", () => {
  it("returns totals, ranked usage by user, and a 6-month trend", async () => {
    vi.mocked(db.generation.count).mockResolvedValue(10)
    vi.mocked(db.generation.groupBy)
      .mockResolvedValueOnce([{ userId: "user_1" }] as never) // distinct users with any generation
      .mockResolvedValueOnce([
        { userId: "user_1", _count: { id: 10 }, _sum: { tokensUsed: 500 } },
      ] as never) // ranked page
    vi.mocked(db.generation.findMany).mockResolvedValue([
      { createdAt: new Date() },
      { createdAt: new Date() },
    ] as never)
    vi.mocked(db.user.findMany).mockResolvedValue([
      { id: "user_1", name: "Jordan Lee", email: "jordan@example.com" },
    ] as never)

    const stats = await getAdminUsageStats({ page: 1 })

    expect(stats.totalGenerations).toBe(10)
    expect(stats.byUser.items).toEqual([
      {
        userId: "user_1",
        userName: "Jordan Lee",
        userEmail: "jordan@example.com",
        generationCount: 10,
        tokensUsed: 500,
      },
    ])
    expect(stats.byUser.totalCount).toBe(1)
    expect(stats.trends).toHaveLength(6)
    expect(stats.trends.at(-1)?.count).toBe(2)
  })

  it("defaults tokensUsed to 0 when the sum is null", async () => {
    vi.mocked(db.generation.count).mockResolvedValue(0)
    vi.mocked(db.generation.groupBy)
      .mockResolvedValueOnce([{ userId: "user_1" }] as never)
      .mockResolvedValueOnce([
        { userId: "user_1", _count: { id: 1 }, _sum: { tokensUsed: null } },
      ] as never)
    vi.mocked(db.generation.findMany).mockResolvedValue([] as never)
    vi.mocked(db.user.findMany).mockResolvedValue([
      { id: "user_1", name: "Jordan Lee", email: "jordan@example.com" },
    ] as never)

    const stats = await getAdminUsageStats({ page: 1 })

    expect(stats.byUser.items[0].tokensUsed).toBe(0)
  })
})
