"use server"

import { requireUser } from "@/lib/auth-guard"
import {
  createWriterGeneration,
  writerInputSchema,
  UsageLimitExceededError,
  type WriterInput,
} from "@/lib/generation-service"

export type GenerateWriterContentResult =
  | { ok: true; id: string; content: string; tokensUsed: number }
  | { ok: false; error: string }

export async function generateWriterContent(
  input: WriterInput
): Promise<GenerateWriterContentResult> {
  const user = await requireUser()

  const parsed = writerInputSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." }
  }

  try {
    const result = await createWriterGeneration(user.id, parsed.data)
    return { ok: true, ...result }
  } catch (err) {
    if (err instanceof UsageLimitExceededError) {
      return {
        ok: false,
        error: `You've reached your monthly limit of ${err.limit} generations. Upgrade your plan to continue.`,
      }
    }

    console.error("AI generation failed", err)
    return {
      ok: false,
      error: "Something went wrong while generating your content. Please try again.",
    }
  }
}
