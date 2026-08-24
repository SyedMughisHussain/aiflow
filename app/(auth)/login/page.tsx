import Link from "next/link"
import type { Metadata } from "next"

import { AuthCard } from "@/components/auth/auth-card"
import { LoginForm } from "@/components/auth/login-form"
import { getAuthErrorMessage } from "@/lib/auth-errors"

export const metadata: Metadata = {
  title: "Sign in — AIFlow",
}

export default async function LoginPage(props: PageProps<"/login">) {
  const searchParams = await props.searchParams
  const errorParam =
    typeof searchParams.error === "string" ? searchParams.error : undefined
  const error = getAuthErrorMessage(errorParam)

  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to your AIFlow account"
      footer={
        <span>
          Don&rsquo;t have an account?{" "}
          <Link
            href="/signup"
            className="font-medium text-foreground hover:underline"
          >
            Sign up
          </Link>
        </span>
      }
    >
      <LoginForm error={error} />
    </AuthCard>
  )
}
