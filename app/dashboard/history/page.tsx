import type { Metadata } from "next"
import { History as HistoryIcon } from "lucide-react"

import { requireUser } from "@/lib/auth-guard"
import { getGenerationHistory } from "@/lib/dashboard-service"
import { parsePageParam } from "@/lib/admin-service"
import { PageHeader } from "@/components/dashboard/page-header"
import { EmptyState } from "@/components/dashboard/empty-state"
import { PaginationControls } from "@/components/dashboard/pagination-controls"
import { GENERATION_TOOL_META } from "@/components/dashboard/generation-tool-meta"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "History — Promptly",
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

export default async function HistoryPage(props: PageProps<"/dashboard/history">) {
  const user = await requireUser()
  const searchParams = await props.searchParams
  const page = parsePageParam(searchParams.page)

  const history = await getGenerationHistory(user.id, page)

  return (
    <>
      <PageHeader title="History" description="A record of everything you've generated." />
      {history.items.length === 0 ? (
        <EmptyState
          icon={HistoryIcon}
          title="No activity yet"
          description="Generations from AI Writer and Rewrite will show up here."
        />
      ) : (
        <Card>
          <CardContent className="flex flex-col divide-y divide-border">
            {history.items.map((item) => {
              const meta = GENERATION_TOOL_META[item.tool]
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
                    <Badge variant="outline">{item.tokensUsed.toLocaleString()} tokens</Badge>
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
      <PaginationControls page={history.page} totalPages={history.totalPages} basePath="/dashboard/history" />
    </>
  )
}
