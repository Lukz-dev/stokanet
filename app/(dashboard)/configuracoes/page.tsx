import prisma from '@/lib/prisma'
import { getActiveUser, getOrCreateDefaultCompany } from '@/lib/access'
import { SettingsClient } from './SettingsClient'

export default async function ConfiguracoesPage() {
  const company = await getOrCreateDefaultCompany()
  const user = await getActiveUser()

  const currentCompany = await prisma.company.findUnique({
    where: { id: company.id },
    select: { name: true, defaultMinStock: true, notificationWebhookUrl: true, nfeSettings: {
      select: {
        enabled: true,
        environment: true,
        model: true,
        series: true,
        nextNumber: true,
        defaultCfop: true,
        naturezaOperacao: true,
        taxRegime: true,
        defaultTaxProfile: true,
        updatedAt: true,
      },
    } },
  })

  if (!currentCompany) {
    throw new Error('Configurações indisponíveis')
  }

  return (
    <SettingsClient
      companyName={currentCompany.name}
      defaultMinStock={currentCompany.defaultMinStock}
      notificationWebhookUrl={currentCompany.notificationWebhookUrl ?? ''}
      nfeSettings={currentCompany.nfeSettings ? { ...currentCompany.nfeSettings, updatedAt: currentCompany.nfeSettings.updatedAt.toISOString() } : null}
      currentThemePreference={user.themePreference as 'SUNSET' | 'OCEAN' | 'FOREST' | 'ROSE'}
    />
  )
}