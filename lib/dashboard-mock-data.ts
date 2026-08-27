import { FileText, MessageSquare, Sparkles, Wand2, type LucideIcon } from "lucide-react"

export interface HistoryItem {
  id: string
  tool: "writer" | "chat" | "rewrite"
  title: string
  createdAt: string
  wordCount: number
}

export const generationHistory: HistoryItem[] = [
  {
    id: "1",
    tool: "writer",
    title: "Blog intro: Sustainable Fashion Trends",
    createdAt: "2026-08-25T14:32:00Z",
    wordCount: 512,
  },
  {
    id: "2",
    tool: "rewrite",
    title: "Product description — Wireless Headphones",
    createdAt: "2026-08-24T09:15:00Z",
    wordCount: 128,
  },
  {
    id: "3",
    tool: "chat",
    title: "Marketing copy brainstorm",
    createdAt: "2026-08-23T18:47:00Z",
    wordCount: 340,
  },
  {
    id: "4",
    tool: "writer",
    title: "Email newsletter draft — August roundup",
    createdAt: "2026-08-22T11:05:00Z",
    wordCount: 610,
  },
  {
    id: "5",
    tool: "rewrite",
    title: "About page tone pass",
    createdAt: "2026-08-20T16:02:00Z",
    wordCount: 245,
  },
  {
    id: "6",
    tool: "chat",
    title: "Feature launch messaging ideas",
    createdAt: "2026-08-18T08:41:00Z",
    wordCount: 190,
  },
  {
    id: "7",
    tool: "writer",
    title: "Landing page hero copy",
    createdAt: "2026-08-15T13:22:00Z",
    wordCount: 96,
  },
  {
    id: "8",
    tool: "rewrite",
    title: "Support macro clarity edit",
    createdAt: "2026-08-12T10:57:00Z",
    wordCount: 152,
  },
]

export const recentActivity: HistoryItem[] = generationHistory.slice(0, 4)

export interface StatItem {
  label: string
  value: string
  hint: string
  icon: LucideIcon
}

export const stats: StatItem[] = [
  { label: "Words generated", value: "12,480", hint: "This month", icon: FileText },
  { label: "Chat messages", value: "86", hint: "This month", icon: MessageSquare },
  { label: "Rewrites", value: "23", hint: "This month", icon: Wand2 },
  { label: "Active plan", value: "Free", hint: "Upgrade for more", icon: Sparkles },
]
