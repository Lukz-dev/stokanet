import { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'
import { createCheckoutPreference, refreshMercadoPagoOAuthToken } from '@/lib/mercadopago'

export type StorefrontCheckoutItemInput = {
  productId: string
  quantity: number
}

export type StorefrontCustomerInput = {
  name?: string
  email?: string
  phone?: string
  address?: Record<string, unknown>
}

export type StorefrontCheckoutInput = {
  slug: string
  items: StorefrontCheckoutItemInput[]
  customer?: StorefrontCustomerInput
  deliveryMethod?: 'DELIVERY' | 'PICKUP'
  paymentMethod?: 'MERCADOPAGO' | 'CASH'
  cashReceived?: number
  discount?: number
  notes?: string
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function normalizeTheme(value: string | null | undefined) {
  const theme = String(value ?? 'ocean').trim().toLowerCase()
  if (['sunset', 'ocean', 'forest', 'rose'].includes(theme)) return theme
  return 'ocean'
}

function formatStoreCode(prefix: string) {
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `${prefix}-${Date.now().toString().slice(-8)}-${randomPart}`
}

function resolveBaseUrl() {
  return process.env.NEXTAUTH_URL?.trim() || 'http://localhost:3000'
}

function computeProductStatus(newQty: number, minStock: number) {
  if (newQty === 0) return 'Esgotado'
  if (newQty <= minStock * 0.5) return 'Crítico'
  if (newQty <= minStock) return 'Baixo'
  return 'Normal'
}

function resolveShippingFee(storefront: {
  storeShippingFee: number | null
  storeFreeShippingMin: number | null
}, subtotal: number) {
  const baseFee = storefront.storeShippingFee ?? 0
  const freeShippingMin = storefront.storeFreeShippingMin

  if (typeof freeShippingMin === 'number' && freeShippingMin > 0 && subtotal >= freeShippingMin) {
    return 0
  }

  return Math.max(0, baseFee)
}

async function getMercadoPagoAccessTokenForCompany(companyId: string) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      mercadopagoAccessToken: true,
      mercadopagoRefreshToken: true,
      mercadopagoTokenExpiresAt: true,
    },
  })

  if (!company?.mercadopagoAccessToken) return null

  const expiresSoon = company.mercadopagoTokenExpiresAt
    ? company.mercadopagoTokenExpiresAt.getTime() <= Date.now() + 60_000
    : false

  if (!expiresSoon || !company.mercadopagoRefreshToken) return company.mercadopagoAccessToken

  const token = await refreshMercadoPagoOAuthToken(company.mercadopagoRefreshToken)
  await prisma.company.update({
    where: { id: companyId },
    data: {
      mercadopagoAccessToken: token.access_token,
      mercadopagoRefreshToken: token.refresh_token ?? company.mercadopagoRefreshToken,
      mercadopagoTokenExpiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null,
    },
  })

  return token.access_token
}

async function applyInventoryChanges(
  tx: Prisma.TransactionClient,
  companyId: string,
  items: Array<{ product: { id: string; minStock: number }; quantity: number }>,
) {
  const stockResults = await Promise.all(
    items.map((item) =>
      tx.product.updateMany({
        where: {
          id: item.product.id,
          companyId,
          stockQty: { gte: item.quantity },
        },
        data: {
          stockQty: { decrement: item.quantity },
        },
      }),
    ),
  )

  if (stockResults.some((result) => result.count !== 1)) {
    throw new Error('Estoque alterado durante a confirmação. Tente novamente.')
  }

  const updatedProducts = await tx.product.findMany({
    where: { id: { in: items.map((item) => item.product.id) }, companyId },
    select: { id: true, stockQty: true, minStock: true },
  })

  await Promise.all(
    updatedProducts.map((product) =>
      tx.product.update({
        where: { id: product.id },
        data: { status: computeProductStatus(product.stockQty, product.minStock) },
      }),
    ),
  )
}

export async function getStorefrontBySlug(slug: string) {
  const normalizedSlug = slugify(slug)

  if (!normalizedSlug) return null

  const company = await prisma.company.findFirst({
    where: { storeSlug: normalizedSlug },
    select: {
      id: true,
      name: true,
      legalName: true,
      storeSlug: true,
      storeName: true,
      storeDescription: true,
      storeHeroTitle: true,
      storeHeroSubtitle: true,
      storeBadgeText: true,
      storePrimaryButtonLabel: true,
      storeSecondaryButtonLabel: true,
      storeWhatsappNumber: true,
      storeInstagramUrl: true,
      storeFacebookUrl: true,
      storeTiktokUrl: true,
      storeShippingFee: true,
      storeFreeShippingMin: true,
      storeShippingNote: true,
      storePrimaryColor: true,
      storeSecondaryColor: true,
      storeShowSocialLinks: true,
      storeShowShippingInfo: true,
      storeBannerUrl: true,
      storeLogoUrl: true,
      storeTheme: true,
      storeActive: true,
      products: {
        where: { storePublished: true, status: { not: 'Arquivado' } },
        select: {
          id: true,
          name: true,
          sku: true,
          price: true,
          stockQty: true,
          minStock: true,
          status: true,
          size: true,
          color: true,
          description: true,
          highlights: true,
          category: { select: { id: true, name: true } },
          images: {
            select: { id: true, imageUrl: true, displayOrder: true },
            orderBy: { displayOrder: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!company || !company.storeActive) return null

  return {
    ...company,
    storeSlug: company.storeSlug ?? normalizedSlug,
    storeName: company.storeName ?? company.name,
    storeDescription: company.storeDescription ?? 'Loja online conectada ao estoque do SaaS.',
    storeHeroTitle: company.storeHeroTitle ?? company.storeName ?? company.name,
    storeHeroSubtitle: company.storeHeroSubtitle ?? company.storeDescription ?? 'Loja online conectada ao estoque do SaaS.',
    storeBadgeText: company.storeBadgeText ?? 'Pagamento por PIX ou cartão no Mercado Pago',
    storePrimaryButtonLabel: company.storePrimaryButtonLabel ?? 'Comprar agora',
    storeSecondaryButtonLabel: company.storeSecondaryButtonLabel ?? 'Ver catálogo',
    storeWhatsappNumber: company.storeWhatsappNumber ?? null,
    storeInstagramUrl: company.storeInstagramUrl ?? null,
    storeFacebookUrl: company.storeFacebookUrl ?? null,
    storeTiktokUrl: company.storeTiktokUrl ?? null,
    storeShippingFee: company.storeShippingFee ?? null,
    storeFreeShippingMin: company.storeFreeShippingMin ?? null,
    storeShippingNote: company.storeShippingNote ?? null,
    storePrimaryColor: company.storePrimaryColor ?? null,
    storeSecondaryColor: company.storeSecondaryColor ?? null,
    storeShowSocialLinks: company.storeShowSocialLinks,
    storeShowShippingInfo: company.storeShowShippingInfo,
    storeBannerUrl: company.storeBannerUrl,
    storeLogoUrl: company.storeLogoUrl,
    storeTheme: normalizeTheme(company.storeTheme),
    products: company.products,
  }
}

export async function buildStorefrontUrl(slug: string, path = '') {
  const baseUrl = resolveBaseUrl()
  const normalizedSlug = slugify(slug)
  const cleanPath = path ? `/${path.replace(/^\/+/, '')}` : ''
  return new URL(`/loja/${normalizedSlug}${cleanPath}`, baseUrl).toString()
}

export async function createStorefrontCheckout(input: StorefrontCheckoutInput) {
  const storefront = await getStorefrontBySlug(input.slug)

  if (!storefront) {
    throw new Error('Loja não encontrada ou inativa.')
  }

  const mercadopagoAccessToken = await getMercadoPagoAccessTokenForCompany(storefront.id)
  if (!mercadopagoAccessToken) throw new Error('A loja ainda não está conectada ao Mercado Pago.')

  const sanitizedItems = input.items
    .map((item) => ({
      productId: item.productId,
      quantity: Math.max(1, Math.floor(item.quantity)),
    }))
    .filter((item) => item.productId)

  if (sanitizedItems.length === 0) {
    throw new Error('Adicione pelo menos um item para finalizar a compra.')
  }

  const productIds = [...new Set(sanitizedItems.map((item) => item.productId))]
  const products = await prisma.product.findMany({
    where: {
      companyId: storefront.id,
      id: { in: productIds },
      storePublished: true,
      status: { not: 'Arquivado' },
    },
    select: { id: true, name: true, sku: true, price: true, stockQty: true, minStock: true },
  })

  if (products.length !== productIds.length) {
    throw new Error('Um ou mais produtos da loja não foram encontrados.')
  }

  const productMap = new Map(products.map((product) => [product.id, product]))

  let subtotal = 0
  const resolvedItems = sanitizedItems.map((item) => {
    const product = productMap.get(item.productId)

    if (!product) {
      throw new Error('Produto inválido na loja.')
    }

    if (product.stockQty < item.quantity) {
      throw new Error(`Estoque insuficiente para ${product.name}. Disponível: ${product.stockQty}.`)
    }

    const lineTotal = Number((product.price * item.quantity).toFixed(2))
    subtotal = Number((subtotal + lineTotal).toFixed(2))

    return {
      ...item,
      product,
      unitPrice: product.price,
      total: lineTotal,
    }
  })

  const discount = Number.isFinite(input.discount) ? Math.max(0, Number(input.discount)) : 0
  const boundedDiscount = Math.min(discount, subtotal)
  const deliveryMethod = input.deliveryMethod === 'PICKUP' ? 'PICKUP' : 'DELIVERY'
  const paymentMethod = input.paymentMethod === 'CASH' ? 'CASH' : 'MERCADOPAGO'
  const requiredAddressFields = ['street', 'number', 'neighborhood', 'city', 'state', 'postalCode']
  if (deliveryMethod === 'DELIVERY' && requiredAddressFields.some((field) => !String(input.customer?.address?.[field] ?? '').trim())) {
    throw new Error('Informe o endereço completo para receber o pedido.')
  }
  const shippingFee = deliveryMethod === 'PICKUP' ? 0 : resolveShippingFee(storefront, subtotal)
  const total = Number(Math.max(0, subtotal - boundedDiscount + shippingFee).toFixed(2))
  const cashReceived = paymentMethod === 'CASH' && Number.isFinite(input.cashReceived) ? Number(input.cashReceived) : null
  if (paymentMethod === 'CASH' && (cashReceived === null || cashReceived < total)) {
    throw new Error(`Informe um valor em dinheiro igual ou maior que ${total.toFixed(2)}.`)
  }
  const changeDue = cashReceived === null ? null : Number((cashReceived - total).toFixed(2))
  const orderCode = formatStoreCode('LO')
  const baseUrl = resolveBaseUrl()
  const storeUrl = await buildStorefrontUrl(storefront.storeSlug ?? slugify(storefront.storeName ?? storefront.name))

  const order = await prisma.storeOrder.create({
    data: {
      code: orderCode,
      status: 'PENDING',
      deliveryMethod,
      paymentProvider: paymentMethod === 'CASH' ? 'CASH' : 'MERCADOPAGO',
      paymentMethod,
      cashReceived,
      changeDue,
      externalReference: orderCode,
      subtotal,
      discount: boundedDiscount,
      shippingFee,
      total,
      notes: input.notes?.trim() || null,
      customerName: input.customer?.name?.trim() || null,
      customerEmail: input.customer?.email?.trim() || null,
      customerPhone: input.customer?.phone?.trim() || null,
      shippingAddress: deliveryMethod === 'DELIVERY' && input.customer?.address ? (input.customer.address as Prisma.InputJsonValue) : Prisma.JsonNull,
      companyId: storefront.id,
      items: {
        createMany: {
          data: resolvedItems.map((item) => ({
            productId: item.product.id,
            productName: item.product.name,
            sku: item.product.sku,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
          })),
        },
      },
    },
    include: { items: true },
  })

  if (paymentMethod === 'CASH') {
    return {
      storefront,
      orderCode,
      order,
      cashOrder: true,
      cashReceived,
      changeDue,
      subtotal,
      discount: boundedDiscount,
      shippingFee,
      total,
    }
  }

  try {
    const preference = await createCheckoutPreference({
      accessToken: mercadopagoAccessToken,
      items: [
        ...resolvedItems.map((item) => ({
          id: item.product.id,
          title: item.product.name,
          description: item.product.sku,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          currency_id: 'BRL',
        })),
        ...(shippingFee > 0
          ? [{
              id: 'shipping-fee',
              title: 'Frete',
              description: storefront.storeShippingNote ?? 'Frete da loja online',
              quantity: 1,
              unit_price: shippingFee,
              currency_id: 'BRL',
            }]
          : []),
      ],
      payerName: input.customer?.name,
      payerEmail: input.customer?.email || 'comprador@exemplo.com',
      backUrls: {
        success: `${storeUrl}?order=${orderCode}&status=success`,
        failure: `${storeUrl}?order=${orderCode}&status=failure`,
        pending: `${storeUrl}?order=${orderCode}&status=pending`,
      },
      notificationUrl: `${baseUrl}/api/loja/webhook/mercadopago?companyId=${encodeURIComponent(storefront.id)}&orderCode=${encodeURIComponent(orderCode)}`,
      externalReference: orderCode,
      metadata: {
        storeSlug: storefront.storeSlug,
        orderCode,
        companyId: storefront.id,
      },
      expiresInHours: 24,
    })

    await prisma.storeOrder.update({
      where: { id: order.id },
      data: {
        paymentPreferenceId: String(preference.id ?? ''),
      },
    })

    return {
      storefront,
      orderCode,
      initPoint: preference.init_point as string,
      sandboxInitPoint: preference.sandbox_init_point as string | undefined,
      order,
      subtotal,
      discount: boundedDiscount,
      shippingFee,
      total,
    }
  } catch (error) {
    await prisma.storeOrder.update({
      where: { id: order.id },
      data: { status: 'ERROR', notes: `${input.notes?.trim() || ''}${input.notes ? '\n\n' : ''}Erro no gateway: ${error instanceof Error ? error.message : String(error)}`.trim() || null },
    })

    throw error
  }
}

export async function finalizeStorefrontOrderFromPayment(payment: {
  id: string | number
  status?: string
  external_reference?: string | null
  preference_id?: string | number | null
  payment_type_id?: string | null
  transaction_amount?: number | null
  date_approved?: string | null
}, fallbackOrderCode?: string | null) {
  const externalReference = String(payment.external_reference ?? fallbackOrderCode ?? '').trim()
  const paymentId = String(payment.id)
  const preferenceId = payment.preference_id != null ? String(payment.preference_id) : null

  const order = await prisma.storeOrder.findFirst({
    where: {
      OR: [
        externalReference ? { externalReference } : undefined,
        preferenceId ? { paymentPreferenceId: preferenceId } : undefined,
      ].filter(Boolean) as Prisma.StoreOrderWhereInput[],
    },
    include: {
      company: { select: { id: true, storeSlug: true, storeName: true } },
      items: {
        include: {
          product: { select: { id: true, name: true, sku: true, stockQty: true, minStock: true, price: true } },
        },
      },
    },
  })
  if (!order) {
    return { ok: false, reason: 'ORDER_NOT_FOUND' as const }
  }

  if (order.saleId && order.status === 'APPROVED') {
    await prisma.storeOrder.update({
      where: { id: order.id },
      data: {
        paymentId,
        mercadopagoStatus: payment.status ?? order.mercadopagoStatus,
      },
    })

    return { ok: true, orderId: order.id, saleId: order.saleId, alreadyProcessed: true }
  }

  const normalizedStatus = String(payment.status ?? '').toLowerCase()

  if (normalizedStatus && normalizedStatus !== 'approved') {
    const nextStatus = normalizedStatus === 'rejected' || normalizedStatus === 'cancelled' || normalizedStatus === 'refunded'
      ? 'CANCELLED'
      : 'PENDING'

    await prisma.storeOrder.update({
      where: { id: order.id },
      data: {
        status: nextStatus,
        paymentId,
        mercadopagoStatus: payment.status ?? order.mercadopagoStatus,
      },
    })

    if (nextStatus === 'CANCELLED') {
      return { ok: true, orderId: order.id, saleId: null, cancelled: true }
    }

    return { ok: true, orderId: order.id, saleId: null, pending: true }
  }

  try {
    const sale = await prisma.$transaction(async (tx) => {
      const saleCode = formatStoreCode('VD')

      await applyInventoryChanges(
        tx,
        order.companyId,
        order.items.map((item) => ({ product: item.product, quantity: item.quantity })),
      )

      const createdSale = await tx.sale.create({
        data: {
          code: saleCode,
          subtotal: order.subtotal,
          discount: order.discount,
          total: order.total,
          paymentMethod: payment.payment_type_id ? `Mercado Pago - ${payment.payment_type_id}` : 'Mercado Pago',
          notes: order.notes ?? null,
          companyId: order.companyId,
          stockCommittedAt: new Date(),
        },
      })

      await tx.saleItem.createMany({
        data: order.items.map((item) => ({
          saleId: createdSale.id,
          productId: item.productId,
          productName: item.productName,
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
        })),
      })

      await tx.movement.createMany({
        data: order.items.map((item) => ({
          type: 'SAIDA' as const,
          quantity: item.quantity,
          reason: `Loja online ${order.code}`,
          productId: item.productId,
          companyId: order.companyId,
        })),
      })

      await tx.storeOrder.update({
        where: { id: order.id },
        data: {
          status: 'APPROVED',
          paymentId,
          mercadopagoStatus: payment.status ?? 'approved',
          paidAt: payment.date_approved ? new Date(payment.date_approved) : new Date(),
          saleId: createdSale.id,
        },
      })

      return createdSale
    })

    await revalidatePath(`/loja/${order.company.storeSlug ?? ''}`)
    await revalidatePath('/estoque')
    await revalidatePath('/vendas')

    return { ok: true, orderId: order.id, saleId: sale.id, approved: true }
  } catch (error) {
    await prisma.storeOrder.update({
      where: { id: order.id },
      data: {
        status: 'STOCK_ERROR',
        paymentId,
        mercadopagoStatus: payment.status ?? order.mercadopagoStatus,
      },
    })

    throw error
  }
}