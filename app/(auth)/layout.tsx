import Link from "next/link";
import type { ReactNode } from "react";

import { Container } from "@/components/layout/container";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="border-b border-border">
        <Container className="flex h-16 items-center justify-between">
          <Link href="/" className="text-base font-semibold tracking-tight">
            Promptly
          </Link>
          <ThemeToggle />
        </Container>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        {children}
      </main>
    </>
  );
}
