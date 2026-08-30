import { describe, expect, it, vi, beforeEach } from "vitest"

vi.mock("@/lib/db", () => ({
  db: {
    aIUsage: {
      upsert: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    subscription: {
      findUnique: vi.fn(),
    },
  },
}))

const { db } = await import("@/lib/db")
const {
  checkUsageLimit,
  reserveUsageSlot,
  releaseUsageSlot,
  recordUsage,
  UsageLimitExceededError,
  FREE_PLAN_MONTHLY_LIMIT,
  PRO_PLAN_MONTHLY_LIMIT,
} = await import("@/lib/usage")

function usageRow(
  overrides: Partial<{ generationCount: number; periodEnd: Date | null }> = {}
) {
  return {
    id: "usage_1",
    userId: "user_1",
    generationCount: 0,
    tokensUsed: 0,
    periodStart: new Date(),
    periodEnd: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(db.subscription.findUnique).mockResolvedValue(null)
})

describe("checkUsageLimit", () => {
  it("upserts (creating on first access) and allows the request for a first-time user", async () => {
    vi.mocked(db.aIUsage.upsert).mockResolvedValue(usageRow({ generationCount: 0 }) as never)

    const status = await checkUsageLimit("user_1")

    expect(db.aIUsage.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user_1" },
        create: expect.objectContaining({ userId: "user_1", generationCount: 0 }),
      })
    )
    expect(status).toEqual({
      used: 0,
      limit: FREE_PLAN_MONTHLY_LIMIT,
      remaining: FREE_PLAN_MONTHLY_LIMIT,
      allowed: true,
      plan: "FREE",
    })
  })

  it("allows the request when usage is under the plan limit", async () => {
    vi.mocked(db.aIUsage.upsert).mockResolvedValue(
      usageRow({ generationCount: FREE_PLAN_MONTHLY_LIMIT - 1 }) as never
    )

    const status = await checkUsageLimit("user_1")

    expect(status.allowed).toBe(true)
    expect(status.remaining).toBe(1)
  })

  it("denies the request once the user has reached the monthly limit", async () => {
    vi.mocked(db.aIUsage.upsert).mockResolvedValue(
      usageRow({ generationCount: FREE_PLAN_MONTHLY_LIMIT }) as never
    )

    const status = await checkUsageLimit("user_1")

    expect(status.allowed).toBe(false)
    expect(status.remaining).toBe(0)
    expect(db.aIUsage.update).not.toHaveBeenCalled()
  })

  it("clamps remaining to zero when usage is over the limit (e.g. after a plan downgrade)", async () => {
    vi.mocked(db.aIUsage.upsert).mockResolvedValue(
      usageRow({ generationCount: FREE_PLAN_MONTHLY_LIMIT + 5 }) as never
    )

    const status = await checkUsageLimit("user_1")

    expect(status.allowed).toBe(false)
    expect(status.remaining).toBe(0)
  })

  it("resets the counter once the current period has ended", async () => {
    const pastPeriodEnd = new Date(Date.now() - 1000 * 60 * 60 * 24)
    vi.mocked(db.aIUsage.upsert).mockResolvedValue(
      usageRow({ generationCount: FREE_PLAN_MONTHLY_LIMIT, periodEnd: pastPeriodEnd }) as never
    )
    vi.mocked(db.aIUsage.update).mockResolvedValue(usageRow({ generationCount: 0 }) as never)

    const status = await checkUsageLimit("user_1")

    expect(db.aIUsage.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user_1" },
        data: expect.objectContaining({ generationCount: 0, tokensUsed: 0 }),
      })
    )
    expect(status.allowed).toBe(true)
    expect(status.used).toBe(0)
  })

  describe("plan resolution from subscription status", () => {
    it.each([
      ["no subscription row", null, "FREE", FREE_PLAN_MONTHLY_LIMIT],
      ["FREE status", "FREE", "FREE", FREE_PLAN_MONTHLY_LIMIT],
      ["TRIALING status", "TRIALING", "PRO", PRO_PLAN_MONTHLY_LIMIT],
      ["ACTIVE status", "ACTIVE", "PRO", PRO_PLAN_MONTHLY_LIMIT],
      ["PAST_DUE status", "PAST_DUE", "FREE", FREE_PLAN_MONTHLY_LIMIT],
      ["CANCELED status", "CANCELED", "FREE", FREE_PLAN_MONTHLY_LIMIT],
      ["INCOMPLETE status", "INCOMPLETE", "FREE", FREE_PLAN_MONTHLY_LIMIT],
      ["INCOMPLETE_EXPIRED status", "INCOMPLETE_EXPIRED", "FREE", FREE_PLAN_MONTHLY_LIMIT],
      ["UNPAID status", "UNPAID", "FREE", FREE_PLAN_MONTHLY_LIMIT],
    ] as const)("resolves %s to the %s plan", async (_label, status, expectedPlan, expectedLimit) => {
      vi.mocked(db.subscription.findUnique).mockResolvedValue(
        status === null ? null : ({ status } as never)
      )
      vi.mocked(db.aIUsage.upsert).mockResolvedValue(usageRow({ generationCount: 0 }) as never)

      const result = await checkUsageLimit("user_1")

      expect(result.plan).toBe(expectedPlan)
      expect(result.limit).toBe(expectedLimit)
    })

    it("allows usage above the free limit but under the pro limit for a pro subscriber", async () => {
      vi.mocked(db.subscription.findUnique).mockResolvedValue({ status: "ACTIVE" } as never)
      vi.mocked(db.aIUsage.upsert).mockResolvedValue(
        usageRow({ generationCount: FREE_PLAN_MONTHLY_LIMIT + 50 }) as never
      )

      const status = await checkUsageLimit("user_1")

      expect(status.allowed).toBe(true)
      expect(status.plan).toBe("PRO")
    })

    it("denies the request once a pro subscriber reaches the pro plan limit", async () => {
      vi.mocked(db.subscription.findUnique).mockResolvedValue({ status: "ACTIVE" } as never)
      vi.mocked(db.aIUsage.upsert).mockResolvedValue(
        usageRow({ generationCount: PRO_PLAN_MONTHLY_LIMIT }) as never
      )

      const status = await checkUsageLimit("user_1")

      expect(status.allowed).toBe(false)
      expect(status.remaining).toBe(0)
    })
  })
})

