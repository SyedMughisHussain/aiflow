import { describe, expect, it, vi, beforeEach } from "vitest"
import bcrypt from "bcryptjs"

import { Prisma } from "@/lib/generated/prisma/client"

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}))

const { db } = await import("@/lib/db")
const { createUser, verifyCredentials } = await import("@/lib/user-service")

beforeEach(() => {
  vi.resetAllMocks()
})

describe("createUser (signup)", () => {
  it("hashes the password and creates the user", async () => {
    vi.mocked(db.user.create).mockImplementation(
      (({ data }: { data: { name: string; email: string; password: string } }) =>
        Promise.resolve({
          id: "user_1",
          name: data.name,
          email: data.email,
          password: data.password,
          role: "USER",
          emailVerified: null,
          image: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })) as never
    )

    const result = await createUser({
      name: "Jordan Lee",
      email: "jordan@example.com",
      password: "super-secret-1",
    })

    expect("user" in result).toBe(true)
    if (!("user" in result)) throw new Error("expected success")

    expect(result.user).toEqual({
      id: "user_1",
      name: "Jordan Lee",
      email: "jordan@example.com",
      role: "USER",
    })

    const createCall = vi.mocked(db.user.create).mock.calls[0][0]
    const storedPassword = createCall.data.password as string
    expect(storedPassword).not.toBe("super-secret-1")
    await expect(bcrypt.compare("super-secret-1", storedPassword)).resolves.toBe(true)
  })

  it("rejects a duplicate email without leaking a raw DB error", async () => {
    vi.mocked(db.user.create).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed on the fields: (`email`)", {
        code: "P2002",
        clientVersion: "test",
      })
    )

    const result = await createUser({
      name: "Jordan Lee",
      email: "taken@example.com",
      password: "super-secret-1",
    })

    expect(result).toEqual({ error: "EmailInUse" })
  })

  it("rethrows unexpected database errors", async () => {
    vi.mocked(db.user.create).mockRejectedValue(new Error("connection lost"))

    await expect(
      createUser({ name: "Jordan Lee", email: "jordan@example.com", password: "super-secret-1" })
    ).rejects.toThrow("connection lost")
  })
})

describe("verifyCredentials (login)", () => {
  it("returns the user when the password is correct", async () => {
    const hashed = await bcrypt.hash("correct-password", 10)
    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: "user_1",
      name: "Jordan Lee",
      email: "jordan@example.com",
      password: hashed,
      role: "USER",
      emailVerified: null,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const result = await verifyCredentials("jordan@example.com", "correct-password")

    expect(result).toEqual({
      id: "user_1",
      name: "Jordan Lee",
      email: "jordan@example.com",
      role: "USER",
    })
  })

  it("returns null for the wrong password (invalid credentials)", async () => {
    const hashed = await bcrypt.hash("correct-password", 10)
    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: "user_1",
      name: "Jordan Lee",
      email: "jordan@example.com",
      password: hashed,
      role: "USER",
      emailVerified: null,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const result = await verifyCredentials("jordan@example.com", "wrong-password")

    expect(result).toBeNull()
  })

  it("returns null for a nonexistent email (invalid credentials)", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue(null)

    const result = await verifyCredentials("nobody@example.com", "whatever")

    expect(result).toBeNull()
  })

  it("returns null for an OAuth-only user with no password set", async () => {
    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: "user_1",
      name: "Jordan Lee",
      email: "jordan@example.com",
      password: null,
      role: "USER",
      emailVerified: null,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const result = await verifyCredentials("jordan@example.com", "anything")

    expect(result).toBeNull()
  })
})
