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

const { syncSubscriptionFromStripe } = await import("@/lib/subscription-service")
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
      data: { object: { subscription: "sub_1", client_reference_id: "user_1" } },
    })
    retrieveSubscriptionMock.mockResolvedValue({ id: "sub_1", status: "active" })

    const response = await POST(makeRequest("{}"))

    expect(retrieveSubscriptionMock).toHaveBeenCalledWith("sub_1")
    expect(syncSubscriptionFromStripe).toHaveBeenCalledWith({ id: "sub_1", status: "active" }, "user_1")
    expect(response.status).toBe(200)
  })

  it("passes undefined userId fallback when client_reference_id is absent", async () => {
    constructEventMock.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: { subscription: "sub_1", client_reference_id: null } },
    })
    retrieveSubscriptionMock.mockResolvedValue({ id: "sub_1", status: "active" })

    await POST(makeRequest("{}"))

    expect(syncSubscriptionFromStripe).toHaveBeenCalledWith({ id: "sub_1", status: "active" }, undefined)
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

  it.each(["customer.updated", "invoice.payment_failed"] as const)(
    "acks unhandled event types without doing anything (%s)",
    async (type) => {
      constructEventMock.mockReturnValue({ type, data: { object: {} } })

      const response = await POST(makeRequest("{}"))

      expect(response.status).toBe(200)
      expect(syncSubscriptionFromStripe).not.toHaveBeenCalled()
    }
  )

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
