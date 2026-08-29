# Phase 10: Stripe Subscriptions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real Stripe billing to AIFlow — a Free plan (10 generations/month) and a Pro plan (500 generations/month, $19/month) via Stripe Checkout, with webhook-driven status sync, a pricing page, a working billing page, and an in-app cancel-at-period-end flow.

**Architecture:** A single sync function (`syncSubscriptionFromStripe`) is the only writer of Stripe data into the `Subscription` table, called from both the webhook route and the cancel Server Action. Checkout is Stripe-hosted (redirect-based, no client-side Stripe.js). `lib/usage.ts` (Phase 9) already reads `Subscription.status` for plan limits and needs no changes.

**Tech Stack:** Next.js Server Actions + Route Handlers, Prisma, `stripe` npm package (official Node SDK, v22.6.0 — already installed), Vitest.

**Spec:** `docs/superpowers/specs/2026-08-29-stripe-subscriptions-design.md`

## Global Constraints

- Free plan: 10 generations/month (`FREE_PLAN_MONTHLY_LIMIT` in `lib/usage.ts`, unchanged).
- Pro plan: 500 generations/month, $19/month (`PRO_PLAN_MONTHLY_LIMIT` in `lib/usage.ts`, unchanged).
- Cancellation is cancel-at-period-end: user keeps Pro access until `stripeCurrentPeriodEnd`, then reverts to Free automatically when Stripe fires `customer.subscription.deleted`.
- Never trust a client-submitted subscription/customer ID — every Server Action resolves "whose subscription" from `requireUser()`'s session.
- Webhook signature must be verified via `stripe.webhooks.constructEvent` before any DB write.
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` are read only in server-only files, lazily (at call time, not module load time) — mirrors the existing `lib/ai.ts` `getClient()` pattern so a missing key doesn't break `next build`.
- No Stripe Customer Portal, no reactivation flow, no proration/multi-tier logic — out of scope per the spec's YAGNI section.
- Code style: no semicolons, double quotes, matches existing files (`lib/usage.ts`, `lib/generation-service.ts`, `components/dashboard/rewrite-form.tsx`).
- Stripe SDK version installed: `stripe@^22.6.0`. Its API version has `current_period_end` on `Stripe.SubscriptionItem` (NOT top-level `Stripe.Subscription`), and `invoice.subscription` moved to `invoice.parent.subscription_details.subscription`. Use those exact paths — do not use the older top-level fields, they don't exist on this SDK version's types.

---

### Task 1: Stripe client config and DB schema field

**Files:**
- Modify: `prisma/schema.prisma` (Subscription model)
- Modify: `package.json` / `package-lock.json` (already done — `stripe@^22.6.0` is installed; running the install step again is a harmless no-op)
- Create: `lib/stripe.ts`
- Test: `lib/stripe.test.ts`

**Interfaces:**
- Produces: `getStripeClient(): Stripe`, `getProPriceId(): string`, `getWebhookSecret(): string`, `getAppUrl(): string` — all in `lib/stripe.ts`, all consumed by Tasks 2–6.
- Produces: `Subscription.cancelAtPeriodEnd: boolean` (Prisma field, default `false`) — consumed by Tasks 2, 4, 6.

- [ ] **Step 1: Add `cancelAtPeriodEnd` to the Subscription model**

Edit `prisma/schema.prisma` — in the `Subscription` model, change:

```prisma
  stripeCustomerId       String?   @unique
  stripeSubscriptionId   String?   @unique
  stripePriceId          String?
  stripeCurrentPeriodEnd DateTime?

  createdAt DateTime @default(now())
```

to:

```prisma
  stripeCustomerId       String?   @unique
  stripeSubscriptionId   String?   @unique
  stripePriceId          String?
  stripeCurrentPeriodEnd DateTime?
  cancelAtPeriodEnd      Boolean   @default(false)

  createdAt DateTime @default(now())
```

- [ ] **Step 2: Run the migration**

Run: `npx prisma migrate dev --name add_cancel_at_period_end`
Expected: A new folder under `prisma/migrations/` is created and the migration applies cleanly against `DIRECT_URL`.

- [ ] **Step 3: Confirm the `stripe` dependency is installed**

Run: `npm install stripe@^22.6.0`
Expected: `package.json` has `"stripe": "^22.6.0"` under `dependencies` (already present — this should report no changes).

- [ ] **Step 4: Create `lib/stripe.ts`**

```ts
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
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
}
```

- [ ] **Step 5: Write `lib/stripe.test.ts`**

```ts
import { describe, expect, it, beforeEach } from "vitest"

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
})
```

- [ ] **Step 6: Run the tests**

Run: `npx vitest run lib/stripe.test.ts`
Expected: All tests PASS.

- [ ] **Step 7: Typecheck**

Run: `npm run typecheck`
Expected: No errors (the regenerated Prisma client must include `cancelAtPeriodEnd`).

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma prisma/migrations package.json package-lock.json lib/stripe.ts lib/stripe.test.ts
git commit -m "feat: add Stripe client config and cancelAtPeriodEnd field"
```

