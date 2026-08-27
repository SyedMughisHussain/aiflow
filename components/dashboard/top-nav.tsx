import { ThemeToggle } from "@/components/theme-toggle"
import { MobileSidebar } from "@/components/dashboard/mobile-sidebar"
import { UserMenu } from "@/components/dashboard/user-menu"
import type { AuthUser } from "@/lib/user-service"

export function DashboardTopNav({ user }: { user: AuthUser }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/80 px-4 backdrop-blur-sm supports-backdrop-filter:bg-background/60 md:px-6">
      <MobileSidebar user={user} />
      <div className="flex-1" />
      <ThemeToggle />
      <UserMenu user={user} />
    </header>
  )
}
