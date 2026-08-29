import Stripe from "stripe"

let client: Stripe | null = null

export function getStripeClient(): Stripe {
  const apiKey = process.env.STRIPE_SECRET_KEY
  if (!apiKey) {
    throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY in the environment.")
  }
  client ??= new Stripe(apiKey)
  return client
}

export function getProPriceId(): string {
  const priceId = process.env.STRIPE_PRO_PRICE_ID
  if (!priceId) {
    throw new Error("Stripe is not configured. Set STRIPE_PRO_PRICE_ID in the environment.")
  }
  return priceId
}

export function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    throw new Error("Stripe is not configured. Set STRIPE_WEBHOOK_SECRET in the environment.")
  }
  return secret
}

export function getAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL
  if (url) return url

  if (process.env.NODE_ENV === "production") {
    throw new Error("Stripe is not configured. Set NEXT_PUBLIC_APP_URL in the environment.")
  }

  return "http://localhost:3000"
}
