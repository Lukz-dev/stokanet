import { getProducts, getCategories } from '@/lib/actions'
import prisma from '@/lib/prisma'
import { getOrCreateDefaultCompany } from '@/lib/access'
import { EstoqueClient } from './EstoqueClient'

export default async function EstoquePage() {
  const [products, categories, company] = await Promise.all([
    getProducts(),
    getCategories(),
    getOrCreateDefaultCompany().then((currentCompany) => prisma.company.findUnique({
      where: { id: currentCompany.id },
      select: { defaultMinStock: true },
    })),
  ])

  return <EstoqueClient initialProducts={products as any} categories={categories} defaultMinStock={company?.defaultMinStock ?? 5} />
}
