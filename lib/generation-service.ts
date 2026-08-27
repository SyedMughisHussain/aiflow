import { z } from "zod"

import { db } from "@/lib/db"
import { composeRewritePrompt, composeUserPrompt, generateContent, generateRewrite } from "@/lib/ai"
import { checkUsageLimit, recordUsage, UsageLimitExceededError } from "@/lib/usage"
import type { RewriteMode } from "@/lib/generation-types"

export { UsageLimitExceededError }

const WRITER_TYPES = ["BLOG_POST", "PRODUCT_DESCRIPTION", "SOCIAL_MEDIA", "EMAIL", "AD_COPY"] as const

export const writerInputSchema = z.object({
  type: z.enum(WRITER_TYPES),
  topic: z
    .string()
    .trim()
    .min(3, "Topic must be at least 3 characters.")
    .max(200, "Topic must be under 200 characters."),
  instructions: z
    .string()
    .trim()
    .min(3, "Instructions must be at least 3 characters.")
    .max(2000, "Instructions must be under 2000 characters."),
  tone: z.string().trim().max(60, "Tone must be under 60 characters.").optional(),
})

export type WriterInput = z.infer<typeof writerInputSchema>

export interface WriterGenerationResult {
  id: string
  content: string
  tokensUsed: number
}

export async function createWriterGeneration(
  userId: string,
  input: WriterInput
): Promise<WriterGenerationResult> {
  const usage = await checkUsageLimit(userId)
  if (!usage.allowed) {
    throw new UsageLimitExceededError(usage.limit)
  }

  const result = await generateContent(input)

  const generation = await db.generation.create({
    data: {
      userId,
      type: input.type,
      prompt: composeUserPrompt(input),
      content: result.content,
      model: result.model,
      tokensUsed: result.tokensUsed,
    },
  })

  await recordUsage(userId, result.tokensUsed)

  return { id: generation.id, content: result.content, tokensUsed: result.tokensUsed }
}

const REWRITE_MODES = ["IMPROVE", "SHORTEN", "EXPAND", "PROFESSIONAL", "FRIENDLY"] as const satisfies readonly RewriteMode[]

export const rewriteInputSchema = z.object({
  mode: z.enum(REWRITE_MODES),
  text: z
    .string()
    .trim()
    .min(10, "Text must be at least 10 characters.")
    .max(5000, "Text must be under 5000 characters."),
})

export type RewriteInput = z.infer<typeof rewriteInputSchema>

export interface RewriteGenerationResult {
  id: string
  content: string
  tokensUsed: number
}

export async function createRewriteGeneration(
  userId: string,
  input: RewriteInput
): Promise<RewriteGenerationResult> {
  const usage = await checkUsageLimit(userId)
  if (!usage.allowed) {
    throw new UsageLimitExceededError(usage.limit)
  }

  const result = await generateRewrite(input)

  const generation = await db.generation.create({
    data: {
      userId,
      type: "REWRITE",
      prompt: composeRewritePrompt(input.text),
      content: result.content,
      model: result.model,
      tokensUsed: result.tokensUsed,
    },
  })

  await recordUsage(userId, result.tokensUsed)

  return { id: generation.id, content: result.content, tokensUsed: result.tokensUsed }
}
