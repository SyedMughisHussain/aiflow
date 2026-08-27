import type { Metadata } from "next"

import { requireUser } from "@/lib/auth-guard"
import { PageHeader } from "@/components/dashboard/page-header"
import { RewriteForm } from "@/components/dashboard/rewrite-form"

export const metadata: Metadata = {
  title: "Rewrite — AIFlow",
}

export default async function RewritePage() {
  await requireUser()

  return (
    <>
      <PageHeader
        title="Rewrite"
        description="Paste any text and rewrite it in a different tone or style."
      />
      <RewriteForm />
    </>
  )
}
