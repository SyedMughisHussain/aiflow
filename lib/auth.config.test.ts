import { describe, expect, it } from "vitest"
import { NextResponse } from "next/server"

import { authConfig } from "@/lib/auth.config"

function fakeRequest(pathname: string) {
  return { nextUrl: new URL(`http://localhost:3000${pathname}`) } as never
}

describe("authConfig.callbacks.authorized", () => {
  it("allows unauthenticated access to routes outside /dashboard", async () => {
    const result = await authConfig.callbacks.authorized({
      request: fakeRequest("/login"),
      auth: null,
    })
    expect(result).toBe(true)
  })

  it("denies /dashboard when there is no session (protected route without auth)", async () => {
    const result = await authConfig.callbacks.authorized({
      request: fakeRequest("/dashboard"),
      auth: null,
    })
    expect(result).toBe(false)
  })

  it("allows /dashboard for any authenticated user", async () => {
    const result = await authConfig.callbacks.authorized({
      request: fakeRequest("/dashboard"),
      auth: { user: { role: "USER" } } as never,
    })
    expect(result).toBe(true)
  })

  it("redirects a USER away from /dashboard/admin (normal user hitting admin route)", async () => {
    const result = await authConfig.callbacks.authorized({
      request: fakeRequest("/dashboard/admin"),
      auth: { user: { role: "USER" } } as never,
    })
    expect(result).toBeInstanceOf(NextResponse)
    const response = result as NextResponse
    expect(response.headers.get("location")).toContain("/dashboard")
  })

  it("allows an ADMIN into /dashboard/admin", async () => {
    const result = await authConfig.callbacks.authorized({
      request: fakeRequest("/dashboard/admin"),
      auth: { user: { role: "ADMIN" } } as never,
    })
    expect(result).toBe(true)
  })
})

describe("authConfig.callbacks.jwt", () => {
  it("copies id and role from the user onto the token at sign-in", () => {
    const token = authConfig.callbacks.jwt({
      token: {},
      user: { id: "user_1", role: "ADMIN" },
    } as never)
    expect(token).toMatchObject({ id: "user_1", role: "ADMIN" })
  })

  it("leaves the token untouched on subsequent calls with no user", () => {
    const token = authConfig.callbacks.jwt({
      token: { id: "user_1", role: "ADMIN" },
      user: undefined,
    } as never)
    expect(token).toMatchObject({ id: "user_1", role: "ADMIN" })
  })
})

describe("authConfig.callbacks.session", () => {
  it("copies id and role from the token onto session.user", () => {
    const session = authConfig.callbacks.session({
      session: { user: { name: "Jordan" }, expires: "" },
      token: { id: "user_1", role: "ADMIN" },
    } as never)
    expect(session.user).toMatchObject({ id: "user_1", role: "ADMIN" })
  })
})
