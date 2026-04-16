'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Settings, PackagePlus, RotateCw, Store, ArrowRight, Webhook } from 'lucide-react'
import { testNotificationWebhook, updateCompanyPreferences } from '@/lib/actions'

interface Props {
  companyName: string
  defaultMinStock: number
  notificationWebhookUrl: string
}

export function SettingsClient({ companyName, defaultMinStock, notificationWebhookUrl }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState({
    defaultMinStock: String(defaultMinStock),
    notificationWebhookUrl,
  })

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
        <section className="lg:col-span-2 bg-card border border-border rounded-2xl shadow-sm p-6">
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