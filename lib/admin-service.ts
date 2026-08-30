import { db } from "@/lib/db"
import type { Role, SubscriptionStatus } from "@/lib/generated/prisma/client"
import { PRO_SUBSCRIPTION_STATUSES, type Plan } from "@/lib/usage"

export const ADMIN_PAGE_SIZE = 10
const ACTIVE_WINDOW_DAYS = 30
const TREND_MONTHS = 6

const PRO_STATUSES = Array.from(PRO_SUBSCRIPTION_STATUSES) as SubscriptionStatus[]

export interface PaginatedResult<T> {
  items: T[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

function buildPaginatedResult<T>(items: T[], page: number, totalCount: number): PaginatedResult<T> {
  return {
    items,
    page,
    pageSize: ADMIN_PAGE_SIZE,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / ADMIN_PAGE_SIZE)),
  }
}

export function parsePageParam(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value
  const parsed = raw ? Number(raw) : NaN
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1)
}

// ---------------------------------------------------------------------------
// Dashboard metrics
// ---------------------------------------------------------------------------

export interface AdminMetrics {
  totalUsers: number
  activeUsers: number
  proSubscribers: number
  totalGenerations: number
  monthlyGenerations: number
}

export async function getAdminMetrics(): Promise<AdminMetrics> {
  const [totalUsers, activeUserRows, proSubscribers, totalGenerations, monthlyGenerations] =
    await Promise.all([
      db.user.count(),
      db.generation.groupBy({
        by: ["userId"],
        where: { createdAt: { gte: daysAgo(ACTIVE_WINDOW_DAYS) } },
      }),
      db.subscription.count({ where: { status: { in: PRO_STATUSES } } }),
      db.generation.count(),
      db.generation.count({ where: { createdAt: { gte: startOfMonth(new Date()) } } }),
    ])

  return {
    totalUsers,
    activeUsers: activeUserRows.length,
    proSubscribers,
    totalGenerations,
    monthlyGenerations,
  }
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export interface AdminUserRow {
  id: string
  name: string | null
  email: string
  role: Role
  createdAt: Date
  status: "active" | "inactive"
  subscriptionStatus: SubscriptionStatus
}

export async function getAdminUsers(params: {
  query?: string
  page?: number
}): Promise<PaginatedResult<AdminUserRow>> {
  const page = Math.max(1, params.page ?? 1)
  const query = params.query?.trim()

  const where = query
    ? {
        OR: [
          { name: { contains: query, mode: "insensitive" as const } },
          { email: { contains: query, mode: "insensitive" as const } },
        ],
      }
    : {}

  const [totalCount, users] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        subscription: { select: { status: true } },
      },
    }),
  ])

  const userIds = users.map((user) => user.id)
  const activeRows = userIds.length
    ? await db.generation.groupBy({
        by: ["userId"],
        where: { userId: { in: userIds }, createdAt: { gte: daysAgo(ACTIVE_WINDOW_DAYS) } },
      })
    : []
  const activeUserIds = new Set(activeRows.map((row) => row.userId))

  const items: AdminUserRow[] = users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    status: activeUserIds.has(user.id) ? "active" : "inactive",
    subscriptionStatus: user.subscription?.status ?? "FREE",
  }))

  return buildPaginatedResult(items, page, totalCount)
}

// ---------------------------------------------------------------------------
// Subscriptions
// ---------------------------------------------------------------------------

export interface AdminSubscriptionRow {
  id: string
  userName: string | null
  userEmail: string
  plan: Plan
  status: SubscriptionStatus
  currentPeriodEnd: Date | null
  cancelAtPeriodEnd: boolean
}

export async function getAdminSubscriptions(params: {
  page?: number
}): Promise<PaginatedResult<AdminSubscriptionRow>> {
  const page = Math.max(1, params.page ?? 1)

  const [totalCount, subscriptions] = await Promise.all([
    db.subscription.count(),
    db.subscription.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      select: {
        id: true,
        status: true,
        stripeCurrentPeriodEnd: true,
        cancelAtPeriodEnd: true,
        user: { select: { name: true, email: true } },
      },
    }),
  ])

  const items: AdminSubscriptionRow[] = subscriptions.map((subscription) => ({
    id: subscription.id,
    userName: subscription.user.name,
    userEmail: subscription.user.email,
    plan: PRO_STATUSES.includes(subscription.status) ? "PRO" : "FREE",
    status: subscription.status,
    currentPeriodEnd: subscription.stripeCurrentPeriodEnd,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
  }))

  return buildPaginatedResult(items, page, totalCount)
}

// ---------------------------------------------------------------------------
// Usage
// ---------------------------------------------------------------------------

export interface AdminUsageByUserRow {
  userId: string
  userName: string | null
  userEmail: string
  generationCount: number
  tokensUsed: number
}

export interface UsageTrendPoint {
  month: string
  label: string
  count: number
}

export interface AdminUsageStats {
  totalGenerations: number
  byUser: PaginatedResult<AdminUsageByUserRow>
  trends: UsageTrendPoint[]
}

function buildMonthlyTrend(dates: Date[], months: number): UsageTrendPoint[] {
  const now = new Date()
  const buckets: UsageTrendPoint[] = []

  for (let i = months - 1; i >= 0; i--) {
    const bucketDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const month = `${bucketDate.getFullYear()}-${String(bucketDate.getMonth() + 1).padStart(2, "0")}`
    const label = bucketDate.toLocaleDateString("en-US", { month: "short", year: "numeric" })
    buckets.push({ month, label, count: 0 })
  }

  const indexByMonth = new Map(buckets.map((bucket, index) => [bucket.month, index]))

  for (const date of dates) {
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
    const index = indexByMonth.get(month)
    if (index !== undefined) buckets[index].count += 1
  }

  return buckets
}

export async function getAdminUsageStats(params: { page?: number }): Promise<AdminUsageStats> {
  const page = Math.max(1, params.page ?? 1)

  const [totalGenerations, distinctUsers, ranked, trendGenerations] = await Promise.all([
    db.generation.count(),
    db.generation.groupBy({ by: ["userId"] }),
    db.generation.groupBy({
      by: ["userId"],
      _count: { id: true },
      _sum: { tokensUsed: true },
      orderBy: { _count: { id: "desc" } },
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
    }),
    db.generation.findMany({
      where: { createdAt: { gte: addMonths(new Date(), -(TREND_MONTHS - 1)) } },
      select: { createdAt: true },
    }),
  ])

  const userIds = ranked.map((row) => row.userId)
  const users = userIds.length
    ? await db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } })
    : []
  const userById = new Map(users.map((user) => [user.id, user]))

  const byUserItems: AdminUsageByUserRow[] = ranked.map((row) => {
    const user = userById.get(row.userId)
    return {
      userId: row.userId,
      userName: user?.name ?? null,
      userEmail: user?.email ?? "Unknown",
      generationCount: row._count.id,
      tokensUsed: row._sum.tokensUsed ?? 0,
    }
  })

  return {
    totalGenerations,
    byUser: buildPaginatedResult(byUserItems, page, distinctUsers.length),
    trends: buildMonthlyTrend(
      trendGenerations.map((generation) => generation.createdAt),
      TREND_MONTHS
    ),
  }
}
