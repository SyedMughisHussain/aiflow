import {
  PenLine,
  MessageSquare,
  Wand2,
  History,
  Gauge,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react"

import { Container } from "@/components/layout/container"
import { SectionHeading } from "@/components/marketing/section-heading"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

interface Feature {
  icon: LucideIcon
  title: string
  description: string
}

const features: Feature[] = [
  {
    icon: PenLine,
    title: "AI writer",
    description:
      "Generate blog posts, product descriptions, social posts, emails, and ad copy from a short brief.",
  },
  {
    icon: MessageSquare,
    title: "AI chat",
    description:
      "Brainstorm ideas, ask questions, and work through drafts in a conversational assistant.",
  },
  {
    icon: Wand2,
    title: "AI rewriter",
    description:
      "Paste any text and improve, shorten, expand, or restyle it in a friendlier or more professional tone.",
  },
  {
    icon: History,
    title: "Generation history",
    description:
      "Every generation is saved automatically, so you can find and reuse past drafts anytime.",
  },
  {
    icon: Gauge,
    title: "Usage tracking",
    description:
      "See exactly how many generations you've used this month and how much room you have left.",
  },
  {
    icon: ShieldCheck,
    title: "Your content stays yours",
    description:
      "Everything you generate is private to your account — never shared or used to train other models.",
  },
]

export function Features() {
  return (
    <section id="features" className="border-t border-border py-24">
      <Container>
        <SectionHeading
          eyebrow="Features"
          title="Everything you need to write, faster"
          description="AIFlow brings AI writing, chat, and rewriting into one focused workspace, with every draft saved for later."
        />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <Card key={title}>
              <CardHeader>
                <Icon className="size-5 text-primary" />
                <CardTitle className="mt-3">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  )
}
