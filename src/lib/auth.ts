import { NextAuthOptions } from 'next-auth'
import GithubProvider from 'next-auth/providers/github'
import GoogleProvider from 'next-auth/providers/google'
import { db } from './db'

export const authOptions: NextAuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!account || !user) return false

      const existingUser = await db.user.findUnique({
        where: {
          provider_providerId: {
            provider: account.provider,
            providerId: account.providerAccountId,
          },
        },
      })

      if (!existingUser) {
        await db.user.create({
          data: {
            provider: account.provider,
            providerId: account.providerAccountId,
            name: user.name,
            email: user.email,
            image: user.image,
            settings: {
              create: {},
            },
          },
        })
      } else {
        // Update user info on each sign in
        await db.user.update({
          where: { id: existingUser.id },
          data: {
            name: user.name,
            email: user.email,
            image: user.image,
          },
        })
      }

      return true
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string
      }
      return session
    },
    async jwt({ token, account, user }) {
      if (account && user) {
        const dbUser = await db.user.findUnique({
          where: {
            provider_providerId: {
              provider: account.provider,
              providerId: account.providerAccountId,
            },
          },
        })
        if (dbUser) {
          token.sub = dbUser.id
        }
      }
      return token
    },
  },
  pages: {
    signIn: '/',
    error: '/',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET || 'development-secret-key-change-in-production',
}
