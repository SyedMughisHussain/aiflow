import type { Metadata } from "next"
import { FileText, MessageSquare, Sparkles, Wand2 } from "lucide-react"

import { requireUser } from "@/lib/auth-guard"
import { checkUsageLimit } from "@/lib/usage"
import { getDashboardStats, getRecentActivity } from "@/lib/dashboard-service"
import { PageHeader } from "@/components/dashboard/page-header"
import { StatCard } from "@/components/dashboard/stat-card"
import { UsageCard } from "@/components/dashboard/usage-card"
import { RecentActivity } from "@/components/dashboard/recent-activity"

export const metadata: Metadata = {
  title: "Dashboard — AIFlow",
}

export default async function DashboardPage() {
  const user = await requireUser()
  // checkUsageLimit must resolve first: it creates the user's AIUsage row on first
  // access, and getDashboardStats reads that same row without creating it.
  const usage = await checkUsageLimit(user.id)
  const [stats, recentActivity] = await Promise.all([
    getDashboardStats(user.id),
    getRecentActivity(user.id),
  ])

  return (
    <>
      <PageHeader
        title={`Welcome back${user.name ? `, ${user.name}` : ""}`}
        description="Here's what's happening with your AI tools."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total generations"
          value={stats.totalGenerations.toLocaleString()}
          hint="All time, Writer + Rewrite"
          icon={FileText}
        />
        <StatCard
          label="Chat messages"
          value={stats.chatMessagesThisMonth.toLocaleString()}
          hint="This month"
          icon={MessageSquare}
        />
        <StatCard
          label="Tokens used"
          value={stats.tokensUsedThisMonth.toLocaleString()}
          hint="This month"
          icon={Wand2}
        />
        <StatCard
          label="Current plan"
          value={usage.plan === "PRO" ? "Pro" : "Free"}
          hint={usage.plan === "PRO" ? "Manage in Billing" : "Upgrade for more"}
          icon={Sparkles}
        />
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
