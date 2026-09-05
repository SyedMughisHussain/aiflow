import type { ReactNode } from "react"

import { requireAdmin } from "@/lib/auth-guard"
import { PageHeader } from "@/components/dashboard/page-header"
import { AdminTabs } from "@/components/dashboard/admin-tabs"

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Admin" description="Manage users, subscriptions, and AI usage across Promptly." />
      <AdminTabs />
      {children}
    </div>
  )
}
