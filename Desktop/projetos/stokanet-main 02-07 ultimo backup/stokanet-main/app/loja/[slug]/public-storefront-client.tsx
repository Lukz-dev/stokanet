'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { BadgeCheck, Loader2, Minus, Plus, ShoppingBag, Store, Ticket, X } from 'lucide-react'
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

type Storefront = {
  id: string
  name: string
  legalName: string | null
  storeSlug: string
  storeName: string
  storeDescription: string
  storeBannerUrl: string | null
  storeLogoUrl: string | null
  storeTheme: string
  products: StoreProduct[]
}

type CartItem = {
  product: StoreProduct
  quantity: number
}

const THEME_STYLES: Record<string, { gradient: string; accent: string; button: string }> = {
  sunset: { gradient: 'from-orange-500 via-rose-500 to-fuchsia-600', accent: 'text-orange-200', button: 'bg-orange-500 hover:bg-orange-600 text-white' },
  ocean: { gradient: 'from-sky-600 via-cyan-500 to-blue-600', accent: 'text-sky-200', button: 'bg-sky-500 hover:bg-sky-600 text-white' },
  forest: { gradient: 'from-emerald-600 via-teal-500 to-lime-600', accent: 'text-emerald-200', button: 'bg-emerald-500 hover:bg-emerald-600 text-white' },
  rose: { gradient: 'from-pink-600 via-rose-500 to-orange-500', accent: 'text-pink-200', button: 'bg-pink-500 hover:bg-pink-600 text-white' },
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function PublicStorefrontClient({ storefront }: { storefront: Storefront }) {
  const [cart, setCart] = useState<Record<string, number>>({})
  const [loadingCheckout, setLoadingCheckout] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'auto' | 'pix' | 'card'>('auto')

  const theme = THEME_STYLES[storefront.storeTheme] ?? THEME_STYLES.ocean

  const cartItems = useMemo<CartItem[]>(() => {
    return Object.entries(cart)
      .map(([productId, quantity]) => {
        const product = storefront.products.find((item) => item.id === productId)
        if (!product) return null
        return { product, quantity }
      })
      .filter((item): item is CartItem => Boolean(item))
  }, [cart, storefront.products])

  const subtotal = useMemo(() => cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0), [cartItems])

  const addToCart = (product: StoreProduct) => {
    if (product.stockQty <= 0) return
    setCart((current) => ({ ...current, [product.id]: Math.min(product.stockQty, (current[product.id] ?? 0) + 1) }))
  }

  const updateQuantity = (product: StoreProduct, nextQuantity: number) => {
    if (nextQuantity <= 0) {
      setCart((current) => {
        const next = { ...current }
        delete next[product.id]
        return next
      })
      return
    }

    setCart((current) => ({ ...current, [product.id]: Math.min(product.stockQty, nextQuantity) }))
  }

  const handleCheckout = async () => {
    if (cartItems.length === 0) return

    setLoadingCheckout(true)
    setCheckoutError('')

    try {
      const response = await fetch('/api/loja/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: storefront.storeSlug,
          items: cartItems.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
          customer: {
            name: customerName,
            email: customerEmail,
            phone: customerPhone,
          },
          paymentMethod,
        }),
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || 'Não foi possível iniciar o pagamento.')
      }

      const checkoutUrl = payload.initPoint || payload.sandboxInitPoint
      if (!checkoutUrl) {
        throw new Error('Gateway não retornou URL de pagamento.')
      }

      window.location.href = checkoutUrl
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : 'Falha ao iniciar checkout.')
    } finally {
      setLoadingCheckout(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className={clsx('absolute inset-x-0 top-0 h-[24rem] bg-gradient-to-br opacity-95', theme.gradient)} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.15),transparent_40%),linear-gradient(to_bottom,rgba(15,23,42,0.12),rgba(2,6,23,0.92))]" />

      <main className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-2xl shadow-black/20 backdrop-blur-xl">
          <div className="grid gap-0 lg:grid-cols-[1.3fr_0.9fr]">
            <div className="relative min-h-[20rem] p-6 sm:p-10">
              {storefront.storeBannerUrl ? (
                <Image src={storefront.storeBannerUrl} alt={storefront.storeName} fill className="object-cover opacity-25" unoptimized />
              ) : null}
              <div className="relative z-10 flex h-full flex-col justify-between gap-8">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10 overflow-hidden">
                    {storefront.storeLogoUrl ? (
                      <Image src={storefront.storeLogoUrl} alt={storefront.storeName} width={48} height={48} unoptimized className="h-full w-full object-cover" />
                    ) : (
                      <Store className="h-6 w-6" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.32em] text-white/45">Loja oficial</p>
                    <h1 className="text-2xl font-semibold sm:text-4xl">{storefront.storeName}</h1>
                  </div>
                </div>

                <div className="max-w-2xl">
                  <p className="text-sm uppercase tracking-[0.28em] text-white/50">{storefront.legalName ?? storefront.name}</p>
                  <p className="mt-3 text-base leading-7 text-white/80 sm:text-lg">{storefront.storeDescription}</p>
                  <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-4 py-2 text-sm text-white/75">
                    <BadgeCheck className={clsx('h-4 w-4', theme.accent)} />
                    Pagamento por PIX ou cartão no Mercado Pago
                  </div>
                </div>
              </div>
            </div>

            <aside className="border-t border-white/10 bg-slate-950/65 p-6 sm:p-8 lg:border-l lg:border-t-0">
              <h2 className="text-xl font-semibold">Carrinho</h2>
              <div className="mt-4 space-y-3">
                {cartItems.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-5 text-sm text-white/55">Adicione produtos para iniciar o checkout.</div>
                ) : (
                  cartItems.map(({ product, quantity }) => (
                    <div key={product.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{product.name}</p>
                          <p className="text-xs text-white/45">{product.sku}</p>
                        </div>
                        <button type="button" onClick={() => updateQuantity(product, 0)} className="rounded-full p-1.5 text-white/45 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/60 px-2 py-1">
                          <button type="button" onClick={() => updateQuantity(product, quantity - 1)} className="rounded-full p-1 hover:bg-white/10"><Minus className="h-3.5 w-3.5" /></button>
                          <span className="min-w-5 text-center text-sm font-semibold">{quantity}</span>
                          <button type="button" onClick={() => updateQuantity(product, quantity + 1)} className="rounded-full p-1 hover:bg-white/10"><Plus className="h-3.5 w-3.5" /></button>
                        </div>
                        <span className="text-sm font-semibold">{formatCurrency(product.price * quantity)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between text-sm text-white/70">
                  <span>Subtotal</span>
                  <strong className="text-lg text-white">{formatCurrency(subtotal)}</strong>
                </div>

                <div className="mt-4 space-y-2">
                  <label className="text-xs uppercase tracking-[0.24em] text-white/45">Dados do comprador</label>
                  <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Nome" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm outline-none placeholder:text-white/30" />
                  <input value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} placeholder="E-mail" type="email" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm outline-none placeholder:text-white/30" />
                  <input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder="Telefone" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm outline-none placeholder:text-white/30" />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => setPaymentMethod('auto')} className={clsx('rounded-full px-3 py-2 text-xs font-semibold', paymentMethod === 'auto' ? 'bg-white text-slate-950' : 'bg-white/5 text-white/70')}>
                    Automático
                  </button>
                  <button type="button" onClick={() => setPaymentMethod('pix')} className={clsx('rounded-full px-3 py-2 text-xs font-semibold', paymentMethod === 'pix' ? 'bg-white text-slate-950' : 'bg-white/5 text-white/70')}>
                    PIX
                  </button>
                  <button type="button" onClick={() => setPaymentMethod('card')} className={clsx('rounded-full px-3 py-2 text-xs font-semibold', paymentMethod === 'card' ? 'bg-white text-slate-950' : 'bg-white/5 text-white/70')}>
                    Cartão
                  </button>
                </div>

                {checkoutError && <p className="mt-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{checkoutError}</p>}

                <button type="button" onClick={() => void handleCheckout()} disabled={loadingCheckout || cartItems.length === 0} className={clsx('mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition', loadingCheckout || cartItems.length === 0 ? 'cursor-not-allowed bg-white/10 text-white/40' : theme.button)}>
                  {loadingCheckout ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ticket className="h-4 w-4" />}
                  Pagar com Mercado Pago
                </button>
              </div>
            </aside>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {storefront.products.map((product) => {
            const isSoldOut = product.stockQty <= 0
            return (
              <article key={product.id} className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-white/40">{product.category?.name ?? 'Sem categoria'}</p>
                    <h3 className="mt-1 text-lg font-semibold">{product.name}</h3>
                  </div>
                  <span className={clsx('rounded-full border px-3 py-1 text-xs', isSoldOut ? 'border-rose-500/20 bg-rose-500/10 text-rose-200' : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200')}>
                    {isSoldOut ? 'Esgotado' : 'Disponível'}
                  </span>
                </div>
                <p className="mt-4 text-3xl font-semibold">{formatCurrency(product.price)}</p>
                <p className="mt-2 text-sm text-white/60">SKU {product.sku} {product.size ? `• ${product.size}` : ''} {product.color ? `• ${product.color}` : ''}</p>
                <button type="button" onClick={() => addToCart(product)} disabled={isSoldOut} className={clsx('mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition', isSoldOut ? 'cursor-not-allowed bg-white/10 text-white/40' : theme.button)}>
                  <ShoppingBag className="h-4 w-4" />
                  Adicionar
                </button>
              </article>
            )
          })}
        </section>
      </main>
    </div>
  )
}