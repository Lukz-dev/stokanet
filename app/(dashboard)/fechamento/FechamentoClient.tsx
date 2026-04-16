'use client'

import { useMemo, useState, useTransition } from 'react'
import { CalendarCheck2, CalendarClock, CalendarRange, ChevronLeft, ChevronRight, Lock, LockOpen, RefreshCw } from 'lucide-react'
import {
  closeDailyClosure,
  closeMonthlyClosure,
  getMonthlyClosureCalendar,
  reopenDailyClosure,
  reopenMonthlyClosure,
} from '@/lib/actions'

type ClosureDay = {
  date: string
  day: number
  weekDay: number
  status: 'OPEN' | 'CLOSED'
  notes: string | null
  salesCount: number
  salesTotal: number
  purchaseOrdersCount: number
  purchaseTotal: number
  stockEntriesQty: number
  stockOutputsQty: number
  stockAdjustmentsQty: number
  stockBalanceQty: number
  cashExpected: number
  stockValue: number
  closedAt: string | null
}

type ClosureCalendar = {
  month: {
    year: number
    month: number
    monthKey: string
    status: 'OPEN' | 'CLOSED'
    notes: string | null
    closedAt: string | null
  }
  summary: {
    daysInMonth: number
    closedDays: number
    openDays: number
    salesTotal: number
    purchaseTotal: number
    cashExpected: number
  }
  days: ClosureDay[]
  prev: { year: number; month: number }
  next: { year: number; month: number }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function formatMonthLabel(year: number, month: number) {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function FechamentoClient({ initialData }: { initialData: ClosureCalendar }) {
  const [data, setData] = useState<ClosureCalendar>(initialData)
  const [selectedDate, setSelectedDate] = useState(initialData.days[0]?.date ?? '')
  const [notes, setNotes] = useState(initialData.days[0]?.notes ?? '')
  const [monthNotes, setMonthNotes] = useState(initialData.month.notes ?? '')
  const [feedback, setFeedback] = useState<string>('')
  const [error, setError] = useState<string>('')
  const [isPending, startTransition] = useTransition()

  const selectedDay = useMemo(
    () => data.days.find((item) => item.date === selectedDate) ?? data.days[0],
    [data.days, selectedDate],
  )

  const firstWeekDay = data.days[0]?.weekDay ?? 1
  const leadingBlanks = (firstWeekDay + 6) % 7

  const calendarCells = useMemo(() => {
    const blanks = Array.from({ length: leadingBlanks }, () => null)
    return [...blanks, ...data.days]
  }, [leadingBlanks, data.days])

  const refreshMonth = (year: number, month: number, keepSelectedDate?: string) => {
    startTransition(async () => {
      try {
        setError('')
        const nextData = (await getMonthlyClosureCalendar({ year, month })) as ClosureCalendar
        setData(nextData)
        setMonthNotes(nextData.month.notes ?? '')

        const nextSelected = keepSelectedDate && nextData.days.some((d) => d.date === keepSelectedDate)
          ? keepSelectedDate
          : nextData.days[0]?.date ?? ''

        setSelectedDate(nextSelected)
        const selectedFromData = nextData.days.find((d) => d.date === nextSelected)
        setNotes(selectedFromData?.notes ?? '')
      } catch (currentError: any) {
        setError(currentError?.message || 'Nao foi possivel atualizar o calendario.')
      }
    })
  }

  const handleSelectDay = (date: string) => {
    setSelectedDate(date)
    const day = data.days.find((item) => item.date === date)
    setNotes(day?.notes ?? '')
    setFeedback('')
    setError('')
  }

  const handleCloseDay = () => {
    if (!selectedDay) return

    startTransition(async () => {
      try {
        setError('')
        setFeedback('')
        await closeDailyClosure({ day: selectedDay.date, notes })
        setFeedback(`Dia ${selectedDay.date} fechado com sucesso.`)
        refreshMonth(data.month.year, data.month.month, selectedDay.date)
      } catch (currentError: any) {
        setError(currentError?.message || 'Nao foi possivel fechar o dia.')
      }
    })
  }

  const handleReopenDay = () => {
    if (!selectedDay) return

    startTransition(async () => {
      try {
        setError('')
        setFeedback('')
        await reopenDailyClosure({ day: selectedDay.date })
        setFeedback(`Dia ${selectedDay.date} reaberto com sucesso.`)
        refreshMonth(data.month.year, data.month.month, selectedDay.date)
      } catch (currentError: any) {
        setError(currentError?.message || 'Nao foi possivel reabrir o dia.')
      }
    })
  }

  const handleCloseMonth = () => {
    startTransition(async () => {
      try {
        setError('')
        setFeedback('')
        await closeMonthlyClosure({
          year: data.month.year,
          month: data.month.month,
          notes: monthNotes,
        })
        setFeedback(`Mes ${data.month.monthKey} fechado com sucesso.`)
        refreshMonth(data.month.year, data.month.month, selectedDay?.date)
      } catch (currentError: any) {
        setError(currentError?.message || 'Nao foi possivel fechar o mes.')
      }
    })
  }

  const handleReopenMonth = () => {
    startTransition(async () => {
      try {
        setError('')
        setFeedback('')
        await reopenMonthlyClosure({ year: data.month.year, month: data.month.month })
        setFeedback(`Mes ${data.month.monthKey} reaberto com sucesso.`)
        refreshMonth(data.month.year, data.month.month, selectedDay?.date)
      } catch (currentError: any) {
        setError(currentError?.message || 'Nao foi possivel reabrir o mes.')
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fechamento mensal</h1>
          <p className="text-muted-foreground mt-1">Controle diario com calendario, snapshot por dia e fechamento consolidado do mes.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refreshMonth(data.prev.year, data.prev.month)}
            className="px-3 py-2 rounded-lg border border-border hover:bg-muted text-sm"
          >
            <span className="inline-flex items-center gap-1"><ChevronLeft className="w-4 h-4" /> Mes anterior</span>
          </button>
          <button
            type="button"
            onClick={() => refreshMonth(data.next.year, data.next.month)}
            className="px-3 py-2 rounded-lg border border-border hover:bg-muted text-sm"
          >
            <span className="inline-flex items-center gap-1">Proximo mes <ChevronRight className="w-4 h-4" /></span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="border border-border rounded-xl bg-card p-4">
          <p className="text-xs text-muted-foreground">Mes selecionado</p>
          <p className="text-xl font-bold capitalize mt-1">{formatMonthLabel(data.month.year, data.month.month)}</p>
          <p className="text-xs text-muted-foreground mt-2">Chave: {data.month.monthKey}</p>
        </div>
        <div className="border border-border rounded-xl bg-card p-4">
          <p className="text-xs text-muted-foreground">Dias fechados</p>
          <p className="text-2xl font-bold mt-1">{data.summary.closedDays}/{data.summary.daysInMonth}</p>
          <p className="text-xs text-muted-foreground mt-2">Pendentes: {data.summary.openDays}</p>
        </div>
        <div className="border border-border rounded-xl bg-card p-4">
          <p className="text-xs text-muted-foreground">Vendas fechadas</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(data.summary.salesTotal)}</p>
          <p className="text-xs text-muted-foreground mt-2">Compras: {formatCurrency(data.summary.purchaseTotal)}</p>
        </div>
        <div className="border border-border rounded-xl bg-card p-4">
          <p className="text-xs text-muted-foreground">Caixa esperado</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(data.summary.cashExpected)}</p>
          <p className="text-xs text-muted-foreground mt-2">Status do mes: {data.month.status === 'CLOSED' ? 'Fechado' : 'Aberto'}</p>
        </div>
      </div>

      {error && <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3">{error}</p>}
      {feedback && <p className="text-sm text-emerald-700 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-3">{feedback}</p>}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <section className="xl:col-span-2 border border-border rounded-xl bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold inline-flex items-center gap-2"><CalendarRange className="w-5 h-5" /> Calendario do mes</h2>
            <span className="text-xs text-muted-foreground">Clique em um dia para ver detalhes</span>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-xs text-muted-foreground mb-2">
            {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'].map((label) => (
              <div key={label} className="py-1">{label}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {calendarCells.map((cell, index) => {
              if (!cell) {
                return <div key={`blank-${index}`} className="h-20 rounded-lg border border-transparent" />
              }

              const isSelected = selectedDay?.date === cell.date
              const isClosed = cell.status === 'CLOSED'

              return (
                <button
                  key={cell.date}
                  type="button"
                  onClick={() => handleSelectDay(cell.date)}
                  className={`h-20 rounded-lg border px-2 py-1 text-left transition-colors ${
                    isSelected
                      ? 'border-primary bg-primary/10'
                      : isClosed
                        ? 'border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15'
                        : 'border-border hover:bg-muted'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="font-semibold text-sm">{cell.day}</span>
                    {isClosed ? <CalendarCheck2 className="w-4 h-4 text-emerald-600" /> : <CalendarClock className="w-4 h-4 text-muted-foreground" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 truncate">{formatCurrency(cell.salesTotal)}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{cell.salesCount} venda(s)</p>
                </button>
              )
            })}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="border border-border rounded-xl bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Dia selecionado</h3>
              <span className={`text-xs px-2 py-1 rounded-full ${selectedDay?.status === 'CLOSED' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
                {selectedDay?.status === 'CLOSED' ? 'Fechado' : 'Aberto'}
              </span>
            </div>

            {selectedDay ? (
              <>
                <p className="text-sm text-muted-foreground">Data: {selectedDay.date}</p>
                <div className="mt-3 space-y-1 text-sm">
                  <p>Vendas: <strong>{selectedDay.salesCount}</strong> ({formatCurrency(selectedDay.salesTotal)})</p>
                  <p>Compras recebidas: <strong>{selectedDay.purchaseOrdersCount}</strong> ({formatCurrency(selectedDay.purchaseTotal)})</p>
                  <p>Movimento estoque: <strong>{selectedDay.stockBalanceQty}</strong> un.</p>
                  <p>Caixa esperado: <strong>{formatCurrency(selectedDay.cashExpected)}</strong></p>
                </div>

                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Observacoes do fechamento diario"
                  className="mt-4 w-full min-h-24 px-3 py-2 rounded-lg border border-border bg-background text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                />

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleCloseDay}
                    disabled={isPending || data.month.status === 'CLOSED'}
                    className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60"
                  >
                    <span className="inline-flex items-center gap-1"><Lock className="w-4 h-4" /> Fechar dia</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleReopenDay}
                    disabled={isPending || data.month.status === 'CLOSED'}
                    className="px-3 py-2 rounded-lg border border-border text-sm font-semibold hover:bg-muted disabled:opacity-60"
                  >
                    <span className="inline-flex items-center gap-1"><LockOpen className="w-4 h-4" /> Reabrir dia</span>
                  </button>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum dia disponivel neste mes.</p>
            )}
          </div>

          <div className="border border-border rounded-xl bg-card p-5 shadow-sm">
            <h3 className="font-semibold mb-2">Fechamento do mes</h3>
            <p className="text-sm text-muted-foreground">Feche o mes somente quando todos os dias estiverem fechados.</p>

            <textarea
              value={monthNotes}
              onChange={(event) => setMonthNotes(event.target.value)}
              placeholder="Observacoes do fechamento mensal"
              className="mt-3 w-full min-h-24 px-3 py-2 rounded-lg border border-border bg-background text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
            />

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleCloseMonth}
                disabled={isPending}
                className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-60"
              >
                <span className="inline-flex items-center gap-1"><CalendarCheck2 className="w-4 h-4" /> Fechar mes</span>
              </button>
              <button
                type="button"
                onClick={handleReopenMonth}
                disabled={isPending}
                className="px-3 py-2 rounded-lg border border-border text-sm font-semibold hover:bg-muted disabled:opacity-60"
              >
                <span className="inline-flex items-center gap-1"><RefreshCw className="w-4 h-4" /> Reabrir mes</span>
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
