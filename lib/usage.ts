import { db } from "@/lib/db"

export const FREE_PLAN_MONTHLY_LIMIT = 10
export const PRO_PLAN_MONTHLY_LIMIT = 500

export const PRO_SUBSCRIPTION_STATUSES = new Set(["ACTIVE", "TRIALING"])

export type Plan = "FREE" | "PRO"

export class UsageLimitExceededError extends Error {
  constructor(public readonly limit: number) {
    super(`Monthly generation limit of ${limit} reached.`)
    this.name = "UsageLimitExceededError"
  }
}

export interface UsageStatus {
  used: number
  limit: number
  remaining: number
  allowed: boolean
  plan: Plan
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months)
  return result
}

async function getCurrentPeriodUsage(userId: string) {
  const now = new Date()

  // Upsert (not findUnique-then-create): two concurrent requests for a brand-new
  // user's first generation would otherwise both see no row and race to create one,
  // and the loser would crash with a unique-constraint error.
  const usage = await db.aIUsage.upsert({
    where: { userId },
    create: { userId, generationCount: 0, periodStart: now, periodEnd: addMonths(now, 1) },
    update: {},
  })

  if (usage.periodEnd && usage.periodEnd.getTime() <= now.getTime()) {
    return db.aIUsage.update({
      where: { userId },
      data: { generationCount: 0, tokensUsed: 0, periodStart: now, periodEnd: addMonths(now, 1) },
    })
  }

  return usage
}

async function resolvePlan(userId: string): Promise<{ plan: Plan; limit: number }> {
  const subscription = await db.subscription.findUnique({
    where: { userId },
    select: { status: true },
  })

  const isPro = subscription ? PRO_SUBSCRIPTION_STATUSES.has(subscription.status) : false

  return isPro
    ? { plan: "PRO", limit: PRO_PLAN_MONTHLY_LIMIT }
    : { plan: "FREE", limit: FREE_PLAN_MONTHLY_LIMIT }
}

// Point-in-time read for display (dashboard stats, usage cards, billing). Not the
// enforcement point — see reserveUsageSlot for that.
export async function checkUsageLimit(userId: string): Promise<UsageStatus> {
  const [usage, { plan, limit }] = await Promise.all([
    getCurrentPeriodUsage(userId),
    resolvePlan(userId),
  ])
  const used = usage.generationCount

  return { used, limit, remaining: Math.max(0, limit - used), allowed: used < limit, plan }
}

// Atomically reserves one generation slot for the caller's current period, throwing
// UsageLimitExceededError if they're already at their limit. Callers must call this
// BEFORE doing the (expensive/billable) work, and call releaseUsageSlot if that work
// then fails, so a failed attempt doesn't cost the user's quota.
//
// This is a single conditional UPDATE (generationCount incremented only WHERE it's
// still under the limit), not a separate read-then-write — that closes the race where
// concurrent requests could all pass a plain "used < limit" check before any of them
// records their usage, letting them collectively exceed the monthly cap.
export async function reserveUsageSlot(userId: string): Promise<void> {
  const [, { limit }] = await Promise.all([getCurrentPeriodUsage(userId), resolvePlan(userId)])

  const reserved = await db.aIUsage.updateMany({
    where: { userId, generationCount: { lt: limit } },
    data: { generationCount: { increment: 1 } },
  })

  if (reserved.count === 0) {
    throw new UsageLimitExceededError(limit)
  }
}

// Undoes a reservation from reserveUsageSlot when the work it was guarding failed.
export async function releaseUsageSlot(userId: string): Promise<void> {
  await db.aIUsage.update({
    where: { userId },
    data: { generationCount: { decrement: 1 } },
  })
}

export async function recordUsage(userId: string, tokensUsed: number): Promise<void> {
  await db.aIUsage.update({
    where: { userId },
    data: { tokensUsed: { increment: tokensUsed } },
  })
}
