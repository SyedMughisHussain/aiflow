import Link from "next/link"

import { Container } from "@/components/layout/container"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export function Hero() {
  return (
    <section className="py-24 sm:py-32">
      <Container className="flex flex-col items-center text-center">
        <Badge variant="secondary">AI-powered writing</Badge>
        <h1 className="mt-6 max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Write, rewrite, and brainstorm content in one place
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          AIFlow is an AI writing assistant for blog posts, product
          descriptions, social copy, emails, and ads — plus an AI chat and
          rewriter to refine anything you draft, all with a saved history you
          can come back to.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button size="lg" render={<Link href="/signup" />}>
            Get started free
          </Button>
          <Button size="lg" variant="outline" render={<a href="#how-it-works" />}>
            See how it works
          </Button>
        </div>
      </Container>
    </section>
  )
}
