"use server"

import { z } from "zod"

import { createUser } from "@/lib/user-service"

const signUpSchema = z.object({
  name: z.string().min(2),
  email: z.string().min(1).email(),
  password: z.string().min(8),
})

export type SignUpResult = { success: true } | { error: string }

export async function signUp(input: {
  name: string
  email: string
  password: string
}): Promise<SignUpResult> {
  const parsed = signUpSchema.safeParse(input)
  if (!parsed.success) {
    return { error: "Invalid input. Please check your details and try again." }
  }

  const result = await createUser(parsed.data)

  if ("error" in result) {
    return { error: result.error }
  }

  return { success: true }
}
