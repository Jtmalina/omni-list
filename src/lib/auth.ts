import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import prisma from "@/lib/prisma"
import authConfig from "@/auth.config"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub
        
        // Background update for lastLoginAt (throttled)
        const now = new Date()
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
        
        // We don't await this to keep the session response fast
        prisma.user.updateMany({
          where: { 
            id: token.sub,
            OR: [
              { lastLoginAt: null },
              { lastLoginAt: { lt: oneHourAgo } }
            ]
          },
          data: { lastLoginAt: now }
        }).catch(err => console.error("Failed to update lastLoginAt:", err))
      }
      return session
    },
  },
})
