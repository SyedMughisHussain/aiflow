"use client"

import { useState, useTransition } from "react"
import { Loader2, Sparkles } from "lucide-react"

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
import { GenerationResultPanel } from "@/components/dashboard/generation-result-panel"
import { fieldClasses } from "@/components/dashboard/field-classes"
import { FormNotice } from "@/components/form-notice"
import { cn } from "@/lib/utils"

export function WriterForm() {
  const [type, setType] = useState<WriterContentType>("BLOG_POST")
  const [topic, setTopic] = useState("")
  const [instructions, setInstructions] = useState("")
  const [tone, setTone] = useState("")
  const [content, setContent] = useState("")
  const [tokensUsed, setTokensUsed] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function submit() {
    setError(null)
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

  const canSubmit = topic.trim().length >= 3 && instructions.trim().length >= 3 && !isPending

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>New generation</CardTitle>
          <CardDescription>
            Describe what you want and Promptly will draft it for you.
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
          <FormNotice message={error} />
        </CardContent>
        <CardFooter>
          <Button onClick={submit} disabled={!canSubmit}>
            {isPending ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {isPending ? "Generating..." : content ? "Regenerate" : "Generate"}
          </Button>
        </CardFooter>
      </Card>

      <GenerationResultPanel
        content={content}
        onContentChange={setContent}
        isPending={isPending}
        loadingLabel="Generating content"
        tokensUsed={tokensUsed}
        onRegenerate={submit}
        regenerateLabel="Regenerate"
        emptyIcon={Sparkles}
        emptyTitle="Nothing generated yet"
        emptyDescription="Fill out the form and click Generate to see your content here."
      />
    </div>
  )
}
