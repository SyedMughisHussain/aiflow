import {
  PenLine,
  LayoutTemplate,
  Calendar,
  Users,
  History,
  BarChart3,
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
    title: "AI writing assistant",
    description:
      "Draft, edit, and polish content with an AI assistant trained on your brand voice and past work.",
  },
  {
    icon: LayoutTemplate,
    title: "Smart templates",
    description:
      "Start from templates for blog posts, social captions, emails, and more — customized to your workflow.",
  },
  {
    icon: Calendar,
    title: "Content calendar",
    description:
      "Plan, schedule, and track content across every channel from a single shared calendar.",
  },
  {
    icon: Users,
    title: "Team workspaces",
    description:
      "Collaborate in shared workspaces with comments, approvals, and role-based access.",
  },
  {
    icon: History,
    title: "Version history",
    description:
      "Every draft is saved automatically, so you can compare, restore, or branch from any version.",
  },
  {
    icon: BarChart3,
    title: "Analytics & insights",
    description:
      "See what's working with performance insights tied directly to your content.",
  },
]

export function Features() {
  return (
    <section id="features" className="border-t border-border py-24">
      <Container>
        <SectionHeading
          eyebrow="Features"
          title="Everything your team needs to create"
          description="AIFlow brings writing, planning, and collaboration into one workspace, so nothing falls through the cracks."
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
