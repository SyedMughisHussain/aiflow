# Phase 10: Stripe Subscriptions — Design Spec

Date: 2026-08-29

## Goal

Add real billing to AIFlow: a Free plan (10 generations/month, already the
default) and a Pro plan (500 generations/month, $19/month via Stripe
Checkout), with webhook-driven subscription status sync, a dedicated
pricing page, a working billing page, and an in-app cancellation flow.
Stripe test mode only for this phase.

Builds on Phase 9 (`lib/usage.ts`), which already reads
`Subscription.status` to pick between `FREE_PLAN_MONTHLY_LIMIT` (10) and
`PRO_PLAN_MONTHLY_LIMIT` (500) — that logic does not change.

## Plans

| Plan | Price | Generations/month |
|------|-------|--------------------|
| Free | $0    | 10                 |
| Pro  | $19/month | 500            |

## Current state (relevant to this phase)

- `prisma/schema.prisma` already has a `Subscription` model with
  `status: SubscriptionStatus`, `stripeCustomerId`, `stripeSubscriptionId`,
  `stripePriceId`, `stripeCurrentPeriodEnd` — but no `cancelAtPeriodEnd`.
- `.env` already has `STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`,
  `STRIPE_PRO_PRICE_ID`. It does **not** yet have `STRIPE_WEBHOOK_SECRET`
  or an app base URL var — both added in this phase.
- `stripe` npm package is not yet installed.
- `app/dashboard/billing/page.tsx` exists but the "Upgrade to Pro" button
  is `disabled` and there's no cancellation UI.
- `components/marketing/pricing-preview.tsx` shows 3 fictional tiers
  (Starter $0 / Pro $24 / Business $59) that don't match real plans.
- No dedicated `/pricing` route exists yet.
- No `app/api/webhooks/` route exists yet.

## Architecture

### New files

- **`lib/stripe.ts`** — Stripe SDK singleton (`new Stripe(...)`, apiVersion
  pinned), plus plan/price config re-exported from `lib/usage.ts`'s
  `FREE_PLAN_MONTHLY_LIMIT` / `PRO_PLAN_MONTHLY_LIMIT` so limits and
  pricing never drift apart. Exports `getAppUrl()` reading
  `NEXT_PUBLIC_APP_URL` (default `http://localhost:3000`) for building
  Checkout success/cancel URLs.

- **`lib/subscription-service.ts`** — `syncSubscriptionFromStripe(stripeSubscription, userId?)`:
  maps a Stripe `Subscription` object to our `Subscription` row (upsert by
  `stripeCustomerId` or `userId`), including a `STATUS_MAP` from Stripe's
  status strings (`active`, `trialing`, `past_due`, `canceled`,
  `incomplete`, `incomplete_expired`, `unpaid`) to our
  `SubscriptionStatus` enum, plus `stripeCurrentPeriodEnd` and
  `cancelAtPeriodEnd`. This is the **only** place that writes Stripe data
  into the DB — both the webhook handler and the cancel action call it,
  so behavior can't drift between the two paths.

- **`app/dashboard/billing/actions.ts`** — two Server Actions:
  - `createCheckoutSessionAction()`: `requireUser()`, loads/creates the
    user's `Subscription` row, creates or reuses a Stripe Customer
    (`stripeCustomerId` if present, else `stripe.customers.create({email,
    metadata: { userId }})` then persists the ID), short-circuits with a
    redirect to `/dashboard/billing` if already Pro, otherwise creates a
    Checkout Session (`mode: "subscription"`, `line_items: [{price:
    env.STRIPE_PRO_PRICE_ID, quantity: 1}]`, `client_reference_id: userId`,
    `success_url`, `cancel_url`) and `redirect(session.url)`.
  - `cancelSubscriptionAction()`: `requireUser()`, loads the user's
    `Subscription`, errors (returns a typed result, not a throw) if there's
    no `stripeSubscriptionId`, otherwise calls
    `stripe.subscriptions.update(id, { cancel_at_period_end: true })` and
    immediately calls `syncSubscriptionFromStripe` with the returned object
    for a responsive UI (webhook will also fire and reconcile — the sync
    function is idempotent).

