"use client"

import { useState } from "react"
import { Menu } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { NavList } from "@/components/dashboard/sidebar"
import type { AuthUser } from "@/lib/user-service"

export function MobileSidebar({ user }: { user: AuthUser }) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Open navigation"
        className={cn(buttonVariants({ variant: "outline", size: "icon" }), "md:hidden")}
      >
        <Menu />
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="h-16 justify-center border-b border-border">
          <SheetTitle>AIFlow</SheetTitle>
        </SheetHeader>
        <NavList user={user} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  )
}
