/**
 * Catálogo de planos do StokaNet.
 * Fonte única de verdade: preços, limites e funcionalidades por plano.
 * Usado pela página de planos, checkout Mercado Pago, gates de funcionalidade e editor admin.
 */

export type PlanId = 'BASIC' | 'PRO'
export type BillingPeriod = 'MONTHLY' | 'ANNUAL'

export interface PlanDefinition {
  id: PlanId
  name: string
  description: string
  monthlyPrice: number
  annualPrice: number // 12 × mensal com desconto
  annualDiscountPct: number
  maxUsers: number // -1 = ilimitado
  features: string[]
  popular?: boolean
}

export const ANNUAL_DISCOUNT_PCT = 15

export const PLANS: Record<PlanId, PlanDefinition> = {
  BASIC: {
    id: 'BASIC',
    name: 'Básico',
    description: 'Para começar a controlar o estoque',
    monthlyPrice: 150,
    annualPrice: Math.round(150 * 12 * (1 - ANNUAL_DISCOUNT_PCT / 100)), // 1530
    annualDiscountPct: ANNUAL_DISCOUNT_PCT,
    maxUsers: 2,
    features: [
      'Produtos, movimentações e vendas',
      'Compras e fornecedores',
      'Filiais, armazéns e lotes',
      'Caixa e fechamento diário/mensal',
      'Emissão de NFe/NFSe',
      'Até 2 usuários',
      'Suporte por e-mail',
    ],
  },
  PRO: {
    id: 'PRO',
    name: 'PRO',
    description: 'Tudo do Básico + loja online e gestão avançada',
    monthlyPrice: 250,
    annualPrice: Math.round(250 * 12 * (1 - ANNUAL_DISCOUNT_PCT / 100)), // 2550
    annualDiscountPct: ANNUAL_DISCOUNT_PCT,
    maxUsers: -1,
    popular: true,
    features: [
      'Tudo do plano Básico',
      'Usuários ilimitados',
      'Loja online (vitrine + checkout Mercado Pago)',
      'Relatórios avançados (faturamento, lucro, giro)',
      'Auditoria completa de ações',
      'Perfil de chefia/performance',
      'Suporte prioritário',
    ],
  },
}

/** Chaves de cobrança: 4 combinações plano × período (usadas no checkout MP). */
export const PLAN_BILLING_KEYS = [
  'BASIC_MONTHLY',
  'BASIC_ANNUAL',
  'PRO_MONTHLY',
  'PRO_ANNUAL',
] as const

export type PlanBillingKey = (typeof PLAN_BILLING_KEYS)[number]

export interface BillingOption {
  key: PlanBillingKey
  planId: PlanId
  period: BillingPeriod
  amount: number
  label: string
  description: string
}

export const BILLING_OPTIONS: Record<PlanBillingKey, BillingOption> = {
  BASIC_MONTHLY: {
    key: 'BASIC_MONTHLY',
    planId: 'BASIC',
    period: 'MONTHLY',
    amount: PLANS.BASIC.monthlyPrice,
    label: 'Básico Mensal',
    description: 'Acesso mensal ao sistema de estoque',
  },
  BASIC_ANNUAL: {
    key: 'BASIC_ANNUAL',
    planId: 'BASIC',
    period: 'ANNUAL',
    amount: PLANS.BASIC.annualPrice,
    label: 'Básico Anual',
    description: 'Acesso anual com 15% de desconto',
  },
  PRO_MONTHLY: {
    key: 'PRO_MONTHLY',
    planId: 'PRO',
    period: 'MONTHLY',
    amount: PLANS.PRO.monthlyPrice,
    label: 'PRO Mensal',
    description: 'Acesso mensal com loja online incluída',
  },
  PRO_ANNUAL: {
    key: 'PRO_ANNUAL',
    planId: 'PRO',
    period: 'ANNUAL',
    amount: PLANS.PRO.annualPrice,
    label: 'PRO Anual',
    description: 'Acesso anual com 15% de desconto',
  },
}

/**
 * Funcionalidades exclusivas do PRO (gates de funcionalidade).
 * Features não listadas aqui estão disponíveis em todos os planos.
 */
export const PRO_ONLY_FEATURES = [
  'store', // loja online (vitrine pública + checkout)
  'reports', // relatórios avançados
  'audit', // auditoria
  'boss', // perfil de chefia/performance
] as const

export type ProFeature = (typeof PRO_ONLY_FEATURES)[number]

/**
 * Verifica se a empresa tem acesso a uma funcionalidade.
 * Sem assinatura ativa → só o essencial (features não-PRO).
 */
export function hasFeature(
  plan: string | null | undefined,
  status: string | null | undefined,
  feature: ProFeature
): boolean {
  if (!PRO_ONLY_FEATURES.includes(feature)) return true
  if (status !== 'ACTIVE') return false
  return plan === 'PRO'
}

/** Valores de assinatura que dão acesso PRO: planos PRO atuais + legado 100/1020 (grandfathered). */
export const PRO_AMOUNTS = [250, 2550, 100, 1020]

export function isProAmount(amount: number | null | undefined): boolean {
  return amount != null && (PRO_AMOUNTS as number[]).includes(amount)
}