- **`app/api/webhooks/stripe/route.ts`** — Route Handler (`POST`). Reads
  the raw body via `request.text()` (required for signature verification —
  must not run through any body-parsing middleware), verifies
  `stripe-signature` header via
  `stripe.webhooks.constructEvent(body, sig, env.STRIPE_WEBHOOK_SECRET)`.
  On signature failure: `400`, no DB writes, no secrets in the response
  body. Handles:
  - `checkout.session.completed` → retrieve the subscription
    (`stripe.subscriptions.retrieve(session.subscription)`), call
    `syncSubscriptionFromStripe`.
  - `customer.subscription.updated` → `syncSubscriptionFromStripe`.
  - `customer.subscription.deleted` → `syncSubscriptionFromStripe` (maps
    to `CANCELED`).
  - `invoice.payment_failed` → look up subscription by
    `invoice.subscription`, mark `PAST_DUE`.
  - Any other event type → `200`, no-op (per Stripe's recommendation, ack
    everything you don't handle).
  - Any thrown error while processing a handled event → log server-side,
    return `500` (Stripe retries automatically); never leak internal error
    detail in the response.

- **`app/(marketing)/pricing/page.tsx`** — dedicated pricing page.

- **`components/marketing/pricing-plans-data.ts`** — shared `Plan[]` data
  (Free / Pro, real prices and features) imported by both
  `pricing-preview.tsx` (homepage teaser) and the new `/pricing` page, so
  pricing is defined once.

### Changed files

- **`prisma/schema.prisma`** — add `cancelAtPeriodEnd Boolean @default(false)`
  to `Subscription`. New migration via `prisma migrate dev`.

- **`components/marketing/pricing-preview.tsx`** — replace the 3 fictional
  tiers with the real Free/Pro plans from the shared data file; "See full
  pricing" links to `/pricing`.

- **`app/dashboard/billing/page.tsx`** — wire "Upgrade to Pro" to
  `createCheckoutSessionAction` (form action). Add a "Cancel plan" button
  (with a confirm dialog) that calls `cancelSubscriptionAction`, visible
  only when Pro and not already `cancelAtPeriodEnd`. When
  `cancelAtPeriodEnd` is true, show "Cancels on {date}" instead of the
  cancel button.

- **`.env`** — add `STRIPE_WEBHOOK_SECRET` (from `stripe listen` locally)
  and `NEXT_PUBLIC_APP_URL=http://localhost:3000`. Never committed (already
  gitignored via `.env*`).

- **`package.json`** — add `stripe` dependency (official Node SDK; required
  server-side for Checkout Sessions and webhook signature verification —
  no other package in the existing stack provides this). No client-side
  Stripe.js needed since Checkout is a Stripe-hosted redirect.

## Data flow

1. User on `/pricing` or `/dashboard/billing` (Free plan) clicks "Upgrade
   to Pro" → `createCheckoutSessionAction` → Stripe-hosted Checkout.
2. On success, Stripe fires `checkout.session.completed` → webhook syncs
   `Subscription` (status `ACTIVE`, Stripe IDs, `stripeCurrentPeriodEnd`).
3. Renewals/cancellations/failures fire `customer.subscription.updated`,
   `customer.subscription.deleted`, `invoice.payment_failed` → same sync
   function keeps the DB row as a cache of Stripe (Stripe is the source of
   truth; DB is read for authorization/usage decisions so we never call
   Stripe synchronously on the hot path).
4. `lib/usage.ts` (`resolvePlan`) reads `Subscription.status` from the DB —
   unchanged from Phase 9.
5. User clicks "Cancel plan" → confirm dialog → `cancelSubscriptionAction`
   → Stripe `cancel_at_period_end: true` → DB synced immediately + webhook
   double-confirms. User keeps Pro access (500/mo limit) until
   `stripeCurrentPeriodEnd`, then Stripe cancels the subscription, firing
   `customer.subscription.deleted`, which syncs status to `CANCELED` and
   the user reverts to the Free limit (10/mo) automatically via
   `resolvePlan`.

## Security

- Webhook signature verified with `stripe.webhooks.constructEvent` using
  `STRIPE_WEBHOOK_SECRET` — never process an unverified payload.
- `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are read only in
  server-only files (`lib/stripe.ts`, the webhook route, Server Actions) —
  never imported by any Client Component.
- Server Actions never accept a subscription/customer ID as a parameter —
  they always resolve "whose subscription" from `requireUser()`'s session,
  so a client can't cancel or modify someone else's subscription.
- Subscription status used for authorization (usage limits) is always read
  from the DB, which is only ever written by `syncSubscriptionFromStripe`
  (webhook or our own post-cancel sync) — never trusted from a client
  request or query param.

## Error handling

- Checkout action: short-circuits (redirect, no session created) if the
  user already has an active/trialing subscription — prevents duplicate
  subscriptions.
- Cancel action: returns a typed error result (not a thrown exception) if
  there's no Stripe subscription on record, so the UI can show a message
  instead of a crash.
- Webhook: bad signature → 400 and stop; DB error during a handled event →
  500 so Stripe retries; unrecognized event type → 200 no-op.

## Testing

- Vitest unit tests (mocking the `stripe` SDK), following the existing
  `lib/usage.test.ts` style:
  - `lib/subscription-service.test.ts` — Stripe status string → our enum
    mapping (including edge cases like `incomplete_expired`, `unpaid`),
    `cancelAtPeriodEnd` propagation, `stripeCurrentPeriodEnd` conversion.
  - `app/api/webhooks/stripe/route.test.ts` — valid signature + each
    handled event type updates the DB as expected; invalid signature
    returns 400 and writes nothing; unhandled event type returns 200.
- Manual smoke test (Stripe test mode, card `4242 4242 4242 4242`, Stripe
  CLI forwarding webhooks to `localhost:3000/api/webhooks/stripe`):
  1. Free user sees 10/mo limit and locked Pro plan.
  2. Clicking Upgrade reaches Stripe Checkout.
  3. Completing checkout with the test card succeeds.
  4. Webhook event is received and processed (checked via `stripe listen`
     logs and/or server logs).
  5. Billing page reflects Pro status.
  6. Usage limit becomes 500/mo (verify via `checkUsageLimit`).
  7. Canceling shows "Cancels on {date}", and (optionally, by manually
     advancing time via the Stripe CLI/dashboard or triggering
     `customer.subscription.deleted`) reverts to Free/10 after the period
     ends.
- `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` all
  passing before considering the phase complete.

## Out of scope (YAGNI for this phase)

- Stripe Customer Portal (payment method updates, invoice history) — the
  existing "Invoices" empty state on the billing page stays as-is.
- Reactivating a subscription that's set to cancel at period end.
- Proration, upgrades/downgrades between paid tiers (only one paid tier
  exists).
- Team/seat-based billing.
