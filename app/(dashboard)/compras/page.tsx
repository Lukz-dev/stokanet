import { getProducts, getPurchaseOrders, getSuppliers } from '@/lib/actions'
import { ComprasClient } from './ComprasClient'

export default async function ComprasPage() {
  try {
    const [orders, suppliers, products] = await Promise.all([
      getPurchaseOrders(80),
      getSuppliers(),
      getProducts(),
    ])

    return <ComprasClient initialOrders={orders as any} suppliers={suppliers as any} products={products as any} />
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível carregar as compras.'

    return (
      <div className="max-w-2xl rounded-3xl border border-border bg-card p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-destructive">Erro ao carregar</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Não foi possível abrir as compras</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{message}</p>
        <p className="mt-3 text-sm text-muted-foreground">
          Se a sessão ou a empresa estiverem inconsistentes, entre novamente e recarregue a página.
        </p>
      </div>
    )
  }
}
