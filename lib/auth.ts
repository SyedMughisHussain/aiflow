import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"

import { authConfig } from "@/lib/auth.config"
import { verifyCredentials } from "@/lib/user-service"

export const { handlers, auth, signIn, signOut, unstable_update: updateSession } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        const email = credentials?.email
        const password = credentials?.password

        if (typeof email !== "string" || typeof password !== "string") {
          return null
        }

        return verifyCredentials(email, password)
      },
    }),
  ],
})
