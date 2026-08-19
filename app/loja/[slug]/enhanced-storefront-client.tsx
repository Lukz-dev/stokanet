'use client'

import { type CSSProperties, useMemo, useState } from 'react'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { BadgeCheck, Link2, Loader2, MessageCircle, Minus, Plus, ShoppingBag, Store, Ticket, Truck, X, Search, Filter, ChevronDown } from 'lucide-react'
import clsx from 'clsx'
import { THEME_COLOR_PRESETS, type ThemePreference } from '@/lib/theme'

type ProductImage = {
  id: string
  imageUrl: string
  displayOrder: number
}

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
  description: string | null
  highlights: string | null
  category: { id: string; name: string } | null
  images: ProductImage[]
}

type Storefront = {
  id: string
  name: string
  legalName: string | null
  storeSlug: string
  storeName: string
  storeDescription: string
  storeHeroTitle: string
  storeHeroSubtitle: string
  storeBadgeText: string
  storePrimaryButtonLabel: string
  storeSecondaryButtonLabel: string
  storeWhatsappNumber: string | null
  storeInstagramUrl: string | null
  storeFacebookUrl: string | null
  storeTiktokUrl: string | null
  storeShippingFee: number | null
  storeFreeShippingMin: number | null
  storeShippingNote: string | null
  storePrimaryColor: string | null
  storeSecondaryColor: string | null
  storeShowSocialLinks: boolean
  storeShowShippingInfo: boolean
  storeBannerUrl: string | null
  storeLogoUrl: string | null
  storeTheme: string
  products: StoreProduct[]
}

type CartItem = {
  product: StoreProduct
  quantity: number
}

type SortOption = 'newest' | 'price-low' | 'price-high' | 'name'

const THEME_STYLES: Record<string, { gradient: string; accent: string; button: string }> = {
  sunset: { gradient: 'from-orange-500 via-rose-500 to-fuchsia-600', accent: 'text-orange-200', button: 'bg-orange-500 hover:bg-orange-600 text-white' },
  ocean: { gradient: 'from-sky-600 via-cyan-500 to-blue-600', accent: 'text-sky-200', button: 'bg-sky-500 hover:bg-sky-600 text-white' },
  forest: { gradient: 'from-emerald-600 via-teal-500 to-lime-600', accent: 'text-emerald-200', button: 'bg-emerald-500 hover:bg-emerald-600 text-white' },
  rose: { gradient: 'from-pink-600 via-rose-500 to-orange-500', accent: 'text-pink-200', button: 'bg-pink-500 hover:bg-pink-600 text-white' },
}

