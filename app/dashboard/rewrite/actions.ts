"use server"

import { requireUser } from "@/lib/auth-guard"
import {
  createRewriteGeneration,
  rewriteInputSchema,
  UsageLimitExceededError,
  type RewriteInput,
} from "@/lib/generation-service"

export type GenerateRewriteContentResult =
  | { ok: true; id: string; content: string; tokensUsed: number }
  | { ok: false; error: string }

export async function generateRewriteContent(
  input: RewriteInput
): Promise<GenerateRewriteContentResult> {
  const user = await requireUser()

  const parsed = rewriteInputSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." }
  }

  try {
    const result = await createRewriteGeneration(user.id, parsed.data)
    return { ok: true, ...result }
  } catch (err) {
    if (err instanceof UsageLimitExceededError) {
      return {
        ok: false,
        error: `You've reached your monthly limit of ${err.limit} generations. Upgrade your plan to continue.`,
      }
    }

    console.error("AI rewrite failed", err)
    return {
      ok: false,
      error: "Something went wrong while rewriting your text. Please try again.",
    }
  }
}
