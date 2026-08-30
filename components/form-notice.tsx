import { AlertCircle, CheckCircle2 } from "lucide-react"

import { cn } from "@/lib/utils"

interface FormNoticeProps {
  variant?: "error" | "success"
  message?: string | null
}

export function FormNotice({ variant = "error", message }: FormNoticeProps) {
  if (!message) return null

  const Icon = variant === "error" ? AlertCircle : CheckCircle2

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-lg border px-3 py-2 text-sm",
        variant === "error"
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-primary/30 bg-primary/10 text-primary"
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </div>
  )
}
