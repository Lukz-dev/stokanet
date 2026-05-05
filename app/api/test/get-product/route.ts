import prisma from '@/lib/prisma'

if (process.env.NODE_ENV === 'production') {
  throw new Error('Test endpoints disabled in production')
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const productId = url.searchParams.get('productId')

  if (!productId) {
    return new Response(JSON.stringify({ error: 'productId required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    })
  }

  const product = await prisma.product.findUnique({ where: { id: productId } })

  if (!product) {
    return new Response(JSON.stringify({ error: 'not_found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    })
  }

  return new Response(JSON.stringify({ product }), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}