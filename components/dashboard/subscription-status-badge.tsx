import { Badge } from "@/components/ui/badge"
import type { SubscriptionStatus } from "@/lib/generated/prisma/client"

const VARIANT_BY_STATUS: Record<SubscriptionStatus, "default" | "secondary" | "destructive" | "outline"> = {
  FREE: "outline",
  TRIALING: "default",
  ACTIVE: "default",
  PAST_DUE: "destructive",
  UNPAID: "destructive",
  CANCELED: "secondary",
  INCOMPLETE: "secondary",
  INCOMPLETE_EXPIRED: "secondary",
}

const LABEL_BY_STATUS: Record<SubscriptionStatus, string> = {
  FREE: "Free",
  TRIALING: "Trialing",
  ACTIVE: "Active",
  PAST_DUE: "Past due",
  UNPAID: "Unpaid",
  CANCELED: "Canceled",
  INCOMPLETE: "Incomplete",
  INCOMPLETE_EXPIRED: "Expired",
}

export function SubscriptionStatusBadge({ status }: { status: SubscriptionStatus }) {
  return <Badge variant={VARIANT_BY_STATUS[status]}>{LABEL_BY_STATUS[status]}</Badge>
}
