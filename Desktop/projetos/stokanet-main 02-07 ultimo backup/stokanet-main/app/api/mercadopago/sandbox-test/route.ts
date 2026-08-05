import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'node:crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET || process.env.MERCADOPAGO_ACCESS_TOKEN || ''
    const timestamp = String(body.timestamp || Math.floor(Date.now() / 1000))
    const payload = typeof body.payload === 'string' ? body.payload : JSON.stringify(body.payload || { id: 123, type: 'payment' })
    const signature = createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex')

    return NextResponse.json({
      timestamp,
      signature,
      header: `ts=${timestamp},v1=${signature}`,
      endpoint: '/api/loja/webhook/mercadopago',
      secretConfigured: Boolean(secret),
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Falha ao gerar payload de teste' }, { status: 500 })
  }
}
