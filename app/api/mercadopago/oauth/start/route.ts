import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { getActiveCompanyId } from '@/lib/access'
import { buildMercadoPagoOAuthUrl } from '@/lib/mercadopago'

export async function GET(request: Request) {
  try {
    await getActiveCompanyId()
    const state = randomBytes(32).toString('hex')
    const response = NextResponse.redirect(buildMercadoPagoOAuthUrl(state))
    response.cookies.set('mp_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600,
      path: '/',
    })
    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível iniciar a conexão.'
    return NextResponse.redirect(new URL(`/configuracoes?mercadopago=error&message=${encodeURIComponent(message)}`, request.url))
  }
}