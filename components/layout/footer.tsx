import Link from "next/link"

import { Container } from "@/components/layout/container"

const productLinks = [
  { href: "/#features", label: "Features" },
  { href: "/#ai-tools", label: "AI Tools" },
  { href: "/pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
]

export function Footer() {
  return (
    <footer className="border-t border-border">
      <Container className="py-12">
        <div className="flex flex-col justify-between gap-8 sm:flex-row">
          <div className="flex flex-col gap-2">
            <Link href="/" className="text-base font-semibold tracking-tight">
              AIFlow
            </Link>
            <p className="max-w-xs text-sm text-muted-foreground">
              AI-powered content creation and productivity, built for teams.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-sm font-medium">Product</span>
            <nav className="flex flex-col gap-2">
              {productLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>
        </div>
        <div className="mt-12 border-t border-border pt-6">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} AIFlow. All rights reserved.
          </p>
        </div>
      </Container>
    </footer>
  )
}
