import OpenAI from "openai"

import type { RewriteMode, WriterContentType } from "@/lib/generation-types"

const GROQ_BASE_URL = "https://api.groq.com/openai/v1"
const DEFAULT_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b"

let client: OpenAI | null = null

function getClient(): OpenAI {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    throw new Error("AI provider is not configured. Set GROQ_API_KEY in the environment.")
  }
  client ??= new OpenAI({ apiKey, baseURL: GROQ_BASE_URL })
  return client
}

const SYSTEM_PROMPTS: Record<WriterContentType, string> = {
  BLOG_POST:
    "You are an expert content writer. Write a well-structured, engaging blog post with a clear introduction, body, and conclusion. Use markdown headings where helpful.",
  PRODUCT_DESCRIPTION:
    "You are an expert e-commerce copywriter. Write a persuasive, concise product description that highlights benefits and features.",
  SOCIAL_MEDIA:
    "You are a social media copywriter. Write a short, engaging post optimized for engagement, including relevant hashtags if appropriate.",
  EMAIL:
    "You are an expert email copywriter. Write a clear, persuasive email with a subject line, greeting, body, and call to action.",
  AD_COPY:
    "You are an expert advertising copywriter. Write short, high-converting ad copy with a strong hook and call to action.",
}

export interface GenerateContentInput {
  type: WriterContentType
  topic: string
  instructions: string
  tone?: string
}

export interface GenerateContentResult {
  content: string
  model: string
  tokensUsed: number
}

interface CompletionMessage {
  role: "system" | "user" | "assistant"
  content: string
}

async function createCompletion(messages: CompletionMessage[]): Promise<GenerateContentResult> {
  const completion = await getClient().chat.completions.create({
    model: DEFAULT_MODEL,
    temperature: 0.7,
    messages,
  })

  const content = completion.choices[0]?.message?.content?.trim()
  if (!content) {
    throw new Error("The AI provider returned an empty response.")
  }

  return {
    content,
    model: completion.model,
    tokensUsed: completion.usage?.total_tokens ?? 0,
  }
}

export function composeUserPrompt({ topic, instructions, tone }: GenerateContentInput): string {
  const lines = [`Topic: ${topic}`, `Instructions: ${instructions}`]
  if (tone) lines.push(`Tone: ${tone}`)
  return lines.join("\n")
}

export async function generateContent(input: GenerateContentInput): Promise<GenerateContentResult> {
  return createCompletion([
    { role: "system", content: SYSTEM_PROMPTS[input.type] },
    { role: "user", content: composeUserPrompt(input) },
  ])
}

const REWRITE_SYSTEM_PROMPTS: Record<RewriteMode, string> = {
  IMPROVE:
    "You are an expert editor. Rewrite the given text to improve clarity, flow, and word choice while preserving its original meaning and length.",
  SHORTEN:
    "You are an expert editor. Rewrite the given text to be significantly more concise while preserving its key meaning.",
  EXPAND:
    "You are an expert editor. Rewrite the given text with more detail, explanation, and supporting points while preserving its original meaning.",
  PROFESSIONAL:
    "You are an expert editor. Rewrite the given text in a formal, professional tone suitable for business communication.",
  FRIENDLY:
    "You are an expert editor. Rewrite the given text in a warm, friendly, conversational tone.",
}

export interface GenerateRewriteInput {
  mode: RewriteMode
  text: string
}

export function composeRewritePrompt(text: string): string {
  return `Rewrite the following text:\n\n${text}`
}

export async function generateRewrite(input: GenerateRewriteInput): Promise<GenerateContentResult> {
  return createCompletion([
    { role: "system", content: REWRITE_SYSTEM_PROMPTS[input.mode] },
    { role: "user", content: composeRewritePrompt(input.text) },
  ])
}

const CHAT_SYSTEM_PROMPT =
  "You are AIFlow's AI assistant. Be helpful, clear, and concise in your responses."

export interface ChatHistoryMessage {
  role: "user" | "assistant"
  content: string
}

export async function generateChatReply(
  history: ChatHistoryMessage[]
): Promise<GenerateContentResult> {
  return createCompletion([
    { role: "system", content: CHAT_SYSTEM_PROMPT },
    ...history.map((message) => ({ role: message.role, content: message.content })),
  ])
}
