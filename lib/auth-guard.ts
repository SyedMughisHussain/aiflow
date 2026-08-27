import { redirect } from "next/navigation"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import type { AuthUser } from "@/lib/user-service"

export async function requireUser(): Promise<AuthUser> {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  return {
    id: session.user.id,
    name: session.user.name ?? null,
    email: session.user.email ?? "",
    role: session.user.role,
  }
}

// Re-checks the role against the database instead of trusting the JWT claim
// alone, so a role change takes effect immediately rather than waiting for
// the user's session token to be refreshed.
export async function requireAdmin(): Promise<AuthUser> {
  const sessionUser = await requireUser()

  const user = await db.user.findUnique({ where: { id: sessionUser.id } })

  if (!user || user.role !== "ADMIN") {
    redirect("/dashboard")
  }

  return { id: user.id, name: user.name, email: user.email, role: user.role }
}
