import type Stripe from "stripe"

import { db } from "@/lib/db"
import { getStripeClient, getWebhookSecret } from "@/lib/stripe"
import { syncSubscriptionFromStripe } from "@/lib/subscription-service"

export async function POST(request: Request): Promise<Response> {
  const body = await request.text()
  const signature = request.headers.get("stripe-signature")

  if (!signature) {
    return new Response("Missing Stripe signature", { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = getStripeClient().webhooks.constructEvent(body, signature, getWebhookSecret())
  } catch (err) {
    console.error("Stripe webhook signature verification failed", err)
    return new Response("Invalid signature", { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object
        if (typeof session.subscription === "string") {
          const subscription = await getStripeClient().subscriptions.retrieve(session.subscription)
          await syncSubscriptionFromStripe(subscription)
        }
        break
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await syncSubscriptionFromStripe(event.data.object)
        break
      }
      case "invoice.payment_failed": {
        const subscriptionRef = event.data.object.parent?.subscription_details?.subscription
        const subscriptionId =
          typeof subscriptionRef === "string" ? subscriptionRef : subscriptionRef?.id

        if (subscriptionId) {
          await db.subscription.updateMany({
            where: { stripeSubscriptionId: subscriptionId },
            data: { status: "PAST_DUE" },
          })
        }
        break
      }
      default:
        break
    }
  } catch (err) {
    console.error(`Failed to process Stripe webhook event ${event.type}`, err)
    return new Response("Webhook handler failed", { status: 500 })
  }

  return new Response(null, { status: 200 })
}
