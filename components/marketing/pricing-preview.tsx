import Link from "next/link"
import { Check } from "lucide-react"

import { Container } from "@/components/layout/container"
import { SectionHeading } from "@/components/marketing/section-heading"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface Plan {
  name: string
  price: string
  period?: string
  description: string
  features: string[]
  cta: string
  ctaHref: string
  highlighted?: boolean
}

const plans: Plan[] = [
  {
    name: "Starter",
    price: "$0",
    description: "For individuals getting started",
    features: [
      "AI writing assistant (limited)",
      "1 workspace",
      "5 saved templates",
      "Community support",
    ],
    cta: "Get started free",
    ctaHref: "/signup",
  },
  {
    name: "Pro",
    price: "$24",
    period: "/user/mo",
    description: "For growing teams",
    features: [
      "Everything in Starter",
      "Unlimited AI generations",
      "Unlimited workspaces",
      "Content calendar & scheduling",
      "Priority support",
    ],
    cta: "Start free trial",
    ctaHref: "/signup",
    highlighted: true,
  },
  {
    name: "Business",
    price: "$59",
    period: "/user/mo",
    description: "For teams that need more control",
    features: [
      "Everything in Pro",
      "Advanced analytics",
      "Role-based permissions",
      "Brand voice tuning",
      "Dedicated support",
    ],
    cta: "Talk to sales",
    ctaHref: "#cta",
  },
]

export function PricingPreview() {
  return (
    <section id="pricing" className="border-t border-border py-24">
      <Container>
        <SectionHeading
          eyebrow="Pricing"
          title="Simple pricing that scales with your team"
          description="Start free. Upgrade when you're ready for more AI, more workspaces, and more control."
        />
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={cn(
                plan.highlighted && "ring-2 ring-primary"
              )}
            >
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>{plan.name}</CardTitle>
                  {plan.highlighted ? (
                    <Badge>Most popular</Badge>
                  ) : null}
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="flex items-baseline gap-1">
                  <span className="text-4xl font-semibold tracking-tight">
                    {plan.price}
                  </span>
                  {plan.period ? (
                    <span className="text-sm text-muted-foreground">
                      {plan.period}
                    </span>
                  ) : null}
                </p>
                <ul className="mt-6 flex flex-col gap-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="border-t-0 bg-transparent">
                <Button
                  className="w-full"
                  variant={plan.highlighted ? "default" : "outline"}
                  render={<Link href={plan.ctaHref} />}
                >
                  {plan.cta}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </Container>
    </section>
  )
}
