import {
  Sparkles,
  FileText,
  Repeat,
  Mic,
  type LucideIcon,
} from "lucide-react"

import { Container } from "@/components/layout/container"

interface Tool {
  icon: LucideIcon
  title: string
  description: string
}

const tools: Tool[] = [
  {
    icon: Sparkles,
    title: "AI writer",
    description:
      "Generate first drafts from a prompt, outline, or existing document in seconds.",
  },
  {
    icon: FileText,
    title: "Summarizer",
    description:
      "Condense long documents, meeting notes, or research into clear summaries.",
  },
  {
    icon: Repeat,
    title: "Repurposing engine",
    description:
      "Turn one piece of content into formats for blog, social, and email automatically.",
  },
  {
    icon: Mic,
    title: "Brand voice tuning",
    description:
      "Fine-tune AI output to match your brand's tone, vocabulary, and style guide.",
  },
]

export function AITools() {
  return (
    <section id="ai-tools" className="border-t border-border py-24">
      <Container className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-16">
        <div className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          <span className="text-sm font-medium text-primary">AI tools</span>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            AI built into every step of your workflow
          </h2>
          <p className="max-w-md text-muted-foreground sm:text-lg">
            AIFlow&rsquo;s AI tools work together throughout the content
            lifecycle — from the first draft to the version your team
            publishes.
          </p>
        </div>
        <div className="flex flex-col divide-y divide-border">
          {tools.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex gap-4 py-6 first:pt-0 last:pb-0">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="size-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}
