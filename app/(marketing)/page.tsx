import { Hero } from "@/components/marketing/hero"
import { Features } from "@/components/marketing/features"
import { AITools } from "@/components/marketing/ai-tools"
import { HowItWorks } from "@/components/marketing/how-it-works"
import { PricingPreview } from "@/components/marketing/pricing-preview"
import { FAQ } from "@/components/marketing/faq"
import { CTA } from "@/components/marketing/cta"

export default function Home() {
  return (
    <>
      <Hero />
      <Features />
      <AITools />
      <HowItWorks />
      <PricingPreview />
      <FAQ />
      <CTA />
    </>
  )
}
