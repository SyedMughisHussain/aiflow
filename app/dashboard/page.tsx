import type { Metadata } from "next"

import { requireUser } from "@/lib/auth-guard"
import { checkUsageLimit } from "@/lib/usage"
import { stats, recentActivity } from "@/lib/dashboard-mock-data"
import { PageHeader } from "@/components/dashboard/page-header"
import { StatCard } from "@/components/dashboard/stat-card"
import { UsageCard } from "@/components/dashboard/usage-card"
import { RecentActivity } from "@/components/dashboard/recent-activity"

export const metadata: Metadata = {
  title: "Dashboard — AIFlow",
}

export default async function DashboardPage() {
  const user = await requireUser()
  const usage = await checkUsageLimit(user.id)

  return (
    <>
      <PageHeader
        title={`Welcome back${user.name ? `, ${user.name}` : ""}`}
        description="Here's what's happening with your AI tools."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            hint={stat.hint}
            icon={stat.icon}
          />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <UsageCard
            plan={usage.plan}
            used={usage.used}
            limit={usage.limit}
            remaining={usage.remaining}
          />
        </div>
        <div className="lg:col-span-2">
          <RecentActivity items={recentActivity} />
        </div>
      </div>
    </>
  )
}
