import { NextResponse } from 'next/server'
import { createStorefrontCheckout } from '@/lib/storefront'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))

    const result = await createStorefrontCheckout({
      slug: typeof body.slug === 'string' ? body.slug : '',
      items: Array.isArray(body.items) ? body.items : [],
      customer: typeof body.customer === 'object' && body.customer !== null ? body.customer : undefined,
      discount: typeof body.discount === 'number' ? body.discount : 0,
      notes: typeof body.notes === 'string' ? body.notes : undefined,
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Falha ao iniciar checkout.' }, { status: 400 })
  }
}