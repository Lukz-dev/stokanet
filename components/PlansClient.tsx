'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import clsx from 'clsx'

interface PlansClientProps {
  hasActiveSubscription: boolean
}

type BillingPeriod = 'MONTHLY' | 'ANNUAL'

const PLANS = [
  {
    id: 'BASIC' as const,
    name: 'Básico',
    description: 'Para começar a controlar o estoque',
    monthlyPrice: 150,
    annualPrice: 1530,
    features: [
      'Produtos, movimentações e vendas',
      'Compras e fornecedores',
      'Filiais, armazéns e lotes',
      'Caixa e fechamento diário/mensal',
      'Emissão de NFe/NFSe',
      'Até 2 usuários',
      'Suporte por e-mail',
    ],
    popular: false,
  },
  {
    id: 'PRO' as const,
    name: 'PRO',
    description: 'Tudo do Básico + loja online e gestão avançada',
    monthlyPrice: 250,
    annualPrice: 2550,
    features: [
      'Tudo do plano Básico',
      'Usuários ilimitados',
      'Loja online (vitrine + checkout Mercado Pago)',
      'Relatórios avançados (faturamento, lucro, giro)',
      'Auditoria completa de ações',
      'Perfil de chefia/performance',
      'Suporte prioritário',
    ],
    popular: true,
  },
]

function formatBRL(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(value)
}

export function PlansClient({ hasActiveSubscription }: PlansClientProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string>('')
  const [period, setPeriod] = useState<BillingPeriod>('MONTHLY')
  const [autoRenew, setAutoRenew] = useState(false)

  const switchPeriod = (next: BillingPeriod) => {
    setPeriod(next)
    setAutoRenew(next === 'ANNUAL')
  }

  const handleCheckout = async (planId: 'BASIC' | 'PRO') => {
    setLoading(planId)
    setError('')

    try {
      const response = await fetch('/api/subscription/create-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: `${planId}_${period}`,
          billingMode: autoRenew ? 'RECURRING' : 'ONE_TIME',
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Erro ao criar pagamento')
        setLoading(null)
        return
      }

      const { initPoint, sandboxInitPoint } = await response.json()
      const checkoutUrl =
        process.env.NEXT_PUBLIC_MERCADOPAGO_ENV === 'production' ? initPoint : sandboxInitPoint || initPoint

      if (checkoutUrl) {
        window.location.href = checkoutUrl
      } else {
        setError('Erro ao redirecionar para pagamento')
      }
    } catch {
      setError('Erro ao processar pedido')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-3">Escolha seu plano</h1>
          <p className="text-lg text-muted-foreground">Controle de estoque completo, com loja online no plano PRO</p>

          <div className="mt-6 inline-flex rounded-full border border-border bg-muted/40 p-1">
            <button
              type="button"
              onClick={() => switchPeriod('MONTHLY')}
              className={clsx(
                'rounded-full px-5 py-2 text-sm font-semibold transition-colors',
                period === 'MONTHLY' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Mensal
            </button>
            <button
              type="button"
              onClick={() => switchPeriod('ANNUAL')}
              className={clsx(
                'rounded-full px-5 py-2 text-sm font-semibold transition-colors',
                period === 'ANNUAL' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Anual
              <span className="ml-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-600">-15%</span>
            </button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {PLANS.map((plan) => {
            const price = period === 'MONTHLY' ? plan.monthlyPrice : plan.annualPrice
            const perMonth = period === 'ANNUAL' ? Math.round(plan.annualPrice / 12) : plan.monthlyPrice
            return (
              <div
                key={plan.id}
                className={clsx(
                  'relative rounded-2xl border bg-card p-8 shadow-sm flex flex-col',
                  plan.popular ? 'border-primary/60 shadow-lg shadow-primary/10' : 'border-border'
                )}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                    Mais popular
                  </span>
                )}
                <h2 className="text-xl font-bold text-foreground">{plan.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>

                <div className="mt-6 flex items-baseline gap-2">
                  <span className="text-4xl font-bold tracking-tight text-foreground">{formatBRL(price)}</span>
                  <span className="text-sm text-muted-foreground">{period === 'MONTHLY' ? '/mês' : '/ano'}</span>
                </div>
                {period === 'ANNUAL' && (
                  <p className="mt-1 text-sm text-muted-foreground">Equivale a {formatBRL(perMonth)}/mês — 15% de desconto</p>
                )}

                <ul className="mt-6 space-y-3 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <label className="mt-6 flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
                  <span className="flex items-start gap-2">
                    <span className="text-sm font-medium text-foreground">Renovação automática</span>
                    <span className="block text-xs text-muted-foreground">
                      {period === 'MONTHLY'
                        ? 'Renova todo mês no Mercado Pago'
                        : 'Renova automaticamente a cada ano'}
                    </span>
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={autoRenew}
                    onClick={() => setAutoRenew((v) => !v)}
                    className={clsx(
                      'relative h-6 w-11 shrink-0 rounded-full transition-colors',
                      autoRenew ? 'bg-primary' : 'bg-muted-foreground/30'
                    )}
                  >
                    <span
                      className={clsx(
                        'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                        autoRenew ? 'translate-x-5' : 'translate-x-0'
                      )}
                    />
                  </button>
                </label>

                <button
                  type="button"
                  onClick={() => handleCheckout(plan.id)}
                  disabled={loading !== null}
                  className={clsx(
                    'mt-8 rounded-xl px-5 py-3 text-sm font-semibold transition-all active:scale-[0.98]',
                    plan.popular
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90'
                      : 'border border-border bg-card text-foreground hover:bg-muted'
                  )}
                >
                  {loading === plan.id ? 'Redirecionando...' : hasActiveSubscription ? 'Trocar de plano' : 'Assinar agora'}
                </button>
              </div>
            )
          })}
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-center text-sm text-destructive">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