---

### Task 2: Subscription sync service

**Files:**
- Create: `lib/subscription-service.ts`
- Test: `lib/subscription-service.test.ts`

**Interfaces:**
- Consumes: `db` from `@/lib/db` (existing Prisma client).
- Produces: `mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus`, `syncSubscriptionFromStripe(subscription: Stripe.Subscription, userId?: string): Promise<void>`, `getSubscriptionDetails(userId: string): Promise<{ cancelAtPeriodEnd: boolean; currentPeriodEnd: Date | null } | null>` — `syncSubscriptionFromStripe` consumed by Tasks 3 and 4; `getSubscriptionDetails` consumed by Task 6.

- [ ] **Step 1: Write the failing tests — `lib/subscription-service.test.ts`**

```ts
import { describe, expect, it, vi, beforeEach } from "vitest"

vi.mock("@/lib/db", () => ({
  db: {
    subscription: {
      findUnique: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
  },
}))

const { db } = await import("@/lib/db")
const { syncSubscriptionFromStripe, mapStripeStatus, getSubscriptionDetails } = await import(
  "@/lib/subscription-service"
)

function stripeSubscription(
  overrides: Partial<{
    id: string
    status: string
    customer: string
    cancel_at_period_end: boolean
    items: { data: Array<{ current_period_end: number; price: { id: string } }> }
  }> = {}
) {
  return {
    id: "sub_1",
    status: "active",
    customer: "cus_1",
    cancel_at_period_end: false,
    items: { data: [{ current_period_end: 1893456000, price: { id: "price_1" } }] },
    ...overrides,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe("mapStripeStatus", () => {
  it.each([
    ["active", "ACTIVE"],
    ["trialing", "TRIALING"],
    ["past_due", "PAST_DUE"],
    ["canceled", "CANCELED"],
    ["incomplete", "INCOMPLETE"],
    ["incomplete_expired", "INCOMPLETE_EXPIRED"],
    ["unpaid", "UNPAID"],
    ["paused", "CANCELED"],
  ] as const)("maps Stripe status %s to %s", (stripeStatus, expected) => {
    expect(mapStripeStatus(stripeStatus as never)).toBe(expected)
  })

  it("falls back to CANCELED for an unrecognized status", () => {
    expect(mapStripeStatus("some_future_status" as never)).toBe("CANCELED")
  })
})

describe("syncSubscriptionFromStripe", () => {
  it("updates an existing subscription row found by Stripe customer id", async () => {
    vi.mocked(db.subscription.findUnique).mockResolvedValue({ id: "row_1" } as never)

    await syncSubscriptionFromStripe(stripeSubscription() as never)

    expect(db.subscription.update).toHaveBeenCalledWith({
      where: { id: "row_1" },
      data: {
        status: "ACTIVE",
        stripeCustomerId: "cus_1",
        stripeSubscriptionId: "sub_1",
        stripePriceId: "price_1",
        stripeCurrentPeriodEnd: new Date(1893456000 * 1000),
        cancelAtPeriodEnd: false,
      },
    })
  })

  it("propagates cancelAtPeriodEnd from Stripe", async () => {
    vi.mocked(db.subscription.findUnique).mockResolvedValue({ id: "row_1" } as never)

    await syncSubscriptionFromStripe(stripeSubscription({ cancel_at_period_end: true }) as never)

    expect(db.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ cancelAtPeriodEnd: true }) })
    )
  })

  it("upserts by userId when no existing row matches the Stripe customer id", async () => {
    vi.mocked(db.subscription.findUnique).mockResolvedValue(null)

    await syncSubscriptionFromStripe(stripeSubscription() as never, "user_1")

    expect(db.subscription.upsert).toHaveBeenCalledWith({
      where: { userId: "user_1" },
      create: expect.objectContaining({ userId: "user_1", status: "ACTIVE" }),
      update: expect.objectContaining({ status: "ACTIVE" }),
    })
  })

  it("throws when no existing row matches and no userId is provided", async () => {
    vi.mocked(db.subscription.findUnique).mockResolvedValue(null)

    await expect(syncSubscriptionFromStripe(stripeSubscription() as never)).rejects.toThrow("sub_1")
  })
})

describe("getSubscriptionDetails", () => {
  it("returns null when the user has no subscription row", async () => {
    vi.mocked(db.subscription.findUnique).mockResolvedValue(null)

    expect(await getSubscriptionDetails("user_1")).toBeNull()
  })

  it("returns cancelAtPeriodEnd and currentPeriodEnd from the subscription row", async () => {
    const periodEnd = new Date("2026-09-29")
    vi.mocked(db.subscription.findUnique).mockResolvedValue({
      cancelAtPeriodEnd: true,
      stripeCurrentPeriodEnd: periodEnd,
    } as never)

    expect(await getSubscriptionDetails("user_1")).toEqual({
      cancelAtPeriodEnd: true,
      currentPeriodEnd: periodEnd,
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/subscription-service.test.ts`
Expected: FAIL with "Cannot find module '@/lib/subscription-service'" (file doesn't exist yet).

- [ ] **Step 3: Create `lib/subscription-service.ts`**

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/subscription-service.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add lib/subscription-service.ts lib/subscription-service.test.ts
git commit -m "feat: add Stripe subscription sync service"
```

---

### Task 3: Stripe webhook route handler

**Files:**
- Create: `app/api/webhooks/stripe/route.ts`
- Test: `app/api/webhooks/stripe/route.test.ts`

**Interfaces:**
- Consumes: `getStripeClient`, `getWebhookSecret` from `@/lib/stripe` (Task 1); `syncSubscriptionFromStripe` from `@/lib/subscription-service` (Task 2); `db` from `@/lib/db`.
- Produces: `POST(request: Request): Promise<Response>` — the live webhook endpoint at `/api/webhooks/stripe`, not consumed by other tasks (it's an external entry point) but exercised in Task 7's manual smoke test.

- [ ] **Step 1: Write the failing tests — `app/api/webhooks/stripe/route.test.ts`**

```ts
import { describe, expect, it, vi, beforeEach } from "vitest"

const constructEventMock = vi.fn()
const retrieveSubscriptionMock = vi.fn()

vi.mock("@/lib/stripe", () => ({
  getStripeClient: () => ({
    webhooks: { constructEvent: constructEventMock },
    subscriptions: { retrieve: retrieveSubscriptionMock },
  }),
  getWebhookSecret: () => "whsec_test_123",
}))

vi.mock("@/lib/subscription-service", () => ({
  syncSubscriptionFromStripe: vi.fn(),
}))

vi.mock("@/lib/db", () => ({
  db: {
    subscription: {
      updateMany: vi.fn(),
    },
  },
}))

const { syncSubscriptionFromStripe } = await import("@/lib/subscription-service")
const { db } = await import("@/lib/db")
const { POST } = await import("@/app/api/webhooks/stripe/route")

function makeRequest(body: string, signature: string | null = "test-signature"): Request {
  const headers = new Headers()
  if (signature) headers.set("stripe-signature", signature)
  return new Request("http://localhost:3000/api/webhooks/stripe", { method: "POST", headers, body })
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe("POST /api/webhooks/stripe", () => {
  it("returns 400 and does nothing when the stripe-signature header is missing", async () => {
    const response = await POST(makeRequest("{}", null))

    expect(response.status).toBe(400)
    expect(constructEventMock).not.toHaveBeenCalled()
  })

  it("returns 400 when signature verification fails", async () => {
    constructEventMock.mockImplementation(() => {
      throw new Error("bad signature")
    })

    const response = await POST(makeRequest("{}"))

    expect(response.status).toBe(400)
    expect(syncSubscriptionFromStripe).not.toHaveBeenCalled()
  })

  it("syncs the subscription on checkout.session.completed", async () => {
    constructEventMock.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: { subscription: "sub_1" } },
    })
    retrieveSubscriptionMock.mockResolvedValue({ id: "sub_1", status: "active" })

    const response = await POST(makeRequest("{}"))

    expect(retrieveSubscriptionMock).toHaveBeenCalledWith("sub_1")
    expect(syncSubscriptionFromStripe).toHaveBeenCalledWith({ id: "sub_1", status: "active" })
    expect(response.status).toBe(200)
  })

  it("does nothing on checkout.session.completed when there's no subscription id", async () => {
    constructEventMock.mockReturnValue({
      type: "checkout.session.completed",
      data: { object: { subscription: null } },
    })

    const response = await POST(makeRequest("{}"))

    expect(retrieveSubscriptionMock).not.toHaveBeenCalled()
    expect(syncSubscriptionFromStripe).not.toHaveBeenCalled()
    expect(response.status).toBe(200)
  })

  it.each(["customer.subscription.updated", "customer.subscription.deleted"] as const)(
    "syncs the subscription on %s",
    async (type) => {
      const subscriptionObject = { id: "sub_1", status: "canceled" }
      constructEventMock.mockReturnValue({ type, data: { object: subscriptionObject } })

      const response = await POST(makeRequest("{}"))

      expect(syncSubscriptionFromStripe).toHaveBeenCalledWith(subscriptionObject)
      expect(response.status).toBe(200)
    }
  )

  it("marks the subscription PAST_DUE on invoice.payment_failed", async () => {
    constructEventMock.mockReturnValue({
      type: "invoice.payment_failed",
      data: { object: { parent: { subscription_details: { subscription: "sub_1" } } } },
    })

    const response = await POST(makeRequest("{}"))

    expect(db.subscription.updateMany).toHaveBeenCalledWith({
      where: { stripeSubscriptionId: "sub_1" },
      data: { status: "PAST_DUE" },
    })
    expect(response.status).toBe(200)
  })

  it("acks unhandled event types without doing anything", async () => {
    constructEventMock.mockReturnValue({ type: "customer.updated", data: { object: {} } })

    const response = await POST(makeRequest("{}"))

    expect(response.status).toBe(200)
    expect(syncSubscriptionFromStripe).not.toHaveBeenCalled()
  })

  it("returns 500 when processing a handled event throws", async () => {
    constructEventMock.mockReturnValue({
      type: "customer.subscription.updated",
      data: { object: { id: "sub_1" } },
    })
    vi.mocked(syncSubscriptionFromStripe).mockRejectedValue(new Error("db down"))

    const response = await POST(makeRequest("{}"))

    expect(response.status).toBe(500)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run app/api/webhooks/stripe/route.test.ts`
Expected: FAIL with "Cannot find module '@/app/api/webhooks/stripe/route'".

- [ ] **Step 3: Create `app/api/webhooks/stripe/route.ts`**

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run app/api/webhooks/stripe/route.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add app/api/webhooks/stripe/route.ts app/api/webhooks/stripe/route.test.ts
git commit -m "feat: add Stripe webhook handler"
```

---

### Task 4: Billing Server Actions (checkout + cancel)

**Files:**
- Modify: `lib/usage.ts:6` (export `PRO_SUBSCRIPTION_STATUSES` instead of keeping it module-private)
- Create: `app/dashboard/billing/actions.ts`
- Test: `app/dashboard/billing/actions.test.ts`

**Interfaces:**
- Consumes: `requireUser` from `@/lib/auth-guard`; `db` from `@/lib/db`; `getStripeClient`, `getProPriceId`, `getAppUrl` from `@/lib/stripe` (Task 1); `syncSubscriptionFromStripe` from `@/lib/subscription-service` (Task 2); `PRO_SUBSCRIPTION_STATUSES` from `@/lib/usage`.
- Produces: `createCheckoutSessionAction(): Promise<void>` (redirects, never returns normally), `cancelSubscriptionAction(): Promise<CancelSubscriptionResult>` where `CancelSubscriptionResult = { ok: true } | { ok: false; error: string }` — both consumed by Task 6's UI.

- [ ] **Step 1: Export `PRO_SUBSCRIPTION_STATUSES` from `lib/usage.ts`**

In `lib/usage.ts`, change:

```ts
const PRO_SUBSCRIPTION_STATUSES = new Set(["ACTIVE", "TRIALING"])
```

to:

```ts
export const PRO_SUBSCRIPTION_STATUSES = new Set(["ACTIVE", "TRIALING"])
```

- [ ] **Step 2: Run the existing usage tests to confirm nothing broke**

Run: `npx vitest run lib/usage.test.ts`
Expected: All existing tests still PASS (this is a pure export addition, no behavior change).

- [ ] **Step 3: Write the failing tests — `app/dashboard/billing/actions.test.ts`**

```ts
import { describe, expect, it, vi, beforeEach } from "vitest"

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`)
  }),
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

