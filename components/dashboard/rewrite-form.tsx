"use client"

import { useState, useTransition } from "react"
import { AlertTriangle, Check, Copy, Loader2, RotateCcw, Wand2 } from "lucide-react"

import { generateRewriteContent } from "@/app/dashboard/rewrite/actions"
import { REWRITE_MODES, type RewriteMode } from "@/lib/generation-types"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/dashboard/empty-state"
import { cn } from "@/lib/utils"

const fieldClasses =
  "w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-base outline-none placeholder:text-muted-foreground transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80"

export function RewriteForm() {
  const [mode, setMode] = useState<RewriteMode>("IMPROVE")
  const [text, setText] = useState("")
  const [content, setContent] = useState("")
  const [tokensUsed, setTokensUsed] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isPending, startTransition] = useTransition()

  function submit() {
    setError(null)
    setCopied(false)
    startTransition(async () => {
      const result = await generateRewriteContent({ mode, text })

      if (result.ok) {
        setContent(result.content)
        setTokensUsed(result.tokensUsed)
      } else {
        setError(result.error)
      }
    })
  }

  function handleCopy() {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const canSubmit = text.trim().length >= 10 && !isPending

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>New rewrite</CardTitle>
          <CardDescription>Paste text and choose how you&apos;d like it rewritten.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="source-text">Original text</Label>
            <textarea
              id="source-text"
              rows={8}
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Paste the text you want to rewrite..."
              disabled={isPending}
              className={cn(fieldClasses, "resize-none py-2")}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mode">Style</Label>
            <select
              id="mode"
              value={mode}
              onChange={(event) => setMode(event.target.value as RewriteMode)}
              disabled={isPending}
              className={cn(fieldClasses, "h-8 py-1")}
            >
              {REWRITE_MODES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          {error ? (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <p>{error}</p>
            </div>
          ) : null}
        </CardContent>
        <CardFooter>
          <Button onClick={submit} disabled={!canSubmit}>
            {isPending ? <Loader2 className="animate-spin" /> : <Wand2 />}
            {isPending ? "Rewriting..." : content ? "Rewrite again" : "Rewrite"}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Result</CardTitle>
          <CardDescription>Edit the rewritten text before you use it.</CardDescription>
        </CardHeader>
        <CardContent>
          {isPending ? (
            <div className="flex flex-col gap-2" role="status" aria-label="Rewriting content">
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            </div>
          ) : content ? (
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={14}
              className={cn(fieldClasses, "resize-y py-2 text-sm")}
            />
          ) : (
            <EmptyState
              icon={Wand2}
              title="Nothing rewritten yet"
              description="Paste some text and click Rewrite to see the result here."
            />
          )}
        </CardContent>
        {content && !isPending ? (
          <CardFooter className="gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
              {copied ? <Check /> : <Copy />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={submit}>
              <RotateCcw /> Rewrite again
            </Button>
            {tokensUsed !== null ? (
              <span className="ml-auto text-xs text-muted-foreground">
                {tokensUsed.toLocaleString()} tokens used
              </span>
            ) : null}
          </CardFooter>
        ) : null}
      </Card>
    </div>
  )
}
