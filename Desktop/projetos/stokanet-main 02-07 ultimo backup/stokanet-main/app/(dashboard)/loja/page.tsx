import prisma from '@/lib/prisma'
import { getActiveCompanyId } from '@/lib/access'
import Link from 'next/link'
import { BadgeCheck, ExternalLink, Globe, LayoutGrid, Megaphone, Package, Sparkles, Store, Ticket, Truck } from 'lucide-react'
import { buildStorefrontUrl } from '../../../lib/storefront'

async function getSandboxStatus() {
  return {
    webhookSecretConfigured: Boolean(process.env.MERCADOPAGO_WEBHOOK_SECRET),
    accessTokenConfigured: Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN || process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN),
    nextAuthUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function themeLabel(theme: string | null | undefined) {
  const normalized = String(theme ?? 'ocean').trim().toLowerCase()
  if (normalized === 'sunset') return 'Sunset'
  if (normalized === 'forest') return 'Forest'
  if (normalized === 'rose') return 'Rose'
  return 'Ocean'
}

export default async function LojaPage() {
  const companyId = await getActiveCompanyId()

  const [company, products] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId } }),
    prisma.product.findMany({
      where: { companyId },
      orderBy: [{ createdAt: 'desc' }],
    }),
  ])

  if (!company) {
    throw new Error('Empresa não encontrada')
  }

  const c = company as any

  const publicUrl = c.storeSlug ? await buildStorefrontUrl(c.storeSlug) : null
  const sandboxStatus = await getSandboxStatus()
  const publishedProducts = products.filter((product) => product.storePublished)
  const activeProducts = products.filter((product) => product.status !== 'Arquivado')
  const lowStockProducts = products.filter((product) => ['Baixo', 'Crítico', 'Esgotado'].includes(product.status))
  const storeReady = Boolean(c.storeActive && c.storeSlug && c.mercadopagoAccessToken)

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground mb-4">
            <Store className="w-3.5 h-3.5 text-primary" />
            Loja pública do cliente
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Painel da loja online</h1>
          <p className="text-muted-foreground mt-1 text-lg">Gerencie URL única, vitrine, gateway e produtos publicados para o cliente acessar apenas a loja.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href={publicUrl ?? '/configuracoes'} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors">
            <ExternalLink className="w-4 h-4" />
            {publicUrl ? 'Abrir loja pública' : 'Configurar URL'}
          </Link>
          <Link href="/configuracoes" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
            Ajustar loja
            <Sparkles className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">URL pública</p>
              <h2 className="text-lg font-semibold mt-1 truncate">{c.storeSlug ? `/loja/${c.storeSlug}` : 'Sem slug configurado'}</h2>
            </div>
            <Globe className="w-5 h-5 text-primary" />
          </div>
          <p className="mt-3 text-xs text-muted-foreground truncate">{publicUrl ?? 'Configure a URL em Configurações'}</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Loja</p>
              <h2 className="text-lg font-semibold mt-1">{c.storeActive ? 'Ativa' : 'Inativa'}</h2>
            </div>
            <BadgeCheck className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{c.storeName ?? c.name}</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Gateway</p>
              <h2 className="text-lg font-semibold mt-1">{c.mercadopagoAccessToken ? 'Configurado' : 'Pendente'}</h2>
            </div>
            <Ticket className="w-5 h-5 text-primary" />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Mercado Pago para PIX e cartão</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Produtos publicados</p>
              <h2 className="text-lg font-semibold mt-1">{publishedProducts.length}/{activeProducts.length}</h2>
            </div>
            <LayoutGrid className="w-5 h-5 text-primary" />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Apenas estes aparecem na vitrine pública</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
        <div className="space-y-6">
          <section className="bg-card border border-border rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-semibold">Status da loja</h2>
                <p className="text-sm text-muted-foreground">Tudo o que o cliente precisa para acessar só a loja, com checkout próprio.</p>
              </div>
              <Megaphone className="w-5 h-5 text-primary" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Nome exibido</p>
                <p className="mt-2 font-semibold">{c.storeName ?? c.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{c.storeDescription ?? 'Sem descrição configurada'}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Tema</p>
                <p className="mt-2 font-semibold">{themeLabel(c.storeTheme)}</p>
                <p className="mt-1 text-xs text-muted-foreground">Layout da vitrine pública</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Gateway</p>
                <p className="mt-2 font-semibold">{c.mercadopagoAccessToken ? 'Ativo' : 'Faltando token'}</p>
                <p className="mt-1 text-xs text-muted-foreground">PIX e cartão via Mercado Pago</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Saúde</p>
                <p className="mt-2 font-semibold">{storeReady ? 'Pronta para publicar' : 'Requer ajustes'}</p>
                <p className="mt-1 text-xs text-muted-foreground">Slug, token e ativação são obrigatórios</p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/configuracoes" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
                Ajustar loja
              </Link>
              {publicUrl && (
                <Link href={publicUrl} target="_blank" className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium hover:bg-muted transition-colors">
                  <ExternalLink className="w-4 h-4" />
                  Ver vitrine pública
                </Link>
              )}
            </div>
          </section>

          <section className="bg-card border border-border rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-semibold">Produtos da vitrine</h2>
                <p className="text-sm text-muted-foreground">Publique só o que deve aparecer para o cliente final.</p>
              </div>
              <Package className="w-5 h-5 text-primary" />
            </div>

            <div className="overflow-hidden rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Produto</th>
                    <th className="px-4 py-3 text-left font-medium">Preço</th>
                    <th className="px-4 py-3 text-left font-medium">Estoque</th>
                    <th className="px-4 py-3 text-left font-medium">Loja</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className="border-t border-border/70">
                      <td className="px-4 py-3">
                        <p className="font-medium">{product.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{product.sku} {product.category ? `• ${product.category.name}` : ''}</p>
                      </td>
                      <td className="px-4 py-3">{formatCurrency(product.price)}</td>
                      <td className="px-4 py-3">
                        <span className={product.stockQty <= 0 ? 'text-destructive' : product.stockQty <= product.minStock ? 'text-amber-500' : 'text-foreground'}>
                          {product.stockQty} unds
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={product.storePublished ? 'rounded-full bg-emerald-500/10 text-emerald-600 px-3 py-1 text-xs font-semibold' : 'rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground'}>
                          {product.storePublished ? 'Publicado' : 'Oculto'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="bg-card border border-border rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-semibold">Resumo operacional</h2>
                <p className="text-sm text-muted-foreground">Indicadores que importam para publicar a loja.</p>
              </div>
              <Sparkles className="w-5 h-5 text-primary" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <p className="text-xs text-muted-foreground">Ativos</p>
                <p className="mt-1 text-xl font-bold">{activeProducts.length}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <p className="text-xs text-muted-foreground">Baixo estoque</p>
                <p className="mt-1 text-xl font-bold">{lowStockProducts.length}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <p className="text-xs text-muted-foreground">Publicados</p>
                <p className="mt-1 text-xl font-bold">{publishedProducts.length}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <p className="text-xs text-muted-foreground">Pronta</p>
                <p className="mt-1 text-xl font-bold">{storeReady ? 'Sim' : 'Não'}</p>
              </div>
            </div>
          </section>

          <section className="bg-card border border-border rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-semibold">Próximos passos</h2>
                <p className="text-sm text-muted-foreground">O que falta para a loja ficar operacional.</p>
              </div>
              <Truck className="w-5 h-5 text-primary" />
            </div>

            <ol className="space-y-3 text-sm text-muted-foreground list-decimal pl-5">
              <li>Definir o slug único da loja em Configurações.</li>
              <li>Informar o token do Mercado Pago da conta do cliente.</li>
              <li>Publicar só os produtos que devem aparecer na vitrine.</li>
              <li>Configurar MERCADOPAGO_WEBHOOK_SECRET e testar o webhook em sandbox.</li>
              <li>Testar a loja pública com PIX e cartão no ambiente real.</li>
            </ol>
          </section>

          <section className="bg-card border border-border rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Resumo da URL</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/20 border border-border/50 p-3">
                <span className="text-muted-foreground">Slug</span>
                <span className="font-medium truncate max-w-[150px] text-right">{c.storeSlug ?? 'não configurado'}</span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/20 border border-border/50 p-3">
                <span className="text-muted-foreground">Link</span>
                <span className="font-medium truncate max-w-[150px] text-right">{publicUrl ?? 'configure o slug'}</span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/20 border border-border/50 p-3">
                <span className="text-muted-foreground">Banner</span>
                <span className="font-medium truncate max-w-[150px] text-right">{c.storeBannerUrl ? 'Sim' : 'Não'}</span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/20 border border-border/50 p-3">
                <span className="text-muted-foreground">Logo</span>
                <span className="font-medium truncate max-w-[150px] text-right">{c.storeLogoUrl ? 'Sim' : 'Não'}</span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/20 border border-border/50 p-3">
                <span className="text-muted-foreground">Sandbox</span>
                <span className="font-medium truncate max-w-[150px] text-right">{sandboxStatus.webhookSecretConfigured ? 'Webhook OK' : 'Secret ausente'}</span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/20 border border-border/50 p-3">
                <span className="text-muted-foreground">Base URL</span>
                <span className="font-medium truncate max-w-[150px] text-right">{sandboxStatus.nextAuthUrl}</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}