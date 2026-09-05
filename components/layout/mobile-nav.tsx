"use client"

import Link from "next/link"
import { Menu } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet"

interface NavLink {
  href: string
  label: string
}

export function MobileNav({ links }: { links: NavLink[] }) {
  return (
    <Sheet>
      <SheetTrigger
        aria-label="Open menu"
        className={cn(buttonVariants({ variant: "outline", size: "icon" }), "sm:hidden")}
      >
        <Menu />
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Promptly</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-4">
          {links.map((link) => (
            <SheetClose
              key={link.href}
              render={<a href={link.href} />}
              className="rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {link.label}
            </SheetClose>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-2 p-4">
          <SheetClose
            render={<Link href="/login" />}
            className={cn(buttonVariants({ variant: "outline" }), "w-full")}
          >
            Sign in
          </SheetClose>
          <SheetClose
            render={<Link href="/signup" />}
            className={cn(buttonVariants(), "w-full")}
          >
            Get started free
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  )
}
