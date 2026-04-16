import NextAuth, { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'E-mail Corporativo',
      credentials: {
        email: { label: 'E-mail', type: 'email', placeholder: 'seu@email.com' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { company: true },
        })

        if (!user) return null

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password)
        if (!isPasswordValid) return null

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          isApproved: user.isApproved,
          isSystemAdmin: user.isSystemAdmin,
          companyId: user.companyId,
          companyName: user.company?.name ?? null,
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60,
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.isApproved = (user as any).isApproved
        token.isSystemAdmin = (user as any).isSystemAdmin
        token.companyId = (user as any).companyId
        token.companyName = (user as any).companyName
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).id = token.id
        ;(session.user as any).role = token.role
        ;(session.user as any).isApproved = token.isApproved
        ;(session.user as any).isSystemAdmin = token.isSystemAdmin
        ;(session.user as any).companyId = token.companyId
        ;(session.user as any).companyName = token.companyName
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }