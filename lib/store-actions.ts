'use server'

import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { getActiveCompanyId } from '@/lib/access'
import { revalidatePath } from 'next/cache'
import { finalizeStorefrontOrderFromPayment } from '@/lib/storefront'

export type StoreOrderEditInput = {
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  notes?: string
  shippingAddress?: Record<string, string>
}

export async function approveStoreOrder(orderId: string) {
  const companyId = await getActiveCompanyId()
  const order = await prisma.storeOrder.findFirst({ where: { id: orderId, companyId }, select: { id: true, code: true, status: true } })
  if (!order) throw new Error('Pedido não encontrado.')
  if (order.status === 'APPROVED') return
  if (order.status === 'CANCELLED') throw new Error('Pedido cancelado não pode ser aprovado.')

  await finalizeStorefrontOrderFromPayment({
    id: `manual-${order.id}`,
    status: 'approved',
    external_reference: order.code,
    payment_type_id: 'manual',
    date_approved: new Date().toISOString(),
  }, order.code)
  revalidatePath('/loja/pedidos')
  revalidatePath('/estoque')
  revalidatePath('/vendas')
}

export async function cancelStoreOrder(orderId: string) {
  const companyId = await getActiveCompanyId()
  const result = await prisma.storeOrder.updateMany({
    where: { id: orderId, companyId, status: { not: 'APPROVED' } },
    data: { status: 'CANCELLED', mercadopagoStatus: 'cancelled' },
  })
  if (!result.count) throw new Error('Pedido não encontrado ou já aprovado.')
  revalidatePath('/loja/pedidos')
}

export async function editStoreOrder(orderId: string, input: StoreOrderEditInput) {
  const companyId = await getActiveCompanyId()
  const order = await prisma.storeOrder.findFirst({ where: { id: orderId, companyId }, select: { id: true, deliveryMethod: true } })
  if (!order) throw new Error('Pedido não encontrado.')

  await prisma.storeOrder.update({
    where: { id: order.id },
    data: {
      customerName: input.customerName?.trim() || null,
      customerEmail: input.customerEmail?.trim() || null,
      customerPhone: input.customerPhone?.trim() || null,
      notes: input.notes?.trim() || null,
      shippingAddress: order.deliveryMethod === 'DELIVERY' && input.shippingAddress ? input.shippingAddress : Prisma.JsonNull,
    },
  })
  revalidatePath('/loja/pedidos')
}

export async function setStoreProductPublished(productId: string, published: boolean) {
  const companyId = await getActiveCompanyId()
  await prisma.product.updateMany({
    where: { id: productId, companyId, status: { not: 'Arquivado' } },
    data: { storePublished: published },
  })
  revalidatePath('/loja')
  revalidatePath('/estoque')
}

export async function addStoreProductImage(productId: string, imageUrl: string) {
  const companyId = await getActiveCompanyId()
  const normalizedUrl = imageUrl.trim()

  if (!normalizedUrl.startsWith('data:image/')) {
    throw new Error('Imagem inválida.')
  }

  if (normalizedUrl.length > 2_000_000) {
    throw new Error('A imagem deve ter no máximo 1,5 MB.')
  }

  const product = await prisma.product.findFirst({ where: { id: productId, companyId }, select: { id: true } })
  if (!product) throw new Error('Produto não encontrado.')

  const lastImage = await prisma.productImage.findFirst({
    where: { productId },
    orderBy: { displayOrder: 'desc' },
    select: { displayOrder: true },
  })

  await prisma.productImage.create({
    data: { productId, imageUrl: normalizedUrl, displayOrder: (lastImage?.displayOrder ?? -1) + 1 },
  })
  revalidatePath('/loja')
}

export async function removeStoreProductImage(productId: string, imageId: string) {
  const companyId = await getActiveCompanyId()
  await prisma.productImage.deleteMany({
    where: { id: imageId, productId, product: { companyId } },
  })
  revalidatePath('/loja')
}