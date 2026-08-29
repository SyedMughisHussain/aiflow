import { Container } from "@/components/layout/container"
import { SectionHeading } from "@/components/marketing/section-heading"
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion"

const faqs = [
  {
    question: "Is there a free plan?",
    answer:
      "Yes. The Free plan includes 10 AI generations per month at no cost, so you can try AIFlow before upgrading.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes, you can cancel or change your plan at any time from your billing page — no long-term contracts.",
  },
  {
    question: "What AI models power AIFlow?",
    answer:
      "AIFlow uses leading large language models to power writing, summarization, and content generation, with your brand voice applied on top.",
  },
  {
    question: "Is my content and data secure?",
    answer:
      "Your content stays private to your workspace. We never use your data to train models for other customers.",
  },
  {
    question: "Does AIFlow integrate with other tools?",
    answer:
      "Integrations with common content and productivity tools are on our roadmap — reach out if there's one your team needs.",
  },
  {
    question: "Do you offer team or enterprise pricing?",
    answer:
      "Not yet — AIFlow currently offers Free and Pro plans for individual use. If your team needs custom pricing, reach out and we'll take a look.",
  },
]

export function FAQ() {
  return (
    <section id="faq" className="border-t border-border py-24">
      <Container className="max-w-3xl">
        <SectionHeading eyebrow="FAQ" title="Frequently asked questions" />
        <Accordion className="mt-12">
          {faqs.map(({ question, answer }) => (
            <AccordionItem key={question} value={question}>
              <AccordionTrigger>{question}</AccordionTrigger>
              <AccordionContent>{answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Container>
    </section>
  )
}
