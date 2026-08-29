"use client"

import { useEffect } from "react"
import { AlertTriangle } from "lucide-react"

import { Container } from "@/components/layout/container"
import { Button } from "@/components/ui/button"

export default function MarketingError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <Container className="py-24">
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-destructive/40 py-24 text-center">
        <AlertTriangle className="size-8 text-destructive" />
        <h1 className="text-lg font-semibold">Something went wrong</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          We couldn&apos;t load this page. Please try again.
        </p>
        <Button variant="outline" onClick={reset}>
          Try again
        </Button>
      </div>
    </Container>
  )
}