vi.mock("@/lib/auth-guard", () => ({
  requireUser: vi.fn(),
}))

vi.mock("@/lib/db", () => ({
  db: {
    subscription: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}))

const stripeMock = {
  customers: { create: vi.fn() },
  checkout: { sessions: { create: vi.fn() } },
  subscriptions: { update: vi.fn() },
}

vi.mock("@/lib/stripe", () => ({
  getStripeClient: () => stripeMock,
  getProPriceId: () => "price_test_123",
  getAppUrl: () => "http://localhost:3000",
}))

vi.mock("@/lib/subscription-service", () => ({
  syncSubscriptionFromStripe: vi.fn(),
}))

const { redirect } = await import("next/navigation")
const { requireUser } = await import("@/lib/auth-guard")
const { db } = await import("@/lib/db")
const { syncSubscriptionFromStripe } = await import("@/lib/subscription-service")
const { createCheckoutSessionAction, cancelSubscriptionAction } = await import(
  "@/app/dashboard/billing/actions"
)

const mockedRequireUser = vi.mocked(requireUser)

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(redirect).mockImplementation((path: string) => {
    throw new Error(`REDIRECT:${path}`)
  })
  mockedRequireUser.mockResolvedValue({
    id: "user_1",
    name: "Jordan",
    email: "jordan@example.com",
    role: "USER",
  } as never)
})

