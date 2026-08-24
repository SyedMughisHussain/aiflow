import { Container } from "@/components/layout/container"
import { SectionHeading } from "@/components/marketing/section-heading"

const steps = [
  {
    title: "Connect your workspace",
    description:
      "Import existing docs or start fresh — AIFlow fits into how your team already works.",
  },
  {
    title: "Generate with AI",
    description:
      "Draft content or automate a task using AI trained on your context and brand voice.",
  },
  {
    title: "Review & refine",
    description:
      "Edit, comment, and approve as a team before anything goes live.",
  },
  {
    title: "Publish & track",
    description:
      "Ship content and monitor performance, all without leaving AIFlow.",
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-t border-border py-24">
      <Container>
        <SectionHeading
          eyebrow="How it works"
          title="From idea to published in four steps"
        />
        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <div key={step.title} className="flex flex-col gap-3">
              <span className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                {index + 1}
              </span>
              <h3 className="font-medium">{step.title}</h3>
              <p className="text-sm text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}
