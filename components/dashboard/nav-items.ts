import {
  LayoutDashboard,
  PenLine,
  MessageSquare,
  Wand2,
  History,
  CreditCard,
  Settings,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react"

export interface DashboardNavItem {
  href: string
  label: string
  icon: LucideIcon
}

export const dashboardNavItems: DashboardNavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/writer", label: "AI Writer", icon: PenLine },
  { href: "/dashboard/chat", label: "Chat", icon: MessageSquare },
  { href: "/dashboard/rewrite", label: "Rewrite", icon: Wand2 },
  { href: "/dashboard/history", label: "History", icon: History },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
]

export const adminNavItem: DashboardNavItem = {
  href: "/dashboard/admin",
  label: "Admin",
  icon: ShieldCheck,
}