describe("createCheckoutSessionAction", () => {
  it("redirects to billing without creating a session when already Pro", async () => {
    vi.mocked(db.subscription.findUnique).mockResolvedValue({
      id: "sub_row_1",
      userId: "user_1",
      status: "ACTIVE",
      stripeCustomerId: "cus_1",
    } as never)

    await expect(createCheckoutSessionAction()).rejects.toThrow("REDIRECT:/dashboard/billing")
    expect(stripeMock.checkout.sessions.create).not.toHaveBeenCalled()
  })

  it("creates a Stripe customer when the user doesn't have one yet, then redirects to Checkout", async () => {
    vi.mocked(db.subscription.findUnique).mockResolvedValue(null)
    stripeMock.customers.create.mockResolvedValue({ id: "cus_new" })
    stripeMock.checkout.sessions.create.mockResolvedValue({ url: "https://checkout.stripe.com/test" })

    await expect(createCheckoutSessionAction()).rejects.toThrow(
      "REDIRECT:https://checkout.stripe.com/test"
    )

    expect(stripeMock.customers.create).toHaveBeenCalledWith({
      email: "jordan@example.com",
      metadata: { userId: "user_1" },
    })
    expect(db.subscription.upsert).toHaveBeenCalledWith({
      where: { userId: "user_1" },
      create: { userId: "user_1", stripeCustomerId: "cus_new" },
      update: { stripeCustomerId: "cus_new" },
    })
    expect(stripeMock.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "subscription",
        customer: "cus_new",
        client_reference_id: "user_1",
        line_items: [{ price: "price_test_123", quantity: 1 }],
      })
    )
  })

  it("reuses an existing Stripe customer instead of creating a new one", async () => {
    vi.mocked(db.subscription.findUnique).mockResolvedValue({
      id: "sub_row_1",
      userId: "user_1",
      status: "FREE",
      stripeCustomerId: "cus_existing",
    } as never)
    stripeMock.checkout.sessions.create.mockResolvedValue({ url: "https://checkout.stripe.com/test" })

    await expect(createCheckoutSessionAction()).rejects.toThrow("REDIRECT:")

    expect(stripeMock.customers.create).not.toHaveBeenCalled()
    expect(stripeMock.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_existing" })
    )
  })

  it("throws when Stripe doesn't return a Checkout Session URL", async () => {
    vi.mocked(db.subscription.findUnique).mockResolvedValue({
      id: "sub_row_1",
      userId: "user_1",
      status: "FREE",
      stripeCustomerId: "cus_existing",
    } as never)
    stripeMock.checkout.sessions.create.mockResolvedValue({ url: null })

    await expect(createCheckoutSessionAction()).rejects.toThrow(
      "Stripe did not return a Checkout Session URL."
    )
  })
})

