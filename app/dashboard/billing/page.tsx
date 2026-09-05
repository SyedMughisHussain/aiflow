import type { Metadata } from "next"
import { Check, CreditCard, Download } from "lucide-react"

import { requireUser } from "@/lib/auth-guard"
import { checkUsageLimit } from "@/lib/usage"
import { getSubscriptionDetails } from "@/lib/subscription-service"
import { createCheckoutSessionAction } from "@/app/dashboard/billing/actions"
import { PRICING_PLANS } from "@/components/marketing/pricing-plans-data"
import { CancelPlanButton } from "@/components/dashboard/cancel-plan-button"
import { PageHeader } from "@/components/dashboard/page-header"
import { UsageCard } from "@/components/dashboard/usage-card"
import { EmptyState } from "@/components/dashboard/empty-state"
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

export const metadata: Metadata = {
  title: "Billing — Promptly",
}

export default async function BillingPage(props: PageProps<"/dashboard/billing">) {
  const user = await requireUser()
  const searchParams = await props.searchParams
  const checkoutStatus =
    typeof searchParams.checkout === "string" ? searchParams.checkout : undefined

  const [usage, subscriptionDetails] = await Promise.all([
    checkUsageLimit(user.id),
    getSubscriptionDetails(user.id),
  ])

  const isPro = usage.plan === "PRO"
  const isCanceling = Boolean(subscriptionDetails?.cancelAtPeriodEnd)
  const periodEndLabel = subscriptionDetails?.currentPeriodEnd
    ? subscriptionDetails.currentPeriodEnd.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null

  return (
    <>
      <PageHeader title="Billing" description="Manage your subscription and view invoices." />
      {checkoutStatus === "success" && isPro ? (
        <div className="rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm text-primary">
          You&apos;re now on the Pro plan. Thanks for upgrading!
        </div>
      ) : null}
      {checkoutStatus === "success" && !isPro ? (
        <div className="rounded-lg border border-border bg-muted p-3 text-sm text-muted-foreground">
          Finalizing your upgrade — this can take a few seconds. Refresh if it doesn&apos;t update shortly.
        </div>
      ) : null}
      {checkoutStatus === "cancelled" ? (
        <div className="rounded-lg border border-border bg-muted p-3 text-sm text-muted-foreground">
          Checkout was cancelled. You&apos;re still on the Free plan.
        </div>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <UsageCard plan={usage.plan} used={usage.used} limit={usage.limit} remaining={usage.remaining} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
          {PRICING_PLANS.map((plan) => {
            const isCurrent = (plan.id === "pro") === isPro

            return (
              <Card key={plan.id}>
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  {isCurrent ? (
                    <CardAction>
                      <Badge variant="outline">Current plan</Badge>
                    </CardAction>
                  ) : null}
                </CardHeader>
                <CardContent>
                  <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <Check className="size-4 shrink-0 text-foreground" /> {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                {plan.id === "pro" && !isPro ? (
                  <CardFooter>
                    <form action={createCheckoutSessionAction} className="w-full">
                      <Button type="submit" className="w-full">
                        <CreditCard /> Upgrade to Pro
                      </Button>
                    </form>
                  </CardFooter>
                ) : null}
                {plan.id === "pro" && isPro ? (
                  <CardFooter className="flex-col items-start gap-2">
                    {isCanceling && periodEndLabel ? (
                      <p className="text-sm text-muted-foreground">
                        Cancels on {periodEndLabel}. You&apos;ll keep Pro access until then.
                      </p>
                    ) : (
                      <CancelPlanButton />
                    )}
                  </CardFooter>
                ) : null}
              </Card>
            )
          })}
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>Your billing history.</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Download}
            title="No invoices yet"
            description="Invoices will appear here after you upgrade to a paid plan."
          />
        </CardContent>
      </Card>
    </>
  )
}
