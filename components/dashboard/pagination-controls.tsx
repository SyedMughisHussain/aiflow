import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"

export function PaginationControls({
  page,
  totalPages,
  basePath,
  extraParams = {},
}: {
  page: number
  totalPages: number
  basePath: string
  extraParams?: Record<string, string | undefined>
}) {
  if (totalPages <= 1) return null

  function hrefFor(targetPage: number) {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(extraParams)) {
      if (value) params.set(key, value)
    }
    params.set("page", String(targetPage))
    return `${basePath}?${params.toString()}`
  }

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Button variant="outline" size="sm" render={<Link href={hrefFor(page - 1)} />}>
            <ChevronLeft /> Previous
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            <ChevronLeft /> Previous
          </Button>
        )}
        {page < totalPages ? (
          <Button variant="outline" size="sm" render={<Link href={hrefFor(page + 1)} />}>
            Next <ChevronRight />
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Next <ChevronRight />
          </Button>
        )}
      </div>
    </div>
  )
}