describe("cancelSubscriptionAction", () => {
  it("returns a typed error when there's no Stripe subscription on record", async () => {
    vi.mocked(db.subscription.findUnique).mockResolvedValue(null)

    const result = await cancelSubscriptionAction()

    expect(result).toEqual({ ok: false, error: "You don't have an active subscription to cancel." })
    expect(stripeMock.subscriptions.update).not.toHaveBeenCalled()
  })

  it("sets cancel_at_period_end on Stripe and syncs the result", async () => {
    vi.mocked(db.subscription.findUnique).mockResolvedValue({
      id: "sub_row_1",
      userId: "user_1",
      stripeSubscriptionId: "sub_1",
    } as never)
    const updatedSubscription = { id: "sub_1", cancel_at_period_end: true }
    stripeMock.subscriptions.update.mockResolvedValue(updatedSubscription)

    const result = await cancelSubscriptionAction()

    expect(stripeMock.subscriptions.update).toHaveBeenCalledWith("sub_1", { cancel_at_period_end: true })
    expect(syncSubscriptionFromStripe).toHaveBeenCalledWith(updatedSubscription)
    expect(result).toEqual({ ok: true })
  })

  it("returns a typed error when the Stripe API call fails", async () => {
    vi.mocked(db.subscription.findUnique).mockResolvedValue({
      id: "sub_row_1",
      userId: "user_1",
      stripeSubscriptionId: "sub_1",
    } as never)
    stripeMock.subscriptions.update.mockRejectedValue(new Error("Stripe is down"))

    const result = await cancelSubscriptionAction()

    expect(result).toEqual({
      ok: false,
      error: "Something went wrong while canceling your plan. Please try again.",
    })
  })
})
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `npx vitest run app/dashboard/billing/actions.test.ts`
Expected: FAIL with "Cannot find module '@/app/dashboard/billing/actions'".

- [ ] **Step 5: Create `app/dashboard/billing/actions.ts`**

```ts
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
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run app/dashboard/billing/actions.test.ts`
Expected: All tests PASS.

- [ ] **Step 7: Typecheck**

Run: `npm run typecheck`
Expected: No errors.

- [ ] **Step 8: Commit**

```bash
git add lib/usage.ts app/dashboard/billing/actions.ts app/dashboard/billing/actions.test.ts
git commit -m "feat: add checkout and cancellation Server Actions"
```

---

### Task 5: Shared pricing data + marketing pricing pages

**Files:**
- Create: `components/marketing/pricing-plans-data.ts`
- Modify: `components/marketing/pricing-preview.tsx` (full rewrite)
- Create: `app/(marketing)/pricing/page.tsx`
- Modify: `components/layout/navbar.tsx:9` (Pricing link)

