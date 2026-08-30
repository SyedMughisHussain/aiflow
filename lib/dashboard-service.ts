import { db } from "@/lib/db"
import { truncate } from "@/lib/utils"

const TITLE_MAX_LENGTH = 60
const RECENT_ACTIVITY_LIMIT = 4
export const HISTORY_PAGE_SIZE = 10

export type GenerationTool = "writer" | "rewrite"

export interface GenerationHistoryItem {
  id: string
  tool: GenerationTool
  title: string
  tokensUsed: number
  createdAt: Date
}

interface GenerationRow {
  id: string
  type: string
  prompt: string
  tokensUsed: number | null
  createdAt: Date
}

function toHistoryItem(generation: GenerationRow): GenerationHistoryItem {
  return {
    id: generation.id,
    tool: generation.type === "REWRITE" ? "rewrite" : "writer",
    title: truncate(generation.prompt, TITLE_MAX_LENGTH),
    tokensUsed: generation.tokensUsed ?? 0,
    createdAt: generation.createdAt,
  }
}

const HISTORY_SELECT = {
  id: true,
  type: true,
  prompt: true,
  tokensUsed: true,
  createdAt: true,
} as const

export async function getRecentActivity(userId: string): Promise<GenerationHistoryItem[]> {
  const generations = await db.generation.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: RECENT_ACTIVITY_LIMIT,
    select: HISTORY_SELECT,
  })

  return generations.map(toHistoryItem)
}

export interface PagedGenerationHistory {
  items: GenerationHistoryItem[]
  page: number
  totalPages: number
}

export async function getGenerationHistory(userId: string, page: number): Promise<PagedGenerationHistory> {
  const safePage = Math.max(1, page)

  const [totalCount, generations] = await Promise.all([
    db.generation.count({ where: { userId } }),
    db.generation.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip: (safePage - 1) * HISTORY_PAGE_SIZE,
      take: HISTORY_PAGE_SIZE,
      select: HISTORY_SELECT,
    }),
  ])

  return {
    items: generations.map(toHistoryItem),
    page: safePage,
    totalPages: Math.max(1, Math.ceil(totalCount / HISTORY_PAGE_SIZE)),
  }
}

export interface DashboardStats {
  totalGenerations: number
  chatMessagesThisMonth: number
  tokensUsedThisMonth: number
}

function startOfCurrentMonth(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

// Callers must await `checkUsageLimit(userId)` before this, so the AIUsage row
// already exists and is rolled over to the current period by the time it's read here.
export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  const [totalGenerations, chatMessagesThisMonth, usage] = await Promise.all([
    db.generation.count({ where: { userId } }),
    db.chatMessage.count({
      where: { chat: { userId }, createdAt: { gte: startOfCurrentMonth() } },
    }),
    db.aIUsage.findUnique({ where: { userId }, select: { tokensUsed: true } }),
  ])

  return {
    totalGenerations,
    chatMessagesThisMonth,
    tokensUsedThisMonth: usage?.tokensUsed ?? 0,
  }
}
