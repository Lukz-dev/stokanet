import { NextResponse } from 'next/server'
import { processSaleWithNfe } from '@/lib/sales/processSaleWithNfe'
import { NfeIntegrationError } from '@/lib/nfe/types'
import prisma from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      items?: Array<{ productId: string; quantity: number }>
      paymentMethod?: string
      discount?: number
      notes?: string
      customerId?: string | null
    }

    const result = await processSaleWithNfe({
      items: body.items ?? [],
      paymentMethod: body.paymentMethod,
      discount: body.discount,
      notes: body.notes,
      customerId: body.customerId ?? null,
    })

    if (result.sale.nfe.status === 'REJEITADO') {
      return NextResponse.json(
        {
          error: {
            type: 'NFE_REJECTED',
            message: result.sale.nfe.sefazMessage ?? 'NF-e rejeitada.',
            sefazCode: result.sale.nfe.sefazCode,
            details: result.sale.nfe.raw ?? null,
          },
          sale: result.sale,
        },
        { status: 422 },
      )
    }

    if (result.sale.nfe.status !== 'AUTORIZADO') {
      return NextResponse.json(
        {
          sale: result.sale,
          warning: {
            type: 'NFE_PROCESSING',
            message: 'NF-e em processamento. Consulte novamente mais tarde.',
          },
        },
        { status: 202 },
      )
    }

    return NextResponse.json({ sale: result.sale }, { status: 201 })
  } catch (error) {
    console.error('[api:/api/sales] Unexpected error', { error })
    try {
      await prisma.auditLog.create({
        data: {
          action: 'API_SALES_ERROR',
          entity: 'SALE',
          details: error instanceof Error ? error.message : String(error),
          companyId: null,
        },
      })
    } catch (e) {
      console.error('[api:/api/sales] Failed to write audit log', e)
    }

    if (error instanceof NfeIntegrationError) {
      return NextResponse.json(
        {
          error: {
            type: error.code,
            message: error.message,
            details: error.details ?? null,
          },
        },
        { status: error.code === 'ENV_MISSING' ? 500 : 400 },
      )
    }

    return NextResponse.json(
      {
        error: {
          type: 'UNEXPECTED',
          message: error instanceof Error ? error.message : 'Erro inesperado.',
        },
      },
      { status: 500 },
    )
  }
}
