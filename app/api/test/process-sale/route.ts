import prisma from '@/lib/prisma'

if (process.env.NODE_ENV === 'production') {
  throw new Error('Test endpoints disabled in production')
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const { companyId, items = [], paymentMethod, discount = 0, notes } = body

  if (!companyId) {
    return new Response(JSON.stringify({ error: 'companyId required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    })
  }
  if (!Array.isArray(items) || items.length === 0) {
    return new Response(JSON.stringify({ error: 'items required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    })
  }

  try {
    const productIds = [...new Set(items.map((i: any) => i.productId))]
    const products = await prisma.product.findMany({ where: { companyId, id: { in: productIds } } })

    let subtotal = 0
    for (const item of items) {
      const p = products.find((x) => x.id === item.productId)
      if (!p) {
        return new Response(JSON.stringify({ error: 'product_not_found', productId: item.productId }), {
          status: 422,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        })
      }
      if (p.stockQty < item.quantity) {
        return new Response(JSON.stringify({ error: 'insufficient_stock', productId: p.id }), {
          status: 422,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        })
      }
      subtotal += p.price * item.quantity
    }

    const boundedDiscount = Math.min(Number(discount) || 0, subtotal)
    const total = Math.max(0, subtotal - boundedDiscount)
    const sale = await prisma.$transaction(async (tx) => {
      const s = await tx.sale.create({ data: { code: `TEST-${Date.now()}`, subtotal, discount: boundedDiscount, total, paymentMethod: paymentMethod || null, notes: notes || null, companyId } as any })
      for (const item of items) {
        const p = products.find((x) => x.id === item.productId)
        await tx.saleItem.create({ data: { saleId: s.id, productId: p.id, productName: p.name, sku: p.sku, quantity: item.quantity, unitPrice: p.price, total: p.price * item.quantity } })
        await tx.product.update({ where: { id: p.id }, data: { stockQty: { decrement: item.quantity } } as any })
        await tx.movement.create({ data: { type: 'SAIDA', quantity: item.quantity, reason: `Teste venda ${s.code}`, productId: p.id, companyId } })
      }
      return s
    })

    return new Response(JSON.stringify({ sale }), {
      status: 201,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    })
  } catch (error) {
    console.error('[test:process-sale] error', error)
    return new Response(JSON.stringify({ error: 'internal' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    })
  }
}