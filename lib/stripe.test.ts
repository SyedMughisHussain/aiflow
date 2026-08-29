import { describe, expect, it, vi, beforeEach } from "vitest"

import { getStripeClient, getProPriceId, getWebhookSecret, getAppUrl } from "@/lib/stripe"

beforeEach(() => {
  process.env.STRIPE_SECRET_KEY = "sk_test_123"
  process.env.STRIPE_PRO_PRICE_ID = "price_test_123"
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_123"
  delete process.env.NEXT_PUBLIC_APP_URL
})

describe("getStripeClient", () => {
  it("throws a descriptive error when STRIPE_SECRET_KEY is missing", () => {
    delete process.env.STRIPE_SECRET_KEY
    expect(() => getStripeClient()).toThrow("STRIPE_SECRET_KEY")
  })

  it("returns a Stripe client when STRIPE_SECRET_KEY is set", () => {
    expect(getStripeClient()).toBeTruthy()
  })
})

describe("getProPriceId", () => {
  it("throws when STRIPE_PRO_PRICE_ID is missing", () => {
    delete process.env.STRIPE_PRO_PRICE_ID
    expect(() => getProPriceId()).toThrow("STRIPE_PRO_PRICE_ID")
  })

  it("returns the configured price id", () => {
    expect(getProPriceId()).toBe("price_test_123")
  })
})

describe("getWebhookSecret", () => {
  it("throws when STRIPE_WEBHOOK_SECRET is missing", () => {
    delete process.env.STRIPE_WEBHOOK_SECRET
    expect(() => getWebhookSecret()).toThrow("STRIPE_WEBHOOK_SECRET")
  })

  it("returns the configured webhook secret", () => {
    expect(getWebhookSecret()).toBe("whsec_test_123")
  })
})

describe("getAppUrl", () => {
  it("defaults to localhost when NEXT_PUBLIC_APP_URL is unset", () => {
    expect(getAppUrl()).toBe("http://localhost:3000")
  })

  it("uses NEXT_PUBLIC_APP_URL when set", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://aiflow.example.com"
    expect(getAppUrl()).toBe("https://aiflow.example.com")
  })

  it("throws in production when NEXT_PUBLIC_APP_URL is unset", () => {
    vi.stubEnv("NODE_ENV", "production")
    try {
      expect(() => getAppUrl()).toThrow("NEXT_PUBLIC_APP_URL")
    } finally {
      vi.unstubAllEnvs()
    }
  })
})
