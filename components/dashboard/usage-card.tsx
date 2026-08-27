import Link from "next/link"
import { Sparkles } from "lucide-react"

import type { Plan } from "@/lib/usage"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const PLAN_LABEL: Record<Plan, string> = { FREE: "Free", PRO: "Pro" }

export function UsageCard({
  plan,
  used,
  limit,
  remaining,
}: {
  plan: Plan
  used: number
  limit: number
  remaining: number
}) {
  const percent = Math.min(100, Math.round((used / limit) * 100))
  const isFree = plan === "FREE"
  const atLimit = remaining === 0

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Usage this month</CardTitle>
        <CardDescription>{PLAN_LABEL[plan]} plan generations</CardDescription>
        <CardAction>
          <Badge variant="outline">{PLAN_LABEL[plan]}</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between text-sm">
          <span className="font-medium">
            {used.toLocaleString()} / {limit.toLocaleString()}
          </span>
          <span className="text-muted-foreground">{percent}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all ${atLimit ? "bg-destructive" : "bg-primary"}`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className={`text-xs ${atLimit ? "text-destructive" : "text-muted-foreground"}`}>
          {atLimit
            ? "You've used all your generations this month."
            : `${remaining.toLocaleString()} generation${remaining === 1 ? "" : "s"} remaining`}
        </p>
      </CardContent>
      <CardFooter>
        {isFree ? (
          <Button
            size="sm"
            className="w-full"
            variant={atLimit ? "default" : "outline"}
            render={<Link href="/dashboard/billing" />}
          >
            <Sparkles /> Upgrade to Pro
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            render={<Link href="/dashboard/billing" />}
          >
            Manage plan
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
