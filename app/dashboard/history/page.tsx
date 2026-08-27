import type { Metadata } from "next"
import { FileText, History as HistoryIcon, MessageSquare, Wand2, type LucideIcon } from "lucide-react"

import { requireUser } from "@/lib/auth-guard"
import { generationHistory, type HistoryItem } from "@/lib/dashboard-mock-data"
import { PageHeader } from "@/components/dashboard/page-header"
import { EmptyState } from "@/components/dashboard/empty-state"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "History — AIFlow",
}

const toolMeta: Record<HistoryItem["tool"], { label: string; icon: LucideIcon }> = {
  writer: { label: "AI Writer", icon: FileText },
  chat: { label: "Chat", icon: MessageSquare },
  rewrite: { label: "Rewrite", icon: Wand2 },
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso))
}

export default async function HistoryPage() {
  await requireUser()

  return (
    <>
      <PageHeader title="History" description="A record of everything you've generated." />
      {generationHistory.length === 0 ? (
        <EmptyState
          icon={HistoryIcon}
          title="No activity yet"
          description="Generations from AI Writer, Chat, and Rewrite will show up here."
        />
      ) : (
        <Card>
          <CardContent className="flex flex-col divide-y divide-border">
            {generationHistory.map((item) => {
              const meta = toolMeta[item.tool]
              const Icon = meta.icon
              return (
                <div
                  key={item.id}
                  className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <Icon className="size-4" />
                    </span>
                    <div>
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{meta.label}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pl-12 sm:pl-0">
                    <Badge variant="outline">{item.wordCount} words</Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(item.createdAt)}
                    </span>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}
    </>
  )
}
