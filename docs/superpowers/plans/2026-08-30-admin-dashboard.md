# Admin Dashboard (Phase 11) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an admin-only dashboard section (overview metrics, users, subscriptions, usage) under `/dashboard/admin`, backed by server-side authorized Prisma queries.

**Architecture:** One new service module (`lib/admin-service.ts`) holds all read-only Prisma queries and pagination/parsing helpers, unit-tested with mocked `db`. A new `app/dashboard/admin/layout.tsx` runs `requireAdmin()` once and renders shared page chrome (header + tab nav) for four pages: overview (`/dashboard/admin`), users, subscriptions, and usage. Small presentational components (tabs, pagination, status badge, trend chart) are shared across pages, following the existing `components/dashboard/*` conventions.

**Tech Stack:** Next.js App Router (Server Components, async `searchParams`), Prisma, Tailwind, existing shadcn-style `components/ui/*` primitives, Vitest.

**Spec:** User's request — "Implement Phase 11: Admin dashboard" (routes `/admin`, `/admin/users`, `/admin/subscriptions`, `/admin/usage`; metrics: total users, active users, pro subscribers, total AI generations, monthly AI usage; users: search, pagination, status, subscription status; subscriptions: plan, status, billing info; usage: total generations, usage by user, usage trends; admin-only + server-side authorization; responsive UI; loading/empty/error states; no sensitive data exposure; run tests and build).

## Global Constraints

- Routes live under the existing `/dashboard/admin` segment (not top-level `/admin`), matching the codebase's existing `app/dashboard/admin/page.tsx` placeholder, the `adminNavItem` in `components/dashboard/nav-items.ts` (href `/dashboard/admin`), and `requireAdmin()` in `lib/auth-guard.ts`. Do not create a parallel top-level `/admin` tree or touch the sidebar/nav-items file — the existing nav already highlights on any `/dashboard/admin*` path.
- Admin authorization must be re-checked server-side against the DB on every admin page load — reuse `requireAdmin()` from `lib/auth-guard.ts` (already re-checks role from `db.user`, not the JWT). Never gate admin UI on a client-side check alone.
- Never display password hashes, verification tokens, or raw Stripe IDs (`stripeCustomerId`, `stripeSubscriptionId`, `stripePriceId`) in the UI. Only expose plan, status, and period/cancellation dates.
- Use TypeScript strictly; no `any`. Follow existing service-file conventions (see `lib/subscription-service.ts`, `lib/usage.ts`, `lib/user-service.ts`).
- Reuse `PRO_SUBSCRIPTION_STATUSES` from `lib/usage.ts` for "Pro" plan derivation — do not redefine that set.
- Reuse existing UI primitives (`Card`, `Badge`, `Button`, `Input`) and dashboard components (`PageHeader`, `StatCard`, `EmptyState`) rather than introducing new dependencies (no new npm packages, no charting library — build the usage trend chart as plain HTML/CSS per the dataviz skill).
- `app/dashboard/error.tsx` already provides a generic error boundary for the whole `/dashboard` segment — do not add per-route `error.tsx` files; unexpected errors in admin pages bubble to it automatically. Add per-route `loading.tsx` files since the existing `app/dashboard/loading.tsx` skeleton (4 stat cards + 2 panels) doesn't match the admin pages' layouts.
- All new `page.tsx` files use the `PageProps<"/dashboard/admin/...">` typed-route helper (see `app/dashboard/billing/page.tsx` for the pattern) with `searchParams` as a `Promise`. **Next's route-type generation only knows about a folder after a dev/build run has seen it** — after creating the four new route folders in Task 6, run `npm run build` once (or briefly `npm run dev` then stop it) before relying on `npm run typecheck` for Tasks 7–9, otherwise `tsc` will fail to resolve the new `PageProps<...>` literals.
- Test style: mock `@/lib/db` with `vi.mock`, `await import` the module under test, `vi.resetAllMocks()` in `beforeEach`, cast Prisma mock return shapes with `as never` — matching `lib/subscription-service.test.ts` / `lib/usage.test.ts`. Only the service layer gets unit tests; presentational components follow the existing convention of no test file (only `components/auth/logout-button.test.tsx` has one, for its confirm/loading interaction logic — none of the new components have comparable logic).

---

### Task 1: Admin metrics query + page-param parsing

**Files:**
- Create: `lib/admin-service.ts`
- Test: `lib/admin-service.test.ts`

**Interfaces:**
- Produces: `ADMIN_PAGE_SIZE: number`, `PaginatedResult<T>`, `parsePageParam(value: string | string[] | undefined): number`, `AdminMetrics`, `getAdminMetrics(): Promise<AdminMetrics>`. Later tasks append more exports to this same file.

