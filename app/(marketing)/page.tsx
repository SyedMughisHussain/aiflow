import { Hero } from "@/components/marketing/hero"
import { TrustedBy } from "@/components/marketing/trusted-by"
import { Features } from "@/components/marketing/features"
import { AITools } from "@/components/marketing/ai-tools"
import { HowItWorks } from "@/components/marketing/how-it-works"
import { PricingPreview } from "@/components/marketing/pricing-preview"
import { Testimonials } from "@/components/marketing/testimonials"
import { FAQ } from "@/components/marketing/faq"
import { CTA } from "@/components/marketing/cta"

export default function Home() {
  return (
    <>
      <Hero />
      <TrustedBy />
      <Features />
      <AITools />
      <HowItWorks />
      <PricingPreview />
      <Testimonials />
      <FAQ />
      <CTA />
    </>
  )
}
