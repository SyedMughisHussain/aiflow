import { describe, expect, it, vi, beforeEach } from "vitest"

vi.mock("@/lib/db", () => ({
  db: {
    subscription: {
      findUnique: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
  },
}))

const { db } = await import("@/lib/db")
const { syncSubscriptionFromStripe, mapStripeStatus, getSubscriptionDetails } = await import(
  "@/lib/subscription-service"
)

function stripeSubscription(
  overrides: Partial<{
    id: string
    status: string
    customer: string
    cancel_at_period_end: boolean
    items: { data: Array<{ current_period_end: number; price: { id: string } }> }
  }> = {}
) {
  return {
    id: "sub_1",
    status: "active",
    customer: "cus_1",
    cancel_at_period_end: false,
    items: { data: [{ current_period_end: 1893456000, price: { id: "price_1" } }] },
    ...overrides,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe("mapStripeStatus", () => {
  it.each([
    ["active", "ACTIVE"],
    ["trialing", "TRIALING"],
    ["past_due", "PAST_DUE"],
    ["canceled", "CANCELED"],
    ["incomplete", "INCOMPLETE"],
    ["incomplete_expired", "INCOMPLETE_EXPIRED"],
    ["unpaid", "UNPAID"],
    ["paused", "CANCELED"],
  ] as const)("maps Stripe status %s to %s", (stripeStatus, expected) => {
    expect(mapStripeStatus(stripeStatus as never)).toBe(expected)
  })

  it("falls back to CANCELED for an unrecognized status", () => {
    expect(mapStripeStatus("some_future_status" as never)).toBe("CANCELED")
  })
})

describe("syncSubscriptionFromStripe", () => {
  it("updates an existing subscription row found by Stripe customer id", async () => {
    vi.mocked(db.subscription.findUnique).mockResolvedValue({ id: "row_1" } as never)

    await syncSubscriptionFromStripe(stripeSubscription() as never)

    expect(db.subscription.update).toHaveBeenCalledWith({
      where: { id: "row_1" },
      data: {
        status: "ACTIVE",
        stripeCustomerId: "cus_1",
        stripeSubscriptionId: "sub_1",
        stripePriceId: "price_1",
        stripeCurrentPeriodEnd: new Date(1893456000 * 1000),
        cancelAtPeriodEnd: false,
      },
    })
  })

  it("propagates cancelAtPeriodEnd from Stripe", async () => {
    vi.mocked(db.subscription.findUnique).mockResolvedValue({ id: "row_1" } as never)

    await syncSubscriptionFromStripe(stripeSubscription({ cancel_at_period_end: true }) as never)

    expect(db.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ cancelAtPeriodEnd: true }) })
    )
  })

  it("upserts by userId when no existing row matches the Stripe customer id", async () => {
    vi.mocked(db.subscription.findUnique).mockResolvedValue(null)

    await syncSubscriptionFromStripe(stripeSubscription() as never, "user_1")

    expect(db.subscription.upsert).toHaveBeenCalledWith({
      where: { userId: "user_1" },
      create: expect.objectContaining({ userId: "user_1", status: "ACTIVE" }),
      update: expect.objectContaining({ status: "ACTIVE" }),
    })
  })

  it("throws when no existing row matches and no userId is provided", async () => {
    vi.mocked(db.subscription.findUnique).mockResolvedValue(null)

    await expect(syncSubscriptionFromStripe(stripeSubscription() as never)).rejects.toThrow("sub_1")
  })
})

describe("getSubscriptionDetails", () => {
  it("returns null when the user has no subscription row", async () => {
    vi.mocked(db.subscription.findUnique).mockResolvedValue(null)

    expect(await getSubscriptionDetails("user_1")).toBeNull()
  })

  it("returns cancelAtPeriodEnd and currentPeriodEnd from the subscription row", async () => {
    const periodEnd = new Date("2026-09-29")
    vi.mocked(db.subscription.findUnique).mockResolvedValue({
      cancelAtPeriodEnd: true,
      stripeCurrentPeriodEnd: periodEnd,
    } as never)

    expect(await getSubscriptionDetails("user_1")).toEqual({
      cancelAtPeriodEnd: true,
      currentPeriodEnd: periodEnd,
    })
  })
})
