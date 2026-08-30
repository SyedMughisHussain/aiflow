import type { Metadata } from "next"
import { CreditCard } from "lucide-react"

import { getAdminSubscriptions, parsePageParam } from "@/lib/admin-service"
import { EmptyState } from "@/components/dashboard/empty-state"
import { PaginationControls } from "@/components/dashboard/pagination-controls"
import { SubscriptionStatusBadge } from "@/components/dashboard/subscription-status-badge"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Admin · Subscriptions — AIFlow",
}

function formatDate(date: Date | null) {
  if (!date) return "—"
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date)
}

export default async function AdminSubscriptionsPage(props: PageProps<"/dashboard/admin/subscriptions">) {
  const searchParams = await props.searchParams
  const page = parsePageParam(searchParams.page)

  const result = await getAdminSubscriptions({ page })

  return (
    <div className="flex flex-col gap-4">
      {result.items.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No subscriptions yet"
          description="Subscription records will appear here once a user starts checkout."
        />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto px-0">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Billing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result.items.map((subscription) => (
                  <tr key={subscription.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{subscription.userName ?? "Unnamed user"}</p>
                      <p className="text-xs text-muted-foreground">{subscription.userEmail}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={subscription.plan === "PRO" ? "default" : "outline"}>
                        {subscription.plan === "PRO" ? "Pro" : "Free"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <SubscriptionStatusBadge status={subscription.status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {subscription.cancelAtPeriodEnd
                        ? `Cancels ${formatDate(subscription.currentPeriodEnd)}`
                        : subscription.currentPeriodEnd
                          ? `Renews ${formatDate(subscription.currentPeriodEnd)}`
                          : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <PaginationControls
        page={result.page}
        totalPages={result.totalPages}
        basePath="/dashboard/admin/subscriptions"
      />
    </div>
  )
}
