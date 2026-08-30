"use client"

import { useState, useTransition } from "react"
import { Loader2 } from "lucide-react"

import { cancelSubscriptionAction } from "@/app/dashboard/billing/actions"
import { Button } from "@/components/ui/button"
import { FormNotice } from "@/components/form-notice"

export function CancelPlanButton() {
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleCancel() {
    setError(null)
    startTransition(async () => {
      const result = await cancelSubscriptionAction()
      if (result.ok) {
        setConfirming(false)
      } else {
        setError(result.error)
      }
    })
  }

  if (!confirming) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setConfirming(true)}>
        Cancel plan
      </Button>
    )
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <p className="text-sm text-muted-foreground">
        You&apos;ll keep Pro access until the end of your current billing period. Cancel anyway?
      </p>
      <FormNotice message={error} />
      <div className="flex gap-2">
        <Button type="button" variant="destructive" size="sm" onClick={handleCancel} disabled={isPending}>
          {isPending ? <Loader2 className="animate-spin" /> : null}
          Yes, cancel plan
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setConfirming(false)}
          disabled={isPending}
        >
          Never mind
        </Button>
      </div>
    </div>
  )
}
