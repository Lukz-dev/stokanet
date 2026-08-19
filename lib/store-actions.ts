'use server'

import prisma from '@/lib/prisma'
import { getActiveCompanyId } from '@/lib/access'
import { revalidatePath } from 'next/cache'

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