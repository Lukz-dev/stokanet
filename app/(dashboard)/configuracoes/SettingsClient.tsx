'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Settings, PackagePlus, RotateCw, Store, ArrowRight, Webhook, Palette, Check, Copy } from 'lucide-react'
import { testNotificationWebhook, updateCompanyPreferences, updateThemePreference } from '@/lib/actions'
import { THEME_ATTRIBUTE_MAP, type ThemePreference } from '@/lib/theme'

const THEME_COLOR_PRESETS: Record<ThemePreference, { primary: string; secondary: string }> = {
  SUNSET: { primary: '#e0a15f', secondary: '#cf6f7a' },
  OCEAN: { primary: '#3f8fbf', secondary: '#61add9' },
  FOREST: { primary: '#5f9a58', secondary: '#7db677' },
  ROSE: { primary: '#cf6f7a', secondary: '#e0a15f' },
}

interface Props {
  companyName: string
  defaultMinStock: number
  notificationWebhookUrl: string
  storeSlug: string
  storeName: string
  storeDescription: string
  storeHeroTitle: string
  storeHeroSubtitle: string
  storeBadgeText: string
  storePrimaryButtonLabel: string
  storeSecondaryButtonLabel: string
  storeWhatsappNumber: string
  storeInstagramUrl: string
  storeFacebookUrl: string
  storeTiktokUrl: string
  storeShippingFee: string
  storeFreeShippingMin: string
  storeShippingNote: string
  storePrimaryColor: string
  storeSecondaryColor: string
  storeShowSocialLinks: boolean
  storeShowShippingInfo: boolean
  storeBannerUrl: string
  storeLogoUrl: string
  storeTheme: ThemePreference
  storeActive: boolean
  mercadopagoConnected: boolean
  currentThemePreference: ThemePreference
}