**Interfaces:**
- Consumes: `FREE_PLAN_MONTHLY_LIMIT`, `PRO_PLAN_MONTHLY_LIMIT`, `PRO_SUBSCRIPTION_STATUSES` from `@/lib/usage`; `createCheckoutSessionAction` from `@/app/dashboard/billing/actions` (Task 4); `auth` from `@/lib/auth`; `db` from `@/lib/db`.
- Produces: `PRICING_PLANS: PricingPlan[]` (`PricingPlan = { id: "free" | "pro"; name: string; price: string; period?: string; description: string; features: string[] }`) — consumed by Task 6.

- [ ] **Step 1: Create `components/marketing/pricing-plans-data.ts`**

```ts
import { FREE_PLAN_MONTHLY_LIMIT, PRO_PLAN_MONTHLY_LIMIT } from "@/lib/usage"

export interface PricingPlan {
  id: "free" | "pro"
  name: string
  price: string
  period?: string
  description: string
  features: string[]
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    description: "Get started at no cost.",
    features: [
      `${FREE_PLAN_MONTHLY_LIMIT} AI generations / month`,
      "AI Writer, Rewriter & Chat",
      "Community support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$19",
    period: "/month",
    description: "For heavier, more frequent use.",
    features: [
      `${PRO_PLAN_MONTHLY_LIMIT} AI generations / month`,
      "AI Writer, Rewriter & Chat",
      "Priority support",
    ],
  },
]
```

- [ ] **Step 2: Rewrite `components/marketing/pricing-preview.tsx`**

Replace the entire file with:

```tsx
import Link from "next/link"
import { Check } from "lucide-react"

import { Container } from "@/components/layout/container"
import { SectionHeading } from "@/components/marketing/section-heading"
import { PRICING_PLANS } from "@/components/marketing/pricing-plans-data"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function PricingPreview() {
  return (
    <section id="pricing" className="border-t border-border py-24">
      <Container>
        <SectionHeading
          eyebrow="Pricing"
          title="Simple pricing that scales with you"
          description="Start free. Upgrade to Pro when you need more AI generations."
        />
        <div className="mx-auto mt-12 grid max-w-3xl gap-6 sm:grid-cols-2">
          {PRICING_PLANS.map((plan) => (
            <Card key={plan.id} className={cn(plan.id === "pro" && "ring-2 ring-primary")}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>{plan.name}</CardTitle>
                  {plan.id === "pro" ? <Badge>Most popular</Badge> : null}
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="flex items-baseline gap-1">
                  <span className="text-4xl font-semibold tracking-tight">{plan.price}</span>
                  {plan.period ? (
                    <span className="text-sm text-muted-foreground">{plan.period}</span>
                  ) : null}
                </p>
                <ul className="mt-6 flex flex-col gap-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="border-t-0 bg-transparent">
                <Button
                  className="w-full"
                  variant={plan.id === "pro" ? "default" : "outline"}
                  render={<Link href="/pricing" />}
                >
                  {plan.id === "pro" ? "Start free trial" : "Get started free"}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  )
}
```

- [ ] **Step 3: Create `app/(marketing)/pricing/page.tsx`**

```tsx
import type { Metadata } from "next"
import Link from "next/link"
import { Check } from "lucide-react"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { PRO_SUBSCRIPTION_STATUSES } from "@/lib/usage"
import { createCheckoutSessionAction } from "@/app/dashboard/billing/actions"
import { PRICING_PLANS } from "@/components/marketing/pricing-plans-data"
import { Container } from "@/components/layout/container"
import { SectionHeading } from "@/components/marketing/section-heading"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Pricing — AIFlow",
}

export default async function PricingPage() {
  const session = await auth()
  let isPro = false

  if (session?.user) {
    const subscription = await db.subscription.findUnique({
      where: { userId: session.user.id },
      select: { status: true },
    })
    isPro = subscription ? PRO_SUBSCRIPTION_STATUSES.has(subscription.status) : false
  }

  return (
    <div className="py-24">
      <Container>
        <SectionHeading
          eyebrow="Pricing"
          title="Simple pricing that scales with you"
          description="Start free. Upgrade to Pro when you need more AI generations."
        />
        <div className="mx-auto mt-12 grid max-w-3xl gap-6 sm:grid-cols-2">
          {PRICING_PLANS.map((plan) => {
            const isCurrent = session ? (plan.id === "pro") === isPro : false

            return (
              <Card key={plan.id} className={cn(plan.id === "pro" && "ring-2 ring-primary")}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CardTitle>{plan.name}</CardTitle>
                    {plan.id === "pro" ? <Badge>Most popular</Badge> : null}
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                  {isCurrent ? (
                    <CardAction>
                      <Badge variant="outline">Current plan</Badge>
                    </CardAction>
                  ) : null}
                </CardHeader>
                <CardContent>
                  <p className="flex items-baseline gap-1">
                    <span className="text-4xl font-semibold tracking-tight">{plan.price}</span>
                    {plan.period ? (
                      <span className="text-sm text-muted-foreground">{plan.period}</span>
                    ) : null}
                  </p>
                  <ul className="mt-6 flex flex-col gap-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="border-t-0 bg-transparent">
                  {!session ? (
                    <Button className="w-full" render={<Link href="/signup" />}>
                      {plan.id === "pro" ? "Start free trial" : "Get started free"}
                    </Button>
                  ) : plan.id === "pro" && !isPro ? (
                    <form action={createCheckoutSessionAction} className="w-full">
                      <Button type="submit" className="w-full">
                        Upgrade to Pro
                      </Button>
                    </form>
                  ) : null}
                </CardFooter>
              </Card>
            )
          })}
        </div>
      </Container>
    </div>
  )
}
```