describe("reserveUsageSlot", () => {
  it("atomically increments generationCount only when still under the limit", async () => {
    vi.mocked(db.aIUsage.upsert).mockResolvedValue(usageRow({ generationCount: 3 }) as never)
    vi.mocked(db.aIUsage.updateMany).mockResolvedValue({ count: 1 })

    await reserveUsageSlot("user_1")

    expect(db.aIUsage.updateMany).toHaveBeenCalledWith({
      where: { userId: "user_1", generationCount: { lt: FREE_PLAN_MONTHLY_LIMIT } },
      data: { generationCount: { increment: 1 } },
    })
  })

  it("throws UsageLimitExceededError when the conditional update matches no row (limit reached, possibly by a concurrent request)", async () => {
    vi.mocked(db.aIUsage.upsert).mockResolvedValue(
      usageRow({ generationCount: FREE_PLAN_MONTHLY_LIMIT - 1 }) as never
    )
    // Simulates a concurrent request having just consumed the last slot: the
    // conditional UPDATE's WHERE clause no longer matches by the time it runs.
    vi.mocked(db.aIUsage.updateMany).mockResolvedValue({ count: 0 })

    await expect(reserveUsageSlot("user_1")).rejects.toThrow(UsageLimitExceededError)
  })

  it("resolves the limit from the pro plan for a pro subscriber", async () => {
    vi.mocked(db.subscription.findUnique).mockResolvedValue({ status: "ACTIVE" } as never)
    vi.mocked(db.aIUsage.upsert).mockResolvedValue(usageRow({ generationCount: 100 }) as never)
    vi.mocked(db.aIUsage.updateMany).mockResolvedValue({ count: 1 })

    await reserveUsageSlot("user_1")

    expect(db.aIUsage.updateMany).toHaveBeenCalledWith({
      where: { userId: "user_1", generationCount: { lt: PRO_PLAN_MONTHLY_LIMIT } },
      data: { generationCount: { increment: 1 } },
    })
  })
})

describe("releaseUsageSlot", () => {
  it("decrements the generation count", async () => {
    await releaseUsageSlot("user_1")

    expect(db.aIUsage.update).toHaveBeenCalledWith({
      where: { userId: "user_1" },
      data: { generationCount: { decrement: 1 } },
    })
  })
})

describe("recordUsage", () => {
  it("increments tokens used without touching the generation count", async () => {
    await recordUsage("user_1", 120)

    expect(db.aIUsage.update).toHaveBeenCalledWith({
      where: { userId: "user_1" },
      data: { tokensUsed: { increment: 120 } },
    })
  })
})
