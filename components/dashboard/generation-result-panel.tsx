"use client"

import { useState } from "react"
import { Check, Copy, RotateCcw, type LucideIcon } from "lucide-react"

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/dashboard/empty-state"
import { fieldClasses } from "@/components/dashboard/field-classes"
import { cn } from "@/lib/utils"

interface GenerationResultPanelProps {
  content: string
  onContentChange: (value: string) => void
  isPending: boolean
  loadingLabel: string
  tokensUsed: number | null
  onRegenerate: () => void
  regenerateLabel: string
  emptyIcon: LucideIcon
  emptyTitle: string
  emptyDescription: string
}

export function GenerationResultPanel({
  content,
  onContentChange,
  isPending,
  loadingLabel,
  tokensUsed,
  onRegenerate,
  regenerateLabel,
  emptyIcon,
  emptyTitle,
  emptyDescription,
}: GenerationResultPanelProps) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Result</CardTitle>
        <CardDescription>Edit the generated content before you use it.</CardDescription>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <div className="flex flex-col gap-2" role="status" aria-label={loadingLabel}>
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
          </div>
        ) : content ? (
          <textarea
            value={content}
            onChange={(event) => onContentChange(event.target.value)}
            rows={14}
            aria-label="Generated content"
            className={cn(fieldClasses, "resize-y py-2 text-sm")}
          />
        ) : (
          <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />
        )}
      </CardContent>
      {content && !isPending ? (
        <CardFooter className="gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
            {copied ? <Check /> : <Copy />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onRegenerate}>
            <RotateCcw /> {regenerateLabel}
          </Button>
          {tokensUsed !== null ? (
            <span className="ml-auto text-xs text-muted-foreground">
              {tokensUsed.toLocaleString()} tokens used
            </span>
          ) : null}
        </CardFooter>
      ) : null}
    </Card>
  )
}
