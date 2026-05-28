'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Settings, PackagePlus, RotateCw, Store, ArrowRight, Webhook, Palette, Check, BadgeCheck, FileText } from 'lucide-react'
import { testNotificationWebhook, updateCompanyPreferences, updateThemePreference } from '@/lib/actions'
import { THEME_ATTRIBUTE_MAP, type ThemePreference } from '@/lib/theme'

type NfeSettings = {
  enabled: boolean
  environment: 'HOMOLOGACAO' | 'PRODUCAO'
  model: 'NFE_55' | 'NFCE_65'
  series: string
  nextNumber: number
  defaultCfop: string | null
  naturezaOperacao: string
  taxRegime: 'SIMPLES_NACIONAL' | 'SIMPLES_EXCESSO_SUBLIMITE' | 'REGIME_NORMAL'
  defaultTaxProfile: unknown | null
  updatedAt: string
} | null

interface Props {
  companyName: string
  defaultMinStock: number
  notificationWebhookUrl: string
  nfeSettings: NfeSettings
  currentThemePreference: ThemePreference
}

function stringifyTaxProfile(value: unknown) {
  if (value == null) return ''

  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return ''
  }
}

function parseTaxProfile(text: string) {
  const trimmed = text.trim()
  if (!trimmed) return null
  return JSON.parse(trimmed) as unknown
}

