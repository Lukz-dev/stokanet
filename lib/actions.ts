'use server'

import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'
import { AppRole, getActiveCompanyId, getActiveUser } from '@/lib/access'

async function getCompanyId(): Promise<string> {
  return getActiveCompanyId()
}

async function getAuthenticatedUser() {
  const user = await getActiveUser()
  return user as { id: string; companyId?: string; role?: AppRole }
}

async function requireRole(allowedRoles: AppRole[]) {
  const user = await getAuthenticatedUser()
  const role = user.role ?? 'OPERATOR'
  if (!allowedRoles.includes(role)) {
    throw new Error('Você não tem permissão para esta ação.')
  }
  return user
}

async function logAudit(data: {
  action: string
  entity: string
  entityId?: string
  details?: string
  companyId: string
  userId?: string
}) {
  try {
    await prisma.auditLog.create({
      data: {
        action: data.action,
        entity: data.entity,
        entityId: data.entityId,
        details: data.details,
        companyId: data.companyId,
        userId: data.userId,
      },
    })
  } catch {
    // Não bloqueia a operação principal.
  }
}

async function sendExternalAlertIfConfigured(companyId: string, payload: { title: string; message: string; level: 'critical' | 'warning' | 'info' }) {
  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { notificationWebhookUrl: true, name: true },
    })
    const webhookUrl = company?.notificationWebhookUrl?.trim()
    if (!webhookUrl) return

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'Estoque Flex',
        companyId,
        companyName: company?.name ?? '',
        ...payload,
        timestamp: new Date().toISOString(),
      }),
    })
  } catch {
    // Falha externa não interrompe fluxo interno.
  }
}

// =====================
// DASHBOARD STATS
// =====================
export async function getDashboardStats() {
  const companyId = await getCompanyId()

  const [totalProducts, lowStockProducts, criticalProducts, products] = await Promise.all([
    prisma.product.count({ where: { companyId } }),
    prisma.product.count({ where: { companyId, status: 'Baixo' } }),
    prisma.product.count({ where: { companyId, OR: [{ status: 'Crítico' }, { status: 'Esgotado' }] } }),
    prisma.product.findMany({ where: { companyId } }),
  ])

  const totalValue = products.reduce((acc, p) => acc + p.price * p.stockQty, 0)
  const totalQty = products.reduce((acc, p) => acc + p.stockQty, 0)

  const criticalList = await prisma.product.findMany({
    where: { companyId, OR: [{ status: 'Crítico' }, { status: 'Esgotado' }, { status: 'Baixo' }] },
    orderBy: { stockQty: 'asc' },
    take: 6,
  })

  return { totalProducts, lowStockProducts, criticalProducts, totalValue, totalQty, criticalList }
}

// =====================
// PRODUTOS
// =====================
export async function getProducts(search?: string, status?: string) {
  const companyId = await getCompanyId()

  return prisma.product.findMany({
    where: {
      companyId,
      ...(search ? {
        OR: [
          { name: { contains: search } },
          { sku: { contains: search } },
            { size: { contains: search } },
            { color: { contains: search } },
        ]
      } : {}),
      ...(status && status !== 'todos' ? { status } : {}),
    },
    include: { category: true },
    orderBy: { createdAt: 'desc' },
  })
}

export async function createProduct(data: {
  name: string
  sku: string
  size?: string
  color?: string
  price: number
  stockQty: number
  minStock: number
  categoryId?: string
}) {
  const user = await getAuthenticatedUser()
  const companyId = await getCompanyId()

  // Calcular status automático
  let status = 'Normal'
  if (data.stockQty === 0) status = 'Esgotado'
  else if (data.stockQty <= data.minStock * 0.5) status = 'Crítico'
  else if (data.stockQty <= data.minStock) status = 'Baixo'

  await prisma.product.create({
    data: {
      ...data,
      status,
      companyId,
    },
  })
  revalidatePath('/estoque')
  revalidatePath('/')

  await logAudit({
    action: 'CREATE',
    entity: 'PRODUCT',
    details: `Produto ${data.name} (${data.sku}) criado`,
    companyId,
    userId: user.id,
  })
}

