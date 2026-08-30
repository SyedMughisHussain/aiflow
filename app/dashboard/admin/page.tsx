import type { Metadata } from "next"
import { Activity, CreditCard, Sparkles, TrendingUp, Users } from "lucide-react"

import { getAdminMetrics } from "@/lib/admin-service"
import { StatCard } from "@/components/dashboard/stat-card"

export const metadata: Metadata = {
  title: "Admin Overview — AIFlow",
}

export default async function AdminOverviewPage() {
  const metrics = await getAdminMetrics()

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard label="Total users" value={metrics.totalUsers.toLocaleString()} icon={Users} />
      <StatCard
        label="Active users"
        value={metrics.activeUsers.toLocaleString()}
        hint="Generated content in the last 30 days"
        icon={Activity}
      />
      <StatCard
        label="Pro subscribers"
        value={metrics.proSubscribers.toLocaleString()}
        icon={CreditCard}
      />
      <StatCard
        label="Total AI generations"
        value={metrics.totalGenerations.toLocaleString()}
        icon={Sparkles}
      />
      <StatCard
        label="Monthly AI usage"
        value={metrics.monthlyGenerations.toLocaleString()}
        hint="Generations so far this calendar month"
        icon={TrendingUp}
      />
    </div>
  )
}