- [ ] **Step 4: Point the navbar's Pricing link at the real page**

In `components/layout/navbar.tsx`, change:

```ts
  { href: "#pricing", label: "Pricing" },
```

to:

```ts
  { href: "/pricing", label: "Pricing" },
```

- [ ] **Step 5: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: No errors.

- [ ] **Step 6: Manually verify in the browser**

Run: `npm run dev`, then visit `http://localhost:3000/pricing` (logged out — should show "Get started free" / "Start free trial" both linking to `/signup`) and `http://localhost:3000` (scroll to the Pricing section — should show the same 2 real plans and link to `/pricing`).
Expected: Both pages render the Free and Pro plans with correct copy, no console errors.

- [ ] **Step 7: Commit**

```bash
git add components/marketing/pricing-plans-data.ts components/marketing/pricing-preview.tsx "app/(marketing)/pricing/page.tsx" components/layout/navbar.tsx
git commit -m "feat: add dedicated pricing page and real plans to homepage teaser"
```

---

### Task 6: Billing page wiring (upgrade, cancel, status)

**Files:**
- Create: `components/dashboard/cancel-plan-button.tsx`
- Modify: `app/dashboard/billing/page.tsx` (full rewrite)

**Interfaces:**
- Consumes: `checkUsageLimit` from `@/lib/usage`; `getSubscriptionDetails` from `@/lib/subscription-service` (Task 2); `createCheckoutSessionAction`, `cancelSubscriptionAction` from `@/app/dashboard/billing/actions` (Task 4); `PRICING_PLANS` from `@/components/marketing/pricing-plans-data` (Task 5).
- Produces: `<CancelPlanButton />` — a self-contained client component, no props, used only on the billing page.

- [ ] **Step 1: Create `components/dashboard/cancel-plan-button.tsx`**

```tsx
"use client"

import { useState, useTransition } from "react"
import { AlertTriangle, Loader2 } from "lucide-react"

import { cancelSubscriptionAction } from "@/app/dashboard/billing/actions"
import { Button } from "@/components/ui/button"

export function CancelPlanButton() {
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleCancel() {
    setError(null)
    startTransition(async () => {
      const result = await cancelSubscriptionAction()
      if (result.ok) {
        setConfirming(false)
      } else {
        setError(result.error)
      }
    })
  }

  if (!confirming) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setConfirming(true)}>
        Cancel plan
      </Button>
    )
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <p className="text-sm text-muted-foreground">
        You&apos;ll keep Pro access until the end of your current billing period. Cancel anyway?
      </p>
      {error ? (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}
      <div className="flex gap-2">
        <Button type="button" variant="destructive" size="sm" onClick={handleCancel} disabled={isPending}>
          {isPending ? <Loader2 className="animate-spin" /> : null}
          Yes, cancel plan
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setConfirming(false)}
          disabled={isPending}
        >
          Never mind
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Rewrite `app/dashboard/billing/page.tsx`**

Replace the entire file with:

```tsx
import type { Metadata } from "next"
import { Check, CreditCard, Download } from "lucide-react"

import { requireUser } from "@/lib/auth-guard"
import { checkUsageLimit } from "@/lib/usage"
import { getSubscriptionDetails } from "@/lib/subscription-service"
import { createCheckoutSessionAction } from "@/app/dashboard/billing/actions"
import { PRICING_PLANS } from "@/components/marketing/pricing-plans-data"
import { CancelPlanButton } from "@/components/dashboard/cancel-plan-button"
import { PageHeader } from "@/components/dashboard/page-header"
import { UsageCard } from "@/components/dashboard/usage-card"
import { EmptyState } from "@/components/dashboard/empty-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
} from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Billing — AIFlow",
}

