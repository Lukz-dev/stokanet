import { getMonthlyClosureCalendar } from '@/lib/actions'
import { FechamentoClient } from './FechamentoClient'

export default async function FechamentoPage() {
  try {
    const data = await getMonthlyClosureCalendar()

    return <FechamentoClient initialData={data as any} />
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível carregar o fechamento.'

    return (
      <div className="max-w-2xl rounded-3xl border border-border bg-card p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-destructive">Erro ao carregar</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Não foi possível abrir o fechamento</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{message}</p>
      </div>
    )
  }
}
