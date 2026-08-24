import Link from "next/link"
import type { Metadata } from "next"

import { AuthCard } from "@/components/auth/auth-card"
import { SignupForm } from "@/components/auth/signup-form"
import { getAuthErrorMessage } from "@/lib/auth-errors"

export const metadata: Metadata = {
  title: "Create an account — AIFlow",
}

export default async function SignupPage(props: PageProps<"/signup">) {
  const searchParams = await props.searchParams
  const errorParam =
    typeof searchParams.error === "string" ? searchParams.error : undefined
  const error = getAuthErrorMessage(errorParam)

  return (
    <AuthCard
      title="Create your account"
      description="Start creating content with AIFlow"
      footer={
        <span>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-foreground hover:underline"
          >
            Sign in
          </Link>
        </span>
      }
    >
      <SignupForm error={error} />
    </AuthCard>
  )
}
