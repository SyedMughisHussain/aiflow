"use client"

import { useState, useTransition } from "react"
import { AlertTriangle, Check, Copy, Loader2, RotateCcw, Sparkles } from "lucide-react"

import { generateWriterContent } from "@/app/dashboard/writer/actions"
import { WRITER_CONTENT_TYPES, type WriterContentType } from "@/lib/generation-types"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/dashboard/empty-state"
import { cn } from "@/lib/utils"

const fieldClasses =
  "w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-base outline-none placeholder:text-muted-foreground transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80"

export function WriterForm() {
  const [type, setType] = useState<WriterContentType>("BLOG_POST")
  const [topic, setTopic] = useState("")
  const [instructions, setInstructions] = useState("")
  const [tone, setTone] = useState("")
  const [content, setContent] = useState("")
  const [tokensUsed, setTokensUsed] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isPending, startTransition] = useTransition()

  function submit() {
    setError(null)
    setCopied(false)
    startTransition(async () => {
      const result = await generateWriterContent({
        type,
        topic,
        instructions,
        tone: tone || undefined,
      })

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

  const canSubmit = topic.trim().length >= 3 && instructions.trim().length >= 3 && !isPending

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>New generation</CardTitle>
          <CardDescription>
            Describe what you want and AIFlow will draft it for you.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="type">Content type</Label>
            <select
              id="type"
              value={type}
              onChange={(event) => setType(event.target.value as WriterContentType)}
              disabled={isPending}
              className={cn(fieldClasses, "h-8 py-1")}
            >
              {WRITER_CONTENT_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="topic">Topic</Label>
            <Input
              id="topic"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="e.g. Benefits of remote work for small teams"
              disabled={isPending}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="instructions">Instructions</Label>
            <textarea
              id="instructions"
              rows={4}
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
              placeholder="What should the content cover, include, or avoid?"
              disabled={isPending}
              className={cn(fieldClasses, "resize-none py-2")}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tone">
              Tone <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="tone"
              value={tone}
              onChange={(event) => setTone(event.target.value)}
              placeholder="e.g. Friendly, professional, witty"
              disabled={isPending}
            />
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
            {isPending ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {isPending ? "Generating..." : content ? "Regenerate" : "Generate"}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Result</CardTitle>
          <CardDescription>Edit the generated content before you use it.</CardDescription>
        </CardHeader>
        <CardContent>
          {isPending ? (
            <div className="flex flex-col gap-2" role="status" aria-label="Generating content">
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
              icon={Sparkles}
              title="Nothing generated yet"
              description="Fill out the form and click Generate to see your content here."
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
              <RotateCcw /> Regenerate
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
