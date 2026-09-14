'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Settings, PackagePlus, RotateCw, Store, ArrowRight, Webhook, Palette, Check, Copy } from 'lucide-react'
import { testNotificationWebhook, updateCompanyPreferences, updateThemePreference } from '@/lib/actions'
import { THEME_ATTRIBUTE_MAP, type ThemePreference } from '@/lib/theme'

function readAndResizeImage(file: File, maxWidth: number, maxHeight: number) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const image = new Image()
      image.onload = () => {
        const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height)
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(image.width * scale))
        canvas.height = Math.max(1, Math.round(image.height * scale))
        const context = canvas.getContext('2d')
        if (!context) {
          reject(new Error('Não foi possível processar a imagem.'))
          return
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      image.onerror = () => reject(new Error('Não foi possível abrir a imagem.'))
      image.src = String(reader.result)
    }
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'))
    reader.readAsDataURL(file)
  })
}

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
  storeBannerUrls: string[]
  storeLogoUrl: string
  storeLayout: Record<string, unknown>
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
  storeBannerUrls,
  storeLogoUrl,
  storeLayout,
  storeTheme,
  storeActive,
  mercadopagoConnected,
  currentThemePreference,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [themePending, startThemeTransition] = useTransition()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [themePreference, setThemePreference] = useState<ThemePreference>(currentThemePreference)
  const oauthError = searchParams.get('mercadopago') === 'error' ? searchParams.get('message') : ''
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
    storeBannerUrls: Array.from(new Set([...storeBannerUrls, ...(storeBannerUrl ? [storeBannerUrl] : [])])),
    storeLogoUrl,
    storeLayout: {
      logoPosition: typeof storeLayout.logoPosition === 'string' ? storeLayout.logoPosition : 'left',
      bannerStyle: typeof storeLayout.bannerStyle === 'string' ? storeLayout.bannerStyle : 'hero',
      bannerCarousel: storeLayout.bannerCarousel !== false,
      bannerHeight: typeof storeLayout.bannerHeight === 'string' ? storeLayout.bannerHeight : 'medium',
      bannerFit: typeof storeLayout.bannerFit === 'string' ? storeLayout.bannerFit : 'cover',
      showBannerArrows: storeLayout.showBannerArrows !== false,
      showBannerDots: storeLayout.showBannerDots !== false,
      cartPosition: typeof storeLayout.cartPosition === 'string' ? storeLayout.cartPosition : 'right',
      headerStyle: typeof storeLayout.headerStyle === 'string' ? storeLayout.headerStyle : 'floating',
      contentWidth: typeof storeLayout.contentWidth === 'string' ? storeLayout.contentWidth : 'standard',
      productColumns: Number(storeLayout.productColumns) || 3,
      productCardStyle: typeof storeLayout.productCardStyle === 'string' ? storeLayout.productCardStyle : 'standard',
      productGap: typeof storeLayout.productGap === 'string' ? storeLayout.productGap : 'normal',
      showCategories: storeLayout.showCategories !== false,
      showSearch: storeLayout.showSearch !== false,
      showSort: storeLayout.showSort !== false,
    },
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
          storeBannerUrls: form.storeBannerUrls,
          storeLogoUrl: form.storeLogoUrl,
          storeLayout: form.storeLayout,
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

  const handleStoreImageChange = async (field: 'storeBannerUrl' | 'storeLogoUrl', file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Selecione um arquivo de imagem válido.')
      return
    }

    setError('')
    setSuccess('')
    try {
      const image = await readAndResizeImage(file, field === 'storeBannerUrl' ? 1800 : 700, field === 'storeBannerUrl' ? 900 : 700)
      setForm((current) => ({ ...current, [field]: image }))
      setSuccess(`${field === 'storeBannerUrl' ? 'Banner' : 'Logo'} carregado. Clique em Salvar configurações para publicar.`)
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : 'Não foi possível carregar a imagem.')
    }
  }

  const handleBannerGalleryChange = async (files: FileList | null) => {
    if (!files?.length) return
    const selectedFiles = Array.from(files).filter((file) => file.type.startsWith('image/')).slice(0, 8)
    if (selectedFiles.length !== files.length) {
      setError('Selecione somente arquivos de imagem.')
      return
    }
    setError('')
    setSuccess('')
    try {
      const images = await Promise.all(selectedFiles.map((file) => readAndResizeImage(file, 1800, 900)))
      setForm((current) => ({ ...current, storeBannerUrls: Array.from(new Set([...current.storeBannerUrls, ...images])).slice(0, 8), storeBannerUrl: images[0] ?? current.storeBannerUrl }))
      setSuccess('Banners carregados. Clique em Salvar configurações para publicar.')
    } catch (currentError) {
      setError(currentError instanceof Error ? currentError.message : 'Não foi possível carregar os banners.')
    }
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
              {(error || oauthError) && <p className="md:col-span-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3">{error || oauthError}</p>}
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
                <input type="file" accept="image/*" multiple onChange={(event) => { void handleBannerGalleryChange(event.target.files); event.currentTarget.value = '' }} className="block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-primary-foreground" />
                <div className="grid grid-cols-4 gap-2">
                  {form.storeBannerUrls.map((image, index) => <div key={`${image.slice(0, 30)}-${index}`} className="relative aspect-video overflow-hidden rounded-lg border border-border"><img src={image} alt={`Banner ${index + 1}`} className="h-full w-full object-cover" /><button type="button" onClick={() => setForm((current) => ({ ...current, storeBannerUrls: current.storeBannerUrls.filter((_, itemIndex) => itemIndex !== index), storeBannerUrl: current.storeBannerUrls.filter((_, itemIndex) => itemIndex !== index)[0] ?? '' }))} className="absolute right-1 top-1 rounded bg-black/65 px-1.5 py-1 text-xs text-white">×</button></div>)}
                </div>
                <span className="text-xs text-muted-foreground">Selecione até 8 fotos para criar um banner único ou um carrossel.</span>
              </label>

              <label className="flex flex-col gap-2 md:col-span-2">
                <span className="text-sm font-medium">Logo da loja</span>
                <input type="file" accept="image/*" onChange={(event) => { void handleStoreImageChange('storeLogoUrl', event.target.files?.[0]); event.currentTarget.value = '' }} className="block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-primary-foreground" />
                {form.storeLogoUrl && <img src={form.storeLogoUrl} alt="Prévia da logo da loja" className="h-24 w-24 rounded-lg border border-border object-cover" />}
                <span className="text-xs text-muted-foreground">Escolha uma foto do computador. Ela será ajustada automaticamente.</span>
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
              <label className="flex flex-col gap-2 rounded-xl border border-border bg-background px-4 py-3">
                <span className="text-sm font-semibold">Tema da vitrine</span>
                <select
                  value={form.storeTheme}
                  onChange={(event) => setForm((prev) => ({ ...prev, storeTheme: event.target.value as ThemePreference }))}
                  className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                >
                  <option value="OCEAN">Ocean</option>
                  <option value="SUNSET">Sunset</option>
                  <option value="FOREST">Forest</option>
                  <option value="ROSE">Rose</option>
                </select>
              </label>

              <div className="grid gap-3 rounded-xl border border-border bg-background p-4 md:grid-cols-2">
                <label className="flex flex-col gap-2"><span className="text-sm font-semibold">Logo</span><select value={form.storeLayout.logoPosition} onChange={(event) => setForm((prev) => ({ ...prev, storeLayout: { ...prev.storeLayout, logoPosition: event.target.value } }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm"><option value="left">Esquerda</option><option value="center">Centro</option><option value="right">Direita</option></select></label>
                <label className="flex flex-col gap-2"><span className="text-sm font-semibold">Carrinho no topo</span><select value={form.storeLayout.cartPosition} onChange={(event) => setForm((prev) => ({ ...prev, storeLayout: { ...prev.storeLayout, cartPosition: event.target.value } }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm"><option value="left">Esquerda</option><option value="right">Direita</option></select></label>
                <label className="flex flex-col gap-2"><span className="text-sm font-semibold">Banner</span><select value={form.storeLayout.bannerStyle} onChange={(event) => setForm((prev) => ({ ...prev, storeLayout: { ...prev.storeLayout, bannerStyle: event.target.value } }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm"><option value="hero">Hero amplo</option><option value="compact">Compacto</option><option value="split">Dividido</option></select></label>
                <label className="flex flex-col gap-2"><span className="text-sm font-semibold">Altura do banner</span><select value={form.storeLayout.bannerHeight} onChange={(event) => setForm((prev) => ({ ...prev, storeLayout: { ...prev.storeLayout, bannerHeight: event.target.value } }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm"><option value="short">Baixo (4:1)</option><option value="medium">Horizontal (3:1)</option><option value="tall">Alto (2:1)</option></select></label>
                <label className="flex flex-col gap-2"><span className="text-sm font-semibold">Imagem do banner</span><select value={form.storeLayout.bannerFit} onChange={(event) => setForm((prev) => ({ ...prev, storeLayout: { ...prev.storeLayout, bannerFit: event.target.value } }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm"><option value="cover">Preencher área</option><option value="contain">Mostrar imagem inteira</option></select></label>
                <label className="flex flex-col gap-2"><span className="text-sm font-semibold">Cabeçalho</span><select value={form.storeLayout.headerStyle} onChange={(event) => setForm((prev) => ({ ...prev, storeLayout: { ...prev.storeLayout, headerStyle: event.target.value } }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm"><option value="floating">Flutuante</option><option value="full">Largura total</option><option value="minimal">Minimalista</option></select></label>
                <label className="flex flex-col gap-2"><span className="text-sm font-semibold">Largura do conteúdo</span><select value={form.storeLayout.contentWidth} onChange={(event) => setForm((prev) => ({ ...prev, storeLayout: { ...prev.storeLayout, contentWidth: event.target.value } }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm"><option value="compact">Compacta</option><option value="standard">Padrão</option><option value="wide">Ampla</option></select></label>
                <label className="flex flex-col gap-2"><span className="text-sm font-semibold">Grade de produtos</span><select value={form.storeLayout.productColumns} onChange={(event) => setForm((prev) => ({ ...prev, storeLayout: { ...prev.storeLayout, productColumns: Number(event.target.value) } }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm"><option value="2">2 colunas</option><option value="3">3 colunas</option><option value="4">4 colunas</option></select></label>
                <label className="flex flex-col gap-2"><span className="text-sm font-semibold">Estilo dos produtos</span><select value={form.storeLayout.productCardStyle} onChange={(event) => setForm((prev) => ({ ...prev, storeLayout: { ...prev.storeLayout, productCardStyle: event.target.value } }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm"><option value="standard">Cartão padrão</option><option value="bordered">Borda destacada</option><option value="minimal">Minimalista</option></select></label>
                <label className="flex flex-col gap-2"><span className="text-sm font-semibold">Espaço entre produtos</span><select value={form.storeLayout.productGap} onChange={(event) => setForm((prev) => ({ ...prev, storeLayout: { ...prev.storeLayout, productGap: event.target.value } }))} className="rounded-lg border border-border bg-card px-3 py-2 text-sm"><option value="tight">Compacto</option><option value="normal">Normal</option><option value="spacious">Espaçado</option></select></label>
                <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm md:col-span-2"><span><strong>Carrossel automático</strong><small className="block text-xs text-muted-foreground">Alterna banners a cada 5 segundos</small></span><input type="checkbox" checked={form.storeLayout.bannerCarousel} onChange={(event) => setForm((prev) => ({ ...prev, storeLayout: { ...prev.storeLayout, bannerCarousel: event.target.checked } }))} className="h-4 w-4" /></label>
                <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"><span><strong>Setas</strong><small className="block text-xs text-muted-foreground">Navegação lateral</small></span><input type="checkbox" checked={form.storeLayout.showBannerArrows} onChange={(event) => setForm((prev) => ({ ...prev, storeLayout: { ...prev.storeLayout, showBannerArrows: event.target.checked } }))} className="h-4 w-4" /></label>
                <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"><span><strong>Indicadores</strong><small className="block text-xs text-muted-foreground">Pontos do carrossel</small></span><input type="checkbox" checked={form.storeLayout.showBannerDots} onChange={(event) => setForm((prev) => ({ ...prev, storeLayout: { ...prev.storeLayout, showBannerDots: event.target.checked } }))} className="h-4 w-4" /></label>
                <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm md:col-span-2"><span><strong>Exibir categorias</strong><small className="block text-xs text-muted-foreground">Mostra filtros de categoria na vitrine</small></span><input type="checkbox" checked={form.storeLayout.showCategories} onChange={(event) => setForm((prev) => ({ ...prev, storeLayout: { ...prev.storeLayout, showCategories: event.target.checked } }))} className="h-4 w-4" /></label>
                <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"><span><strong>Busca</strong><small className="block text-xs text-muted-foreground">Campo de pesquisa</small></span><input type="checkbox" checked={form.storeLayout.showSearch} onChange={(event) => setForm((prev) => ({ ...prev, storeLayout: { ...prev.storeLayout, showSearch: event.target.checked } }))} className="h-4 w-4" /></label>
                <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"><span><strong>Ordenação</strong><small className="block text-xs text-muted-foreground">Filtro de ordenação</small></span><input type="checkbox" checked={form.storeLayout.showSort} onChange={(event) => setForm((prev) => ({ ...prev, storeLayout: { ...prev.storeLayout, showSort: event.target.checked } }))} className="h-4 w-4" /></label>
              </div>

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
          <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-border p-5">
              <div>
                <h2 className="text-lg font-semibold">Prévia da vitrine</h2>
                <p className="text-xs text-muted-foreground">Atualiza enquanto você edita</p>
              </div>
              <Store className="h-5 w-5 text-primary" />
            </div>
            <div className="bg-slate-950 p-3">
              <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-900 text-white shadow-xl">
                <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    {form.storeLogoUrl ? <img src={form.storeLogoUrl} alt="" className="h-7 w-7 rounded-lg object-cover" /> : <span className="h-7 w-7 rounded-lg bg-white/10" />}
                    <span className="truncate text-xs font-semibold">{form.storeName || companyName}</span>
                  </div>
                  <span className="shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold" style={{ backgroundColor: form.storePrimaryColor || storeThemePreset.primary }}>Carrinho</span>
                </div>
                <div className={`relative overflow-hidden ${form.storeLayout.bannerHeight === 'short' ? 'aspect-[4/1]' : form.storeLayout.bannerHeight === 'tall' ? 'aspect-[2/1]' : 'aspect-[3/1]'}`} style={{ background: `linear-gradient(135deg, ${form.storePrimaryColor || storeThemePreset.primary}, ${form.storeSecondaryColor || storeThemePreset.secondary})` }}>
                  {(form.storeBannerUrls[0] || form.storeBannerUrl) && <img src={form.storeBannerUrls[0] || form.storeBannerUrl} alt="Prévia do banner" className={`absolute inset-0 h-full w-full ${form.storeLayout.bannerFit === 'contain' ? 'object-contain' : 'object-cover'}`} />}
                  {form.storeLayout.showBannerArrows && <><span className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/45 px-1.5 py-0.5 text-xs text-white">‹</span><span className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/45 px-1.5 py-0.5 text-xs text-white">›</span></>}
                  {form.storeLayout.showBannerDots && <div className="absolute bottom-1.5 left-1/2 flex -translate-x-1/2 gap-1"><span className="h-1.5 w-4 rounded-full bg-white" /><span className="h-1.5 w-1.5 rounded-full bg-white/60" /><span className="h-1.5 w-1.5 rounded-full bg-white/60" /></div>}
                </div>
                <div className="p-4" style={{ background: `linear-gradient(135deg, ${form.storePrimaryColor || storeThemePreset.primary}, ${form.storeSecondaryColor || storeThemePreset.secondary})` }}>
                  <p className="text-[9px] uppercase tracking-[0.2em] text-white/70">Loja online</p>
                  <p className="mt-2 text-xl font-bold leading-tight">{form.storeHeroTitle || form.storeName || companyName}</p>
                  <p className="mt-2 line-clamp-2 text-[10px] leading-4 text-white/80">{form.storeHeroSubtitle || form.storeDescription || 'Produtos escolhidos para você.'}</p>
                  <span className="mt-3 inline-flex rounded-lg bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-900">{form.storePrimaryButtonLabel || 'Comprar agora'}</span>
                </div>
                <div className="p-3">
                  <div className="mb-3 flex gap-1.5 overflow-hidden">
                    {['Destaques', 'Novidades', 'Ofertas'].map((label, index) => <span key={label} className={`shrink-0 rounded-full px-2 py-1 text-[9px] ${index === 0 ? 'text-white' : 'bg-white/5 text-white/55'}`} style={index === 0 ? { backgroundColor: form.storePrimaryColor || storeThemePreset.primary } : undefined}>{label}</span>)}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[1, 2].map((item) => <div key={item} className="overflow-hidden rounded-lg border border-white/10 bg-white/5"><div className="h-16 bg-white/10" /><div className="p-2"><p className="truncate text-[10px] font-medium">Produto em destaque</p><p className="mt-1 text-xs font-bold">R$ 49,90</p></div></div>)}
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t border-border p-4">
              <Link href={form.storeSlug ? `/loja/${form.storeSlug}` : '/loja'} target="_blank" className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
                Abrir loja pública
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>

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