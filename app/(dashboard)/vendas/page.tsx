import { getSales } from '@/lib/actions'
import { VendasClient } from './VendasClient'

export default async function VendasPage() {
  try {
    const sales = await getSales(200)

    return <VendasClient initialSales={sales as any} />
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível carregar as vendas.'

    return (
      <div className="max-w-2xl rounded-3xl border border-border bg-card p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-destructive">Erro ao carregar</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Não foi possível abrir a página de vendas</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{message}</p>
        <p className="mt-3 text-sm text-muted-foreground">
          Se a conta estiver com a sessão ou empresa fora de sincronia, recarregue a página após entrar novamente.
        </p>
      </div>
    )
  }
}
