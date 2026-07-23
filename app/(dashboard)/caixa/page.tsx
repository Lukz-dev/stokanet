import { getProducts, getSales } from '@/lib/actions'
import { CaixaClient } from './CaixaClient'

export default async function CaixaPage() {
  try {
    const [products, sales] = await Promise.all([
      getProducts(),
      getSales(30),
    ])

    return <CaixaClient products={products as any} initialSales={sales as any} />
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível carregar o caixa.'

    return (
      <div className="max-w-2xl rounded-3xl border border-border bg-card p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-destructive">Erro ao carregar</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Não foi possível abrir a caixa</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{message}</p>
        <p className="mt-3 text-sm text-muted-foreground">
          Se a conta estiver sem empresa vinculada ou a sessão tiver expirado, entre novamente e recarregue a página.
        </p>
      </div>
    )
  }
}
