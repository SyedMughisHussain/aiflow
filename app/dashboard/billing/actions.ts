"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

import { requireUser } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { getStripeClient, getProPriceId, getAppUrl } from "@/lib/stripe"
import { syncSubscriptionFromStripe } from "@/lib/subscription-service"
import { PRO_SUBSCRIPTION_STATUSES } from "@/lib/usage"

export async function createCheckoutSessionAction(): Promise<void> {
  const user = await requireUser()
  const stripe = getStripeClient()

  const subscription = await db.subscription.findUnique({ where: { userId: user.id } })

  if (subscription && PRO_SUBSCRIPTION_STATUSES.has(subscription.status)) {
    redirect("/dashboard/billing")
  }

  let customerId = subscription?.stripeCustomerId ?? null

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId: user.id },
    })
    customerId = customer.id

    await db.subscription.upsert({
      where: { userId: user.id },
      create: { userId: user.id, stripeCustomerId: customerId },
      update: { stripeCustomerId: customerId },
    })
  }

  const appUrl = getAppUrl()
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: user.id,
    line_items: [{ price: getProPriceId(), quantity: 1 }],
    success_url: `${appUrl}/dashboard/billing?checkout=success`,
    cancel_url: `${appUrl}/dashboard/billing?checkout=cancelled`,
  })

  if (!session.url) {
    throw new Error("Stripe did not return a Checkout Session URL.")
  }

  redirect(session.url)
}

export type CancelSubscriptionResult = { ok: true } | { ok: false; error: string }

export async function cancelSubscriptionAction(): Promise<CancelSubscriptionResult> {
  const user = await requireUser()
  const subscription = await db.subscription.findUnique({ where: { userId: user.id } })

  if (!subscription?.stripeSubscriptionId) {
    return { ok: false, error: "You don't have an active subscription to cancel." }
  }

  try {
    const stripe = getStripeClient()
    const updated = await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    })
    await syncSubscriptionFromStripe(updated)
    revalidatePath("/dashboard/billing")
    return { ok: true }
  } catch (err) {
    console.error("Failed to cancel subscription", err)
    return { ok: false, error: "Something went wrong while canceling your plan. Please try again." }
  }
}