- [ ] **Step 1: Write the failing tests**

Create `lib/admin-service.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from "vitest"

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    subscription: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    generation: {
      count: vi.fn(),
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
  },
}))

const { db } = await import("@/lib/db")
const { getAdminMetrics, parsePageParam } = await import("@/lib/admin-service")

beforeEach(() => {
  vi.resetAllMocks()
})

describe("parsePageParam", () => {
  it("defaults to page 1 when no value is given", () => {
    expect(parsePageParam(undefined)).toBe(1)
  })

  it("parses a valid numeric string", () => {
    expect(parsePageParam("3")).toBe(3)
  })

  it("takes the first value when given an array", () => {
    expect(parsePageParam(["2", "5"])).toBe(2)
  })

  it.each(["0", "-1", "abc", ""])("falls back to page 1 for invalid input %s", (value) => {
    expect(parsePageParam(value)).toBe(1)
  })

  it("floors a fractional page number", () => {
    expect(parsePageParam("2.9")).toBe(2)
  })
})

describe("getAdminMetrics", () => {
  it("aggregates totals from users, subscriptions, and generations", async () => {
    vi.mocked(db.user.count).mockResolvedValue(42)
    vi.mocked(db.generation.groupBy).mockResolvedValueOnce([{ userId: "u1" }, { userId: "u2" }] as never)
    vi.mocked(db.subscription.count).mockResolvedValue(7)
    vi.mocked(db.generation.count).mockResolvedValueOnce(500).mockResolvedValueOnce(30)

    const metrics = await getAdminMetrics()

    expect(metrics).toEqual({
      totalUsers: 42,
      activeUsers: 2,
      proSubscribers: 7,
      totalGenerations: 500,
      monthlyGenerations: 30,
    })
    expect(db.subscription.count).toHaveBeenCalledWith({
      where: { status: { in: ["ACTIVE", "TRIALING"] } },
    })
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- lib/admin-service.test.ts`
Expected: FAIL — `Cannot find module '@/lib/admin-service'`

- [ ] **Step 3: Create `lib/admin-service.ts` with the metrics query and shared helpers**

```ts
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
```

Reference types used below (`Role`, `Plan`, `TREND_MONTHS`, `addMonths`) are wired up by Tasks 2–4, which append to this same file.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- lib/admin-service.test.ts`
Expected: PASS (5 `parsePageParam` groups + 1 `getAdminMetrics` test, 9 assertions total)

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add lib/admin-service.ts lib/admin-service.test.ts
git commit -m "feat: add admin dashboard metrics query"
```

---

### Task 2: Admin users query (search + pagination + activity status)

**Files:**
- Modify: `lib/admin-service.ts` (append)
- Modify: `lib/admin-service.test.ts` (append)

**Interfaces:**
- Consumes: `db`, `ADMIN_PAGE_SIZE`, `buildPaginatedResult`, `daysAgo`, `ACTIVE_WINDOW_DAYS`, `PaginatedResult<T>` from Task 1.
- Produces: `AdminUserRow`, `getAdminUsers(params: { query?: string; page?: number }): Promise<PaginatedResult<AdminUserRow>>`.

- [ ] **Step 1: Write the failing tests**

Append to `lib/admin-service.test.ts` (extend the `vi.mock("@/lib/db", ...)` factory — it already declares `user.findMany` and `generation.groupBy`, so no mock changes needed):

```ts
const { getAdminUsers } = await import("@/lib/admin-service")

describe("getAdminUsers", () => {
  it("returns paginated users with computed status and subscription", async () => {
    vi.mocked(db.user.count).mockResolvedValue(1)
    vi.mocked(db.user.findMany).mockResolvedValue([
      {
        id: "user_1",
        name: "Jordan Lee",
        email: "jordan@example.com",
        role: "USER",
        createdAt: new Date("2026-01-01"),
        subscription: { status: "ACTIVE" },
      },
    ] as never)
    vi.mocked(db.generation.groupBy).mockResolvedValue([{ userId: "user_1" }] as never)

    const result = await getAdminUsers({ page: 1 })

    expect(result).toEqual({
      items: [
        {
          id: "user_1",
          name: "Jordan Lee",
          email: "jordan@example.com",
          role: "USER",
          createdAt: new Date("2026-01-01"),
          status: "active",
          subscriptionStatus: "ACTIVE",
        },
      ],
      page: 1,
      pageSize: 10,
      totalCount: 1,
      totalPages: 1,
    })
  })

  it("marks a user with no recent generations as inactive and defaults to the FREE plan", async () => {
    vi.mocked(db.user.count).mockResolvedValue(1)
    vi.mocked(db.user.findMany).mockResolvedValue([
      {
        id: "user_2",
        name: null,
        email: "quiet@example.com",
        role: "USER",
        createdAt: new Date("2026-01-01"),
        subscription: null,
      },
    ] as never)
    vi.mocked(db.generation.groupBy).mockResolvedValue([] as never)

    const result = await getAdminUsers({ page: 1 })

    expect(result.items[0].status).toBe("inactive")
    expect(result.items[0].subscriptionStatus).toBe("FREE")
  })

  it("filters by a search query across name and email", async () => {
    vi.mocked(db.user.count).mockResolvedValue(0)
    vi.mocked(db.user.findMany).mockResolvedValue([] as never)

    await getAdminUsers({ query: "jordan", page: 1 })

    expect(db.user.count).toHaveBeenCalledWith({
      where: {
        OR: [
          { name: { contains: "jordan", mode: "insensitive" } },
          { email: { contains: "jordan", mode: "insensitive" } },
        ],
      },
    })
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- lib/admin-service.test.ts`
Expected: FAIL — `getAdminUsers is not a function` / import error

