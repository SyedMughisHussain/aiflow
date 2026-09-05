"use client"

import Link from "next/link"
import { Settings, CreditCard } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { LogoutButton } from "@/components/auth/logout-button"
import type { AuthUser } from "@/lib/user-service"

function getInitials(user: AuthUser) {
  const source = user.name ?? user.email
  return source.slice(0, 2).toUpperCase()
}

export function UserMenu({ user }: { user: AuthUser }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Open account menu"
        className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Avatar>
          <AvatarFallback>{getInitials(user)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col items-start gap-1 px-1.5 py-1.5">
            <span className="text-sm font-medium text-foreground">
              {user.name ?? user.email}
            </span>
            <span className="text-xs text-muted-foreground">{user.email}</span>
            <Badge variant="outline" className="mt-1">
              {user.role}
            </Badge>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/dashboard/settings" />}>
          <Settings /> Settings
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/dashboard/billing" />}>
          <CreditCard /> Billing
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <LogoutButton
          variant="ghost"
          className="w-full justify-start gap-1.5 rounded-md px-1.5 py-1 text-sm font-normal hover:bg-accent hover:text-accent-foreground"
        />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
