import {
  Sparkles,
  MessageSquare,
  Wand2,
  History,
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
      "Generate blog posts, product descriptions, social posts, emails, and ad copy from a short brief.",
  },
  {
    icon: MessageSquare,
    title: "AI chat",
    description:
      "Talk through ideas, ask follow-up questions, and iterate on a draft conversationally.",
  },
  {
    icon: Wand2,
    title: "AI rewriter",
    description:
      "Paste any text and improve, shorten, expand, or restyle it in a different tone.",
  },
  {
    icon: History,
    title: "Generation history",
    description:
      "Every writer and rewrite generation is saved automatically, so nothing gets lost.",
  },
]

export function AITools() {
  return (
    <section id="ai-tools" className="border-t border-border py-24">
      <Container className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-16">
        <div className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          <span className="text-sm font-medium text-primary">AI tools</span>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            AI built for writing, not busywork
          </h2>
          <p className="max-w-md text-muted-foreground sm:text-lg">
            Promptly&rsquo;s tools work together from first draft to finished
            copy — write it, refine it, and find it again later.
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
