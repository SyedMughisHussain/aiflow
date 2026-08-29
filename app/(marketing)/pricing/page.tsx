import type { Metadata } from "next"
import Link from "next/link"
import { Check } from "lucide-react"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { PRO_SUBSCRIPTION_STATUSES } from "@/lib/usage"
import { createCheckoutSessionAction } from "@/app/dashboard/billing/actions"
import { PRICING_PLANS } from "@/components/marketing/pricing-plans-data"
import { Container } from "@/components/layout/container"
import { SectionHeading } from "@/components/marketing/section-heading"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Pricing — AIFlow",
}

export default async function PricingPage() {
  const session = await auth()
  let isPro = false

  if (session?.user) {
    const subscription = await db.subscription.findUnique({
      where: { userId: session.user.id },
      select: { status: true },
    })
    isPro = subscription ? PRO_SUBSCRIPTION_STATUSES.has(subscription.status) : false
  }

  return (
    <div className="py-24">
      <Container>
        <SectionHeading
          eyebrow="Pricing"
          title="Simple pricing that scales with you"
          description="Start free. Upgrade to Pro when you need more AI generations."
        />
        <div className="mx-auto mt-12 grid max-w-3xl gap-6 sm:grid-cols-2">
          {PRICING_PLANS.map((plan) => {
            const isCurrent = session ? (plan.id === "pro") === isPro : false

            return (
              <Card key={plan.id} className={cn(plan.id === "pro" && "ring-2 ring-primary")}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CardTitle>{plan.name}</CardTitle>
                    {plan.id === "pro" ? <Badge>Most popular</Badge> : null}
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                  {isCurrent ? (
                    <CardAction>
                      <Badge variant="outline">Current plan</Badge>
                    </CardAction>
                  ) : null}
                </CardHeader>
                <CardContent>
                  <p className="flex items-baseline gap-1">
                    <span className="text-4xl font-semibold tracking-tight">{plan.price}</span>
                    {plan.period ? (
                      <span className="text-sm text-muted-foreground">{plan.period}</span>
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
                  {!session ? (
                    <Button className="w-full" render={<Link href="/signup" />}>
                      {plan.id === "pro" ? "Upgrade to Pro" : "Get started free"}
                    </Button>
                  ) : plan.id === "pro" && !isPro ? (
                    <form action={createCheckoutSessionAction} className="w-full">
                      <Button type="submit" className="w-full">
                        Upgrade to Pro
                      </Button>
                    </form>
                  ) : null}
                </CardFooter>
              </Card>
            )
          })}
        </div>
      </Container>
    </div>
  )
}
