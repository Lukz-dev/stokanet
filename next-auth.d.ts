import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  // Isso força o TypeScript a aceitar o import do getServerSession direto de 'next-auth'
  export function getServerSession(...args: any[]): Promise<any>;

  interface Session {
    user: {
      id?: string
      role?: string
      isApproved?: boolean
      isSystemAdmin?: boolean
      companyId?: string | null
      companyName?: string | null
      rememberLogin?: boolean
      authExpiresAt?: number | null
      avatarVersion?: number | null
    } & DefaultSession['user']
  }

  interface User {
    id: string
    role?: string
    isApproved?: boolean
    isSystemAdmin?: boolean
    companyId?: string | null
    companyName?: string | null
    rememberLogin?: boolean
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    role?: string
    isApproved?: boolean
    isSystemAdmin?: boolean
    companyId?: string | null
    companyName?: string | null
    rememberLogin?: boolean
    authExpiresAt?: number | null
    avatarVersion?: number | null
  }
}

declare module 'next-auth/next' {
  export function getServerSession(...args: any[]): Promise<any>;
}

export {}
