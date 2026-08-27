import { describe, expect, it, vi, beforeEach } from "vitest"

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`)
  }),
}))

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}))

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
    },
  },
}))

const { redirect } = await import("next/navigation")
const { auth } = await import("@/lib/auth")
const { db } = await import("@/lib/db")
const { requireUser, requireAdmin } = await import("@/lib/auth-guard")

// `auth()` has a broad overloaded type (it also doubles as Proxy middleware).
// For these tests we only care about its plain `() => Promise<Session | null>` shape.
const mockedAuth = vi.mocked(
  auth as unknown as () => Promise<{
    user: { id: string; name: string; email: string; role: string }
  } | null>
)

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(redirect).mockImplementation((path: string) => {
    throw new Error(`REDIRECT:${path}`)
  })
})

describe("requireUser", () => {
  it("redirects to /login when there is no session (protected route without auth)", async () => {
    mockedAuth.mockResolvedValue(null)

    await expect(requireUser()).rejects.toThrow("REDIRECT:/login")
  })

  it("returns the session user when authenticated", async () => {
    mockedAuth.mockResolvedValue({
      user: { id: "user_1", name: "Jordan", email: "jordan@example.com", role: "USER" },
      expires: "",
    } as never)

    const user = await requireUser()

    expect(user).toEqual({
      id: "user_1",
      name: "Jordan",
      email: "jordan@example.com",
      role: "USER",
    })
  })
})

describe("requireAdmin", () => {
  it("redirects a normal USER away from admin (normal user hitting admin route)", async () => {
    mockedAuth.mockResolvedValue({
      user: { id: "user_1", name: "Jordan", email: "jordan@example.com", role: "USER" },
      expires: "",
    } as never)
    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: "user_1",
      name: "Jordan",
      email: "jordan@example.com",
      role: "USER",
    } as never)

    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/dashboard")
  })

  it("allows an ADMIN through", async () => {
    mockedAuth.mockResolvedValue({
      user: { id: "user_2", name: "Alex", email: "alex@example.com", role: "ADMIN" },
      expires: "",
    } as never)
    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: "user_2",
      name: "Alex",
      email: "alex@example.com",
      role: "ADMIN",
    } as never)

    const user = await requireAdmin()

    expect(user.role).toBe("ADMIN")
  })

  it("re-checks the role against the database rather than trusting a stale session claim", async () => {
    // Session/JWT still says ADMIN, but the database (source of truth) has
    // since been downgraded to USER — requireAdmin must not trust the token.
    mockedAuth.mockResolvedValue({
      user: { id: "user_1", name: "Jordan", email: "jordan@example.com", role: "ADMIN" },
      expires: "",
    } as never)
    vi.mocked(db.user.findUnique).mockResolvedValue({
      id: "user_1",
      name: "Jordan",
      email: "jordan@example.com",
      role: "USER",
    } as never)

    await expect(requireAdmin()).rejects.toThrow("REDIRECT:/dashboard")
  })
})
