import type { Metadata } from "next"
import { Check, CreditCard, Download } from "lucide-react"

import { requireUser } from "@/lib/auth-guard"
import { checkUsageLimit, FREE_PLAN_MONTHLY_LIMIT, PRO_PLAN_MONTHLY_LIMIT } from "@/lib/usage"
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
  title: "Billing — AIFlow",
}

const PLAN_FEATURES: Record<"FREE" | "PRO", string[]> = {
  FREE: [`${FREE_PLAN_MONTHLY_LIMIT} AI generations / month`, "Community support"],
  PRO: [
    `${PRO_PLAN_MONTHLY_LIMIT} AI generations / month`,
    "Priority support",
    "Advanced AI models",
  ],
}

export default async function BillingPage() {
  const user = await requireUser()
  const usage = await checkUsageLimit(user.id)

  return (
    <>
      <PageHeader title="Billing" description="Manage your subscription and view invoices." />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <UsageCard
            plan={usage.plan}
            used={usage.used}
            limit={usage.limit}
            remaining={usage.remaining}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Free</CardTitle>
              <CardDescription>Get started at no cost.</CardDescription>
              {usage.plan === "FREE" ? (
                <CardAction>
                  <Badge variant="outline">Current plan</Badge>
                </CardAction>
              ) : null}
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
                {PLAN_FEATURES.FREE.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="size-4 shrink-0 text-foreground" /> {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Pro</CardTitle>
              <CardDescription>For heavier, more frequent use.</CardDescription>
              {usage.plan === "PRO" ? (
                <CardAction>
                  <Badge variant="outline">Current plan</Badge>
                </CardAction>
              ) : null}
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
                {PLAN_FEATURES.PRO.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="size-4 shrink-0 text-foreground" /> {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
            {usage.plan === "FREE" ? (
              <CardFooter>
                <Button disabled className="w-full">
                  <CreditCard /> Upgrade to Pro
                </Button>
              </CardFooter>
            ) : null}
          </Card>
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