- [ ] **Step 3: Append `getAdminUsers` to `lib/admin-service.ts`**

```ts
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- lib/admin-service.test.ts`
Expected: PASS (all `parsePageParam`, `getAdminMetrics`, and `getAdminUsers` tests green)

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add lib/admin-service.ts lib/admin-service.test.ts
git commit -m "feat: add admin users query with search and activity status"
```

---

### Task 3: Admin subscriptions query

**Files:**
- Modify: `lib/admin-service.ts` (append)
- Modify: `lib/admin-service.test.ts` (append)

**Interfaces:**
- Consumes: `db`, `ADMIN_PAGE_SIZE`, `buildPaginatedResult`, `PaginatedResult<T>`, `PRO_STATUSES`, `Plan` from Task 1.
- Produces: `AdminSubscriptionRow`, `getAdminSubscriptions(params: { page?: number }): Promise<PaginatedResult<AdminSubscriptionRow>>`.

- [ ] **Step 1: Write the failing test**

Append to `lib/admin-service.test.ts`:

```ts
const { getAdminSubscriptions } = await import("@/lib/admin-service")

describe("getAdminSubscriptions", () => {
  it("derives the plan from subscription status and never exposes raw Stripe IDs", async () => {
    vi.mocked(db.subscription.count).mockResolvedValue(2)
    vi.mocked(db.subscription.findMany).mockResolvedValue([
      {
        id: "sub_1",
        status: "ACTIVE",
        stripeCurrentPeriodEnd: new Date("2026-09-01"),
        cancelAtPeriodEnd: false,
        user: { name: "Jordan Lee", email: "jordan@example.com" },
      },
      {
        id: "sub_2",
        status: "CANCELED",
        stripeCurrentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        user: { name: null, email: "free@example.com" },
      },
    ] as never)

    const result = await getAdminSubscriptions({ page: 1 })

    expect(result.items).toEqual([
      {
        id: "sub_1",
        userName: "Jordan Lee",
        userEmail: "jordan@example.com",
        plan: "PRO",
        status: "ACTIVE",
        currentPeriodEnd: new Date("2026-09-01"),
        cancelAtPeriodEnd: false,
      },
      {
        id: "sub_2",
        userName: null,
        userEmail: "free@example.com",
        plan: "FREE",
        status: "CANCELED",
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      },
    ])
    expect(result.totalCount).toBe(2)
    expect(db.subscription.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          id: true,
          status: true,
          stripeCurrentPeriodEnd: true,
          cancelAtPeriodEnd: true,
        }),
      })
    )
    const selectArg = vi.mocked(db.subscription.findMany).mock.calls[0][0]?.select
    expect(selectArg).not.toHaveProperty("stripeCustomerId")
    expect(selectArg).not.toHaveProperty("stripeSubscriptionId")
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- lib/admin-service.test.ts`
Expected: FAIL — `getAdminSubscriptions is not a function`

- [ ] **Step 3: Append `getAdminSubscriptions` to `lib/admin-service.ts`**

```ts
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- lib/admin-service.test.ts`
Expected: PASS

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add lib/admin-service.ts lib/admin-service.test.ts
git commit -m "feat: add admin subscriptions query"
```

---

### Task 4: Admin usage stats query (totals, usage by user, monthly trend)

**Files:**
- Modify: `lib/admin-service.ts` (append)
- Modify: `lib/admin-service.test.ts` (append)

