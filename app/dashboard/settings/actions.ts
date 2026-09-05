"use server"

import { z } from "zod"

import { requireUser } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { updateSession } from "@/lib/auth"

const updateProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
})

export type UpdateProfileResult = { success: true; name: string } | { error: string }

export async function updateProfileAction(input: {
  name: string
}): Promise<UpdateProfileResult> {
  const user = await requireUser()

  const parsed = updateProfileSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." }
  }

  await db.user.update({
    where: { id: user.id },
    data: { name: parsed.data.name },
  })

  await updateSession({ user: { name: parsed.data.name } })

  return { success: true, name: parsed.data.name }
}
