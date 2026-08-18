import prisma from '@/lib/prisma'
import { getActiveUser, getOrCreateDefaultCompany } from '@/lib/access'
import { SettingsClient } from './SettingsClient'
import { type ThemePreference } from '@/lib/theme'

const THEME_COLOR_PRESETS: Record<ThemePreference, { primary: string; secondary: string }> = {
  SUNSET: { primary: '#e0a15f', secondary: '#cf6f7a' },
  OCEAN: { primary: '#3f8fbf', secondary: '#61add9' },
  FOREST: { primary: '#5f9a58', secondary: '#7db677' },
  ROSE: { primary: '#cf6f7a', secondary: '#e0a15f' },
}

export default async function ConfiguracoesPage() {
  const company = await getOrCreateDefaultCompany()
  const user = await getActiveUser()

  const currentCompany = (await prisma.company.findUnique({
    where: { id: company.id },
  })) as {
    name: string
    defaultMinStock: number
    notificationWebhookUrl: string | null
    storeSlug: string | null
    storeName: string | null
    storeDescription: string | null
    storeHeroTitle: string | null
    storeHeroSubtitle: string | null
    storeBadgeText: string | null
    storePrimaryButtonLabel: string | null
    storeSecondaryButtonLabel: string | null
    storeWhatsappNumber: string | null
    storeInstagramUrl: string | null
    storeFacebookUrl: string | null
    storeTiktokUrl: string | null
    storeShippingFee: number | null
    storeFreeShippingMin: number | null
    storeShippingNote: string | null
    storePrimaryColor: string | null
    storeSecondaryColor: string | null
    storeShowSocialLinks: boolean | null
    storeShowShippingInfo: boolean | null
    storeBannerUrl: string | null
    storeLogoUrl: string | null
    storeTheme: string | null
    storeActive: boolean
    mercadopagoRefreshToken: string | null
    mercadopagoConnectedAt: Date | null
  } | null

  if (!currentCompany) {
    throw new Error('Configurações indisponíveis')
  }

  const storeTheme = String(currentCompany.storeTheme ?? 'ocean').toUpperCase() as ThemePreference
  const presetColors = THEME_COLOR_PRESETS[storeTheme]

  return (
    <SettingsClient
      companyName={currentCompany.name}
      defaultMinStock={currentCompany.defaultMinStock}
      notificationWebhookUrl={currentCompany.notificationWebhookUrl ?? ''}
      storeSlug={currentCompany.storeSlug ?? ''}
      storeName={currentCompany.storeName ?? currentCompany.name}
      storeDescription={currentCompany.storeDescription ?? ''}
      storeHeroTitle={currentCompany.storeHeroTitle ?? ''}
      storeHeroSubtitle={currentCompany.storeHeroSubtitle ?? ''}
      storeBadgeText={currentCompany.storeBadgeText ?? ''}
      storePrimaryButtonLabel={currentCompany.storePrimaryButtonLabel ?? ''}
      storeSecondaryButtonLabel={currentCompany.storeSecondaryButtonLabel ?? ''}
      storeWhatsappNumber={currentCompany.storeWhatsappNumber ?? ''}
      storeInstagramUrl={currentCompany.storeInstagramUrl ?? ''}
      storeFacebookUrl={currentCompany.storeFacebookUrl ?? ''}
      storeTiktokUrl={currentCompany.storeTiktokUrl ?? ''}
      storeShippingFee={currentCompany.storeShippingFee?.toString() ?? ''}
      storeFreeShippingMin={currentCompany.storeFreeShippingMin?.toString() ?? ''}
      storeShippingNote={currentCompany.storeShippingNote ?? ''}
      storePrimaryColor={currentCompany.storePrimaryColor ?? presetColors.primary}
      storeSecondaryColor={currentCompany.storeSecondaryColor ?? presetColors.secondary}
      storeShowSocialLinks={currentCompany.storeShowSocialLinks ?? true}
      storeShowShippingInfo={currentCompany.storeShowShippingInfo ?? true}
      storeBannerUrl={currentCompany.storeBannerUrl ?? ''}
      storeLogoUrl={currentCompany.storeLogoUrl ?? ''}
      storeTheme={storeTheme}
      storeActive={currentCompany.storeActive}
      mercadopagoConnected={Boolean(currentCompany.mercadopagoRefreshToken && currentCompany.mercadopagoConnectedAt)}
      currentThemePreference={user.themePreference as ThemePreference}
    />
  )
}