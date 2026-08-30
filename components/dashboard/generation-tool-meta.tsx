import { FileText, Wand2, type LucideIcon } from "lucide-react"

import type { GenerationTool } from "@/lib/dashboard-service"

export const GENERATION_TOOL_META: Record<GenerationTool, { label: string; icon: LucideIcon }> = {
  writer: { label: "AI Writer", icon: FileText },
  rewrite: { label: "Rewrite", icon: Wand2 },
}
