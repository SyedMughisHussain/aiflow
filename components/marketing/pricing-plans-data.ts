import { FREE_PLAN_MONTHLY_LIMIT, PRO_PLAN_MONTHLY_LIMIT } from "@/lib/usage"

export interface PricingPlan {
  id: "free" | "pro"
  name: string
  price: string
  period?: string
  description: string
  features: string[]
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    description: "Get started at no cost.",
    features: [
      `${FREE_PLAN_MONTHLY_LIMIT} AI generations / month`,
      "AI Writer, Rewriter & Chat",
      "Community support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$19",
    period: "/month",
    description: "For heavier, more frequent use.",
    features: [
      `${PRO_PLAN_MONTHLY_LIMIT} AI generations / month`,
      "AI Writer, Rewriter & Chat",
      "Priority support",
    ],
  },
]