**Interfaces:**
- Consumes: `db`, `ADMIN_PAGE_SIZE`, `buildPaginatedResult`, `PaginatedResult<T>`, `TREND_MONTHS`, `addMonths` from Task 1.
- Produces: `AdminUsageByUserRow`, `UsageTrendPoint`, `AdminUsageStats`, `getAdminUsageStats(params: { page?: number }): Promise<AdminUsageStats>`.

- [ ] **Step 1: Write the failing tests**

Append to `lib/admin-service.test.ts`:

```ts
const { getAdminUsageStats } = await import("@/lib/admin-service")

describe("getAdminUsageStats", () => {
  it("returns totals, ranked usage by user, and a 6-month trend", async () => {
    vi.mocked(db.generation.count).mockResolvedValue(10)
    vi.mocked(db.generation.groupBy)
      .mockResolvedValueOnce([{ userId: "user_1" }] as never) // distinct users with any generation
      .mockResolvedValueOnce([
        { userId: "user_1", _count: { id: 10 }, _sum: { tokensUsed: 500 } },
      ] as never) // ranked page
    vi.mocked(db.generation.findMany).mockResolvedValue([
      { createdAt: new Date() },
      { createdAt: new Date() },
    ] as never)
    vi.mocked(db.user.findMany).mockResolvedValue([
      { id: "user_1", name: "Jordan Lee", email: "jordan@example.com" },
    ] as never)

    const stats = await getAdminUsageStats({ page: 1 })

    expect(stats.totalGenerations).toBe(10)
    expect(stats.byUser.items).toEqual([
      {
        userId: "user_1",
        userName: "Jordan Lee",
        userEmail: "jordan@example.com",
        generationCount: 10,
        tokensUsed: 500,
      },
    ])
    expect(stats.byUser.totalCount).toBe(1)
    expect(stats.trends).toHaveLength(6)
    expect(stats.trends.at(-1)?.count).toBe(2)
  })

  it("defaults tokensUsed to 0 when the sum is null", async () => {
    vi.mocked(db.generation.count).mockResolvedValue(0)
    vi.mocked(db.generation.groupBy)
      .mockResolvedValueOnce([{ userId: "user_1" }] as never)
      .mockResolvedValueOnce([
        { userId: "user_1", _count: { id: 1 }, _sum: { tokensUsed: null } },
      ] as never)
    vi.mocked(db.generation.findMany).mockResolvedValue([] as never)
    vi.mocked(db.user.findMany).mockResolvedValue([
      { id: "user_1", name: "Jordan Lee", email: "jordan@example.com" },
    ] as never)

    const stats = await getAdminUsageStats({ page: 1 })

    expect(stats.byUser.items[0].tokensUsed).toBe(0)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- lib/admin-service.test.ts`
Expected: FAIL — `getAdminUsageStats is not a function`

- [ ] **Step 3: Append `getAdminUsageStats` to `lib/admin-service.ts`**

```ts
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
```

- [ ] **Step 4: Run the full service test suite**

Run: `npm test -- lib/admin-service.test.ts`
Expected: PASS — all tests in the file green

- [ ] **Step 5: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add lib/admin-service.ts lib/admin-service.test.ts
git commit -m "feat: add admin usage stats query with monthly trend"
```

---

### Task 5: Shared admin UI components

**Files:**
- Create: `components/dashboard/admin-tabs.tsx`
- Create: `components/dashboard/pagination-controls.tsx`
- Create: `components/dashboard/subscription-status-badge.tsx`
- Create: `components/dashboard/usage-trend-chart.tsx`

**Interfaces:**
- Consumes: `Badge` (`components/ui/badge.tsx`), `Button` (`components/ui/button.tsx`), `SubscriptionStatus` type (`lib/generated/prisma/client`), `cn` (`lib/utils.ts`).
- Produces: `AdminTabs()`, `PaginationControls({ page, totalPages, basePath, extraParams? })`, `SubscriptionStatusBadge({ status })`, `UsageTrendChart({ data: { label: string; count: number }[] })` — all consumed by Tasks 6–9.

- [ ] **Step 1: Create `components/dashboard/admin-tabs.tsx`**

```tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

const ADMIN_TABS = [
  { href: "/dashboard/admin", label: "Overview" },
  { href: "/dashboard/admin/users", label: "Users" },
  { href: "/dashboard/admin/subscriptions", label: "Subscriptions" },
  { href: "/dashboard/admin/usage", label: "Usage" },
] as const

