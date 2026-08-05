import { NextRequest, NextResponse } from 'next/server'
import { finalizeStorefrontOrderFromPayment } from '@/lib/storefront'
import { verifyMercadoPagoWebhookSignature } from '@/lib/mercadopago'

function normalizeResourceId(value: unknown) {
  if (value == null) return null
  if (typeof value === 'object' && value !== null && 'id' in value) {
    return normalizeResourceId((value as { id?: unknown }).id)
  }

  const rawValue = String(value).trim()
  return rawValue || null
}

async function fetchPayment(id: string) {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN || ''
  if (!accessToken) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN não configurado')
  }

  const response = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`Falha ao consultar pagamento (${response.status})`)
  }

  return response.json()
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const body = JSON.parse(rawBody || '{}')
    const signatureHeader = request.headers.get('x-signature')
    const signatureResult = verifyMercadoPagoWebhookSignature(
      signatureHeader,
      rawBody,
      process.env.MERCADOPAGO_WEBHOOK_SECRET || process.env.MERCADOPAGO_ACCESS_TOKEN || ''
    )

    if (!signatureResult.ok && !signatureResult.skipped) {
      console.warn('Webhook Mercado Pago rejeitado por assinatura inválida', { signatureResult })
      return NextResponse.json({ success: false, error: 'Assinatura inválida' }, { status: 401 })
    }

    const paymentId = normalizeResourceId(body?.data?.id ?? body?.id ?? body?.resource?.id ?? body?.resource)

    if (!paymentId) {
      return NextResponse.json({ success: true, ignored: true })
    }

    console.log('Webhook Mercado Pago processando pagamento', { paymentId, signatureResult })
    const payment = await fetchPayment(paymentId)
    const result = await finalizeStorefrontOrderFromPayment(payment)

    return NextResponse.json({ success: true, result })
  } catch (error) {
    console.error('Erro ao processar webhook da loja', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Erro ao processar webhook da loja' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'webhook da loja ativo' })
}