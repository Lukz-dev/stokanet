import prisma from '@/lib/prisma'
import { getActiveUser, getOrCreateDefaultCompany } from '@/lib/access'
import { SettingsClient } from './SettingsClient'

export default async function ConfiguracoesPage() {
  try {
    const company = await getOrCreateDefaultCompany()
    const user = await getActiveUser()

    const currentCompany = await prisma.company.findUnique({
      where: { id: company.id },
      select: { name: true, defaultMinStock: true, notificationWebhookUrl: true },
    })

    if (!currentCompany) {
      throw new Error('Configurações indisponíveis')
    }

    return (
      <SettingsClient
        companyName={currentCompany.name}
        defaultMinStock={currentCompany.defaultMinStock}
        notificationWebhookUrl={currentCompany.notificationWebhookUrl ?? ''}
        currentThemePreference={user.themePreference as 'SUNSET' | 'OCEAN' | 'FOREST' | 'ROSE'}
      />
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Não foi possível carregar as configurações.'

    return (
      <div className="max-w-2xl rounded-3xl border border-border bg-card p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-destructive">Erro ao carregar</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Não foi possível abrir as configurações</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{message}</p>
      </div>
    )
  }
}