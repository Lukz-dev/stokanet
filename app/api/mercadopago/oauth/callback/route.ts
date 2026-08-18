import { NextRequest, NextResponse } from 'next/server'
import { getActiveCompanyId } from '@/lib/access'
import { exchangeMercadoPagoOAuthCode } from '@/lib/mercadopago'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const url = request.nextUrl
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const savedState = request.cookies.get('mp_oauth_state')?.value

  if (!code || !state || !savedState || state !== savedState) {
    return NextResponse.redirect(new URL('/configuracoes?mercadopago=error&message=Autorizacao%20invalida.', request.url))
  }

  try {
    const companyId = await getActiveCompanyId()
    const token = await exchangeMercadoPagoOAuthCode(code)
    const expiresAt = token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null

    await prisma.company.update({
      where: { id: companyId },
      data: {
        mercadopagoAccessToken: token.access_token,
        mercadopagoRefreshToken: token.refresh_token ?? null,
        mercadopagoUserId: token.user_id ? String(token.user_id) : null,
        mercadopagoTokenExpiresAt: expiresAt,
        mercadopagoConnectedAt: new Date(),
      },
    })

    const response = NextResponse.redirect(new URL('/configuracoes?mercadopago=connected', request.url))
    response.cookies.delete('mp_oauth_state')
    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível conectar o Mercado Pago.'
    return NextResponse.redirect(new URL(`/configuracoes?mercadopago=error&message=${encodeURIComponent(message)}`, request.url))
  }
}