import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export default async function proxy(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const pathname = req.nextUrl.pathname

  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const isApproved = token.isApproved === true || token.isSystemAdmin === true
  const isSystemAdmin = token.isSystemAdmin === true

  if (!isApproved && pathname !== '/pending') {
    return NextResponse.redirect(new URL('/pending', req.url))
  }

  if (pathname.startsWith('/admin') && !isSystemAdmin) {
    return NextResponse.redirect(new URL('/pending', req.url))
  }

  if (pathname.startsWith('/configuracoes')) {
    const role = String(token.role ?? 'OPERATOR')
    if (role !== 'ADMIN' && role !== 'MANAGER') {
      return NextResponse.redirect(new URL('/', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api/auth|login|signup|_next/static|_next/image|favicon.ico).*)',
  ],
}

