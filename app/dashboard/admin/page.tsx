import type { Metadata } from "next"
import { ShieldCheck } from "lucide-react"

import { requireAdmin } from "@/lib/auth-guard"

export const metadata: Metadata = {
  title: "Admin — AIFlow",
}

export default async function AdminPage() {
  const user = await requireAdmin()

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-24 text-center">
      <ShieldCheck className="size-8 text-muted-foreground" />
      <h1 className="text-lg font-semibold">Admin panel</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Signed in as {user.email}. Admin tools will appear here in a later phase.
      </p>
    </div>
  )
}
