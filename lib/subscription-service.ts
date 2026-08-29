import type Stripe from "stripe"

import { db } from "@/lib/db"
import type { SubscriptionStatus } from "@/lib/generated/prisma/client"

const STATUS_MAP: Record<string, SubscriptionStatus> = {
  active: "ACTIVE",
  trialing: "TRIALING",
  past_due: "PAST_DUE",
  canceled: "CANCELED",
  incomplete: "INCOMPLETE",
  incomplete_expired: "INCOMPLETE_EXPIRED",
  unpaid: "UNPAID",
  // Stripe pauses collection rather than canceling outright, but this app has
  // no paused state of its own — treat it like a cancellation so the user
  // reverts to the Free plan instead of staying stuck on Pro.
  paused: "CANCELED",
}

export function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  return STATUS_MAP[status] ?? "CANCELED"
}

function currentPeriodEndFrom(subscription: Stripe.Subscription): Date | null {
  const periodEnd = subscription.items.data[0]?.current_period_end
  return periodEnd ? new Date(periodEnd * 1000) : null
}

export async function syncSubscriptionFromStripe(
  subscription: Stripe.Subscription,
  userId?: string
): Promise<void> {
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id

  const data = {
    status: mapStripeStatus(subscription.status),
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    stripePriceId: subscription.items.data[0]?.price.id ?? null,
    stripeCurrentPeriodEnd: currentPeriodEndFrom(subscription),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  }

  const existing = await db.subscription.findUnique({ where: { stripeCustomerId: customerId } })

  if (existing) {
    await db.subscription.update({ where: { id: existing.id }, data })
    return
  }

  if (!userId) {
    throw new Error(
      `Cannot sync subscription ${subscription.id}: no existing row for Stripe customer ${customerId} and no userId provided.`
    )
  }

  await db.subscription.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  })
}

export interface SubscriptionDetails {
  cancelAtPeriodEnd: boolean
  currentPeriodEnd: Date | null
}

export async function getSubscriptionDetails(userId: string): Promise<SubscriptionDetails | null> {
  const subscription = await db.subscription.findUnique({
    where: { userId },
    select: { cancelAtPeriodEnd: true, stripeCurrentPeriodEnd: true },
  })

  if (!subscription) return null

  return {
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    currentPeriodEnd: subscription.stripeCurrentPeriodEnd,
  }
}
