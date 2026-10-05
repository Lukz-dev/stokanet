import { NextResponse } from 'next/server'
import { createStorefrontCheckout } from '@/lib/storefront'

const checkoutAttempts = new Map<string, { count: number; expiresAt: number }>()
const WINDOW_MS = 60_000
const MAX_ATTEMPTS = 10

function clientIp(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}

function allowed(ip: string) {
  const now = Date.now()
  const current = checkoutAttempts.get(ip)
  if (!current || current.expiresAt <= now) {
    checkoutAttempts.set(ip, { count: 1, expiresAt: now + WINDOW_MS })
    return true
  }
  if (current.count >= MAX_ATTEMPTS) return false
  current.count += 1
  return true
}

export async function POST(request: Request) {
  if (!allowed(clientIp(request))) {
    return NextResponse.json({ error: 'Limite de tentativas excedido. Aguarde um minuto.' }, { status: 429 })
  }
  const contentLength = Number(request.headers.get('content-length') ?? 0)
  if (contentLength > 128 * 1024) {
    return NextResponse.json({ error: 'Requisição muito grande.' }, { status: 413 })
  }
  try {
    const body = await request.json().catch(() => ({}))

    const result = await createStorefrontCheckout({
      slug: typeof body.slug === 'string' ? body.slug : '',
      items: Array.isArray(body.items) ? body.items : [],
      customer: typeof body.customer === 'object' && body.customer !== null ? body.customer : undefined,
      deliveryMethod: body.deliveryMethod === 'PICKUP' ? 'PICKUP' : 'DELIVERY',
      paymentMethod: String(body.paymentMethod ?? '').toUpperCase() === 'CASH' ? 'CASH' : 'MERCADOPAGO',
      cashReceived: typeof body.cashReceived === 'number' ? body.cashReceived : undefined,
      discount: 0,
      notes: typeof body.notes === 'string' ? body.notes : undefined,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Falha ao processar checkout público:', error)
    return NextResponse.json({ error: 'Não foi possível concluir o pedido.' }, { status: 400 })
  }
}