export function AdminTabs() {
  const pathname = usePathname()

  return (
    <div className="flex gap-1 overflow-x-auto border-b border-border">
      {ADMIN_TABS.map((tab) => {
        const active =
          tab.href === "/dashboard/admin" ? pathname === tab.href : pathname.startsWith(tab.href)

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "shrink-0 border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
              active && "border-primary text-foreground"
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Create `components/dashboard/pagination-controls.tsx`**

```tsx
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"

export function PaginationControls({
  page,
  totalPages,
  basePath,
  extraParams = {},
}: {
  page: number
  totalPages: number
  basePath: string
  extraParams?: Record<string, string | undefined>
}) {
  if (totalPages <= 1) return null

  function hrefFor(targetPage: number) {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(extraParams)) {
      if (value) params.set(key, value)
    }
    params.set("page", String(targetPage))
    return `${basePath}?${params.toString()}`
  }

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Button variant="outline" size="sm" render={<Link href={hrefFor(page - 1)} />}>
            <ChevronLeft /> Previous
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            <ChevronLeft /> Previous
          </Button>
        )}
        {page < totalPages ? (
          <Button variant="outline" size="sm" render={<Link href={hrefFor(page + 1)} />}>
            Next <ChevronRight />
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Next <ChevronRight />
          </Button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `components/dashboard/subscription-status-badge.tsx`**

```tsx
import { Badge } from "@/components/ui/badge"
import type { SubscriptionStatus } from "@/lib/generated/prisma/client"

const VARIANT_BY_STATUS: Record<SubscriptionStatus, "default" | "secondary" | "destructive" | "outline"> = {
  FREE: "outline",
  TRIALING: "default",
  ACTIVE: "default",
  PAST_DUE: "destructive",
  UNPAID: "destructive",
  CANCELED: "secondary",
  INCOMPLETE: "secondary",
  INCOMPLETE_EXPIRED: "secondary",
}

const LABEL_BY_STATUS: Record<SubscriptionStatus, string> = {
  FREE: "Free",
  TRIALING: "Trialing",
  ACTIVE: "Active",
  PAST_DUE: "Past due",
  UNPAID: "Unpaid",
  CANCELED: "Canceled",
  INCOMPLETE: "Incomplete",
  INCOMPLETE_EXPIRED: "Expired",
}

export function SubscriptionStatusBadge({ status }: { status: SubscriptionStatus }) {
  return <Badge variant={VARIANT_BY_STATUS[status]}>{LABEL_BY_STATUS[status]}</Badge>
}
```

- [ ] **Step 4: Create `components/dashboard/usage-trend-chart.tsx`**

A single-series (one hue, `bg-primary`) bar chart with a hover tooltip and an `sr-only` data table fallback, per the project's dataviz conventions (no legend needed for a single series; text stays in muted/foreground tokens, never the series color).

```tsx
"use client"

import { useState } from "react"

interface TrendPoint {
  label: string
  count: number
}

export function UsageTrendChart({ data }: { data: TrendPoint[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const max = Math.max(1, ...data.map((point) => point.count))

  return (
    <div>
      <div className="flex h-40 items-end gap-3">
        {data.map((point, index) => {
          const heightPct = point.count > 0 ? Math.max((point.count / max) * 100, 4) : 1

          return (
            <div key={point.label} className="relative flex flex-1 flex-col items-center gap-2">
              {activeIndex === index ? (
                <div className="absolute -top-8 rounded-md border border-border bg-popover px-2 py-1 text-xs font-medium whitespace-nowrap text-popover-foreground shadow-sm">
                  {point.count.toLocaleString()}
                </div>
              ) : null}
              <div
                className="flex w-full flex-1 items-end"
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                <div
                  className="w-full rounded-t-md bg-primary"
                  style={{ height: `${heightPct}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">{point.label}</span>
            </div>
          )
        })}
      </div>
      <table className="sr-only">
        <caption>Monthly AI generations</caption>
        <thead>
          <tr>
            <th>Month</th>
            <th>Generations</th>
          </tr>
        </thead>
        <tbody>
          {data.map((point) => (
            <tr key={point.label}>
              <td>{point.label}</td>
              <td>{point.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 5: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add components/dashboard/admin-tabs.tsx components/dashboard/pagination-controls.tsx components/dashboard/subscription-status-badge.tsx components/dashboard/usage-trend-chart.tsx
git commit -m "feat: add shared admin dashboard UI components"
```

---

### Task 6: Admin layout + overview page

**Files:**
- Create: `app/dashboard/admin/layout.tsx`
- Modify: `app/dashboard/admin/page.tsx` (replace placeholder)
- Create: `app/dashboard/admin/loading.tsx`

**Interfaces:**
- Consumes: `requireAdmin` (`lib/auth-guard.ts`), `getAdminMetrics` (`lib/admin-service.ts`, Task 1), `PageHeader`, `StatCard` (`components/dashboard/*`), `AdminTabs` (Task 5).

- [ ] **Step 1: Create `app/dashboard/admin/layout.tsx`**

```tsx
import type { ReactNode } from "react"

import { requireAdmin } from "@/lib/auth-guard"
import { PageHeader } from "@/components/dashboard/page-header"
import { AdminTabs } from "@/components/dashboard/admin-tabs"

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Admin" description="Manage users, subscriptions, and AI usage across AIFlow." />
      <AdminTabs />
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Replace `app/dashboard/admin/page.tsx`**

The layout now owns `requireAdmin()` and the page header, so the page itself only renders metrics.

```tsx
import type { Metadata } from "next"
import { Activity, CreditCard, Sparkles, TrendingUp, Users } from "lucide-react"

import { getAdminMetrics } from "@/lib/admin-service"
import { StatCard } from "@/components/dashboard/stat-card"

export const metadata: Metadata = {
  title: "Admin Overview — AIFlow",
}

export default async function AdminOverviewPage() {
  const metrics = await getAdminMetrics()

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard label="Total users" value={metrics.totalUsers.toLocaleString()} icon={Users} />
      <StatCard
        label="Active users"
        value={metrics.activeUsers.toLocaleString()}
        hint="Generated content in the last 30 days"
        icon={Activity}
      />
      <StatCard
        label="Pro subscribers"
        value={metrics.proSubscribers.toLocaleString()}
        icon={CreditCard}
      />
      <StatCard
        label="Total AI generations"
        value={metrics.totalGenerations.toLocaleString()}
        icon={Sparkles}
      />
      <StatCard
        label="Monthly AI usage"
        value={metrics.monthlyGenerations.toLocaleString()}
        hint="Generations so far this calendar month"
        icon={TrendingUp}
      />
    </div>
  )
}
```

- [ ] **Step 3: Create `app/dashboard/admin/loading.tsx`**

```tsx
export default function AdminOverviewLoading() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="h-28 animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Regenerate Next.js route types, then typecheck and lint**

Run: `npm run build`
Expected: build succeeds (this also regenerates `.next/types` for the new admin route segment, needed by `PageProps<...>` in Tasks 7–9)

Run: `npm run typecheck && npm run lint`
Expected: no errors

- [ ] **Step 5: Manually verify in the browser**

Run: `npm run dev`, sign in as a user with `role: ADMIN` (or promote a test user via `npx prisma studio`), visit `/dashboard/admin`. Expected: 5 stat cards render with real counts, the Admin tab row shows "Overview" active, and a non-admin user visiting `/dashboard/admin` is redirected to `/dashboard`.

- [ ] **Step 6: Commit**

```bash
git add app/dashboard/admin/layout.tsx app/dashboard/admin/page.tsx app/dashboard/admin/loading.tsx
git commit -m "feat: add admin overview page with dashboard metrics"
```

---

### Task 7: Admin users page

**Files:**
- Create: `app/dashboard/admin/users/page.tsx`
- Create: `app/dashboard/admin/users/loading.tsx`

**Interfaces:**
- Consumes: `getAdminUsers`, `parsePageParam` (Tasks 1–2), `EmptyState`, `PaginationControls`, `SubscriptionStatusBadge` (Task 5), `Badge`, `Button`, `Input`, `Card`, `CardContent`.

- [ ] **Step 1: Create `app/dashboard/admin/users/page.tsx`**

```tsx
import type { Metadata } from "next"
import { Users as UsersIcon } from "lucide-react"

import { getAdminUsers, parsePageParam } from "@/lib/admin-service"
import { EmptyState } from "@/components/dashboard/empty-state"
import { PaginationControls } from "@/components/dashboard/pagination-controls"
import { SubscriptionStatusBadge } from "@/components/dashboard/subscription-status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Admin · Users — AIFlow",
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date)
}

export default async function AdminUsersPage(props: PageProps<"/dashboard/admin/users">) {
  const searchParams = await props.searchParams
  const query = typeof searchParams.q === "string" ? searchParams.q.trim().slice(0, 200) : ""
  const page = parsePageParam(searchParams.page)

  const result = await getAdminUsers({ query: query || undefined, page })

  return (
    <div className="flex flex-col gap-4">
      <form className="flex gap-2" role="search">
        <Input
          type="search"
          name="q"
          placeholder="Search by name or email…"
          defaultValue={query}
          className="max-w-sm"
        />
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      {result.items.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title={query ? "No users found" : "No users yet"}
          description={
            query ? `No users match "${query}". Try a different search.` : "Users will appear here once they sign up."
          }
        />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto px-0">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Subscription</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result.items.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{user.name ?? "Unnamed user"}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={user.role === "ADMIN" ? "default" : "outline"}>{user.role}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={user.status === "active" ? "default" : "secondary"}>
                        {user.status === "active" ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <SubscriptionStatusBadge status={user.subscriptionStatus} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(user.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <PaginationControls
        page={result.page}
        totalPages={result.totalPages}
        basePath="/dashboard/admin/users"
        extraParams={{ q: query || undefined }}
      />
    </div>
  )
}
```

- [ ] **Step 2: Create `app/dashboard/admin/users/loading.tsx`**

```tsx
export default function AdminUsersLoading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-8 w-64 animate-pulse rounded-md bg-muted" />
      <div className="h-80 animate-pulse rounded-xl bg-muted" />
    </div>
  )
}
```

- [ ] **Step 3: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: no errors (route types for `/dashboard/admin/users` were generated by Task 6's `npm run build`)

- [ ] **Step 4: Manually verify in the browser**

Visit `/dashboard/admin/users` as an admin. Expected: table lists users with role/status/subscription badges and join dates (no password/Stripe IDs visible); typing a name/email into the search box and submitting filters the list and resets to page 1; with more than 10 users, pagination controls appear and page links preserve the search query; with zero matches, the empty state renders.

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/admin/users/page.tsx app/dashboard/admin/users/loading.tsx
git commit -m "feat: add admin users page with search and pagination"
```

---

### Task 8: Admin subscriptions page

**Files:**
- Create: `app/dashboard/admin/subscriptions/page.tsx`
- Create: `app/dashboard/admin/subscriptions/loading.tsx`

**Interfaces:**
- Consumes: `getAdminSubscriptions`, `parsePageParam` (Tasks 1, 3), `EmptyState`, `PaginationControls`, `SubscriptionStatusBadge` (Task 5), `Badge`, `Card`, `CardContent`.

- [ ] **Step 1: Create `app/dashboard/admin/subscriptions/page.tsx`**

```tsx
import type { Metadata } from "next"
import { CreditCard } from "lucide-react"

import { getAdminSubscriptions, parsePageParam } from "@/lib/admin-service"
import { EmptyState } from "@/components/dashboard/empty-state"
import { PaginationControls } from "@/components/dashboard/pagination-controls"
import { SubscriptionStatusBadge } from "@/components/dashboard/subscription-status-badge"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Admin · Subscriptions — AIFlow",
}

function formatDate(date: Date | null) {
  if (!date) return "—"
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date)
}

export default async function AdminSubscriptionsPage(props: PageProps<"/dashboard/admin/subscriptions">) {
  const searchParams = await props.searchParams
  const page = parsePageParam(searchParams.page)

  const result = await getAdminSubscriptions({ page })

  return (
    <div className="flex flex-col gap-4">
      {result.items.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No subscriptions yet"
          description="Subscription records will appear here once a user starts checkout."
        />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto px-0">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Billing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result.items.map((subscription) => (
                  <tr key={subscription.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{subscription.userName ?? "Unnamed user"}</p>
                      <p className="text-xs text-muted-foreground">{subscription.userEmail}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={subscription.plan === "PRO" ? "default" : "outline"}>
                        {subscription.plan === "PRO" ? "Pro" : "Free"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <SubscriptionStatusBadge status={subscription.status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {subscription.cancelAtPeriodEnd
                        ? `Cancels ${formatDate(subscription.currentPeriodEnd)}`
                        : subscription.currentPeriodEnd
                          ? `Renews ${formatDate(subscription.currentPeriodEnd)}`
                          : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <PaginationControls
        page={result.page}
        totalPages={result.totalPages}
        basePath="/dashboard/admin/subscriptions"
      />
    </div>
  )
}
```

- [ ] **Step 2: Create `app/dashboard/admin/subscriptions/loading.tsx`**

```tsx
export default function AdminSubscriptionsLoading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-80 animate-pulse rounded-xl bg-muted" />
    </div>
  )
}
```

- [ ] **Step 3: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: no errors

- [ ] **Step 4: Manually verify in the browser**

Visit `/dashboard/admin/subscriptions` as an admin. Expected: table lists subscription records with plan/status badges and a billing column showing "Renews <date>" or "Cancels <date>" (no raw Stripe customer/subscription IDs visible); empty state renders if no subscriptions exist yet.

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/admin/subscriptions/page.tsx app/dashboard/admin/subscriptions/loading.tsx
git commit -m "feat: add admin subscriptions page"
```

---

### Task 9: Admin usage page

**Files:**
- Create: `app/dashboard/admin/usage/page.tsx`
- Create: `app/dashboard/admin/usage/loading.tsx`

**Interfaces:**
- Consumes: `getAdminUsageStats`, `parsePageParam` (Tasks 1, 4), `StatCard`, `EmptyState`, `PaginationControls`, `UsageTrendChart` (Task 5), `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`.

- [ ] **Step 1: Create `app/dashboard/admin/usage/page.tsx`**

```tsx
import type { Metadata } from "next"
import { Sparkles } from "lucide-react"

import { getAdminUsageStats, parsePageParam } from "@/lib/admin-service"
import { StatCard } from "@/components/dashboard/stat-card"
import { EmptyState } from "@/components/dashboard/empty-state"
import { PaginationControls } from "@/components/dashboard/pagination-controls"
import { UsageTrendChart } from "@/components/dashboard/usage-trend-chart"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Admin · Usage — AIFlow",
}

export default async function AdminUsagePage(props: PageProps<"/dashboard/admin/usage">) {
  const searchParams = await props.searchParams
  const page = parsePageParam(searchParams.page)

  const stats = await getAdminUsageStats({ page })

  return (
    <div className="flex flex-col gap-4">
      <StatCard label="Total AI generations" value={stats.totalGenerations.toLocaleString()} icon={Sparkles} />

      <Card>
        <CardHeader>
          <CardTitle>Usage trends</CardTitle>
          <CardDescription>Monthly AI generations across all users, last 6 months.</CardDescription>
        </CardHeader>
        <CardContent>
          <UsageTrendChart data={stats.trends} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usage by user</CardTitle>
          <CardDescription>Users ranked by total generations.</CardDescription>
        </CardHeader>
        {stats.byUser.items.length === 0 ? (
          <CardContent>
            <EmptyState
              icon={Sparkles}
              title="No usage yet"
              description="Generation activity by user will appear here."
            />
          </CardContent>
        ) : (
          <CardContent className="overflow-x-auto px-0">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Generations</th>
                  <th className="px-4 py-3 font-medium">Tokens used</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stats.byUser.items.map((row) => (
                  <tr key={row.userId}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{row.userName ?? "Unnamed user"}</p>
                      <p className="text-xs text-muted-foreground">{row.userEmail}</p>
                    </td>
                    <td className="px-4 py-3">{row.generationCount.toLocaleString()}</td>
                    <td className="px-4 py-3">{row.tokensUsed.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        )}
      </Card>

      <PaginationControls
        page={stats.byUser.page}
        totalPages={stats.byUser.totalPages}
        basePath="/dashboard/admin/usage"
      />
    </div>
  )
}
```

- [ ] **Step 2: Create `app/dashboard/admin/usage/loading.tsx`**

```tsx
export default function AdminUsageLoading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-28 animate-pulse rounded-xl bg-muted" />
      <div className="h-56 animate-pulse rounded-xl bg-muted" />
      <div className="h-80 animate-pulse rounded-xl bg-muted" />
    </div>
  )
}
```

- [ ] **Step 3: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: no errors

- [ ] **Step 4: Manually verify in the browser**

Visit `/dashboard/admin/usage` as an admin. Expected: total generations stat card, a 6-month bar chart where hovering a bar shows its exact count in a tooltip, and a usage-by-user table ranked by generation count with pagination when there are more than 10 distinct users; empty state renders when there is no generation activity yet.

- [ ] **Step 5: Commit**

```bash
git add app/dashboard/admin/usage/page.tsx app/dashboard/admin/usage/loading.tsx
git commit -m "feat: add admin usage page with trends and per-user breakdown"
```

---

### Task 10: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run lint**

Run: `npm run lint`
Expected: no errors

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 3: Run the full test suite**

Run: `npm test`
Expected: all tests pass, including the new `lib/admin-service.test.ts` suite

- [ ] **Step 4: Run the production build**

Run: `npm run build`
Expected: build succeeds with no errors, including the four new `/dashboard/admin*` routes

- [ ] **Step 5: Manual end-to-end browser check**

Run: `npm run dev`. As an ADMIN user: click through Overview → Users → Subscriptions → Usage via the tabs; confirm active-tab highlighting, search + pagination on Users, and hover tooltips on the Usage trend chart; resize the browser to a mobile width and confirm tables scroll horizontally instead of breaking the layout. As a USER-role account: confirm visiting any `/dashboard/admin*` URL directly redirects to `/dashboard` (server-side, not just a hidden nav link).

- [ ] **Step 6: Fix any issues found, then summarize**

If any step fails, fix the root cause and re-run the failed step (and any step after it) before moving on. Once everything passes, summarize what was built and confirm no sensitive fields (passwords, verification tokens, raw Stripe IDs) are exposed anywhere in the admin UI.
