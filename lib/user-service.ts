import bcrypt from "bcryptjs"

import { db } from "@/lib/db"
import { Prisma, type Role } from "@/lib/generated/prisma/client"

const SALT_ROUNDS = 10

export interface AuthUser {
  id: string
  name: string | null
  email: string
  role: Role
}

export type CreateUserResult = { user: AuthUser } | { error: "EmailInUse" }

export async function createUser(input: {
  name: string
  email: string
  password: string
}): Promise<CreateUserResult> {
  const hashedPassword = await bcrypt.hash(input.password, SALT_ROUNDS)

  try {
    const user = await db.user.create({
      data: {
        name: input.name,
        email: input.email,
        password: hashedPassword,
      },
    })

    return { user: toAuthUser(user) }
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { error: "EmailInUse" }
    }
    throw err
  }
}

export async function verifyCredentials(
  email: string,
  password: string
): Promise<AuthUser | null> {
  const user = await db.user.findUnique({ where: { email } })
  if (!user?.password) return null

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) return null

  return toAuthUser(user)
}

function toAuthUser(user: {
  id: string
  name: string | null
  email: string
  role: Role
}): AuthUser {
  return { id: user.id, name: user.name, email: user.email, role: user.role }
}
