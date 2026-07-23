import prisma from '@/lib/prisma'
import { getActiveUser } from '@/lib/access'
import { getSubscriptionInfo } from '@/lib/subscription'
import { PerfilClient } from './PerfilClient'

export default async function PerfilPage() {
  try {
    const activeUser = await getActiveUser()

    const user = await prisma.user.findUnique({
      where: { id: activeUser.id },
      include: { company: true },
    })

    if (!user || !user.company) {
      throw new Error('Perfil indisponível')
    }

    const subscription = user.companyId ? await getSubscriptionInfo(user.companyId) : null

    return (
      <PerfilClient
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
          themePreference: user.themePreference,
          role: user.role,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        }}
        company={{
          id: user.company.id,
          name: user.company.name,
          defaultMinStock: user.company.defaultMinStock,
          createdAt: user.company.createdAt.toISOString(),
        }}
        subscription={subscription
          ? {
              planType: subscription.planType,
              billingMode: subscription.billingMode,
              status: subscription.status,
              nextBillingDate: subscription.nextBillingDate?.toISOString() ?? null,
              expiresAt: subscription.expiresAt?.toISOString() ?? null,
              autoRenew: subscription.autoRenew,
            }
          : null}
      />
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível carregar o perfil.'

    return (
      <div className="max-w-2xl rounded-3xl border border-border bg-card p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-destructive">Erro ao carregar</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Não foi possível abrir o perfil</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{message}</p>
      </div>
    )
  }
}