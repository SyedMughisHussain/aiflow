import { Container } from "@/components/layout/container"
import { SectionHeading } from "@/components/marketing/section-heading"

const steps = [
  {
    title: "Describe what you need",
    description:
      "Pick a content type — blog post, email, social post, and more — and describe the topic and tone.",
  },
  {
    title: "Generate with AI",
    description:
      "Promptly drafts the content in seconds, ready to edit right in the browser.",
  },
  {
    title: "Refine with chat or rewrite",
    description:
      "Ask the AI chat to adjust it, or send it through the rewriter to change the tone or length.",
  },
  {
    title: "Copy it and move on",
    description:
      "Copy the finished result and find it again anytime in your generation history.",
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-t border-border py-24">
      <Container>
        <SectionHeading
          eyebrow="How it works"
          title="From idea to finished draft in four steps"
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
