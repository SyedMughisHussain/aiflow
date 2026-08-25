import "dotenv/config"
import { defineConfig } from "prisma/config"

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Migrations need a direct (non-pooled) connection — Neon's pooler runs
    // in transaction mode, which breaks Prisma Migrate's DDL statements.
    url: process.env.DIRECT_URL,
  },
})
