"use client"

import { useState, useTransition } from "react"
import { Loader2, Wand2 } from "lucide-react"

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
import { GenerationResultPanel } from "@/components/dashboard/generation-result-panel"
import { fieldClasses } from "@/components/dashboard/field-classes"
import { FormNotice } from "@/components/form-notice"
import { cn } from "@/lib/utils"

export function RewriteForm() {
  const [mode, setMode] = useState<RewriteMode>("IMPROVE")
  const [text, setText] = useState("")
  const [content, setContent] = useState("")
  const [tokensUsed, setTokensUsed] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function submit() {
    setError(null)
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
          <FormNotice message={error} />
        </CardContent>
        <CardFooter>
          <Button onClick={submit} disabled={!canSubmit}>
            {isPending ? <Loader2 className="animate-spin" /> : <Wand2 />}
            {isPending ? "Rewriting..." : content ? "Rewrite again" : "Rewrite"}
          </Button>
        </CardFooter>
      </Card>

      <GenerationResultPanel
        content={content}
        onContentChange={setContent}
        isPending={isPending}
        loadingLabel="Rewriting content"
        tokensUsed={tokensUsed}
        onRegenerate={submit}
        regenerateLabel="Rewrite again"
        emptyIcon={Wand2}
        emptyTitle="Nothing rewritten yet"
        emptyDescription="Paste some text and click Rewrite to see the result here."
      />
    </div>
  )
}
