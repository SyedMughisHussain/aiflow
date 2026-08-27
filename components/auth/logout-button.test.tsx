// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"

const pushMock = vi.fn()
const refreshMock = vi.fn()
const signOutMock = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}))

vi.mock("next-auth/react", () => ({
  signOut: (...args: unknown[]) => signOutMock(...args),
}))

const { LogoutButton } = await import("@/components/auth/logout-button")

beforeEach(() => {
  vi.resetAllMocks()
  signOutMock.mockResolvedValue(undefined)
})

describe("LogoutButton", () => {
  it("signs the user out and redirects to /login on click", async () => {
    render(<LogoutButton />)

    fireEvent.click(screen.getByRole("button", { name: /log out/i }))

    await waitFor(() => {
      expect(signOutMock).toHaveBeenCalledWith({ redirect: false })
    })
    expect(pushMock).toHaveBeenCalledWith("/login")
    expect(refreshMock).toHaveBeenCalled()
  })
})