export function SettingsClient({ companyName, defaultMinStock, notificationWebhookUrl, nfeSettings, currentThemePreference }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [themePending, startThemeTransition] = useTransition()
  const [fiscalPending, startFiscalTransition] = useTransition()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [themePreference, setThemePreference] = useState<ThemePreference>(currentThemePreference)
  const [fiscalError, setFiscalError] = useState('')
  const [fiscalSuccess, setFiscalSuccess] = useState('')
  const [form, setForm] = useState({
    defaultMinStock: String(defaultMinStock),
    notificationWebhookUrl,
  })
  const [fiscalForm, setFiscalForm] = useState({
    enabled: nfeSettings?.enabled ?? false,
    environment: nfeSettings?.environment ?? 'HOMOLOGACAO',
    model: nfeSettings?.model ?? 'NFE_55',
    series: nfeSettings?.series ?? '1',
    nextNumber: String(nfeSettings?.nextNumber ?? 1),
    defaultCfop: nfeSettings?.defaultCfop ?? '',
    naturezaOperacao: nfeSettings?.naturezaOperacao ?? 'Venda',
    taxRegime: nfeSettings?.taxRegime ?? 'SIMPLES_NACIONAL',
    defaultTaxProfile: stringifyTaxProfile(nfeSettings?.defaultTaxProfile ?? null),
  })

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
        })
        setSuccess('Configurações salvas com sucesso.')
        router.refresh()
      } catch (currentError: any) {
        setError(currentError.message || 'Não foi possível salvar as configurações.')
      }
    })
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

  const handleFiscalSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setFiscalError('')
    setFiscalSuccess('')

    startFiscalTransition(async () => {
      try {
        const response = await fetch('/api/nfe/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            enabled: fiscalForm.enabled,
            environment: fiscalForm.environment,
            model: fiscalForm.model,
            series: fiscalForm.series,
            nextNumber: Number.parseInt(fiscalForm.nextNumber, 10),
            defaultCfop: fiscalForm.defaultCfop.trim() || null,
            naturezaOperacao: fiscalForm.naturezaOperacao,
            taxRegime: fiscalForm.taxRegime,
            defaultTaxProfile: parseTaxProfile(fiscalForm.defaultTaxProfile),
          }),
        })

        const payload = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(payload.error || 'Não foi possível salvar as configurações fiscais.')
        }

        setFiscalForm((prev) => ({
          ...prev,
          enabled: payload.settings.enabled,
          environment: payload.settings.environment,
          model: payload.settings.model,
          series: payload.settings.series,
          nextNumber: String(payload.settings.nextNumber),
          defaultCfop: payload.settings.defaultCfop ?? '',
          naturezaOperacao: payload.settings.naturezaOperacao,
          taxRegime: payload.settings.taxRegime,
          defaultTaxProfile: stringifyTaxProfile(payload.settings.defaultTaxProfile),
        }))
        setFiscalSuccess('Configurações fiscais salvas com sucesso.')
        router.refresh()
      } catch (currentError: any) {
        setFiscalError(currentError.message || 'Não foi possível salvar as configurações fiscais.')
      }
    })
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
                <h2 className="text-lg font-semibold">Fiscal e emissão</h2>
                <p className="text-sm text-muted-foreground">Configure a emissão de NF-e / NFS-e e os dados padrão da empresa.</p>
              </div>
              <BadgeCheck className="w-5 h-5 text-primary" />
            </div>

            <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleFiscalSubmit}>
              {fiscalError && <p className="md:col-span-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3">{fiscalError}</p>}
              {fiscalSuccess && <p className="md:col-span-2 text-sm text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-3">{fiscalSuccess}</p>}

              <label className="flex items-center gap-3 md:col-span-2 rounded-lg border border-border px-4 py-3 bg-background">
                <input
                  type="checkbox"
                  checked={fiscalForm.enabled}
                  onChange={(event) => setFiscalForm((prev) => ({ ...prev, enabled: event.target.checked }))}
                  className="h-4 w-4 rounded border-border"
                />
                <span>
                  <span className="block text-sm font-medium">Ativar emissão fiscal automática</span>
                  <span className="block text-xs text-muted-foreground">Quando ligado, vendas elegíveis já tentam emitir NF-e.</span>
                </span>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">Ambiente</span>
                <select
                  value={fiscalForm.environment}
                  onChange={(event) => setFiscalForm((prev) => ({ ...prev, environment: event.target.value as 'HOMOLOGACAO' | 'PRODUCAO' }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                >
                  <option value="HOMOLOGACAO">Homologação</option>
                  <option value="PRODUCAO">Produção</option>
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">Modelo</span>
                <select
                  value={fiscalForm.model}
                  onChange={(event) => setFiscalForm((prev) => ({ ...prev, model: event.target.value as 'NFE_55' | 'NFCE_65' }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                >
                  <option value="NFE_55">NF-e 55</option>
                  <option value="NFCE_65">NFC-e 65</option>
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">Série</span>
                <input
                  type="text"
                  value={fiscalForm.series}
                  onChange={(event) => setFiscalForm((prev) => ({ ...prev, series: event.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">Próximo número</span>
                <input
                  type="number"
                  min="1"
                  value={fiscalForm.nextNumber}
                  onChange={(event) => setFiscalForm((prev) => ({ ...prev, nextNumber: event.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">CFOP padrão</span>
                <input
                  type="text"
                  value={fiscalForm.defaultCfop}
                  onChange={(event) => setFiscalForm((prev) => ({ ...prev, defaultCfop: event.target.value }))}
                  placeholder="5102"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">Regime tributário</span>
                <select
                  value={fiscalForm.taxRegime}
                  onChange={(event) => setFiscalForm((prev) => ({ ...prev, taxRegime: event.target.value as 'SIMPLES_NACIONAL' | 'SIMPLES_EXCESSO_SUBLIMITE' | 'REGIME_NORMAL' }))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                >
                  <option value="SIMPLES_NACIONAL">Simples Nacional</option>
                  <option value="SIMPLES_EXCESSO_SUBLIMITE">Simples excesso sublimite</option>
                  <option value="REGIME_NORMAL">Regime normal</option>
                </select>
              </label>

              <label className="flex flex-col gap-2 md:col-span-2">
                <span className="text-sm font-medium">Natureza da operação</span>
                <input
                  type="text"
                  value={fiscalForm.naturezaOperacao}
                  onChange={(event) => setFiscalForm((prev) => ({ ...prev, naturezaOperacao: event.target.value }))}
                  placeholder="Venda"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
                />
              </label>

              <label className="flex flex-col gap-2 md:col-span-2">
                <span className="text-sm font-medium">Perfil fiscal padrão (JSON)</span>
                <textarea
                  value={fiscalForm.defaultTaxProfile}
                  onChange={(event) => setFiscalForm((prev) => ({ ...prev, defaultTaxProfile: event.target.value }))}
                  rows={5}
                  placeholder='{"icms":{"cst":"102"}}'
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 font-mono"
                />
              </label>

              <div className="md:col-span-2 flex items-center justify-between gap-3 flex-wrap">
                <p className="text-xs text-muted-foreground">Última atualização: {nfeSettings?.updatedAt ? new Date(nfeSettings.updatedAt).toLocaleString('pt-BR') : 'Nunca'}</p>
                <button
                  type="submit"
                  disabled={fiscalPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
                >
                  <FileText className="w-4 h-4" />
                  {fiscalPending ? 'Salvando...' : 'Salvar emissão fiscal'}
                </button>
              </div>
            </form>
          </section>

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
                <span className="text-muted-foreground">Padrão atual</span>
                <span className="font-semibold">{defaultMinStock} unds</span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/20 border border-border/50 p-3">
                <span className="text-muted-foreground">Emissão fiscal</span>
                <span className="font-semibold">{nfeSettings?.enabled ? 'Ativa' : 'Desativada'}</span>
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
              <Link href="/vendas" className="flex items-center justify-between rounded-lg border border-border px-4 py-3 text-sm hover:bg-muted transition-colors">
                <span>Conferir NF-e</span>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}