type CustomThemePalette = {
  primary: string
  secondary: string
  gradientStyle: CSSProperties
  accentStyle: CSSProperties
  buttonStyle: CSSProperties
  softStyle: CSSProperties
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function truncateText(text: string, maxLength: number) {
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text
}

function isHexColor(value: string | null | undefined) {
  return /^#([0-9a-f]{6})$/i.test(String(value ?? '').trim())
}

function rgbaFromHex(hex: string, alpha: number) {
  if (!isHexColor(hex)) return `rgba(255, 255, 255, ${alpha})`

  const normalized = hex.replace('#', '')
  const red = Number.parseInt(normalized.slice(0, 2), 16)
  const green = Number.parseInt(normalized.slice(2, 4), 16)
  const blue = Number.parseInt(normalized.slice(4, 6), 16)
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

function buildCustomThemePalette(primaryColor: string | null, secondaryColor: string | null, themeKey: string): CustomThemePalette | null {
  const presetKey = String(themeKey ?? 'ocean').toUpperCase() as ThemePreference
  const preset = THEME_COLOR_PRESETS[presetKey] ?? THEME_COLOR_PRESETS.OCEAN
  const primary = isHexColor(primaryColor) ? String(primaryColor) : preset.primary
  const secondary = isHexColor(secondaryColor) ? String(secondaryColor) : preset.secondary

  if (!isHexColor(primaryColor) && !isHexColor(secondaryColor)) {
    return null
  }

  return {
    primary,
    secondary,
    gradientStyle: { backgroundImage: `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)` },
    accentStyle: { color: primary },
    buttonStyle: { backgroundColor: primary, color: '#ffffff' },
    softStyle: {
      borderColor: rgbaFromHex(primary, 0.24),
      backgroundColor: rgbaFromHex(primary, 0.12),
      color: '#ffffff',
    },
  }
}

function formatPhoneLink(value: string | null) {
  const digits = value?.replace(/\D/g, '') ?? ''
  return digits ? `https://wa.me/${digits}` : ''
}

function formatShippingAmount(value: number | null) {
  return typeof value === 'number' && value > 0 ? formatCurrency(value) : 'Grátis'
}

export function EnhancedStorefrontClient({ storefront }: { storefront: Storefront }) {
  const searchParams = useSearchParams()
  const [cart, setCart] = useState<Record<string, number>>({})
  const [loadingCheckout, setLoadingCheckout] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [deliveryMethod, setDeliveryMethod] = useState<'DELIVERY' | 'PICKUP'>('DELIVERY')
  const [address, setAddress] = useState({ street: '', number: '', complement: '', neighborhood: '', city: '', state: '', postalCode: '' })
  const [paymentMethod, setPaymentMethod] = useState<'auto' | 'pix' | 'card'>('auto')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const checkoutStatus = searchParams.get('status')
  const checkoutOrderCode = searchParams.get('order')
  const showCheckoutResult = ['success', 'pending', 'failure'].includes(checkoutStatus ?? '')

  const theme = THEME_STYLES[storefront.storeTheme] ?? THEME_STYLES.ocean
  const customTheme = buildCustomThemePalette(storefront.storePrimaryColor, storefront.storeSecondaryColor, storefront.storeTheme)
  const primaryButtonClassName = clsx('rounded-2xl px-4 py-3 text-sm font-semibold transition', !customTheme && theme.button)
  const primaryButtonStyle = customTheme ? customTheme.buttonStyle : undefined
  const accentStyle = customTheme ? customTheme.accentStyle : undefined
  const gradientStyle = customTheme ? customTheme.gradientStyle : undefined

  const categories = useMemo(() => {
    const unique = new Set<string>()
    storefront.products.forEach((p) => {
      if (p.category) unique.add(p.category.id)
    })
    return Array.from(unique)
      .map((categoryId) => storefront.products.find((p) => p.category?.id === categoryId)?.category)
      .filter((c): c is NonNullable<typeof c> => Boolean(c))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [storefront.products])

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

  const selectedProduct = useMemo(() => storefront.products.find((p) => p.id === selectedProductId), [storefront.products, selectedProductId])

  const cartShippingFee = useMemo(() => {
    const baseShippingFee = storefront.storeShippingFee ?? 0
    const freeShippingMinimum = storefront.storeFreeShippingMin

    if (typeof freeShippingMinimum === 'number' && subtotal >= freeShippingMinimum) {
      return 0
    }

    return baseShippingFee
  }, [subtotal, storefront.storeFreeShippingMin, storefront.storeShippingFee])
  const cartTotal = subtotal + cartShippingFee
  const whatsappUrl = formatPhoneLink(storefront.storeWhatsappNumber)

  const filteredAndSortedProducts = useMemo(() => {
    let filtered = storefront.products

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.sku.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query),
      )
    }

    if (selectedCategory) {
      filtered = filtered.filter((p) => p.category?.id === selectedCategory)
    }

    let sorted = [...filtered]
    switch (sortBy) {
      case 'price-low':
        sorted.sort((a, b) => a.price - b.price)
        break
      case 'price-high':
        sorted.sort((a, b) => b.price - a.price)
        break
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'newest':
      default:
        break
    }

    return sorted
  }, [storefront.products, searchQuery, selectedCategory, sortBy])

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
          deliveryMethod,
          customer: {
            name: customerName,
            email: customerEmail,
            phone: customerPhone,
            address: deliveryMethod === 'DELIVERY' ? address : undefined,
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
      <div className={clsx('absolute inset-x-0 top-0 h-[24rem] bg-gradient-to-br opacity-95', !customTheme && theme.gradient)} style={gradientStyle} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.15),transparent_40%),linear-gradient(to_bottom,rgba(15,23,42,0.12),rgba(2,6,23,0.92))]" />

      <main className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {showCheckoutResult && (
          <section className={clsx(
            'relative z-10 mb-6 rounded-3xl border p-5 shadow-xl backdrop-blur-xl',
            checkoutStatus === 'success' && 'border-emerald-400/30 bg-emerald-950/70',
            checkoutStatus === 'pending' && 'border-amber-400/30 bg-amber-950/70',
            checkoutStatus === 'failure' && 'border-rose-400/30 bg-rose-950/70',
          )}>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/55">Pedido {checkoutOrderCode ?? 'online'}</p>
            <h2 className="mt-2 text-2xl font-semibold">
              {checkoutStatus === 'success' && 'Pedido realizado com sucesso'}
              {checkoutStatus === 'pending' && 'Pagamento pendente'}
              {checkoutStatus === 'failure' && 'Não foi possível concluir o pagamento'}
            </h2>
            <p className="mt-2 text-sm leading-6 text-white/75">
              {checkoutStatus === 'success' && 'Recebemos seu retorno do Mercado Pago. A confirmação final do pagamento será atualizada assim que o gateway processar a transação.'}
              {checkoutStatus === 'pending' && 'Seu pedido foi registrado e o Mercado Pago ainda está processando o pagamento.'}
              {checkoutStatus === 'failure' && 'O pagamento não foi concluído. Você pode revisar o carrinho e tentar novamente.'}
            </p>
            {checkoutStatus !== 'failure' && <p className="mt-3 text-sm font-medium text-white/90">Guarde o código do pedido para falar com a loja.</p>}
          </section>
        )}
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
                    <h2 className="mt-3 text-3xl font-semibold leading-tight sm:text-5xl">{storefront.storeHeroTitle}</h2>
                    <p className="mt-3 text-base leading-7 text-white/80 sm:text-lg">{storefront.storeHeroSubtitle}</p>
                    <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-4 py-2 text-sm text-white/75" style={customTheme ? { borderColor: rgbaFromHex(customTheme.primary, 0.3), backgroundColor: rgbaFromHex(customTheme.primary, 0.12) } : undefined}>
                    <BadgeCheck className={clsx('h-4 w-4', !customTheme && theme.accent)} style={accentStyle} />
                      {storefront.storeBadgeText}
                  </div>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <a href="#catalogo" className={primaryButtonClassName} style={primaryButtonStyle}>
                        {storefront.storePrimaryButtonLabel}
                      </a>
                      <button type="button" onClick={() => document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' })} className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white/80 hover:bg-white/10 transition" style={customTheme ? { borderColor: rgbaFromHex(customTheme.primary, 0.25) } : undefined}>
                        {storefront.storeSecondaryButtonLabel}
                      </button>
                    </div>
                    {storefront.storeShowSocialLinks && (whatsappUrl || storefront.storeInstagramUrl || storefront.storeFacebookUrl || storefront.storeTiktokUrl) && (
                      <div className="mt-6 flex flex-wrap gap-3">
                        {whatsappUrl && (
                          <a href={whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition hover:bg-white/10" style={customTheme ? customTheme.softStyle : undefined}>
                            <MessageCircle className="h-4 w-4" />
                            WhatsApp
                          </a>
                        )}
                        {storefront.storeInstagramUrl && (
                          <a href={storefront.storeInstagramUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/75 transition hover:bg-white/10" style={customTheme ? { borderColor: rgbaFromHex(customTheme.primary, 0.2) } : undefined}>
                            <Link2 className="h-4 w-4" />
                            Instagram
                          </a>
                        )}
                        {storefront.storeFacebookUrl && (
                          <a href={storefront.storeFacebookUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/75 transition hover:bg-white/10" style={customTheme ? { borderColor: rgbaFromHex(customTheme.primary, 0.2) } : undefined}>
                            <Link2 className="h-4 w-4" />
                            Facebook
                          </a>
                        )}
                        {storefront.storeTiktokUrl && (
                          <a href={storefront.storeTiktokUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/75 transition hover:bg-white/10" style={customTheme ? { borderColor: rgbaFromHex(customTheme.primary, 0.2) } : undefined}>
                            <Link2 className="h-4 w-4" />
                            TikTok
                          </a>
                        )}
                      </div>
                    )}
                </div>
              </div>
            </div>

            <aside className="border-t border-white/10 bg-slate-950/65 p-6 sm:p-8 lg:border-l lg:border-t-0">
              <h2 className="text-xl font-semibold">Carrinho</h2>
              <div className="mt-4 space-y-3 max-h-[300px] overflow-y-auto">
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
                        <button type="button" onClick={() => updateQuantity(product, 0)} className="rounded-full p-1.5 text-white/45 hover:bg-white/10 hover:text-white">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/60 px-2 py-1">
                          <button type="button" onClick={() => updateQuantity(product, quantity - 1)} className="rounded-full p-1 hover:bg-white/10">
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="min-w-5 text-center text-sm font-semibold">{quantity}</span>
                          <button type="button" onClick={() => updateQuantity(product, quantity + 1)} className="rounded-full p-1 hover:bg-white/10">
                            <Plus className="h-3.5 w-3.5" />
                          </button>
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

                {storefront.storeShowShippingInfo && (
                  <>
                    <div className="mt-2 flex items-center justify-between text-sm text-white/70">
                      <span className="inline-flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        Frete
                      </span>
                      <strong className="text-white">{formatShippingAmount(cartShippingFee)}</strong>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-sm text-white/70">
                      <span>Total</span>
                      <strong className="text-lg text-white">{formatCurrency(cartTotal)}</strong>
                    </div>

                    {storefront.storeShippingNote && <p className="mt-3 text-xs leading-5 text-white/55">{storefront.storeShippingNote}</p>}
                    {typeof storefront.storeFreeShippingMin === 'number' && storefront.storeFreeShippingMin > 0 && (
                      <p className="mt-2 text-xs leading-5 text-white/55">
                        {subtotal >= storefront.storeFreeShippingMin
                          ? 'Seu carrinho já alcançou frete grátis.'
                          : `Frete grátis acima de ${formatCurrency(storefront.storeFreeShippingMin)}.`}
                      </p>
                    )}
                  </>
                )}

                <div className="mt-4 space-y-2">
                  <label className="text-xs uppercase tracking-[0.24em] text-white/45">Dados do comprador</label>
                  <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Nome" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm outline-none placeholder:text-white/30" />
                  <input value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} placeholder="E-mail" type="email" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm outline-none placeholder:text-white/30" />
                  <input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder="Telefone" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm outline-none placeholder:text-white/30" />
                  <p className="pt-2 text-xs uppercase tracking-[0.24em] text-white/45">Como receber o pedido</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setDeliveryMethod('DELIVERY')} className={clsx('rounded-2xl border px-3 py-2.5 text-sm font-semibold transition', deliveryMethod === 'DELIVERY' ? 'border-white bg-white text-slate-950' : 'border-white/10 bg-white/5 text-white/70')}>Entrega</button>
                    <button type="button" onClick={() => setDeliveryMethod('PICKUP')} className={clsx('rounded-2xl border px-3 py-2.5 text-sm font-semibold transition', deliveryMethod === 'PICKUP' ? 'border-white bg-white text-slate-950' : 'border-white/10 bg-white/5 text-white/70')}>Retirada</button>
                  </div>
                  {deliveryMethod === 'DELIVERY' && <>
                  <p className="pt-2 text-xs uppercase tracking-[0.24em] text-white/45">Endereço de entrega</p>
                  <div className="grid grid-cols-[1fr_7rem] gap-2">
                    <input value={address.street} onChange={(event) => setAddress((current) => ({ ...current, street: event.target.value }))} placeholder="Rua / avenida" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm outline-none placeholder:text-white/30" />
                    <input value={address.number} onChange={(event) => setAddress((current) => ({ ...current, number: event.target.value }))} placeholder="Número" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm outline-none placeholder:text-white/30" />
                  </div>
                  <input value={address.complement} onChange={(event) => setAddress((current) => ({ ...current, complement: event.target.value }))} placeholder="Complemento (opcional)" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm outline-none placeholder:text-white/30" />
                  <input value={address.neighborhood} onChange={(event) => setAddress((current) => ({ ...current, neighborhood: event.target.value }))} placeholder="Bairro" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm outline-none placeholder:text-white/30" />
                  <div className="grid grid-cols-[1fr_5rem] gap-2">
                    <input value={address.city} onChange={(event) => setAddress((current) => ({ ...current, city: event.target.value }))} placeholder="Cidade" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm outline-none placeholder:text-white/30" />
                    <input value={address.state} onChange={(event) => setAddress((current) => ({ ...current, state: event.target.value.toUpperCase().slice(0, 2) }))} placeholder="UF" maxLength={2} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm uppercase outline-none placeholder:text-white/30" />
                  </div>
                  <input value={address.postalCode} onChange={(event) => setAddress((current) => ({ ...current, postalCode: event.target.value }))} placeholder="CEP" inputMode="numeric" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm outline-none placeholder:text-white/30" />
                  </>}
                  {deliveryMethod === 'PICKUP' && <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/65">O cliente retirará o pedido no endereço informado pela loja.</p>}
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

                <button type="button" onClick={() => void handleCheckout()} disabled={loadingCheckout || cartItems.length === 0} className={clsx('mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition', loadingCheckout || cartItems.length === 0 ? 'cursor-not-allowed bg-white/10 text-white/40' : !customTheme && theme.button)} style={customTheme ? primaryButtonStyle : undefined}>
                  {loadingCheckout ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ticket className="h-4 w-4" />}
                  Pagar com Mercado Pago
                </button>
              </div>
            </aside>
          </div>
        </section>

        <section id="catalogo" className="mt-8 space-y-6">
          <div className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex-1">
                <label className="text-xs uppercase tracking-[0.24em] text-white/45 mb-2 block">Buscar produtos</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Nome, SKU ou descrição..."
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm outline-none focus:border-white/30 focus:ring-2 focus:ring-white/10 transition placeholder:text-white/30"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                {categories.length > 0 && (
                  <div className="relative">
                    <select
                      value={selectedCategory || ''}
                      onChange={(e) => setSelectedCategory(e.target.value || null)}
                      className="pl-3 pr-10 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm outline-none focus:border-white/30 focus:ring-2 focus:ring-white/10 transition appearance-none cursor-pointer"
                    >
                      <option value="">Todas categorias</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id} className="bg-slate-950">
                          {cat.name}
                        </option>
                      ))}
                    </select>
                    <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                  </div>
                )}

                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="pl-3 pr-10 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm outline-none focus:border-white/30 focus:ring-2 focus:ring-white/10 transition appearance-none cursor-pointer"
                  >
                    <option value="newest" className="bg-slate-950">
                      Mais recentes
                    </option>
                    <option value="price-low" className="bg-slate-950">
                      Menor preço
                    </option>
                    <option value="price-high" className="bg-slate-950">
                      Maior preço
                    </option>
                    <option value="name" className="bg-slate-950">
                      Nome (A-Z)
                    </option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                </div>
              </div>
            </div>

            <p className="text-sm text-white/60">
              {filteredAndSortedProducts.length} produto{filteredAndSortedProducts.length !== 1 ? 's' : ''} encontrado{filteredAndSortedProducts.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredAndSortedProducts.map((product) => {
              const isSoldOut = product.stockQty <= 0
              const firstImage = product.images[0]?.imageUrl

              return (
                <article key={product.id} className="group rounded-3xl border border-white/10 bg-white/5 overflow-hidden backdrop-blur-xl transition hover:border-white/20 hover:bg-white/8">
                  <div className="relative h-40 bg-slate-900 overflow-hidden">
                    {firstImage ? (
                      <Image src={firstImage} alt={product.name} fill className="object-cover group-hover:scale-105 transition" unoptimized />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="w-12 h-12 text-white/20" />
                      </div>
                    )}
                    {isSoldOut && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><span className="text-sm font-semibold">Esgotado</span></div>}
                  </div>

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.22em] text-white/40">{product.category?.name ?? 'Sem categoria'}</p>
                        <h3 className="mt-1 text-lg font-semibold line-clamp-2">{product.name}</h3>
                      </div>
                      <span className={clsx('rounded-full border px-3 py-1 text-xs flex-shrink-0', isSoldOut ? 'border-rose-500/20 bg-rose-500/10 text-rose-200' : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200')}>
                        {isSoldOut ? 'Esgotado' : 'Disponível'}
                      </span>
                    </div>

                    {product.description && <p className="mt-2 text-sm text-white/60 line-clamp-2">{truncateText(product.description, 100)}</p>}

                    <p className="mt-4 text-3xl font-semibold">{formatCurrency(product.price)}</p>
                    <p className="mt-2 text-xs text-white/50">SKU {product.sku} {product.size ? `• ${product.size}` : ''} {product.color ? `• ${product.color}` : ''}</p>

                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedProductId(product.id)}
                        className="flex-1 rounded-2xl border border-white/10 px-3 py-2 text-sm font-semibold text-white/70 hover:bg-white/10 hover:text-white transition"
                      >
                        Detalhes
                      </button>
                      <button type="button" onClick={() => addToCart(product)} disabled={isSoldOut} className={clsx('flex-1 inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold transition', isSoldOut ? 'cursor-not-allowed bg-white/10 text-white/40' : !customTheme && theme.button)} style={customTheme ? primaryButtonStyle : undefined}>
                        <ShoppingBag className="h-4 w-4" />
                        Adicionar
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>

          {filteredAndSortedProducts.length === 0 && (
            <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-12 text-center">
              <ShoppingBag className="mx-auto h-12 w-12 text-white/20 mb-4" />
              <p className="text-white/60">Nenhum produto encontrado com os filtros selecionados.</p>
            </div>
          )}
        </section>
      </main>

      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-slate-900 rounded-3xl border border-white/10 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 flex items-center justify-between gap-3 border-b border-white/10 bg-slate-900/95 p-6 backdrop-blur-sm">
              <h2 className="text-2xl font-semibold">{selectedProduct.name}</h2>
              <button type="button" onClick={() => setSelectedProductId(null)} className="rounded-full p-2 hover:bg-white/10 transition">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {selectedProduct.images.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.24em] text-white/45">Imagens</label>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedProduct.images.map((img) => (
                      <div key={img.id} className="relative aspect-square rounded-2xl overflow-hidden border border-white/10 bg-slate-800">
                        <Image src={img.imageUrl} alt={`${selectedProduct.name} - Imagem ${img.displayOrder + 1}`} fill className="object-cover" unoptimized />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.24em] text-white/45">Categoria</label>
                <p className="text-sm">{selectedProduct.category?.name ?? 'Sem categoria'}</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.24em] text-white/45">SKU</label>
                <p className="text-sm font-mono">{selectedProduct.sku}</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.24em] text-white/45">Preço</label>
                <p className="text-3xl font-semibold">{formatCurrency(selectedProduct.price)}</p>
              </div>

              {selectedProduct.description && (
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.24em] text-white/45">Descrição</label>
                  <p className="text-sm text-white/80 whitespace-pre-wrap">{selectedProduct.description}</p>
                </div>
              )}

              {selectedProduct.highlights && (
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.24em] text-white/45">Destaques</label>
                  <p className="text-sm text-white/80 whitespace-pre-wrap">{selectedProduct.highlights}</p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.24em] text-white/45">Variações</label>
                <div className="flex gap-2 flex-wrap">
                  {selectedProduct.size && <span className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs">{selectedProduct.size}</span>}
                  {selectedProduct.color && <span className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs">{selectedProduct.color}</span>}
                </div>
              </div>

              <div className="border-t border-white/10 pt-6 flex gap-2">
                <button type="button" onClick={() => setSelectedProductId(null)} className="flex-1 rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold hover:bg-white/10 transition">
                  Fechar
                </button>
                <button type="button" onClick={() => { addToCart(selectedProduct); setSelectedProductId(null) }} disabled={selectedProduct.stockQty <= 0} className={clsx('flex-1 inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition', selectedProduct.stockQty <= 0 ? 'cursor-not-allowed bg-white/10 text-white/40' : !customTheme && theme.button)} style={customTheme ? primaryButtonStyle : undefined}>
                  <ShoppingBag className="h-4 w-4" />
                  Adicionar ao carrinho
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
