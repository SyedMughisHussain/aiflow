import { describe, expect, it, vi, beforeEach } from "vitest"

const constructEventMock = vi.fn()
const retrieveSubscriptionMock = vi.fn()

vi.mock("@/lib/stripe", () => ({
  getStripeClient: () => ({
    webhooks: { constructEvent: constructEventMock },
    subscriptions: { retrieve: retrieveSubscriptionMock },
  }),
  getWebhookSecret: () => "whsec_test_123",
}))

vi.mock("@/lib/subscription-service", () => ({
  syncSubscriptionFromStripe: vi.fn(),
}))

vi.mock("@/lib/db", () => ({
  db: {
    subscription: {
      updateMany: vi.fn(),
    },
  },
}))

const { syncSubscriptionFromStripe } = await import("@/lib/subscription-service")
const { db } = await import("@/lib/db")
const { POST } = await import("@/app/api/webhooks/stripe/route")

function makeRequest(body: string, signature: string | null = "test-signature"): Request {
  const headers = new Headers()
  if (signature) headers.set("stripe-signature", signature)
  return new Request("http://localhost:3000/api/webhooks/stripe", { method: "POST", headers, body })
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe("POST /api/webhooks/stripe", () => {
  it("returns 400 and does nothing when the stripe-signature header is missing", async () => {
    const response = await POST(makeRequest("{}", null))

    expect(response.status).toBe(400)
    expect(constructEventMock).not.toHaveBeenCalled()
  })

  it("returns 400 when signature verification fails", async () => {
    constructEventMock.mockImplementation(() => {
      throw new Error("bad signature")
    })

    const response = await POST(makeRequest("{}"))

    expect(response.status).toBe(400)
    expect(syncSubscriptionFromStripe).not.toHaveBeenCalled()
  })

  it("syncs the subscription on checkout.session.completed", async () => {
    constructEventMock.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: { subscription: "sub_1" } },
    })
    retrieveSubscriptionMock.mockResolvedValue({ id: "sub_1", status: "active" })

    const response = await POST(makeRequest("{}"))

    expect(retrieveSubscriptionMock).toHaveBeenCalledWith("sub_1")
    expect(syncSubscriptionFromStripe).toHaveBeenCalledWith({ id: "sub_1", status: "active" })
    expect(response.status).toBe(200)
  })

  it("does nothing on checkout.session.completed when there's no subscription id", async () => {
    constructEventMock.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: { subscription: null } },
    })

    const response = await POST(makeRequest("{}"))

    expect(retrieveSubscriptionMock).not.toHaveBeenCalled()
    expect(syncSubscriptionFromStripe).not.toHaveBeenCalled()
    expect(response.status).toBe(200)
  })

  it.each(["customer.subscription.updated", "customer.subscription.deleted"] as const)(
    "syncs the subscription on %s",
    async (type) => {
      const subscriptionObject = { id: "sub_1", status: "canceled" }
      constructEventMock.mockReturnValue({ type, data: { object: subscriptionObject } })

      const response = await POST(makeRequest("{}"))

      expect(syncSubscriptionFromStripe).toHaveBeenCalledWith(subscriptionObject)
      expect(response.status).toBe(200)
    }
  )

  it("marks the subscription PAST_DUE on invoice.payment_failed", async () => {
    constructEventMock.mockReturnValue({
      type: "invoice.payment_failed",
      data: { object: { parent: { subscription_details: { subscription: "sub_1" } } } },
    })

    const response = await POST(makeRequest("{}"))

    expect(db.subscription.updateMany).toHaveBeenCalledWith({
      where: { stripeSubscriptionId: "sub_1" },
      data: { status: "PAST_DUE" },
    })
    expect(response.status).toBe(200)
  })

  it("acks unhandled event types without doing anything", async () => {
    constructEventMock.mockReturnValue({ type: "customer.updated", data: { object: {} } })

    const response = await POST(makeRequest("{}"))

    expect(response.status).toBe(200)
    expect(syncSubscriptionFromStripe).not.toHaveBeenCalled()
  })

  it("returns 500 when processing a handled event throws", async () => {
    constructEventMock.mockReturnValue({
      type: "customer.subscription.updated",
      data: { object: { id: "sub_1" } },
    })
    vi.mocked(syncSubscriptionFromStripe).mockRejectedValue(new Error("db down"))

    const response = await POST(makeRequest("{}"))

    expect(response.status).toBe(500)
  })
})
