import prisma from '@/lib/prisma'
import { hasFeature, isProAmount, type ProFeature } from '@/lib/plans'

export interface CompanyPlanInfo {
  planId: string | null
  status: string | null
  isActive: boolean
  maxUsers: number
}

/** Lê o plano + status ativo da empresa (uma query). O plano vem do amount da assinatura. */
export async function getCompanyPlan(companyId: string): Promise<CompanyPlanInfo> {
  const subscription = await prisma.subscription.findUnique({
    where: { companyId },
    select: { amount: true, status: true },
  })

  const isActive = subscription?.status === 'ACTIVE'
  const planId = isActive ? (isProAmount(subscription!.amount) ? 'PRO' : 'BASIC') : null

  return {
    planId,
    status: subscription?.status ?? null,
    isActive,
    maxUsers: planId === 'PRO' ? -1 : 2,
  }
}

/** Gate de funcionalidade: lança erro se a empresa não tem a feature. */
export async function requireFeature(companyId: string, feature: ProFeature) {
  const info = await getCompanyPlan(companyId)
  if (!hasFeature(info.planId, info.status, feature)) {
    throw new Error(
      feature === 'store'
        ? 'A loja online está disponível somente no plano PRO. Faça upgrade para liberar.'
        : 'Esta funcionalidade está disponível somente no plano PRO. Faça upgrade para liberar.'
    )
  }
  return info
}

/** Gate silencioso: retorna boolean (para esconder itens de menu/páginas). */
export async function companyHasFeature(companyId: string, feature: ProFeature): Promise<boolean> {
  const info = await getCompanyPlan(companyId)
  return hasFeature(info.planId, info.status, feature)
}