export async function updateProduct(id: string, data: {
  name?: string
  sku?: string
  size?: string
  color?: string
  price?: number
  stockQty?: number
  minStock?: number
  categoryId?: string
}) {
  const user = await getAuthenticatedUser()
  const companyId = await getCompanyId()

  // Verifica que o produto pertence à empresa
  const product = await prisma.product.findFirst({ where: { id, companyId } })
  if (!product) throw new Error('Produto não encontrado')

  const stockQty = data.stockQty ?? product.stockQty
  const minStock = data.minStock ?? product.minStock
  let status = 'Normal'
  if (stockQty === 0) status = 'Esgotado'
  else if (stockQty <= minStock * 0.5) status = 'Crítico'
  else if (stockQty <= minStock) status = 'Baixo'

  await prisma.product.update({
    where: { id },
    data: { ...data, status },
  })
  revalidatePath('/estoque')
  revalidatePath('/')

  await logAudit({
    action: 'UPDATE',
    entity: 'PRODUCT',
    entityId: id,
    details: `Produto ${id} atualizado`,
    companyId,
    userId: user.id,
  })
}

export async function deleteProduct(id: string) {
  const user = await getAuthenticatedUser()
  const companyId = await getCompanyId()
  const product = await prisma.product.findFirst({ where: { id, companyId } })
  if (!product) throw new Error('Produto não encontrado')
  await prisma.product.delete({ where: { id } })
  revalidatePath('/estoque')
  revalidatePath('/')

  await logAudit({
    action: 'DELETE',
    entity: 'PRODUCT',
    entityId: id,
    details: `Produto ${id} removido`,
    companyId,
    userId: user.id,
  })
}

// =====================
// CATEGORIAS
// =====================
export async function getCategories() {
  const companyId = await getCompanyId()
  return prisma.category.findMany({ where: { companyId }, orderBy: { name: 'asc' } })
}

export async function createCategory(name: string) {
  const companyId = await getCompanyId()
  const trimmedName = name.trim()
  if (!trimmedName) {
    throw new Error('Informe o nome da categoria.')
  }

  const existingCategory = await prisma.category.findFirst({
    where: { companyId, name: trimmedName },
  })
  if (existingCategory) {
    throw new Error('Esta categoria já existe.')
  }

  const category = await prisma.category.create({ data: { name: trimmedName, companyId } })
  revalidatePath('/estoque')
  return category
}

// =====================
// PERFIL E CONFIGURAÇÕES
// =====================
export async function updateAccountProfile(data: {
  name: string
  email: string
  companyName: string
  avatarUrl?: string | null
}) {
  const user = await getAuthenticatedUser()
  const companyId = await getCompanyId()

  const name = data.name.trim()
  const email = data.email.trim().toLowerCase()
  const companyName = data.companyName.trim()
  const hasAvatarUrl = Object.prototype.hasOwnProperty.call(data, 'avatarUrl')
  const avatarUrl = typeof data.avatarUrl === 'string' ? data.avatarUrl.trim() || null : data.avatarUrl

  if (!name || !email || !companyName) {
    throw new Error('Nome, e-mail e empresa são obrigatórios.')
  }

  const existingEmail = await prisma.user.findUnique({ where: { email } })
  if (existingEmail && existingEmail.id !== user.id) {
    throw new Error('Este e-mail já está em uso.')
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        name,
        email,
        ...(hasAvatarUrl ? { avatarUrl } : {}),
      },
    }),
    prisma.company.update({
      where: { id: companyId },
      data: { name: companyName },
    }),
  ])

  revalidatePath('/perfil')
  revalidatePath('/configuracoes')
  revalidatePath('/')
}

export async function updateCompanyPreferences(data: {
  defaultMinStock: number
  notificationWebhookUrl?: string
}) {
  const user = await requireRole(['ADMIN', 'MANAGER'])
  const companyId = await getCompanyId()

  const defaultMinStock = Number.isFinite(data.defaultMinStock)
    ? Math.max(0, Math.floor(data.defaultMinStock))
    : 5

  await prisma.company.update({
    where: { id: companyId },
    data: {
      defaultMinStock,
      ...(Object.prototype.hasOwnProperty.call(data, 'notificationWebhookUrl')
        ? { notificationWebhookUrl: data.notificationWebhookUrl?.trim() || null }
        : {}),
    },
  })

  revalidatePath('/perfil')
  revalidatePath('/configuracoes')
  revalidatePath('/estoque')

  await logAudit({
    action: 'UPDATE',
    entity: 'COMPANY_PREFERENCES',
    entityId: companyId,
    details: 'Preferências da empresa atualizadas',
    companyId,
    userId: user.id,
  })
}

