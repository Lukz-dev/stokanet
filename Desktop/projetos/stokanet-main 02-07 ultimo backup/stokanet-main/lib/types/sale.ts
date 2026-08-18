import type { Sale as PrismaSale } from '@prisma/client'

export type Sale = PrismaSale & {
  stockCommittedAt: string | null
}

export type SaleItem = {
  id: string
  productName: string
  sku: string
  quantity: number
  unitPrice: number
  unitCost: number
  total: number
}
