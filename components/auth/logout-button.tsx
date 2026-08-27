"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { LogOut, Loader2 } from "lucide-react"
import type { VariantProps } from "class-variance-authority"

import { Button, type buttonVariants } from "@/components/ui/button"

type LogoutButtonProps = {
  className?: string
} & Pick<VariantProps<typeof buttonVariants>, "variant" | "size">

export function LogoutButton({ className, variant = "ghost", size = "sm" }: LogoutButtonProps = {}) {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  async function handleLogout() {
    setIsLoggingOut(true)
    await signOut({ redirect: false })
    router.push("/login")
    router.refresh()
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      onClick={handleLogout}
      disabled={isLoggingOut}
    >
      {isLoggingOut ? <Loader2 className="animate-spin" /> : <LogOut />}
      Log out
    </Button>
  )
}
