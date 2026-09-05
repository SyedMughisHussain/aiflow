import type { Metadata } from "next"
import { Sparkles } from "lucide-react"

import { getAdminUsageStats, parsePageParam } from "@/lib/admin-service"
import { StatCard } from "@/components/dashboard/stat-card"
import { EmptyState } from "@/components/dashboard/empty-state"
import { PaginationControls } from "@/components/dashboard/pagination-controls"
import { UsageTrendChart } from "@/components/dashboard/usage-trend-chart"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Admin · Usage — Promptly",
}

export default async function AdminUsagePage(props: PageProps<"/dashboard/admin/usage">) {
  const searchParams = await props.searchParams
  const page = parsePageParam(searchParams.page)

  const stats = await getAdminUsageStats({ page })

  return (
    <div className="flex flex-col gap-4">
      <StatCard label="Total AI generations" value={stats.totalGenerations.toLocaleString()} icon={Sparkles} />

      <Card>
        <CardHeader>
          <CardTitle>Usage trends</CardTitle>
          <CardDescription>Monthly AI generations across all users, last 6 months.</CardDescription>
        </CardHeader>
        <CardContent>
          <UsageTrendChart data={stats.trends} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usage by user</CardTitle>
          <CardDescription>Users ranked by total generations.</CardDescription>
        </CardHeader>
        {stats.byUser.items.length === 0 ? (
          <CardContent>
            <EmptyState
              icon={Sparkles}
              title="No usage yet"
              description="Generation activity by user will appear here."
            />
          </CardContent>
        ) : (
          <CardContent className="overflow-x-auto px-0">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Generations</th>
                  <th className="px-4 py-3 font-medium">Tokens used</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stats.byUser.items.map((row) => (
                  <tr key={row.userId}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{row.userName ?? "Unnamed user"}</p>
                      <p className="text-xs text-muted-foreground">{row.userEmail}</p>
                    </td>
                    <td className="px-4 py-3">{row.generationCount.toLocaleString()}</td>
                    <td className="px-4 py-3">{row.tokensUsed.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        )}
      </Card>

      <PaginationControls
        page={stats.byUser.page}
        totalPages={stats.byUser.totalPages}
        basePath="/dashboard/admin/usage"
      />
    </div>
  )
}
