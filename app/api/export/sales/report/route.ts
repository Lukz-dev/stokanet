import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getActiveCompanyId } from '@/lib/access'

function csvEscape(value: string | number | null | undefined) {
  const normalized = String(value ?? '')
  return `"${normalized.replace(/"/g, '""')}"`
}

function parseDateParam(value: string | null) {
  if (!value) {
    throw new Error('Informe a data no formato YYYY-MM-DD.')
  }

  const normalized = value.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    const parsed = new Date(`${normalized}T00:00:00.000Z`)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }

  const slashMatch = normalized.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (slashMatch) {
    const [, day, month, year] = slashMatch
    const parsed = new Date(`${year}-${month}-${day}T00:00:00.000Z`)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }

  throw new Error('Data inválida. Use YYYY-MM-DD ou DD/MM/YYYY.')
}

function dayBounds(day: Date) {
  const start = new Date(day)
  start.setUTCHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 1)
  return { start, end }
}

export async function GET(request: Request) {
  try {
    const companyId = await getActiveCompanyId()
    const url = new URL(request.url)
    const day = parseDateParam(url.searchParams.get('date'))
    const userEmail = url.searchParams.get('userEmail')?.trim().toLowerCase() || ''
    const userName = url.searchParams.get('userName')?.trim().toLowerCase() || ''

    const { start, end } = dayBounds(day)

    const sales = await prisma.sale.findMany({
      where: {
        companyId,
        createdAt: { gte: start, lt: end },
      },
      include: {
        items: {
          include: {
            product: { select: { purchaseCost: true } },
          },
          orderBy: { id: 'asc' },
        },
        customer: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    const saleIds = sales.map((sale) => sale.id)
    const auditLogs = saleIds.length
      ? await prisma.auditLog.findMany({
          where: {
            companyId,
            entity: 'SALE',
            action: 'CREATE',
            entityId: { in: saleIds },
          },
        })
      : []

    const userIds = [...new Set(auditLogs.map((log) => log.userId).filter((value): value is string => Boolean(value)))]
    const users = userIds.length
      ? await prisma.user.findMany({
          where: { id: { in: userIds }, companyId },
          select: { id: true, name: true, email: true },
        })
      : []

    const userById = new Map(users.map((user) => [user.id, user]))
    const auditBySaleId = new Map(auditLogs.map((log) => [log.entityId ?? '', log]))

    const filteredSales = sales.filter((sale) => {
      const audit = auditBySaleId.get(sale.id)
      const seller = audit?.userId ? userById.get(audit.userId) : null
      const saleUserName = (seller?.name ?? '').toLowerCase()
      const saleUserEmail = (seller?.email ?? '').toLowerCase()

      if (userEmail && saleUserEmail !== userEmail) {
        return false
      }

      if (userName && !saleUserName.includes(userName)) {
        return false
      }

      return true
    })

    const headers = [
      'venda_codigo',
      'criado_em',
      'usuario_nome',
      'usuario_email',
      'forma_pagamento',
      'subtotal',
      'desconto',
      'total',
      'cancelada',
      'produto',
      'sku',
      'quantidade',
      'preco_unitario',
      'custo_unitario',
      'custo_total',
      'lucro_bruto_item',
      'total_item',
      'cliente_nome',
      'cliente_documento',
    ]

    const lines = [headers.map(csvEscape).join(',')]

    for (const sale of filteredSales) {
      const audit = auditBySaleId.get(sale.id)
      const seller = audit?.userId ? userById.get(audit.userId) : null
      const sellerName = seller?.name ?? ''
      const sellerEmail = seller?.email ?? ''
      const cancelled = (sale.notes ?? '').includes('[CANCELADA]')

      for (const item of sale.items) {
        const itemCost = Number((item.quantity * item.product?.purchaseCost).toFixed(2))
        const itemProfit = Number((item.total - itemCost).toFixed(2))
        lines.push([
          sale.code,
          sale.createdAt.toISOString(),
          sellerName,
          sellerEmail,
          sale.paymentMethod ?? '',
          sale.subtotal.toFixed(2),
          sale.discount.toFixed(2),
          sale.total.toFixed(2),
          cancelled ? 'SIM' : 'NAO',
          item.productName,
          item.sku,
          item.quantity,
          item.unitPrice.toFixed(2),
          item.product?.purchaseCost?.toFixed(2) ?? '0.00',
          itemCost.toFixed(2),
          itemProfit.toFixed(2),
          item.total.toFixed(2),
          sale.customer?.name ?? '',
          sale.customer?.cpfCnpj ?? '',
        ].map(csvEscape).join(','))
      }
    }

    const fileDate = day.toISOString().slice(0, 10)
    const suffix = userEmail || userName ? '-filtrado' : ''

    return new NextResponse(lines.join('\n'), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="vendas-${fileDate}${suffix}.csv"`,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao gerar relatório de vendas.' },
      { status: 400 },
    )
  }
}
