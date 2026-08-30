"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

const ADMIN_TABS = [
  { href: "/dashboard/admin", label: "Overview" },
  { href: "/dashboard/admin/users", label: "Users" },
  { href: "/dashboard/admin/subscriptions", label: "Subscriptions" },
  { href: "/dashboard/admin/usage", label: "Usage" },
] as const

export function AdminTabs() {
  const pathname = usePathname()

  return (
    <div className="flex gap-1 overflow-x-auto border-b border-border">
      {ADMIN_TABS.map((tab) => {
        const active =
          tab.href === "/dashboard/admin" ? pathname === tab.href : pathname.startsWith(tab.href)

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "shrink-0 border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
              active && "border-primary text-foreground"
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
