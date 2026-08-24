import Link from "next/link"

import { Container } from "@/components/layout/container"
import { Button } from "@/components/ui/button"

export function CTA() {
  return (
    <section id="cta" className="border-t border-border py-24">
      <Container className="flex flex-col items-center gap-6 text-center">
        <h2 className="max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
          Ready to create more, faster?
        </h2>
        <p className="max-w-md text-muted-foreground sm:text-lg">
          Join teams using AIFlow to turn ideas into finished content —
          without the busywork.
        </p>
        <Button size="lg" render={<Link href="/signup" />}>
          Get started free
        </Button>
      </Container>
    </section>
  )
}
