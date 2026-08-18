'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, BadgeCheck, BellRing, Box, CheckCircle2, Globe, Palette, Search, ShoppingCart, Sparkles, Store, Truck, Minus, Plus, X } from 'lucide-react'
import clsx from 'clsx'

type StoreProduct = {
  id: string
  name: string
  sku: string
  price: number
  stockQty: number
  minStock: number
  status: string
  size: string | null
  color: string | null
  category: { id: string; name: string } | null
}

type StoreCompany = {
  id: string
  name: string
  legalName: string | null
  defaultMinStock: number
} | null

type StoreSettings = {
  storefrontName: string
  headline: string
  subheadline: string
  accent: 'sunset' | 'ocean' | 'forest' | 'rose'
  ctaLabel: string
}

const DEFAULT_SETTINGS: StoreSettings = {
  storefrontName: 'Loja da minha empresa',
  headline: 'Vitrine conectada ao estoque do SaaS',
  subheadline: 'Cada compra registrada aqui gera uma venda interna e baixa o estoque automaticamente.',
  accent: 'ocean',
  ctaLabel: 'Comprar agora',
}

const ACCENT_CLASSES: Record<StoreSettings['accent'], { gradient: string; badge: string; button: string }> = {
  sunset: {
    gradient: 'from-orange-500 via-rose-500 to-fuchsia-600',
    badge: 'bg-orange-500/10 text-orange-700 border-orange-500/20',
    button: 'bg-orange-600 hover:bg-orange-700 text-white',
  },
  ocean: {
    gradient: 'from-sky-600 via-cyan-500 to-blue-600',
    badge: 'bg-sky-500/10 text-sky-700 border-sky-500/20',
    button: 'bg-sky-600 hover:bg-sky-700 text-white',
  },
  forest: {
    gradient: 'from-emerald-600 via-teal-500 to-lime-600',
    badge: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
    button: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  },
  rose: {
    gradient: 'from-pink-600 via-rose-500 to-orange-500',
    badge: 'bg-pink-500/10 text-pink-700 border-pink-500/20',
    button: 'bg-pink-600 hover:bg-pink-700 text-white',
  },
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function getStorageKey(companyId: string) {
  return `stokanet.storefront.${companyId}`
}

export function StorefrontPrototypeClient({ company, products }: { company: StoreCompany; products: StoreProduct[] }) {
  const storageKey = company?.id ? getStorageKey(company.id) : 'stokanet.storefront.unknown'
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS)
  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [cart, setCart] = useState<Record<string, number>>({})
  const [checkoutState, setCheckoutState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [checkoutMessage, setCheckoutMessage] = useState('')

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (!raw) return

      const parsed = JSON.parse(raw) as Partial<StoreSettings>
      setSettings((current) => ({ ...current, ...parsed }))
    } catch {
      // Fallback para a configuração padrão do protótipo.
    }
  }, [storageKey])

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(settings))
    } catch {
      // O protótipo continua funcionando mesmo sem persistência local.
    }
  }, [settings, storageKey])

  const categories = useMemo(() => {
    const unique = new Map<string, string>()
    for (const product of products) {
      if (product.category) {
        unique.set(product.category.id, product.category.name)
      }
    }
    return [{ id: 'all', name: 'Todos' }, ...[...unique.entries()].map(([id, name]) => ({ id, name }))]
  }, [products])

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return products.filter((product) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        [product.name, product.sku, product.category?.name ?? '', product.size ?? '', product.color ?? '']
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery)

      const matchesCategory = selectedCategory === 'all' || product.category?.id === selectedCategory

      return matchesQuery && matchesCategory
    })
  }, [products, query, selectedCategory])

  const cartEntries = useMemo(() => {
    return Object.entries(cart)
      .map(([productId, quantity]) => {
        const product = products.find((item) => item.id === productId)
        if (!product) return null
        return { product, quantity }
      })
      .filter((entry): entry is { product: StoreProduct; quantity: number } => Boolean(entry))
  }, [cart, products])

  const cartTotal = useMemo(() => cartEntries.reduce((total, entry) => total + entry.product.price * entry.quantity, 0), [cartEntries])
  const cartQuantity = useMemo(() => cartEntries.reduce((total, entry) => total + entry.quantity, 0), [cartEntries])
  const activeAccent = ACCENT_CLASSES[settings.accent]

  const setSetting = <K extends keyof StoreSettings>(key: K, value: StoreSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }))
  }

  const addToCart = (product: StoreProduct) => {
    if (product.stockQty <= 0) return
    setCart((current) => ({
      ...current,
      [product.id]: Math.min(product.stockQty, (current[product.id] ?? 0) + 1),
    }))
  }

  const updateQuantity = (product: StoreProduct, nextQuantity: number) => {
    if (nextQuantity <= 0) {
      setCart((current) => {
        const copy = { ...current }
        delete copy[product.id]
        return copy
      })
      return
    }

    setCart((current) => ({
      ...current,
      [product.id]: Math.min(product.stockQty, nextQuantity),
    }))
  }

  const handleCheckout = async () => {
    if (cartEntries.length === 0) return

    setCheckoutState('loading')
    setCheckoutMessage('')

    try {
      const response = await fetch('/api/loja/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartEntries.map((entry) => ({ productId: entry.product.id, quantity: entry.quantity })),
          paymentMethod: 'PIX',
          notes: `Pedido realizado pela loja online do protótipo - ${settings.storefrontName}`,
        }),
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || 'Não foi possível concluir a compra.')
      }

      setCheckoutState('success')
      setCheckoutMessage(`Venda ${payload.sale.code} registrada com sucesso. O estoque foi baixado automaticamente.`)
      setCart({})
    } catch (error) {
      setCheckoutState('error')
      setCheckoutMessage(error instanceof Error ? error.message : 'Falha ao concluir a compra.')
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className={clsx('absolute inset-x-0 top-0 h-[28rem] bg-gradient-to-br opacity-90', activeAccent.gradient)} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_45%),linear-gradient(to_bottom,rgba(15,23,42,0.12),rgba(2,6,23,0.88))]" />

      <div className="relative mx-auto flex max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/15 bg-white/10">
              <Store className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-white/55">Loja protótipo conectada ao SaaS</p>
              <h1 className="text-lg font-semibold">{settings.storefrontName}</h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm text-white/80">
            <span className={clsx('inline-flex items-center gap-2 rounded-full border px-3 py-1.5', activeAccent.badge)}>
              <BadgeCheck className="h-4 w-4" />
              Estoque sincronizado
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              <ShoppingCart className="h-4 w-4" />
              {cartQuantity} item(ns)
            </span>
            <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 transition hover:bg-white/10">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Link>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.45fr_0.85fr]">
          <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/6 shadow-2xl shadow-black/20 backdrop-blur-xl">
            <div className="border-b border-white/10 p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="max-w-2xl space-y-4">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.3em] text-white/70">
                    <Sparkles className="h-3.5 w-3.5" />
                    Vitrine personalizável
                  </div>
                  <div>
                    <h2 className="text-3xl font-semibold tracking-tight sm:text-5xl">{settings.headline}</h2>
                    <p className="mt-4 max-w-2xl text-sm leading-6 text-white/75 sm:text-base">{settings.subheadline}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm text-white/75">
                  <div className="flex items-center gap-2 text-white">
                    <Truck className="h-4 w-4 text-emerald-400" />
                    Entrega e retirada
                  </div>
                  <p className="mt-2 max-w-xs">Este protótipo já fecha a venda no SaaS e movimenta o estoque da empresa vinculada automaticamente.</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 border-b border-white/10 p-6 sm:p-8 xl:grid-cols-[1.25fr_0.75fr]">
              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/75">
                <Search className="h-4 w-4 text-white/45" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar produto, SKU, cor ou categoria" className="w-full bg-transparent text-sm outline-none placeholder:text-white/35" />
              </label>

              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setSelectedCategory(category.id)}
                    className={clsx(
                      'rounded-full border px-4 py-2 text-sm transition',
                      selectedCategory === category.id
                        ? 'border-white/25 bg-white text-slate-950'
                        : 'border-white/10 bg-white/5 text-white/75 hover:bg-white/10',
                    )}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 p-6 sm:p-8 lg:grid-cols-2">
              {filteredProducts.length === 0 ? (
                <div className="col-span-full rounded-3xl border border-dashed border-white/15 bg-white/5 p-10 text-center text-white/60">Nenhum produto encontrado com os filtros atuais.</div>
              ) : (
                filteredProducts.map((product) => {
                  const isLowStock = product.stockQty > 0 && product.stockQty <= product.minStock
                  const isSoldOut = product.stockQty <= 0

                  return (
                    <article key={product.id} className={clsx('group rounded-[1.75rem] border p-5 transition hover:-translate-y-0.5', 'border-white/10 bg-slate-950/50 hover:border-white/20', isSoldOut && 'opacity-70')}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.24em] text-white/45">
                            <span>{product.sku}</span>
                            {product.category && <span>• {product.category.name}</span>}
                          </div>
                          <h3 className="text-xl font-semibold leading-tight text-white">{product.name}</h3>
                        </div>
                        <div className={clsx('rounded-full border px-3 py-1 text-xs font-medium', isSoldOut ? 'border-rose-500/20 bg-rose-500/10 text-rose-200' : isLowStock ? 'border-amber-500/20 bg-amber-500/10 text-amber-200' : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200')}>
                          {isSoldOut ? 'Esgotado' : isLowStock ? 'Estoque baixo' : 'Disponível'}
                        </div>
                      </div>

                      <div className="mt-5 flex items-end justify-between gap-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.22em] text-white/40">Preço</p>
                          <p className="text-3xl font-semibold">{formatCurrency(product.price)}</p>
                        </div>

                        <div className="text-right text-sm text-white/60">
                          <p>Saldo: {product.stockQty}</p>
                          <p>{product.size ? `Tamanho ${product.size}` : 'Sem variação de tamanho'}</p>
                          <p>{product.color ? `Cor ${product.color}` : 'Sem variação de cor'}</p>
                        </div>
                      </div>

                      <button type="button" onClick={() => addToCart(product)} disabled={isSoldOut} className={clsx('mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition', isSoldOut ? 'cursor-not-allowed bg-white/8 text-white/35' : activeAccent.button)}>
                        <ShoppingCart className="h-4 w-4" />
                        {settings.ctaLabel}
                      </button>
                    </article>
                  )
                })
              )}
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-[2rem] border border-white/10 bg-white/6 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-white">
                <Palette className="h-4 w-4 text-fuchsia-300" />
                <h3 className="font-semibold">Personalização do protótipo</h3>
              </div>

              <div className="mt-4 space-y-4">
                <label className="block space-y-2 text-sm text-white/70">
                  <span>Nome da loja</span>
                  <input value={settings.storefrontName} onChange={(event) => setSetting('storefrontName', event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none placeholder:text-white/30" />
                </label>

                <label className="block space-y-2 text-sm text-white/70">
                  <span>Título principal</span>
                  <input value={settings.headline} onChange={(event) => setSetting('headline', event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none placeholder:text-white/30" />
                </label>

                <label className="block space-y-2 text-sm text-white/70">
                  <span>Subtítulo</span>
                  <textarea value={settings.subheadline} onChange={(event) => setSetting('subheadline', event.target.value)} rows={4} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none placeholder:text-white/30" />
                </label>

                <label className="block space-y-2 text-sm text-white/70">
                  <span>Texto do botão</span>
                  <input value={settings.ctaLabel} onChange={(event) => setSetting('ctaLabel', event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none placeholder:text-white/30" />
                </label>

                <div className="space-y-2 text-sm text-white/70">
                  <span>Tema visual</span>
                  <div className="grid grid-cols-2 gap-2">
                    {(['ocean', 'sunset', 'forest', 'rose'] as const).map((accent) => (
                      <button key={accent} type="button" onClick={() => setSetting('accent', accent)} className={clsx('rounded-2xl border px-3 py-3 text-left transition', settings.accent === accent ? 'border-white/25 bg-white text-slate-950' : 'border-white/10 bg-slate-950/50 text-white/70 hover:bg-white/10')}>
                        <span className="block text-sm font-semibold capitalize">{accent}</span>
                        <span className="block text-xs opacity-70">Paleta {accent}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-white/6 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-white">
                  <ShoppingCart className="h-4 w-4 text-cyan-300" />
                  <h3 className="font-semibold">Carrinho</h3>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/65">{cartEntries.length} item(ns)</span>
              </div>

              <div className="mt-4 space-y-3">
                {cartEntries.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 py-8 text-center text-sm text-white/55">Adicione produtos para montar o pedido.</div>
                ) : (
                  cartEntries.map(({ product, quantity }) => (
                    <div key={product.id} className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-white">{product.name}</p>
                          <p className="text-xs text-white/45">{formatCurrency(product.price)} cada</p>
                        </div>
                        <button type="button" onClick={() => updateQuantity(product, 0)} className="rounded-full p-1.5 text-white/45 transition hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-1">
                          <button type="button" onClick={() => updateQuantity(product, quantity - 1)} className="rounded-full p-1 text-white/70 hover:bg-white/10 hover:text-white"><Minus className="h-3.5 w-3.5" /></button>
                          <span className="min-w-6 text-center text-sm font-semibold text-white">{quantity}</span>
                          <button type="button" onClick={() => updateQuantity(product, quantity + 1)} className="rounded-full p-1 text-white/70 hover:bg-white/10 hover:text-white"><Plus className="h-3.5 w-3.5" /></button>
                        </div>
                        <p className="text-sm font-semibold text-white">{formatCurrency(product.price * quantity)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <div className="flex items-center justify-between text-sm text-white/70">
                  <span>Total estimado</span>
                  <span className="text-xl font-semibold text-white">{formatCurrency(cartTotal)}</span>
                </div>

                <button type="button" onClick={() => void handleCheckout()} disabled={checkoutState === 'loading' || cartEntries.length === 0} className={clsx('mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition', checkoutState === 'loading' || cartEntries.length === 0 ? 'cursor-not-allowed bg-white/8 text-white/35' : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400')}>
                  {checkoutState === 'loading' ? 'Processando...' : 'Finalizar compra'}
                </button>

                <p className={clsx('mt-3 flex items-start gap-2 text-sm', checkoutState === 'error' ? 'text-rose-300' : checkoutState === 'success' ? 'text-emerald-300' : 'text-white/60')}>
                  {checkoutState === 'success' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : checkoutState === 'error' ? <BellRing className="mt-0.5 h-4 w-4 shrink-0" /> : <Globe className="mt-0.5 h-4 w-4 shrink-0" />}
                  <span>{checkoutMessage || 'A compra do protótipo cria a venda no SaaS e baixa o estoque da empresa vinculada.'}</span>
                </p>
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-white/6 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-white">
                <Box className="h-4 w-4 text-violet-300" />
                <h3 className="font-semibold">Resumo da empresa</h3>
              </div>
              <div className="mt-4 space-y-3 text-sm text-white/70">
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3"><span>Empresa</span><span className="font-medium text-white">{company?.name ?? 'Empresa sem nome'}</span></div>
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3"><span>Razão social</span><span className="font-medium text-white">{company?.legalName ?? 'Não informada'}</span></div>
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3"><span>Produtos publicados</span><span className="font-medium text-white">{products.length}</span></div>
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3"><span>Baixa de estoque</span><span className="font-medium text-white">Automática</span></div>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs leading-5 text-white/55">Este é um protótipo de avaliação. O próximo passo natural é persistir as configurações de loja por empresa e publicar uma URL pública com checkout.</div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  )
}