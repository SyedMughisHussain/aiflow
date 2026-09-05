"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import { dashboardNavItems, adminNavItem } from "@/components/dashboard/nav-items"
import type { AuthUser } from "@/lib/user-service"

export function NavList({
  user,
  onNavigate,
}: {
  user: AuthUser
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const items =
    user.role === "ADMIN" ? [...dashboardNavItems, adminNavItem] : dashboardNavItems

  return (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      {items.map((item) => {
        const active =
          item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href)
        const Icon = item.icon

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              active && "bg-muted text-foreground"
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

export function DashboardSidebar({ user }: { user: AuthUser }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
      <div className="flex h-16 items-center border-b border-sidebar-border px-5">
        <Link
          href="/dashboard"
          className="text-base font-semibold tracking-tight text-sidebar-foreground"
        >
          Promptly
        </Link>
      </div>
      <NavList user={user} />
    </aside>
  )
}
