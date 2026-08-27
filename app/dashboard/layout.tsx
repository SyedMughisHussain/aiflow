import type { ReactNode } from "react"

import { Container } from "@/components/layout/container"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { DashboardTopNav } from "@/components/dashboard/top-nav"
import { requireUser } from "@/lib/auth-guard"

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const user = await requireUser()

  return (
    <div className="flex min-h-screen flex-1">
      <DashboardSidebar user={user} />
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardTopNav user={user} />
        <main className="flex-1">
          <Container className="flex max-w-7xl flex-col gap-8 py-8">{children}</Container>
        </main>
      </div>
    </div>
  )
}
