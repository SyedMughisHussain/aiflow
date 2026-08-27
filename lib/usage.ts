import { db } from "@/lib/db"

export const FREE_PLAN_MONTHLY_LIMIT = 10
export const PRO_PLAN_MONTHLY_LIMIT = 500

const PRO_SUBSCRIPTION_STATUSES = new Set(["ACTIVE", "TRIALING"])

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
  const usage = await db.aIUsage.findUnique({ where: { userId } })

  if (!usage) {
    return db.aIUsage.create({
      data: { userId, generationCount: 0, periodStart: now, periodEnd: addMonths(now, 1) },
    })
  }

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

export async function checkUsageLimit(userId: string): Promise<UsageStatus> {
  const [usage, { plan, limit }] = await Promise.all([
    getCurrentPeriodUsage(userId),
    resolvePlan(userId),
  ])
  const used = usage.generationCount

  return { used, limit, remaining: Math.max(0, limit - used), allowed: used < limit, plan }
}

export async function recordUsage(userId: string, tokensUsed: number): Promise<void> {
  await getCurrentPeriodUsage(userId)
  await db.aIUsage.update({
    where: { userId },
    data: {
      generationCount: { increment: 1 },
      tokensUsed: { increment: tokensUsed },
    },
  })
}
