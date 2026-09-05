import type { NextAuthConfig, Session } from "next-auth"
import type { JWT } from "next-auth/jwt"
import { NextResponse } from "next/server"

// Edge-safe config: no Prisma/bcrypt here, so this can run in Middleware.
// The Credentials provider (which needs the database) lives in lib/auth.ts.
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [],
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (user?.id) {
        token.id = user.id
        token.role = user.role
      }
      if (trigger === "update" && session?.user?.name !== undefined) {
        token.name = session.user.name
      }
      return token
    },
    session({ session, token }: { session: Session; token: JWT }) {
      if (session.user) {
        session.user.id = token.id
        session.user.role = token.role
      }
      return session
    },
    authorized({ request, auth }) {
      const { pathname } = request.nextUrl

      if (!pathname.startsWith("/dashboard")) return true
      if (!auth?.user) return false

      if (pathname.startsWith("/dashboard/admin") && auth.user.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/dashboard", request.nextUrl))
      }

      return true
    },
  },
} satisfies NextAuthConfig
