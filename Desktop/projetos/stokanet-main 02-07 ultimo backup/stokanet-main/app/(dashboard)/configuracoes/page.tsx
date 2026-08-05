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

  const currentCompany = await prisma.company.findUnique({
    where: { id: company.id },
    select: {
      name: true,
      defaultMinStock: true,
      notificationWebhookUrl: true,
      storeSlug: true,
      storeName: true,
      storeDescription: true,
      storeHeroTitle: true,
      storeHeroSubtitle: true,
      storeBadgeText: true,
      storePrimaryButtonLabel: true,
      storeSecondaryButtonLabel: true,
      storeWhatsappNumber: true,
      storeInstagramUrl: true,
      storeFacebookUrl: true,
      storeTiktokUrl: true,
      storeShippingFee: true,
      storeFreeShippingMin: true,
      storeShippingNote: true,
      storePrimaryColor: true,
      storeSecondaryColor: true,
      storeShowSocialLinks: true,
      storeShowShippingInfo: true,
      storeBannerUrl: true,
      storeLogoUrl: true,
      storeTheme: true,
      storeActive: true,
      mercadopagoAccessToken: true,
    },
  })

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
      storeShowSocialLinks={currentCompany.storeShowSocialLinks}
      storeShowShippingInfo={currentCompany.storeShowShippingInfo}
      storeBannerUrl={currentCompany.storeBannerUrl ?? ''}
      storeLogoUrl={currentCompany.storeLogoUrl ?? ''}
      storeTheme={storeTheme}
      storeActive={currentCompany.storeActive}
      mercadopagoAccessToken={currentCompany.mercadopagoAccessToken ?? ''}
      currentThemePreference={user.themePreference as ThemePreference}
    />
  )
}