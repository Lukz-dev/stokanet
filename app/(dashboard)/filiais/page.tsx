import { getProducts, getWarehouses, getWarehouseTransfers } from '@/lib/actions'
import { FiliaisClient } from './FiliaisClient'

export default async function FiliaisPage() {
  try {
    const [warehouses, transfers, products] = await Promise.all([
      getWarehouses(),
      getWarehouseTransfers(80),
      getProducts(),
    ])

    return (
      <FiliaisClient
        initialWarehouses={warehouses as any}
        initialTransfers={transfers as any}
        products={products as any}
      />
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível carregar as filiais.'

    return (
      <div className="max-w-2xl rounded-3xl border border-border bg-card p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-destructive">Erro ao carregar</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Não foi possível abrir as filiais</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{message}</p>
      </div>
    )
  }
}
