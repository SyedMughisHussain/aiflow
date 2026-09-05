import type { Metadata } from "next"

import { requireUser } from "@/lib/auth-guard"
import { PageHeader } from "@/components/dashboard/page-header"
import { WriterForm } from "@/components/dashboard/writer-form"

export const metadata: Metadata = {
  title: "AI Writer — Promptly",
}

export default async function WriterPage() {
  await requireUser()

  return (
    <>
      <PageHeader
        title="AI Writer"
        description="Generate blog posts, emails, and marketing copy from a short brief."
      />
      <WriterForm />
    </>
  )
}