export default async function BillingPage(props: PageProps<"/dashboard/billing">) {
  const user = await requireUser()
  const searchParams = await props.searchParams
  const checkoutStatus =
    typeof searchParams.checkout === "string" ? searchParams.checkout : undefined

  const [usage, subscriptionDetails] = await Promise.all([
    checkUsageLimit(user.id),
    getSubscriptionDetails(user.id),
  ])

  const isPro = usage.plan === "PRO"
  const isCanceling = Boolean(subscriptionDetails?.cancelAtPeriodEnd)
  const periodEndLabel = subscriptionDetails?.currentPeriodEnd
    ? subscriptionDetails.currentPeriodEnd.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null

  return (
    <>
      <PageHeader title="Billing" description="Manage your subscription and view invoices." />
      {checkoutStatus === "success" ? (
        <div className="rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm text-primary">
          You&apos;re now on the Pro plan. Thanks for upgrading!
        </div>
      ) : null}
      {checkoutStatus === "cancelled" ? (
        <div className="rounded-lg border border-border bg-muted p-3 text-sm text-muted-foreground">
          Checkout was cancelled. You&apos;re still on the Free plan.
        </div>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <UsageCard plan={usage.plan} used={usage.used} limit={usage.limit} remaining={usage.remaining} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
          {PRICING_PLANS.map((plan) => {
            const isCurrent = (plan.id === "pro") === isPro

            return (
              <Card key={plan.id}>
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  {isCurrent ? (
                    <CardAction>
                      <Badge variant="outline">Current plan</Badge>
                    </CardAction>
                  ) : null}
                </CardHeader>
                <CardContent>
                  <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <Check className="size-4 shrink-0 text-foreground" /> {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                {plan.id === "pro" && !isPro ? (
                  <CardFooter>
                    <form action={createCheckoutSessionAction} className="w-full">
                      <Button type="submit" className="w-full">
                        <CreditCard /> Upgrade to Pro
                      </Button>
                    </form>
                  </CardFooter>
                ) : null}
                {plan.id === "pro" && isPro ? (
                  <CardFooter className="flex-col items-start gap-2">
                    {isCanceling && periodEndLabel ? (
                      <p className="text-sm text-muted-foreground">
                        Cancels on {periodEndLabel}. You&apos;ll keep Pro access until then.
                      </p>
                    ) : (
                      <CancelPlanButton />
                    )}
                  </CardFooter>
                ) : null}
              </Card>
            )
          })}
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>Your billing history.</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Download}
            title="No invoices yet"
            description="Invoices will appear here after you upgrade to a paid plan."
          />
        </CardContent>
      </Card>
    </>
  )
}
```

- [ ] **Step 3: Typecheck and lint**

Run: `npm run typecheck && npm run lint`
Expected: No errors.

- [ ] **Step 4: Run the full test suite**

Run: `npm run test`
Expected: All tests PASS (including everything from Tasks 1–4).

- [ ] **Step 5: Commit**

```bash
git add components/dashboard/cancel-plan-button.tsx app/dashboard/billing/page.tsx
git commit -m "feat: wire billing page to real Stripe checkout and cancellation"
```

---

### Task 7: Final verification and manual smoke test

**Files:** None (verification only).

**Interfaces:** None — this task exercises the whole system built in Tasks 1–6.

- [ ] **Step 1: Add the missing env vars for local testing**

Add to `.env` (never commit — already gitignored via `.env*`):
```
STRIPE_WEBHOOK_SECRET=whsec_...   # from `stripe listen` below
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- [ ] **Step 2: Start the Stripe CLI webhook forwarder**

Run (in a separate terminal, keep it running): `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
Expected: It prints a `whsec_...` signing secret — copy it into `STRIPE_WEBHOOK_SECRET` in `.env` (Step 1) and restart `npm run dev` so it picks up the new value.

- [ ] **Step 3: Run the full verification suite**

Run: `npm run lint && npm run typecheck && npm run test && npm run build`
Expected: All four commands succeed with no errors.

- [ ] **Step 4: Manual smoke test — Free user**

Run: `npm run dev`, log in as a test user with no subscription.
Expected: `/dashboard/billing` shows the Free plan as current, 10/mo usage limit, and an "Upgrade to Pro" button on the Pro card.

- [ ] **Step 5: Manual smoke test — Checkout**

Click "Upgrade to Pro".
Expected: Redirected to a Stripe-hosted Checkout page for a $19/month subscription.

- [ ] **Step 6: Manual smoke test — Successful subscription**

Complete checkout with card `4242 4242 4242 4242`, any future expiry, any CVC.
Expected: Redirected back to `/dashboard/billing?checkout=success`, success banner shown.

- [ ] **Step 7: Manual smoke test — Webhook**

Check the `stripe listen` terminal output.
Expected: `checkout.session.completed` (and likely `customer.subscription.created`/`updated`) logged with a `200` response from the local server.

- [ ] **Step 8: Manual smoke test — Pro status**

Reload `/dashboard/billing`.
Expected: Pro card shows "Current plan" badge and a "Cancel plan" button; Free card shows no badge.

- [ ] **Step 9: Manual smoke test — Usage limit change**

Check the usage card.
Expected: Limit now reads out of 500 instead of 10.

- [ ] **Step 10: Manual smoke test — Cancellation**

Click "Cancel plan" → "Yes, cancel plan".
Expected: UI updates in place (no full reload needed) to show "Cancels on {date}. You'll keep Pro access until then." The `stripe listen` terminal shows a `customer.subscription.updated` event with `200`.

- [ ] **Step 11: Commit any `.env`-adjacent doc note if needed, otherwise finish**

If everything in Steps 3–10 passed, the phase is complete. No code changes are expected in this task — if any step fails, fix the responsible task above, re-run Step 3, and repeat the relevant manual step.