export async function changePassword(data: {
  currentPassword: string
  newPassword: string
}) {
  const user = await getAuthenticatedUser()

  if (!data.currentPassword || !data.newPassword) {
    throw new Error('Informe a senha atual e a nova senha.')
  }

  if (data.newPassword.length < 8) {
    throw new Error('A nova senha deve ter pelo menos 8 caracteres.')
  }

  const currentUser = await prisma.user.findUnique({ where: { id: user.id } })
  if (!currentUser) throw new Error('Usuário não encontrado')

  const isValid = await bcrypt.compare(data.currentPassword, currentUser.password)
  if (!isValid) throw new Error('Senha atual incorreta.')

  const hashedPassword = await bcrypt.hash(data.newPassword, 12)
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword },
  })

  revalidatePath('/perfil')
  revalidatePath('/configuracoes')
}

// =====================
// MOVIMENTAÇÕES
// =====================
export async function getMovements(productId?: string) {
  const companyId = await getCompanyId()

  return prisma.movement.findMany({
    where: {
      companyId,
      ...(productId ? { productId } : {}),
    },
    include: { product: { select: { id: true, name: true, sku: true, size: true, color: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
}

export async function createMovement(data: {
  productId: string
  type: 'ENTRADA' | 'SAIDA' | 'AJUSTE'
  quantity: number
  reason?: string
}) {
  const user = await getAuthenticatedUser()
  const companyId = await getCompanyId()

  const product = await prisma.product.findFirst({ where: { id: data.productId, companyId } })
  if (!product) throw new Error('Produto não encontrado')

  if (data.type === 'SAIDA' && product.stockQty < data.quantity) {
    throw new Error(`Estoque insuficiente. Disponível: ${product.stockQty} und(s).`)
  }

  // Calcula novo estoque
  let newQty = product.stockQty
  if (data.type === 'ENTRADA') newQty += data.quantity
  else if (data.type === 'SAIDA') newQty -= data.quantity
  else if (data.type === 'AJUSTE') newQty = data.quantity

  // Calcula novo status
  let status = 'Normal'
  if (newQty === 0) status = 'Esgotado'
  else if (newQty <= product.minStock * 0.5) status = 'Crítico'
  else if (newQty <= product.minStock) status = 'Baixo'

  // Transação atômica: cria movimentação + atualiza estoque
  await prisma.$transaction([
    prisma.movement.create({
      data: {
        type: data.type,
        quantity: data.quantity,
        reason: data.reason,
        productId: data.productId,
        companyId,
      },
    }),
    prisma.product.update({
      where: { id: data.productId },
      data: { stockQty: newQty, status },
    }),
  ])

  revalidatePath('/movimentacoes')
  revalidatePath('/estoque')
  revalidatePath('/')

  await logAudit({
    action: 'CREATE',
    entity: 'MOVEMENT',
    entityId: data.productId,
    details: `Movimentação ${data.type} de ${data.quantity} unidade(s)`,
    companyId,
    userId: user.id,
  })

  if (status === 'Crítico' || status === 'Esgotado') {
    await sendExternalAlertIfConfigured(companyId, {
      level: 'critical',
      title: `Produto em ${status.toLowerCase()}`,
      message: `Produto ${product.name} (${product.sku}) ficou com status ${status} após movimentação ${data.type}.`,
    })
  }
}

export async function createSaleByCode(data: {
  code: string
  quantity?: number
  reason?: string
}) {
  const companyId = await getCompanyId()
  const code = data.code.trim()
  const quantity = Number.isFinite(data.quantity) ? Math.max(1, Math.floor(data.quantity as number)) : 1

  if (!code) {
    throw new Error('Informe o codigo para leitura.')
  }

  const matches = await prisma.product.findMany({
    where: {
      companyId,
      OR: [
        { sku: code },
        { sku: code.toUpperCase() },
        { sku: code.toLowerCase() },
      ],
    },
    select: { id: true, name: true, sku: true, stockQty: true },
    take: 2,
  })

  if (matches.length === 0) {
    throw new Error('Produto nao encontrado para este codigo.')
  }

  if (matches.length > 1) {
    throw new Error('Ha mais de um produto com este codigo. Use codigos unicos para leitura no caixa.')
  }

  const product = matches[0]

  await createMovement({
    productId: product.id,
    type: 'SAIDA',
    quantity,
    reason: data.reason?.trim() || 'Venda no caixa (leitor)',
  })

  return {
    productId: product.id,
    productName: product.name,
    sku: product.sku,
    quantity,
  }
}

export async function findProductByCode(code: string) {
  const companyId = await getCompanyId()
  const normalizedCode = code.trim()

  if (!normalizedCode) {
    throw new Error('Informe um código válido.')
  }

  const matches = await prisma.product.findMany({
    where: {
      companyId,
      OR: [
        { sku: normalizedCode },
        { sku: normalizedCode.toUpperCase() },
        { sku: normalizedCode.toLowerCase() },
      ],
    },
    select: {
      id: true,
      name: true,
      sku: true,
      price: true,
      stockQty: true,
      size: true,
      color: true,
    },
    take: 2,
  })

  if (matches.length === 0) {
    throw new Error('Produto não encontrado para este código.')
  }

  if (matches.length > 1) {
    throw new Error('Há mais de um produto com este código. Use códigos únicos no SKU.')
  }

  return matches[0]
}

export async function completeSale(data: {
  items: Array<{ productId: string; quantity: number }>
  paymentMethod?: string
  discount?: number
  notes?: string
}) {
  const user = await getAuthenticatedUser()
  const companyId = await getCompanyId()

  if (!data.items || data.items.length === 0) {
    throw new Error('Adicione pelo menos um item para finalizar a venda.')
  }

  const sanitizedItems = data.items
    .map((item) => ({
      productId: item.productId,
      quantity: Math.max(1, Math.floor(item.quantity)),
    }))
    .filter((item) => item.productId)

  if (sanitizedItems.length === 0) {
    throw new Error('Itens inválidos para venda.')
  }

  const productIds = [...new Set(sanitizedItems.map((item) => item.productId))]
  const products = await prisma.product.findMany({
    where: { companyId, id: { in: productIds } },
    select: { id: true, name: true, sku: true, price: true, stockQty: true, minStock: true },
  })

  if (products.length !== productIds.length) {
    throw new Error('Um ou mais produtos não foram encontrados para esta empresa.')
  }

  const productMap = new Map(products.map((product) => [product.id, product]))

  let subtotal = 0
  const resolvedItems = sanitizedItems.map((item) => {
    const product = productMap.get(item.productId)
    if (!product) {
      throw new Error('Produto inválido na venda.')
    }
    if (product.stockQty < item.quantity) {
      throw new Error(`Estoque insuficiente para ${product.name}. Disponível: ${product.stockQty}.`)
    }

    const lineTotal = product.price * item.quantity
    subtotal += lineTotal
    return {
      ...item,
      product,
      unitPrice: product.price,
      total: lineTotal,
    }
  })

  const discount = Number.isFinite(data.discount) ? Math.max(0, Number(data.discount)) : 0
  const boundedDiscount = Math.min(discount, subtotal)
  const total = Math.max(0, subtotal - boundedDiscount)
  const saleCode = `VD-${Date.now().toString().slice(-8)}`

  const result = await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.create({
      data: {
        code: saleCode,
        subtotal,
        discount: boundedDiscount,
        total,
        paymentMethod: data.paymentMethod?.trim() || null,
        notes: data.notes?.trim() || null,
        companyId,
      },
    })

    for (const item of resolvedItems) {
      await tx.saleItem.create({
        data: {
          saleId: sale.id,
          productId: item.product.id,
          productName: item.product.name,
          sku: item.product.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
        },
      })

      const newQty = item.product.stockQty - item.quantity
      let newStatus = 'Normal'
      if (newQty === 0) newStatus = 'Esgotado'
      else if (newQty <= item.product.minStock * 0.5) newStatus = 'Crítico'
      else if (newQty <= item.product.minStock) newStatus = 'Baixo'

      await tx.product.update({
        where: { id: item.product.id },
        data: { stockQty: newQty, status: newStatus },
      })

      await tx.movement.create({
        data: {
          type: 'SAIDA',
          quantity: item.quantity,
          reason: `Venda ${sale.code}`,
          productId: item.product.id,
          companyId,
        },
      })
    }

    return sale
  })

  revalidatePath('/movimentacoes')
  revalidatePath('/estoque')
  revalidatePath('/caixa')
  revalidatePath('/')

  await logAudit({
    action: 'CREATE',
    entity: 'SALE',
    entityId: result.id,
    details: `Venda ${result.code} finalizada com total ${total.toFixed(2)}`,
    companyId,
    userId: user.id,
  })

  const hasCriticalAfterSale = resolvedItems.some((item) => {
    const remaining = item.product.stockQty - item.quantity
    return remaining === 0 || remaining <= item.product.minStock * 0.5
  })

  if (hasCriticalAfterSale) {
    await sendExternalAlertIfConfigured(companyId, {
      level: 'warning',
      title: 'Venda gerou alerta de estoque',
      message: `A venda ${result.code} deixou ao menos um item em nível crítico ou esgotado.`,
    })
  }

  return {
    id: result.id,
    code: result.code,
    subtotal,
    discount: boundedDiscount,
    total,
  }
}

export async function getSales(limit = 50) {
  const companyId = await getCompanyId()

  return prisma.sale.findMany({
    where: { companyId },
    include: {
      items: {
        select: {
          id: true,
          productName: true,
          sku: true,
          quantity: true,
          unitPrice: true,
          total: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: Math.max(1, Math.min(limit, 200)),
  })
}

export async function createSupplier(data: {
  name: string
  email?: string
  phone?: string
  contactName?: string
  notes?: string
}) {
  const user = await requireRole(['ADMIN', 'MANAGER', 'OPERATOR'])
  const companyId = await getCompanyId()

  const supplier = await prisma.supplier.create({
    data: {
      name: data.name.trim(),
      email: data.email?.trim() || null,
      phone: data.phone?.trim() || null,
      contactName: data.contactName?.trim() || null,
      notes: data.notes?.trim() || null,
      companyId,
    },
  })

  revalidatePath('/fornecedores')
  await logAudit({
    action: 'CREATE',
    entity: 'SUPPLIER',
    entityId: supplier.id,
    details: `Fornecedor ${supplier.name} criado`,
    companyId,
    userId: user.id,
  })

  return supplier
}

export async function getSuppliers() {
  const companyId = await getCompanyId()
  return prisma.supplier.findMany({
    where: { companyId },
    orderBy: { name: 'asc' },
  })
}

export async function deleteSupplier(id: string) {
  const user = await requireRole(['ADMIN', 'MANAGER', 'OPERATOR'])
  const companyId = await getCompanyId()

  const supplier = await prisma.supplier.findFirst({
    where: { id, companyId },
    select: { id: true },
  })

  if (!supplier) {
    throw new Error('Fornecedor nao encontrado')
  }

  await prisma.supplier.delete({ where: { id: supplier.id } })

  revalidatePath('/fornecedores')
  await logAudit({
    action: 'DELETE',
    entity: 'SUPPLIER',
    entityId: id,
    details: 'Fornecedor removido',
    companyId,
    userId: user.id,
  })
}

export async function createPurchaseOrder(data: {
  supplierId?: string
  notes?: string
  expectedAt?: string
  items: Array<{ productId: string; quantity: number; unitCost: number }>
}) {
  const user = await requireRole(['ADMIN', 'MANAGER', 'OPERATOR'])
  const companyId = await getCompanyId()

  if (!data.items?.length) {
    throw new Error('Adicione ao menos um item no pedido de compra')
  }

  const productIds = data.items.map((item) => item.productId)
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, companyId },
    select: { id: true, name: true },
  })

  if (products.length !== productIds.length) {
    throw new Error('Um ou mais produtos nao pertencem a empresa atual')
  }

  const productMap = new Map(products.map((p) => [p.id, p]))
  const code = `PO-${Date.now()}`

  const result = await prisma.$transaction(async (tx) => {
    let subtotal = 0
    const po = await tx.purchaseOrder.create({
      data: {
        code,
        supplierId: data.supplierId || null,
        notes: data.notes?.trim() || null,
        expectedAt: data.expectedAt ? new Date(data.expectedAt) : null,
        companyId,
      },
    })

    for (const item of data.items) {
      if (item.quantity <= 0) throw new Error('Quantidade invalida no pedido')
      if (item.unitCost < 0) throw new Error('Custo unitario invalido no pedido')

      const product = productMap.get(item.productId)
      if (!product) throw new Error('Produto invalido no pedido')

      const total = Number((item.quantity * item.unitCost).toFixed(2))
      subtotal += total

      await tx.purchaseOrderItem.create({
        data: {
          purchaseOrderId: po.id,
          productId: item.productId,
          productName: product.name,
          quantity: item.quantity,
          unitCost: item.unitCost,
          total,
        },
      })
    }

    const finalSubtotal = Number(subtotal.toFixed(2))
    return tx.purchaseOrder.update({
      where: { id: po.id },
      data: { subtotal: finalSubtotal },
      include: {
        supplier: { select: { id: true, name: true } },
        items: true,
      },
    })
  })

  revalidatePath('/compras')
  await logAudit({
    action: 'CREATE',
    entity: 'PURCHASE_ORDER',
    entityId: result.id,
    details: `Pedido ${result.code} criado`,
    companyId,
    userId: user.id,
  })

  return result
}

export async function receivePurchaseOrder(id: string) {
  const user = await requireRole(['ADMIN', 'MANAGER', 'OPERATOR'])
  const companyId = await getCompanyId()

  const order = await prisma.purchaseOrder.findFirst({
    where: { id, companyId },
    include: { items: true },
  })

  if (!order) throw new Error('Pedido de compra nao encontrado')
  if (order.status !== 'PENDENTE') throw new Error('Pedido ja processado')

  await prisma.$transaction(async (tx) => {
    for (const item of order.items) {
      const product = await tx.product.findFirst({
        where: { id: item.productId, companyId },
      })

      if (!product) continue

      const newStock = product.stockQty + item.quantity
      const status =
        newStock <= 0
          ? 'Esgotado'
          : newStock <= product.minStock * 0.5
            ? 'Crítico'
            : newStock <= product.minStock
              ? 'Baixo'
              : 'Normal'

      await tx.product.update({
        where: { id: product.id },
        data: { stockQty: newStock, status },
      })

      await tx.movement.create({
        data: {
          type: 'ENTRADA',
          quantity: item.quantity,
          reason: `Recebimento do pedido ${order.code}`,
          productId: product.id,
          companyId,
        },
      })
    }

    await tx.purchaseOrder.update({
      where: { id: order.id },
      data: { status: 'RECEBIDO' },
    })
  })

  revalidatePath('/compras')
  revalidatePath('/estoque')
  revalidatePath('/movimentacoes')

  await logAudit({
    action: 'UPDATE',
    entity: 'PURCHASE_ORDER',
    entityId: id,
    details: `Pedido ${order.code} recebido`,
    companyId,
    userId: user.id,
  })
}

export async function getPurchaseOrders(limit = 100) {
  const companyId = await getCompanyId()
  return prisma.purchaseOrder.findMany({
    where: { companyId },
    include: {
      supplier: { select: { id: true, name: true } },
      items: {
        select: {
          id: true,
          productId: true,
          productName: true,
          quantity: true,
          unitCost: true,
          total: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: Math.max(1, Math.min(limit, 500)),
  })
}

export async function createWarehouse(data: {
  name: string
  code: string
  address?: string
  isDefault?: boolean
}) {
  const user = await requireRole(['ADMIN', 'MANAGER', 'OPERATOR'])
  const companyId = await getCompanyId()

  const code = data.code.trim().toUpperCase()
  const existing = await prisma.warehouse.findFirst({
    where: { companyId, code },
    select: { id: true },
  })

  if (existing) throw new Error('Ja existe deposito com este codigo')

  const warehouse = await prisma.$transaction(async (tx) => {
    if (data.isDefault) {
      await tx.warehouse.updateMany({
        where: { companyId, isDefault: true },
        data: { isDefault: false },
      })
    }

    return tx.warehouse.create({
      data: {
        name: data.name.trim(),
        code,
        address: data.address?.trim() || null,
        isDefault: Boolean(data.isDefault),
        companyId,
      },
    })
  })

  revalidatePath('/filiais')
  await logAudit({
    action: 'CREATE',
    entity: 'WAREHOUSE',
    entityId: warehouse.id,
    details: `Deposito ${warehouse.name} criado`,
    companyId,
    userId: user.id,
  })

  return warehouse
}

export async function getWarehouses() {
  const companyId = await getCompanyId()
  return prisma.warehouse.findMany({
    where: { companyId },
    include: {
      _count: { select: { stocks: true } },
    },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  })
}

export async function adjustWarehouseStock(data: {
  warehouseId: string
  productId: string
  quantity: number
}) {
  const user = await requireRole(['ADMIN', 'MANAGER', 'OPERATOR'])
  const companyId = await getCompanyId()

  const [warehouse, product] = await Promise.all([
    prisma.warehouse.findFirst({ where: { id: data.warehouseId, companyId } }),
    prisma.product.findFirst({ where: { id: data.productId, companyId } }),
  ])

  if (!warehouse) throw new Error('Deposito nao encontrado')
  if (!product) throw new Error('Produto nao encontrado')
  if (data.quantity < 0) throw new Error('Quantidade invalida')

  const stock = await prisma.warehouseStock.upsert({
    where: {
      warehouseId_productId: {
        warehouseId: warehouse.id,
        productId: product.id,
      },
    },
    update: { quantity: data.quantity },
    create: {
      warehouseId: warehouse.id,
      productId: product.id,
      quantity: data.quantity,
    },
  })

  await logAudit({
    action: 'UPDATE',
    entity: 'WAREHOUSE_STOCK',
    entityId: stock.id,
    details: `Estoque ${warehouse.code}/${product.sku} ajustado para ${data.quantity}`,
    companyId,
    userId: user.id,
  })

  revalidatePath('/filiais')
  return stock
}

export async function transferWarehouseStock(data: {
  fromWarehouseId: string
  toWarehouseId: string
  notes?: string
  items: Array<{ productId: string; quantity: number }>
}) {
  const user = await requireRole(['ADMIN', 'MANAGER', 'OPERATOR'])
  const companyId = await getCompanyId()

  if (data.fromWarehouseId === data.toWarehouseId) {
    throw new Error('Origem e destino devem ser diferentes')
  }
  if (!data.items?.length) throw new Error('Adicione itens para transferir')

  const [fromWarehouse, toWarehouse] = await Promise.all([
    prisma.warehouse.findFirst({ where: { id: data.fromWarehouseId, companyId } }),
    prisma.warehouse.findFirst({ where: { id: data.toWarehouseId, companyId } }),
  ])

  if (!fromWarehouse || !toWarehouse) {
    throw new Error('Deposito de origem ou destino nao encontrado')
  }

  const productIds = [...new Set(data.items.map((item) => item.productId))]
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, companyId },
    select: { id: true, name: true },
  })
  const productMap = new Map(products.map((p) => [p.id, p]))

  const code = `TR-${Date.now()}`

  const transfer = await prisma.$transaction(async (tx) => {
    const createdTransfer = await tx.warehouseTransfer.create({
      data: {
        code,
        fromWarehouseId: fromWarehouse.id,
        toWarehouseId: toWarehouse.id,
        notes: data.notes?.trim() || null,
        companyId,
      },
    })

    for (const item of data.items) {
      if (item.quantity <= 0) throw new Error('Quantidade de transferencia invalida')

      const product = productMap.get(item.productId)
      if (!product) throw new Error('Produto invalido na transferencia')

      const fromStock = await tx.warehouseStock.upsert({
        where: {
          warehouseId_productId: {
            warehouseId: fromWarehouse.id,
            productId: item.productId,
          },
        },
        update: {},
        create: {
          warehouseId: fromWarehouse.id,
          productId: item.productId,
          quantity: 0,
        },
      })

      if (fromStock.quantity < item.quantity) {
        throw new Error(`Estoque insuficiente no deposito de origem para ${product.name}`)
      }

      await tx.warehouseStock.update({
        where: { id: fromStock.id },
        data: { quantity: fromStock.quantity - item.quantity },
      })

      await tx.warehouseStock.upsert({
        where: {
          warehouseId_productId: {
            warehouseId: toWarehouse.id,
            productId: item.productId,
          },
        },
        update: {
          quantity: { increment: item.quantity },
        },
        create: {
          warehouseId: toWarehouse.id,
          productId: item.productId,
          quantity: item.quantity,
        },
      })

      await tx.warehouseTransferItem.create({
        data: {
          transferId: createdTransfer.id,
          productId: item.productId,
          productName: product.name,
          quantity: item.quantity,
        },
      })
    }

    return tx.warehouseTransfer.findUnique({
      where: { id: createdTransfer.id },
      include: {
        fromWarehouse: { select: { id: true, name: true, code: true } },
        toWarehouse: { select: { id: true, name: true, code: true } },
        items: true,
      },
    })
  })

  revalidatePath('/filiais')
  await logAudit({
    action: 'CREATE',
    entity: 'WAREHOUSE_TRANSFER',
    entityId: transfer?.id,
    details: `Transferencia ${code} concluida`,
    companyId,
    userId: user.id,
  })

  return transfer
}

export async function getWarehouseTransfers(limit = 100) {
  const companyId = await getCompanyId()
  return prisma.warehouseTransfer.findMany({
    where: { companyId },
    include: {
      fromWarehouse: { select: { id: true, name: true, code: true } },
      toWarehouse: { select: { id: true, name: true, code: true } },
      items: true,
    },
    orderBy: { createdAt: 'desc' },
    take: Math.max(1, Math.min(limit, 500)),
  })
}

export async function createBatch(data: {
  productId: string
  code: string
  quantity: number
  expiresAt: string
  notes?: string
}) {
  const user = await requireRole(['ADMIN', 'MANAGER', 'OPERATOR'])
  const companyId = await getCompanyId()

  if (data.quantity <= 0) throw new Error('Quantidade do lote invalida')
  const expiry = new Date(data.expiresAt)
  if (Number.isNaN(expiry.getTime())) throw new Error('Data de validade invalida')

  const product = await prisma.product.findFirst({
    where: { id: data.productId, companyId },
    select: { id: true, name: true, sku: true },
  })

  if (!product) throw new Error('Produto nao encontrado')

  const batch = await prisma.$transaction(async (tx) => {
    const created = await tx.batch.create({
      data: {
        productId: product.id,
        code: data.code.trim(),
        quantity: data.quantity,
        expiresAt: expiry,
        notes: data.notes?.trim() || null,
        companyId,
      },
    })

    const current = await tx.product.findUnique({
      where: { id: product.id },
      select: { stockQty: true, minStock: true },
    })

    if (!current) throw new Error('Produto nao encontrado ao atualizar estoque')

    const newStock = current.stockQty + data.quantity
    const status =
      newStock <= 0
        ? 'Esgotado'
        : newStock <= current.minStock * 0.5
          ? 'Crítico'
          : newStock <= current.minStock
            ? 'Baixo'
            : 'Normal'

    await tx.product.update({
      where: { id: product.id },
      data: { stockQty: newStock, status },
    })

    await tx.movement.create({
      data: {
        type: 'ENTRADA',
        quantity: data.quantity,
        reason: `Entrada por lote ${data.code.trim()}`,
        productId: product.id,
        companyId,
      },
    })

    return created
  })

  revalidatePath('/lotes')
  revalidatePath('/estoque')
  revalidatePath('/movimentacoes')

  await logAudit({
    action: 'CREATE',
    entity: 'BATCH',
    entityId: batch.id,
    details: `Lote ${batch.code} criado para ${product.sku}`,
    companyId,
    userId: user.id,
  })

  return batch
}

export async function getBatches(params?: { expiresInDays?: number; limit?: number }) {
  const companyId = await getCompanyId()
  const limit = Math.max(1, Math.min(params?.limit ?? 200, 1000))

  const where: Prisma.BatchWhereInput = { companyId }
  if (params?.expiresInDays && params.expiresInDays > 0) {
    const until = new Date()
    until.setDate(until.getDate() + params.expiresInDays)
    where.expiresAt = { lte: until }
  }

  return prisma.batch.findMany({
    where,
    include: {
      product: { select: { id: true, name: true, sku: true } },
    },
    orderBy: { expiresAt: 'asc' },
    take: limit,
  })
}

export async function getAuditLogs(limit = 200) {
  await requireRole(['ADMIN', 'MANAGER', 'OPERATOR'])
  const companyId = await getCompanyId()

  return prisma.auditLog.findMany({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
    take: Math.max(1, Math.min(limit, 1000)),
  })
}

export async function getDashboardReport() {
  const companyId = await getCompanyId()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const next30Days = new Date()
  next30Days.setDate(next30Days.getDate() + 30)

  const [
    productsCount,
    lowStockCount,
    outOfStockCount,
    salesToday,
    salesMonth,
    pendingPurchaseOrders,
    expiringBatches,
  ] = await Promise.all([
    prisma.product.count({ where: { companyId } }),
    prisma.product.count({ where: { companyId, status: { in: ['Crítico', 'Baixo'] } } }),
    prisma.product.count({ where: { companyId, status: 'Esgotado' } }),
    prisma.sale.aggregate({
      _sum: { total: true },
      where: { companyId, createdAt: { gte: today } },
    }),
    prisma.sale.aggregate({
      _sum: { total: true },
      where: {
        companyId,
        createdAt: {
          gte: new Date(today.getFullYear(), today.getMonth(), 1),
        },
      },
    }),
    prisma.purchaseOrder.count({ where: { companyId, status: 'PENDENTE' } }),
    prisma.batch.count({
      where: {
        companyId,
        expiresAt: { gte: today, lte: next30Days },
      },
    }),
  ])

  return {
    productsCount,
    lowStockCount,
    outOfStockCount,
    pendingPurchaseOrders,
    expiringBatches,
    salesToday: Number((salesToday._sum.total ?? 0).toFixed(2)),
    salesMonth: Number((salesMonth._sum.total ?? 0).toFixed(2)),
  }
}

export async function testNotificationWebhook() {
  const companyId = await getCompanyId()
  await sendExternalAlertIfConfigured(companyId, {
    level: 'info',
    title: 'Teste de webhook',
    message: 'Este e um teste de notificacao externa do Estoque Flex.',
  })

  return { ok: true }
}
