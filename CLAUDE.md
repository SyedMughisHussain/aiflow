# AIFlow — AI Content & Productivity SaaS

## What this is

A SaaS platform where users sign up, subscribe to a plan, and use AI tools
(content generator, chatbot, summarizer, rewriter, idea generator) from a
dashboard. Includes an admin panel for managing users/subscriptions/usage.

## Tech stack (locked — do not substitute without asking)

- Next.js 14+ App Router, TypeScript (strict mode)
- Tailwind CSS + shadcn/ui components
- PostgreSQL via Prisma ORM
- Auth.js (NextAuth v5) — credentials + email/password, JWT sessions
- Stripe — Checkout Sessions + Customer Portal + webhooks
- OpenAI API (or Anthropic API) for all AI features
- Resend for transactional email (password reset, welcome)
- Deployed on Vercel; DB on Neon

## Folder structure conventions

```
/app
  /(marketing)        -> landing page routes (public)
  /(auth)              -> signup, login, forgot-password
  /(dashboard)         -> protected app routes, behind middleware
  /(admin)              -> admin-only routes
  /api                 -> route handlers (webhooks, AI calls)
/components
  /ui                  -> shadcn components
  /marketing
  /dashboard
/lib
  /db.ts               -> Prisma client singleton
  /auth.ts             -> Auth.js config
  /stripe.ts           -> Stripe client + helpers
  /ai.ts               -> AI provider wrapper (one function per feature)
/prisma
  schema.prisma
```

## Database schema (initial)

```prisma
model User {
  id              String   @id @default(cuid())
  email           String   @unique
  passwordHash    String?
  name            String?
  plan            String   @default("free") // free | pro
  stripeCustomerId String? @unique
  createdAt       DateTime @default(now())
  generations     Generation[]
  usageLogs       UsageLog[]
}

model Subscription {
  id                String   @id @default(cuid())
  userId            String   @unique
  stripeSubId       String   @unique
  status            String   // active | canceled | past_due
  plan              String
  currentPeriodEnd  DateTime
}

model Generation {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  type        String   // content | chatbot | summarize | rewrite | ideas
  prompt      String
  output      String
  tokensUsed  Int
  createdAt   DateTime @default(now())
}

model UsageLog {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  feature     String
  count       Int      @default(0)
  periodStart DateTime
}
```

## Rules for Claude Code

- Use Server Actions for mutations where possible; API routes only for
  webhooks (Stripe) and AI streaming endpoints.
- Every AI feature call must log a UsageLog row and check the user's plan
  limit BEFORE calling the AI API (don't waste tokens on rejected requests).
- Never commit real API keys — always read from process.env, and confirm
  .env.local is in .gitignore.
- Keep components small; one feature = one folder under /components/dashboard.
- After finishing a phase, run `npm run build` to confirm no type errors
  before moving to the next phase.

## Build status (update this section as phases complete)

- [ ] Phase 1: Project scaffold + landing page
- [ ] Phase 2: Auth (signup/login/forgot-password/protected routes)
- [ ] Phase 3: DB schema + dashboard shell + usage stats UI
- [ ] Phase 4: AI content generator (full pattern: form -> API -> DB -> display)
- [ ] Phase 5: Remaining AI features (chatbot, summarizer, rewrite, ideas)
- [ ] Phase 6: Stripe integration (checkout, webhooks, plan gating)
- [ ] Phase 7: Admin panel
- [ ] Phase 8: Polish (loading/error/empty states, responsive pass)
