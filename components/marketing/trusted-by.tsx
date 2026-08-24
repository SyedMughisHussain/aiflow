import { Container } from "@/components/layout/container"

const companies = [
  "Northwind Studio",
  "Vertex Media",
  "Lumen Analytics",
  "Fernwood & Co",
  "Halcyon Labs",
  "Ridgeline Systems",
]

export function TrustedBy() {
  return (
    <section className="border-t border-border py-16">
      <Container>
        <p className="text-center text-sm text-muted-foreground">
          Trusted by content and marketing teams at
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {companies.map((company) => (
            <span
              key={company}
              className="text-lg font-semibold tracking-tight text-muted-foreground/70"
            >
              {company}
            </span>
          ))}
        </div>
      </Container>
    </section>
  )
}
