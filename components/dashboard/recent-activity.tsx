import Link from "next/link"
import { FileText, MessageSquare, Wand2, type LucideIcon } from "lucide-react"

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/dashboard/empty-state"
import type { HistoryItem } from "@/lib/dashboard-mock-data"

const toolMeta: Record<HistoryItem["tool"], { label: string; icon: LucideIcon }> = {
  writer: { label: "AI Writer", icon: FileText },
  chat: { label: "Chat", icon: MessageSquare },
  rewrite: { label: "Rewrite", icon: Wand2 },
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
    new Date(iso)
  )
}

export function RecentActivity({ items }: { items: HistoryItem[] }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
        <CardDescription>Your latest AI generations</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No activity yet"
            description="Generations from AI Writer, Chat, and Rewrite will show up here."
          />
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {items.map((item) => {
              const meta = toolMeta[item.tool]
              const Icon = meta.icon
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{meta.label}</p>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDate(item.createdAt)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
      {items.length > 0 ? (
        <CardFooter>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            render={<Link href="/dashboard/history" />}
          >
            View all activity
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  )
}
