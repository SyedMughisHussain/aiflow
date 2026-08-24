# AIFlow - Project Instructions

## 1. Project Overview

AIFlow is a production-quality AI-powered SaaS platform for content creation and productivity.

The project is being built as:

- A real portfolio project
- A Fiverr showcase project
- A learning project for full-stack and AI development

The application should feel like a real commercial SaaS product, not a tutorial/demo application.

---

## 2. Tech Stack

### Frontend

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui

### Backend

- Next.js Server Components
- Server Actions where appropriate
- Route Handlers for API/webhook endpoints

### Database

- PostgreSQL
- Prisma ORM

### Authentication

- Auth.js

### AI

- OpenAI API

### Payments

- Stripe

---

## 3. Architecture

Use a simple, scalable architecture.

Keep responsibilities separated:

- UI components → components/
- Pages/routes → app/
- Database → lib/db.ts and prisma/
- Authentication → lib/auth.ts
- AI integration → lib/ai.ts
- Stripe → lib/stripe.ts
- Shared utilities → lib/utils.ts
- Shared types → types/

Do not put business logic directly into UI components when it can be placed in a reusable service or utility.

---

## 4. Project Structure

Use this general structure:

app/
components/
lib/
prisma/
public/
types/

Create additional folders only when they are actually needed.

Do not create unnecessary abstractions or empty folders.

---

## 5. Coding Rules

- Use TypeScript.
- Avoid `any` unless absolutely necessary.
- Prefer server-side logic for sensitive operations.
- Use reusable components.
- Avoid duplicated code.
- Keep components focused.
- Use meaningful variable and function names.
- Prefer simple solutions over unnecessary abstractions.
- Do not introduce dependencies unless they provide clear value.
- Follow existing project conventions.

---

## 6. UI/UX Rules

The UI should feel like a premium modern SaaS product.

Requirements:

- Responsive
- Clean typography
- Consistent spacing
- Accessible controls
- Professional navigation
- Good empty states
- Good loading states
- Good error states
- Mobile friendly
- Light and dark mode where appropriate

Avoid:

- Excessive animations
- Excessive gradients
- Generic AI-generated-looking layouts
- Unnecessary visual effects
- Placeholder content in final UI

---

## 7. Authentication & Authorization

Never trust the client for authorization.

Protected resources must be checked server-side.

Roles:

- USER
- ADMIN

Users must never be able to access admin functionality.

Sensitive operations must run server-side.

---

## 8. Security

Never expose:

- API keys
- Database credentials
- Stripe secrets
- Authentication secrets

Use environment variables.

Validate user input on the server.

Never trust client-provided:

- User IDs
- Roles
- Subscription status
- Usage limits
- Payment status

Verify Stripe webhooks using Stripe's official signature verification.

---

## 9. AI Rules

All OpenAI API calls must happen server-side.

Do not expose the OpenAI API key to the browser.

AI requests must:

- Validate input
- Check authentication
- Check usage limits
- Handle errors
- Track usage
- Save relevant history

Never allow users to bypass usage limits through client-side values.

---

## 10. Database Rules

Use Prisma for database access.

Use proper:

- Relations
- Indexes
- Constraints
- Unique fields

Do not put raw database logic inside UI components.

Database changes must use Prisma migrations.

---

## 11. API Rules

API endpoints must:

- Validate input
- Check authentication
- Check authorization
- Return consistent responses
- Handle errors safely
- Never expose internal errors or secrets

---

## 12. Testing & Verification

After implementing a feature:

1. Run lint.
2. Run typecheck.
3. Run relevant tests.
4. Run production build when appropriate.
5. Fix errors before considering the feature complete.

Do not claim a feature is complete if verification has not been performed.

---

## 13. Development Workflow

For large features:

1. Inspect the existing code.
2. Explain the relevant architecture.
3. Create a plan.
4. Implement in small steps.
5. Verify each step.
6. Review the implementation.
7. Fix issues.
8. Summarize changes.

Do not modify unrelated files.

Do not refactor unrelated code while implementing a feature.

---

## 14. Dependencies

Before installing a new dependency:

- Check whether the existing stack can solve the problem.
- Prefer existing dependencies.
- If a new package is necessary, explain why before installing it.

---

## 15. Git

Use small, meaningful commits.

Preferred format:

feat: add AI writer
feat: add authentication
feat: add usage tracking
fix: handle AI generation error

Do not commit:

- .env.local
- API keys
- secrets
- generated sensitive files

---

## 16. Important Rule

Do not build the entire application in one task.

Implement the project phase-by-phase.

Before starting a new phase:

- Verify the previous phase.
- Keep the existing functionality working.
- Do not unnecessarily rewrite working code.

---

## 17. Current Project Goal

The immediate goal is to build a polished AI SaaS MVP that can be showcased on Fiverr.

Prioritize:

1. Quality
2. Reliability
3. Professional UI
4. Real functionality
5. Clean architecture

Do not prioritize unnecessary features over a polished core product.
