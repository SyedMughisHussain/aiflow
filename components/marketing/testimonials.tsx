import { Container } from "@/components/layout/container"
import { SectionHeading } from "@/components/marketing/section-heading"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"

interface Testimonial {
  quote: string
  name: string
  title: string
  company: string
  initials: string
}

const testimonials: Testimonial[] = [
  {
    quote:
      "AIFlow cut our content production time in half. What used to take a week now takes two days.",
    name: "Sarah Chen",
    title: "Head of Content",
    company: "Northwind Studio",
    initials: "SC",
  },
  {
    quote:
      "The AI actually sounds like us. That's the difference — it doesn't feel like generic AI copy.",
    name: "Marcus Webb",
    title: "Marketing Director",
    company: "Vertex Media",
    initials: "MW",
  },
  {
    quote:
      "Our team finally has one place for drafts, approvals, and scheduling. No more scattered docs.",
    name: "Priya Nair",
    title: "Operations Lead",
    company: "Lumen Analytics",
    initials: "PN",
  },
]

export function Testimonials() {
  return (
    <section className="border-t border-border py-24">
      <Container>
        <SectionHeading eyebrow="Testimonials" title="Teams get more done with AIFlow" />
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {testimonials.map(({ quote, name, title, company, initials }) => (
            <Card key={name}>
              <CardContent className="flex flex-col gap-6">
                <p className="text-sm leading-relaxed text-foreground">
                  &ldquo;{quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{name}</p>
                    <p className="text-sm text-muted-foreground">
                      {title}, {company}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  )
}
