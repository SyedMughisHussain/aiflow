import type { GenerationType } from "@/lib/generated/prisma/client"

export type WriterContentType = Extract<
  GenerationType,
  "BLOG_POST" | "PRODUCT_DESCRIPTION" | "SOCIAL_MEDIA" | "EMAIL" | "AD_COPY"
>

export const WRITER_CONTENT_TYPES: { value: WriterContentType; label: string }[] = [
  { value: "BLOG_POST", label: "Blog post" },
  { value: "PRODUCT_DESCRIPTION", label: "Product description" },
  { value: "SOCIAL_MEDIA", label: "Social media post" },
  { value: "EMAIL", label: "Email" },
  { value: "AD_COPY", label: "Advertisement" },
]

export type RewriteMode = "IMPROVE" | "SHORTEN" | "EXPAND" | "PROFESSIONAL" | "FRIENDLY"

export const REWRITE_MODES: { value: RewriteMode; label: string }[] = [
  { value: "IMPROVE", label: "Improve" },
  { value: "SHORTEN", label: "Shorten" },
  { value: "EXPAND", label: "Expand" },
  { value: "PROFESSIONAL", label: "Professional" },
  { value: "FRIENDLY", label: "Friendly" },
]
