import type { Metadata } from "next"
import { Users as UsersIcon } from "lucide-react"

import { getAdminUsers, parsePageParam } from "@/lib/admin-service"
import { EmptyState } from "@/components/dashboard/empty-state"
import { PaginationControls } from "@/components/dashboard/pagination-controls"
import { SubscriptionStatusBadge } from "@/components/dashboard/subscription-status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Admin · Users — AIFlow",
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date)
}

export default async function AdminUsersPage(props: PageProps<"/dashboard/admin/users">) {
  const searchParams = await props.searchParams
  const query = typeof searchParams.q === "string" ? searchParams.q.trim().slice(0, 200) : ""
  const page = parsePageParam(searchParams.page)

  const result = await getAdminUsers({ query: query || undefined, page })

  return (
    <div className="flex flex-col gap-4">
      <form className="flex gap-2" role="search">
        <Input
          type="search"
          name="q"
          placeholder="Search by name or email…"
          defaultValue={query}
          className="max-w-sm"
        />
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      {result.items.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title={query ? "No users found" : "No users yet"}
          description={
            query ? `No users match "${query}". Try a different search.` : "Users will appear here once they sign up."
          }
        />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto px-0">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Subscription</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result.items.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{user.name ?? "Unnamed user"}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={user.role === "ADMIN" ? "default" : "outline"}>{user.role}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={user.status === "active" ? "default" : "secondary"}>
                        {user.status === "active" ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <SubscriptionStatusBadge status={user.subscriptionStatus} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(user.createdAt)}</td>
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
        basePath="/dashboard/admin/users"
        extraParams={{ q: query || undefined }}
      />
    </div>
  )
}
