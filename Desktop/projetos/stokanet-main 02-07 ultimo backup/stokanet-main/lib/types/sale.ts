export type SaleItem = {
  id: string
  productName: string
  sku: string
  quantity: number
  unitPrice: number
  unitCost: number
  total: number
}

export type Sale = {
  id: string
  code: string
  subtotal: number
  discount: number
  total: number
  paymentMethod: string | null
  notes: string | null
  nfeStatus: string
  saleStatus: string
  stockCommittedAt: string | null
  createdAt: string
  items: SaleItem[]
}

export default {} as unknown