export function SettingsClient({
  companyName,
  defaultMinStock,
  notificationWebhookUrl,
  storeSlug,
  storeName,
  storeDescription,
  storeHeroTitle,
  storeHeroSubtitle,
  storeBadgeText,
  storePrimaryButtonLabel,
  storeSecondaryButtonLabel,
  storeWhatsappNumber,
  storeInstagramUrl,
  storeFacebookUrl,
  storeTiktokUrl,
  storeShippingFee,
  storeFreeShippingMin,
  storeShippingNote,
  storePrimaryColor,
  storeSecondaryColor,
  storeShowSocialLinks,
  storeShowShippingInfo,
  storeBannerUrl,
  storeLogoUrl,
  storeTheme,
  storeActive,
  mercadopagoConnected,
  currentThemePreference,
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [themePending, startThemeTransition] = useTransition()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [themePreference, setThemePreference] = useState<ThemePreference>(currentThemePreference)
  const [form, setForm] = useState({
    defaultMinStock: String(defaultMinStock),
    notificationWebhookUrl,
    storeSlug,
    storeName,
    storeDescription,
    storeHeroTitle,
    storeHeroSubtitle,
    storeBadgeText,
    storePrimaryButtonLabel,
    storeSecondaryButtonLabel,
    storeWhatsappNumber,
    storeInstagramUrl,
    storeFacebookUrl,
    storeTiktokUrl,
    storeShippingFee,
    storeFreeShippingMin,
    storeShippingNote,
    storePrimaryColor,
    storeSecondaryColor,
    storeShowSocialLinks,
    storeShowShippingInfo,
    storeBannerUrl,
    storeLogoUrl,
    storeTheme,
    storeActive: Boolean(storeActive),
  })
  const storeThemePreset = THEME_COLOR_PRESETS[String(form.storeTheme ?? 'ocean').toUpperCase() as ThemePreference] ?? THEME_COLOR_PRESETS.OCEAN

  const themeOptions: Array<{ value: ThemePreference; label: string; description: string; swatch: string }> = [
    { value: 'SUNSET', label: 'Sunset', description: 'Laranja quente (padrão)', swatch: 'bg-[#e0a15f]' },
    { value: 'OCEAN', label: 'Ocean', description: 'Azul profundo e frio', swatch: 'bg-[#3f8fbf]' },
    { value: 'FOREST', label: 'Forest', description: 'Verde sóbrio', swatch: 'bg-[#5f9a58]' },
    { value: 'ROSE', label: 'Rose', description: 'Rosa elegante', swatch: 'bg-[#cf6f7a]' },
  ]

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    startTransition(async () => {
      try {
        await updateCompanyPreferences({
          defaultMinStock: Number.parseInt(form.defaultMinStock, 10),
          notificationWebhookUrl: form.notificationWebhookUrl,
          storeSlug: form.storeSlug,
          storeName: form.storeName,
          storeDescription: form.storeDescription,
          storeHeroTitle: form.storeHeroTitle,
          storeHeroSubtitle: form.storeHeroSubtitle,
          storeBadgeText: form.storeBadgeText,
          storePrimaryButtonLabel: form.storePrimaryButtonLabel,
          storeSecondaryButtonLabel: form.storeSecondaryButtonLabel,
          storeWhatsappNumber: form.storeWhatsappNumber,
          storeInstagramUrl: form.storeInstagramUrl,
          storeFacebookUrl: form.storeFacebookUrl,
          storeTiktokUrl: form.storeTiktokUrl,
          storeShippingFee: Number(form.storeShippingFee),
          storeFreeShippingMin: Number(form.storeFreeShippingMin),
          storeShippingNote: form.storeShippingNote,
          storePrimaryColor: form.storePrimaryColor,
          storeSecondaryColor: form.storeSecondaryColor,
          storeShowSocialLinks: form.storeShowSocialLinks,
          storeShowShippingInfo: form.storeShowShippingInfo,
          storeBannerUrl: form.storeBannerUrl,
          storeLogoUrl: form.storeLogoUrl,
          storeTheme: form.storeTheme,
          storeActive: form.storeActive,
        } as Parameters<typeof updateCompanyPreferences>[0])
        setSuccess('Configurações salvas com sucesso.')
        router.refresh()
      } catch (currentError: any) {
        setError(currentError.message || 'Não foi possível salvar as configurações.')
      }
    })
  }

  const disconnectMercadoPago = async () => {
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/mercadopago/oauth/disconnect', { method: 'POST' })
      if (!response.ok) throw new Error('Não foi possível desconectar o Mercado Pago.')
      setSuccess('Mercado Pago desconectado.')
      router.refresh()
    } catch (currentError: any) {
      setError(currentError.message || 'Não foi possível desconectar o Mercado Pago.')
    }
  }

  const handleTestWebhook = () => {
    setError('')
    setSuccess('')

    startTransition(async () => {
      try {
        await testNotificationWebhook()
        setSuccess('Teste enviado para o webhook configurado.')
      } catch (currentError: any) {
        setError(currentError.message || 'Não foi possível enviar teste para o webhook.')
      }
    })
  }

  const handleCopyPublicUrl = async () => {
    const shareUrl = `${window.location.origin}/loja/${form.storeSlug || 'seu-slug'}`

    try {
      await navigator.clipboard.writeText(shareUrl)
      setSuccess('URL da loja copiada para a área de transferência.')
    } catch {
      setError('Não foi possível copiar a URL. Tente selecionar o link manualmente.')
    }
  }

  const applyThemeToDocument = (value: ThemePreference) => {
    document.documentElement.setAttribute('data-theme-color', THEME_ATTRIBUTE_MAP[value])
  }

  const handleThemePreferenceChange = (nextTheme: ThemePreference) => {
    if (nextTheme === themePreference || themePending) return

    const previousTheme = themePreference
    setError('')
    setSuccess('')
    setThemePreference(nextTheme)
    applyThemeToDocument(nextTheme)

    startThemeTransition(async () => {
      try {
        await updateThemePreference(nextTheme)
        setSuccess('Tema do layout atualizado com sucesso.')
        router.refresh()
      } catch (currentError: any) {
        setThemePreference(previousTheme)
        applyThemeToDocument(previousTheme)
        setError(currentError.message || 'Não foi possível atualizar o tema.')
      }
    })
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground mb-4">
            <Settings className="w-3.5 h-3.5 text-primary" />
            Preferências da operação
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações operacionais</h1>
          <p className="text-muted-foreground mt-1 text-lg">Ajuste o comportamento padrão do cadastro e da reposição.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/perfil" className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors">
            <Store className="w-4 h-4" />
            Abrir perfil
          </Link>
          <Link href="/estoque" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
            Ir para o estoque
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-card border border-border rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-semibold">Cadastro padrão</h2>
                <p className="text-sm text-muted-foreground">Esse valor já vem preenchido ao criar um novo produto.</p>
              </div>
              <PackagePlus className="w-5 h-5 text-primary" />
            </div>

            <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSubmit}>
              {error && <p className="md:col-span-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3">{error}</p>}
              {success && <p className="md:col-span-2 text-sm text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-3">{success}</p>}

              <label className="flex flex-col gap-2 md:col-span-2">
                <span className="text-sm font-medium">Estoque mínimo padrão</span>
                <span className="relative">
                  <RotateCw className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="number"
                    min="0"
                    value={form.defaultMinStock}
                    onChange={(event) => setForm((prev) => ({ ...prev, defaultMinStock: event.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </span>
              </label>

              <label className="flex flex-col gap-2 md:col-span-2">
                <span className="text-sm font-medium">Webhook externo de alertas</span>
                <span className="relative">
                  <Webhook className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="url"
                    value={form.notificationWebhookUrl}
                    onChange={(event) => setForm((prev) => ({ ...prev, notificationWebhookUrl: event.target.value }))}
                    placeholder="https://seu-endpoint.com/webhook"
                    className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </span>
              </label>

              <label className="flex flex-col gap-2 md:col-span-2">
                <span className="text-sm font-medium">URL pública da loja</span>
                <span className="relative">
                  <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={form.storeSlug}
                    onChange={(event) => setForm((prev) => ({ ...prev, storeSlug: event.target.value }))}
                    placeholder="minha-loja"
                    className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </span>
                <span className="text-xs text-muted-foreground">
                  Use apenas letras, números e hífen. O endereço final fica em /loja/{form.storeSlug || 'seu-slug'}
                </span>
              </label>

              <div className="md:col-span-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleTestWebhook}
                  disabled={isPending}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-muted transition-colors disabled:opacity-60"
                >
                  Testar webhook
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
                >
                  {isPending ? 'Salvando...' : 'Salvar configurações'}
                </button>
              </div>
            </form>
          </section>

          <section className="bg-card border border-border rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-semibold">Pagamento da loja</h2>
                <p className="text-sm text-muted-foreground">Conecte a conta do próprio cliente. Nenhum token precisa ser compartilhado.</p>
              </div>
              <Store className="w-5 h-5 text-primary" />
            </div>
            {mercadopagoConnected ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                <div>
                  <p className="font-semibold text-emerald-700">Mercado Pago conectado</p>
                  <p className="mt-1 text-xs text-muted-foreground">Os pagamentos da loja serão recebidos na conta autorizada.</p>
                </div>
                <button type="button" onClick={disconnectMercadoPago} className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold hover:bg-muted">
                  Desconectar
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                <div>
                  <p className="font-semibold text-amber-700">Mercado Pago não conectado</p>
                  <p className="mt-1 text-xs text-muted-foreground">O cliente será levado ao Mercado Pago para autorizar a própria conta.</p>
                </div>
                <a href="/api/mercadopago/oauth/start" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                  Conectar Mercado Pago
                </a>
              </div>
            )}
          </section>

          <section className="bg-card border border-border rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-semibold">Conteúdo da loja</h2>
                <p className="text-sm text-muted-foreground">Edite textos, chamada principal e aparência do topo da vitrine.</p>
              </div>
              <Store className="w-5 h-5 text-primary" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-2 md:col-span-2">
                <span className="text-sm font-medium">Nome da loja</span>
                <input
                  type="text"
                  value={form.storeName}
                  onChange={(event) => setForm((prev) => ({ ...prev, storeName: event.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <label className="flex flex-col gap-2 md:col-span-2">
                <span className="text-sm font-medium">Descrição da loja</span>
                <textarea
                  value={form.storeDescription}
                  onChange={(event) => setForm((prev) => ({ ...prev, storeDescription: event.target.value }))}
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <label className="flex flex-col gap-2 md:col-span-2">
                <span className="text-sm font-medium">Título principal da vitrine</span>
                <input
                  type="text"
                  value={form.storeHeroTitle}
                  onChange={(event) => setForm((prev) => ({ ...prev, storeHeroTitle: event.target.value }))}
                  placeholder="Ex: Moda com entrega rápida"
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <label className="flex flex-col gap-2 md:col-span-2">
                <span className="text-sm font-medium">Subtítulo da vitrine</span>
                <textarea
                  value={form.storeHeroSubtitle}
                  onChange={(event) => setForm((prev) => ({ ...prev, storeHeroSubtitle: event.target.value }))}
                  rows={3}
                  placeholder="Ex: Produtos escolhidos, estoque atualizado e checkout direto no Mercado Pago."
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">Texto de destaque</span>
                <input
                  type="text"
                  value={form.storeBadgeText}
                  onChange={(event) => setForm((prev) => ({ ...prev, storeBadgeText: event.target.value }))}
                  placeholder="Ex: Entrega em até 24h"
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">Botão principal</span>
                <input
                  type="text"
                  value={form.storePrimaryButtonLabel}
                  onChange={(event) => setForm((prev) => ({ ...prev, storePrimaryButtonLabel: event.target.value }))}
                  placeholder="Ex: Comprar agora"
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">Botão secundário</span>
                <input
                  type="text"
                  value={form.storeSecondaryButtonLabel}
                  onChange={(event) => setForm((prev) => ({ ...prev, storeSecondaryButtonLabel: event.target.value }))}
                  placeholder="Ex: Ver catálogo"
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <label className="flex flex-col gap-2 md:col-span-2">
                <span className="text-sm font-medium">Banner da loja</span>
                <input
                  type="url"
                  value={form.storeBannerUrl}
                  onChange={(event) => setForm((prev) => ({ ...prev, storeBannerUrl: event.target.value }))}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <label className="flex flex-col gap-2 md:col-span-2">
                <span className="text-sm font-medium">Logo da loja</span>
                <input
                  type="url"
                  value={form.storeLogoUrl}
                  onChange={(event) => setForm((prev) => ({ ...prev, storeLogoUrl: event.target.value }))}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <label className="flex flex-col gap-2 md:col-span-2">
                <span className="text-sm font-medium">WhatsApp da loja</span>
                <input
                  type="text"
                  value={form.storeWhatsappNumber}
                  onChange={(event) => setForm((prev) => ({ ...prev, storeWhatsappNumber: event.target.value }))}
                  placeholder="5511999999999"
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">Instagram</span>
                <input
                  type="url"
                  value={form.storeInstagramUrl}
                  onChange={(event) => setForm((prev) => ({ ...prev, storeInstagramUrl: event.target.value }))}
                  placeholder="https://instagram.com/sualoja"
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">Facebook</span>
                <input
                  type="url"
                  value={form.storeFacebookUrl}
                  onChange={(event) => setForm((prev) => ({ ...prev, storeFacebookUrl: event.target.value }))}
                  placeholder="https://facebook.com/sualoja"
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">TikTok</span>
                <input
                  type="url"
                  value={form.storeTiktokUrl}
                  onChange={(event) => setForm((prev) => ({ ...prev, storeTiktokUrl: event.target.value }))}
                  placeholder="https://tiktok.com/@sualoja"
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">Frete padrão (R$)</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.storeShippingFee}
                  onChange={(event) => setForm((prev) => ({ ...prev, storeShippingFee: event.target.value }))}
                  placeholder="20,00"
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">Frete grátis acima de (R$)</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.storeFreeShippingMin}
                  onChange={(event) => setForm((prev) => ({ ...prev, storeFreeShippingMin: event.target.value }))}
                  placeholder="150,00"
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <label className="flex flex-col gap-2 md:col-span-2">
                <span className="text-sm font-medium">Aviso sobre frete</span>
                <textarea
                  value={form.storeShippingNote}
                  onChange={(event) => setForm((prev) => ({ ...prev, storeShippingNote: event.target.value }))}
                  rows={3}
                  placeholder="Ex: Entregas em até 3 dias úteis após a confirmação do pagamento."
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                />
              </label>
            </div>
          </section>

          <section className="bg-card border border-border rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-semibold">Cores da loja</h2>
                <p className="text-sm text-muted-foreground">Abra o seletor e personalize a vitrine com qualquer cor.</p>
              </div>
              <Palette className="w-5 h-5 text-primary" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">Cor principal</span>
                <input
                  type="color"
                  value={form.storePrimaryColor || storeThemePreset.primary}
                  onChange={(event) => setForm((prev) => ({ ...prev, storePrimaryColor: event.target.value }))}
                  className="h-11 w-full cursor-pointer rounded-lg border border-border bg-background p-1"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">Cor secundária</span>
                <input
                  type="color"
                  value={form.storeSecondaryColor || storeThemePreset.secondary}
                  onChange={(event) => setForm((prev) => ({ ...prev, storeSecondaryColor: event.target.value }))}
                  className="h-11 w-full cursor-pointer rounded-lg border border-border bg-background p-1"
                />
              </label>
            </div>
          </section>

          <section className="bg-card border border-border rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-semibold">Layout avançado</h2>
                <p className="text-sm text-muted-foreground">Ative ou esconda blocos específicos da home pública da loja.</p>
              </div>
              <Store className="w-5 h-5 text-primary" />
            </div>

            <div className="space-y-3">
              <label className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background px-4 py-3">
                <div>
                  <p className="text-sm font-semibold">Exibir contatos e redes sociais</p>
                  <p className="text-xs text-muted-foreground">Mostra WhatsApp, Instagram, Facebook e TikTok no topo da loja.</p>
                </div>
                <input
                  type="checkbox"
                  checked={form.storeShowSocialLinks}
                  onChange={(event) => setForm((prev) => ({ ...prev, storeShowSocialLinks: event.target.checked }))}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
                />
              </label>

              <label className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background px-4 py-3">
                <div>
                  <p className="text-sm font-semibold">Exibir bloco de frete</p>
                  <p className="text-xs text-muted-foreground">Mostra o cálculo de frete, frete grátis e aviso de entrega no carrinho.</p>
                </div>
                <input
                  type="checkbox"
                  checked={form.storeShowShippingInfo}
                  onChange={(event) => setForm((prev) => ({ ...prev, storeShowShippingInfo: event.target.checked }))}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
                />
              </label>
            </div>
          </section>

          <section className="bg-card border border-border rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-semibold">Aparência</h2>
                <p className="text-sm text-muted-foreground">Selecione uma cor para o layout da sua conta.</p>
              </div>
              <Palette className="w-5 h-5 text-primary" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {themeOptions.map((option) => {
                const isActive = option.value === themePreference

                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={themePending}
                    onClick={() => handleThemePreferenceChange(option.value)}
                    className={`w-full rounded-xl border p-4 text-left transition-all disabled:opacity-60 ${
                      isActive
                        ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                        : 'border-border bg-background hover:border-primary/40 hover:bg-muted/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className={`h-8 w-8 rounded-full border border-white/15 ${option.swatch}`} />
                        <span>
                          <p className="text-sm font-semibold">{option.label}</p>
                          <p className="text-xs text-muted-foreground">{option.description}</p>
                        </span>
                      </div>
                      {isActive && <Check className="w-4 h-4 text-primary mt-0.5" />}
                    </div>
                  </button>
                )
              })}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="bg-card border border-border rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Loja ativa</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/20 border border-border/50 p-3">
                <span className="text-muted-foreground">Empresa</span>
                <span className="font-medium truncate max-w-[150px] text-right">{companyName}</span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/20 border border-border/50 p-3">
                <span className="text-muted-foreground">URL pública</span>
                <button type="button" onClick={handleCopyPublicUrl} className="inline-flex items-center gap-2 text-right font-medium text-primary hover:underline">
                  <span className="truncate max-w-[150px]">/loja/{form.storeSlug || 'seu-slug'}</span>
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/20 border border-border/50 p-3">
                <span className="text-muted-foreground">Padrão atual</span>
                <span className="font-semibold">{defaultMinStock} unds</span>
              </div>
            </div>
          </section>

          <section className="bg-card border border-border rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Atalhos úteis</h2>
            <div className="space-y-2">
              <Link href="/perfil" className="flex items-center justify-between rounded-lg border border-border px-4 py-3 text-sm hover:bg-muted transition-colors">
                <span>Editar conta</span>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </Link>
              <Link href="/movimentacoes" className="flex items-center justify-between rounded-lg border border-border px-4 py-3 text-sm hover:bg-muted transition-colors">
                <span>Ver reposições</span>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}