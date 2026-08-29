import { describe, expect, it, vi, beforeEach } from "vitest"

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`)
  }),
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

vi.mock("@/lib/auth-guard", () => ({
  requireUser: vi.fn(),
}))

vi.mock("@/lib/db", () => ({
  db: {
    subscription: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}))

const stripeMock = {
  customers: { create: vi.fn() },
  checkout: { sessions: { create: vi.fn() } },
  subscriptions: { update: vi.fn() },
}

vi.mock("@/lib/stripe", () => ({
  getStripeClient: () => stripeMock,
  getProPriceId: () => "price_test_123",
  getAppUrl: () => "http://localhost:3000",
}))

vi.mock("@/lib/subscription-service", () => ({
  syncSubscriptionFromStripe: vi.fn(),
}))

const { redirect } = await import("next/navigation")
const { requireUser } = await import("@/lib/auth-guard")
const { db } = await import("@/lib/db")
const { syncSubscriptionFromStripe } = await import("@/lib/subscription-service")
const { createCheckoutSessionAction, cancelSubscriptionAction } = await import(
  "@/app/dashboard/billing/actions"
)

const mockedRequireUser = vi.mocked(requireUser)

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(redirect).mockImplementation((path: string) => {
    throw new Error(`REDIRECT:${path}`)
  })
  mockedRequireUser.mockResolvedValue({
    id: "user_1",
    name: "Jordan",
    email: "jordan@example.com",
    role: "USER",
  } as never)
})

describe("createCheckoutSessionAction", () => {
  it("redirects to billing without creating a session when already Pro", async () => {
    vi.mocked(db.subscription.findUnique).mockResolvedValue({
      id: "sub_row_1",
      userId: "user_1",
      status: "ACTIVE",
      stripeCustomerId: "cus_1",
    } as never)

    await expect(createCheckoutSessionAction()).rejects.toThrow("REDIRECT:/dashboard/billing")
    expect(stripeMock.checkout.sessions.create).not.toHaveBeenCalled()
  })

  it("creates a Stripe customer when the user doesn't have one yet, then redirects to Checkout", async () => {
    vi.mocked(db.subscription.findUnique).mockResolvedValue(null)
    stripeMock.customers.create.mockResolvedValue({ id: "cus_new" })
    stripeMock.checkout.sessions.create.mockResolvedValue({ url: "https://checkout.stripe.com/test" })

    await expect(createCheckoutSessionAction()).rejects.toThrow(
      "REDIRECT:https://checkout.stripe.com/test"
    )

    expect(stripeMock.customers.create).toHaveBeenCalledWith({
      email: "jordan@example.com",
      metadata: { userId: "user_1" },
    })
    expect(db.subscription.upsert).toHaveBeenCalledWith({
      where: { userId: "user_1" },
      create: { userId: "user_1", stripeCustomerId: "cus_new" },
      update: { stripeCustomerId: "cus_new" },
    })
    expect(stripeMock.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "subscription",
        customer: "cus_new",
        client_reference_id: "user_1",
        line_items: [{ price: "price_test_123", quantity: 1 }],
      })
    )
  })

  it("reuses an existing Stripe customer instead of creating a new one", async () => {
    vi.mocked(db.subscription.findUnique).mockResolvedValue({
      id: "sub_row_1",
      userId: "user_1",
      status: "FREE",
      stripeCustomerId: "cus_existing",
    } as never)
    stripeMock.checkout.sessions.create.mockResolvedValue({ url: "https://checkout.stripe.com/test" })

    await expect(createCheckoutSessionAction()).rejects.toThrow("REDIRECT:")

    expect(stripeMock.customers.create).not.toHaveBeenCalled()
    expect(stripeMock.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_existing" })
    )
  })

  it("throws when Stripe doesn't return a Checkout Session URL", async () => {
    vi.mocked(db.subscription.findUnique).mockResolvedValue({
      id: "sub_row_1",
      userId: "user_1",
      status: "FREE",
      stripeCustomerId: "cus_existing",
    } as never)
    stripeMock.checkout.sessions.create.mockResolvedValue({ url: null })

    await expect(createCheckoutSessionAction()).rejects.toThrow(
      "Stripe did not return a Checkout Session URL."
    )
  })
})

describe("cancelSubscriptionAction", () => {
  it("returns a typed error when there's no Stripe subscription on record", async () => {
    vi.mocked(db.subscription.findUnique).mockResolvedValue(null)

    const result = await cancelSubscriptionAction()

    expect(result).toEqual({ ok: false, error: "You don't have an active subscription to cancel." })
    expect(stripeMock.subscriptions.update).not.toHaveBeenCalled()
  })

  it("sets cancel_at_period_end on Stripe and syncs the result", async () => {
    vi.mocked(db.subscription.findUnique).mockResolvedValue({
      id: "sub_row_1",
      userId: "user_1",
      stripeSubscriptionId: "sub_1",
    } as never)
    const updatedSubscription = { id: "sub_1", cancel_at_period_end: true }
    stripeMock.subscriptions.update.mockResolvedValue(updatedSubscription)

    const result = await cancelSubscriptionAction()

    expect(stripeMock.subscriptions.update).toHaveBeenCalledWith("sub_1", { cancel_at_period_end: true })
    expect(syncSubscriptionFromStripe).toHaveBeenCalledWith(updatedSubscription)
    expect(result).toEqual({ ok: true })
  })

  it("returns a typed error when the Stripe API call fails", async () => {
    vi.mocked(db.subscription.findUnique).mockResolvedValue({
      id: "sub_row_1",
      userId: "user_1",
      stripeSubscriptionId: "sub_1",
    } as never)
    stripeMock.subscriptions.update.mockRejectedValue(new Error("Stripe is down"))

    const result = await cancelSubscriptionAction()

    expect(result).toEqual({
      ok: false,
      error: "Something went wrong while canceling your plan. Please try again.",
    })
  })
})
