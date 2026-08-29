import { describe, expect, it, vi } from "vitest"
import Stripe from "stripe"

process.env.STRIPE_SECRET_KEY = "sk_test_fake_key_for_signature_tests"
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_signature_secret"

vi.mock("@/lib/subscription-service", () => ({
  syncSubscriptionFromStripe: vi.fn(),
}))

const { POST } = await import("@/app/api/webhooks/stripe/route")

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

function makeSignedRequest(body: string, signature: string): Request {
  const headers = new Headers({ "stripe-signature": signature })
  return new Request("http://localhost:3000/api/webhooks/stripe", { method: "POST", headers, body })
}

describe("POST /api/webhooks/stripe — real signature verification", () => {
  it("accepts a request with a genuinely valid Stripe signature", async () => {
    const payload = JSON.stringify({ id: "evt_test", type: "customer.updated", data: { object: {} } })
    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: process.env.STRIPE_WEBHOOK_SECRET as string,
    })

    const response = await POST(makeSignedRequest(payload, signature))

    expect(response.status).toBe(200)
  })

  it("rejects a request whose body was tampered with after signing", async () => {
    const originalPayload = JSON.stringify({ id: "evt_test", type: "customer.updated", data: { object: {} } })
    const signature = stripe.webhooks.generateTestHeaderString({
      payload: originalPayload,
      secret: process.env.STRIPE_WEBHOOK_SECRET as string,
    })
    const tamperedPayload = JSON.stringify({
      id: "evt_test",
      type: "customer.subscription.deleted",
      data: { object: {} },
    })

    const response = await POST(makeSignedRequest(tamperedPayload, signature))

    expect(response.status).toBe(400)
  })
})
