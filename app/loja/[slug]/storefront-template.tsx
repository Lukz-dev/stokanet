"use client"

// ============================================================
// StorefrontTemplate.tsx — Vitrine pública da loja (arquivo único)
// React + TypeScript, pronto para Next.js (client component).
// Estrutura visual fixa — não configurável.
// Todo conteúdo vem de `storefront`; carrinho e checkout são
// controlados pelo app via props (nenhum estado paralelo).
// ============================================================

import { useMemo, useState, useEffect, useRef, Fragment, type ReactNode } from "react"
import {
  Search,
  User,
  ShoppingCart,
  Minus,
  Plus,
  Trash2,
  X,
  Truck,
  Lock,
  MessageCircle,
  Gift,
  Link2,
  ChevronLeft,
  ChevronRight,
  Star,
  MapPin,
} from "lucide-react"

// ------------------------------------------------------------
// 1. CONTRATO DE DADOS
// ------------------------------------------------------------

export type ProductImage = {
  id: string
  imageUrl: string
  displayOrder: number
}

export type StoreProduct = {
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
  category: {
    id: string
    name: string
  } | null
  images: ProductImage[]
}

export type StorefrontData = {
  storeName: string
  legalName: string | null
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
  storeShippingNote: string | null
  storePrimaryColor: string | null
  storeSecondaryColor: string | null
  storeBannerUrl: string | null
  storeBannerUrls: string[]
  storeLogoUrl: string | null
  products: StoreProduct[]
  storeLayout?: {
    categoryImages?: Record<string, string>
    aboutImage?: string | null
    instagramImage?: string | null
    sectionVisibility?: Record<string, boolean>
    testimonials?: Array<{ name: string; text: string }>
    sections?: string[]
    bannerCarousels?: Array<{ id: string; images: string[] }>
  }
}

export type CartItem = {
  product: StoreProduct
  quantity: number
}

export type StorefrontTemplateProps = {
  storefront: StorefrontData
  cartItems: CartItem[]
  onAddToCart: (product: StoreProduct) => void
  onRemoveFromCart: (productId: string) => void
  onUpdateQuantity: (productId: string, quantity: number) => void
  onCheckout: () => void
  onViewProduct?: (product: StoreProduct) => void
}

// ------------------------------------------------------------
// 2. HELPERS
// ------------------------------------------------------------

const fmtPrice = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })

const categoriesOf = (data: StorefrontData) => {
  const map = new Map<string, string>()
  data.products.forEach((p) => {
    if (p.category) map.set(p.category.id, p.category.name)
  })
  return [...map.entries()].map(([id, name]) => ({ id, name }))
}

// Disponibilidade: APENAS estoque. status não é exigido.
const isAvailable = (p: StoreProduct) => p.stockQty > 0

const mainImage = (p: StoreProduct): string | null =>
  [...p.images].sort((a, b) => a.displayOrder - b.displayOrder)[0]?.imageUrl ??
  null

// Parcelamento: até 3x sem juros a partir de R$ 99,90 (padrão de e-commerce)
const installmentLine = (p: StoreProduct): string | null => {
  if (p.price < 99.9) return null
  return `3x de ${fmtPrice(p.price / 3)} sem juros`
}

// ------------------------------------------------------------
// 3. CSS EMBUTIDO (estrutura fixa — não alterar hierarquia)
// ------------------------------------------------------------

const CSS = `
.sf-root {
  --sf-primary: #6e1423;
  --sf-secondary: #b08d57;
  --sf-text: #2b2118;
  --sf-bg: #f7f1e6;
  --sf-radius: 2px;
  --sf-ink: #6e1423;
  --sf-gold: #b08d57;
  --sf-paper: #fdfaf3;
  --sf-line: #e3d5bd;
  font-family: Georgia, 'Times New Roman', serif;
  color: var(--sf-text);
  background: var(--sf-bg);
}
.sf-container { max-width: 1240px; margin: 0 auto; padding: 0 20px; }

/* rótulos editoriais em caixa alta com espaçamento */
.sf-root h1, .sf-root h2, .sf-root h3 { font-weight: 500; letter-spacing: .01em; }
.sf-section__title, .sf-card__brand, .sf-cat-card__name, .sf-brand-chip__name,
.sf-benefits__label, .sf-promo__item, .sf-catnav__button, .sf-btn {
  font-family: system-ui, -apple-system, sans-serif;
}

/* faixa promocional — marquee vinho com dourado */
.sf-promo { background: var(--sf-ink); color: #f3e6c8; overflow: hidden; padding: 9px 0; border-bottom: 1px solid var(--sf-gold); }
.sf-promo__track { display: flex; width: max-content; animation: sf-marquee 26s linear infinite; }
.sf-promo__item { white-space: nowrap; font-size: 11px; font-weight: 600; padding: 0 32px; letter-spacing: .22em; text-transform: uppercase; }
.sf-promo__item strong { font-weight: 700; color: #fff; }
@keyframes sf-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }

/* header papel com logo serifado e filete duplo */
.sf-header { border-bottom: 1px solid var(--sf-line); background: var(--sf-paper); position: sticky; top: 0; z-index: 50; }
.sf-header::after { content: ""; display: block; height: 3px; background: linear-gradient(90deg, transparent, var(--sf-gold), transparent); opacity: .55; }
.sf-header__inner { display: flex; align-items: center; gap: 24px; padding: 18px 20px; }
.sf-logo { text-decoration: none; }
.sf-logo img { max-height: 52px; display: block; }
.sf-logo span { font-size: 30px; font-weight: 500; color: var(--sf-ink); letter-spacing: .12em; text-transform: uppercase; }
.sf-search { flex: 1; display: flex; max-width: 480px; border: 1px solid var(--sf-line); border-radius: 0; overflow: hidden; background: #fff; }
.sf-search input { flex: 1; border: 0; padding: 11px 16px; outline: none; font-size: 14px; min-width: 0; background: transparent; color: var(--sf-text); font-family: Georgia, serif; }
.sf-search input::placeholder { color: #a99e8c; font-style: italic; }
.sf-search button { border: 0; border-left: 1px solid var(--sf-line); background: transparent; color: var(--sf-ink); padding: 0 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.sf-search button:hover { background: var(--sf-ink); color: #f3e6c8; }
.sf-header__actions { display: flex; gap: 16px; align-items: center; margin-left: auto; }
.sf-header__actions a { color: var(--sf-ink); display: inline-flex; }
.sf-icon-btn { display: inline-flex; align-items: center; justify-content: center; background: none; border: 0; cursor: pointer; color: var(--sf-ink); padding: 4px; position: relative; }
.sf-icon-btn:hover { color: var(--sf-gold); }

.sf-cart-wrap { position: relative; }
.sf-cart-badge { position: absolute; top: -4px; right: -6px; background: var(--sf-ink); color: #f3e6c8; border-radius: 999px; font-size: 10px; font-weight: 700; min-width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; padding: 0 4px; }
.sf-minicart { position: absolute; right: 0; top: calc(100% + 10px); width: 360px; max-width: calc(100vw - 32px); background: var(--sf-paper); border: 1px solid var(--sf-gold); border-radius: 0; box-shadow: 0 18px 40px rgba(43,33,24,.18); z-index: 100; padding: 16px; text-align: left; }
.sf-minicart__head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid var(--sf-line); }
.sf-minicart__head strong { font-size: 15px; letter-spacing: .14em; text-transform: uppercase; font-weight: 600; color: var(--sf-ink); }
.sf-minicart__empty { display: flex; flex-direction: column; align-items: center; gap: 8px; color: #a99e8c; padding: 20px 0; }
.sf-minicart__list { list-style: none; margin: 0; padding: 0; max-height: 280px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; }
.sf-minicart__item { display: flex; justify-content: space-between; align-items: center; gap: 10px; border-bottom: 1px solid var(--sf-line); padding-bottom: 10px; }
.sf-minicart__info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.sf-minicart__name { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sf-minicart__price { font-size: 12px; color: #8a7d68; }
.sf-minicart__controls { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.sf-qty-btn { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border: 1px solid var(--sf-line); background: #fff; border-radius: 0; cursor: pointer; color: var(--sf-text); }
.sf-qty-btn:hover { border-color: var(--sf-ink); color: var(--sf-ink); }
.sf-qty-btn--danger:hover { border-color: #8f1d14; color: #8f1d14; }
.sf-minicart__qty { font-size: 13px; font-weight: 700; min-width: 18px; text-align: center; }
.sf-minicart__footer { margin-top: 12px; display: flex; flex-direction: column; gap: 10px; }
.sf-minicart__subtotal { display: flex; justify-content: space-between; font-size: 14px; }
.sf-minicart__checkout { width: 100%; text-align: center; border: 0; }

/* nav de categorias — vinho, letras douradas espaçadas */
.sf-catnav { background: var(--sf-ink); border-bottom: 2px solid var(--sf-gold); }
.sf-catnav__list { display: flex; gap: 0; overflow-x: auto; list-style: none; margin: 0; justify-content: center; }
.sf-catnav__list a { display: block; color: #f3e6c8; text-decoration: none; padding: 13px 18px; font-size: 12px; font-weight: 600; white-space: nowrap; letter-spacing: .18em; text-transform: uppercase; }
.sf-catnav__list a:hover { background: rgba(176,141,87,.22); color: #fff; }
.sf-catnav__button { display: block; color: #f3e6c8; text-decoration: none; padding: 13px 18px; font-size: 12px; font-weight: 600; white-space: nowrap; border: 0; background: transparent; cursor: pointer; letter-spacing: .18em; text-transform: uppercase; }
.sf-catnav__button:hover { background: rgba(176,141,87,.22); color: #fff; }

/* carrossel full-bleed com moldura dourada */
.sf-hero { position: relative; overflow: hidden; width: 100%; border-bottom: 3px double var(--sf-gold); }
.sf-hero__slides { display: flex; height: 100%; transition: transform .6s ease; }
.sf-hero__viewport { height: 420px; }
.sf-hero__slide { min-width: 100%; background-size: cover; background-position: center; display: block; height: 100%; }
.sf-hero__slide--fallback { background: linear-gradient(120deg, #4a0d18, var(--sf-ink) 55%, #8a6a3b); position: relative; overflow: hidden; }
.sf-hero__slide--fallback::after { content: ""; position: absolute; right: -80px; top: -80px; width: 320px; height: 320px; border-radius: 50%; border: 1px solid rgba(243,230,200,.35); background: rgba(176,141,87,.12); }
.sf-hero__arrow { position: absolute; top: 50%; transform: translateY(-50%); width: 40px; height: 40px; border-radius: 0; border: 1px solid rgba(243,230,200,.5); background: rgba(43,33,24,.45); color: #f3e6c8; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 5; }
.sf-hero__arrow:hover { background: var(--sf-ink); }
.sf-hero__arrow--left { left: 16px; }
.sf-hero__arrow--right { right: 16px; }
.sf-hero__dots { position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%); display: flex; gap: 8px; z-index: 5; }
.sf-dot { width: 9px; height: 9px; border-radius: 50%; border: 1px solid #f3e6c8; background: transparent; cursor: pointer; padding: 0; }
.sf-dot--active { background: #f3e6c8; }

/* seções editoriais com kicker */
.sf-section { margin: 56px auto; }
.sf-section__title { font-size: 30px; color: var(--sf-text); margin: 0 0 24px; text-align: center; letter-spacing: .02em; }
.sf-section__title strong { color: var(--sf-ink); font-style: italic; }
.sf-kicker { display: block; font-family: system-ui, -apple-system, sans-serif; font-size: 11px; font-weight: 600; letter-spacing: .3em; text-transform: uppercase; color: var(--sf-gold); margin-bottom: 10px; }

/* banner intermediário full-width */
.sf-midbanner { margin: 48px 0; }
.sf-midbanner a { display: block; }
.sf-midbanner__img { width: 100%; height: 300px; object-fit: cover; display: block; }
.sf-midbanner__fallback { width: 100%; height: 300px; background: linear-gradient(120deg, #4a0d18, var(--sf-ink) 55%, #8a6a3b); position: relative; overflow: hidden; }
.sf-midbanner__fallback::after { content: ""; position: absolute; left: -60px; bottom: -100px; width: 280px; height: 280px; border-radius: 50%; border: 1px solid rgba(243,230,200,.35); background: rgba(176,141,87,.12); }
.sf-carousel { margin: 48px auto; max-width: 1240px; }
.sf-carousel .sf-midbanner__frame { position: relative; overflow: hidden; height: 300px; }
.sf-carousel .sf-midbanner__slides { display: flex; height: 100%; transition: transform .6s ease; }
.sf-carousel .sf-midbanner__slide { min-width: 100%; height: 100%; background-size: cover; background-position: center; display: block; }

.sf-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; }

/* card editorial: moldura fina, papel, serifas */
.sf-card { border: 1px solid var(--sf-line); border-radius: 0; overflow: hidden; background: var(--sf-paper); display: flex; flex-direction: column; transition: box-shadow .25s, transform .25s; position: relative; }
.sf-card:hover { box-shadow: 0 14px 30px rgba(43,33,24,.12); transform: translateY(-2px); }
.sf-card::after { content: ""; position: absolute; inset: 6px; border: 1px solid rgba(176,141,87,.35); pointer-events: none; z-index: 1; }
.sf-card__media { aspect-ratio: 4 / 5; overflow: hidden; background: #efe6d4; position: relative; }
.sf-card__media img { width: 100%; height: 100%; object-fit: cover; display: block; }
.sf-img-fallback { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, var(--sf-ink), #8a6a3b); }
.sf-img-fallback span { color: rgba(243,230,200,.9); font-size: 44px; font-weight: 500; font-style: italic; }
.sf-card__badge { position: absolute; top: 14px; left: 14px; font-size: 10px; font-weight: 700; padding: 4px 10px; border-radius: 0; z-index: 2; letter-spacing: .16em; text-transform: uppercase; font-family: system-ui, sans-serif; }
.sf-card__badge--free { background: var(--sf-gold); color: #fff; }
.sf-card__badge--out { background: #3a3a3a; color: #f3e6c8; }
.sf-card__body { padding: 18px 16px 20px; display: flex; flex-direction: column; gap: 7px; flex: 1; text-align: center; align-items: center; }
.sf-card__brand { font-size: 10px; color: var(--sf-gold); text-transform: uppercase; letter-spacing: .24em; }
.sf-card__name { font-size: 17px; margin: 0; line-height: 1.35; color: var(--sf-ink); }
.sf-card__price { font-size: 19px; font-weight: 600; color: var(--sf-text); }
.sf-card__installments { font-size: 11px; color: #6d7a4f; font-weight: 600; letter-spacing: .04em; }
.sf-card__cta { margin-top: auto; border: 0; width: 100%; }

/* botões: retangulares, vinho com filete dourado */
.sf-btn { display: inline-block; padding: 13px 28px; border-radius: 0; font-weight: 600; font-size: 11px; text-decoration: none; border: 1px solid var(--sf-ink); cursor: pointer; letter-spacing: .2em; text-transform: uppercase; transition: background .2s, color .2s; }
.sf-btn--primary { background: var(--sf-ink); color: #f3e6c8; }
.sf-btn--primary:hover { background: #55101c; }
.sf-btn:disabled { background: #c9bfae; border-color: #c9bfae; cursor: not-allowed; filter: none; color: #fff; }

/* navegue por categoria — medalhões com anel dourado */
.sf-cats__row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
.sf-cat-card { text-decoration: none; color: var(--sf-text); display: flex; flex-direction: column; align-items: center; gap: 12px; text-align: center; }
.sf-cat-card { border: 0; background: transparent; cursor: pointer; font: inherit; }
.sf-cat-card__media { width: 100%; aspect-ratio: 1; border-radius: 50%; overflow: hidden; background: #efe6d4; border: 1px solid var(--sf-gold); padding: 4px; }
.sf-cat-card__media img { width: 100%; height: 100%; object-fit: cover; display: block; border-radius: 50%; }
.sf-cat-card__media .sf-img-fallback { border-radius: 50%; }
.sf-cat-card__name { font-size: 12px; font-weight: 600; letter-spacing: .18em; text-transform: uppercase; }
.sf-cat-card:hover .sf-cat-card__name { color: var(--sf-ink); }

/* marcas */
.sf-brands__row { display: flex; flex-wrap: wrap; gap: 18px; justify-content: center; }
.sf-brand-chip { width: 132px; aspect-ratio: 3 / 4; border-radius: 0; overflow: hidden; background: var(--sf-paper); text-decoration: none; color: var(--sf-text); display: flex; flex-direction: column; border: 1px solid var(--sf-line); }
.sf-brand-chip__media { flex: 1; }
.sf-brand-chip__media img { width: 100%; height: 100%; object-fit: cover; display: block; }
.sf-brand-chip__media .sf-img-fallback { height: 100%; }
.sf-brand-chip__media .sf-img-fallback span { font-size: 28px; }
.sf-brand-chip__name { font-size: 11px; font-weight: 600; text-align: center; padding: 9px 4px; background: var(--sf-paper); letter-spacing: .14em; text-transform: uppercase; }

/* depoimentos — papel com aspas serifadas */
.sf-testimonials__row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
.sf-testimonial { background: var(--sf-paper); border: 1px solid var(--sf-line); border-top: 3px solid var(--sf-gold); border-radius: 0; padding: 22px 18px; margin: 0; display: flex; flex-direction: column; gap: 10px; }
.sf-testimonial__stars { color: var(--sf-gold); display: flex; gap: 2px; }
.sf-testimonial p { margin: 0; font-size: 13px; font-style: italic; color: #5c5142; flex: 1; line-height: 1.7; }
.sf-testimonial footer { font-weight: 600; font-size: 10px; color: var(--sf-ink); letter-spacing: .18em; text-transform: uppercase; font-family: system-ui, sans-serif; }

/* sobre a loja — editorial com kicker */
.sf-about { display: grid; grid-template-columns: 1fr 1fr; gap: 44px; align-items: center; }
.sf-about__text p { line-height: 1.9; color: #5c5142; font-size: 15px; }
.sf-about__address { display: inline-flex; align-items: center; gap: 6px; color: var(--sf-ink); font-weight: 600; text-decoration: none; margin-top: 10px; border-bottom: 1px solid var(--sf-gold); padding-bottom: 2px; }
.sf-about__media img { width: 100%; border-radius: 0; object-fit: cover; display: block; border: 1px solid var(--sf-gold); padding: 6px; background: var(--sf-paper); }
.sf-about__media .sf-img-fallback { aspect-ratio: 3 / 2; border-radius: 0; }

/* banner Instagram */
.sf-insta { margin: 48px 0; }
.sf-insta a { display: block; position: relative; }
.sf-insta__img { width: 100%; height: 240px; object-fit: cover; display: block; }
.sf-insta__fallback { width: 100%; height: 240px; background: linear-gradient(120deg, #4a0d18, var(--sf-ink) 55%, #8a6a3b); display: flex; align-items: center; justify-content: center; gap: 12px; color: #f3e6c8; font-size: 18px; font-weight: 500; font-style: italic; }
.sf-insta__overlay { position: absolute; inset: 0; background: rgba(43,33,24,.35); display: flex; align-items: center; justify-content: center; gap: 10px; color: #fff; font-weight: 500; letter-spacing: .08em; }

/* benefícios — faixa papel com filetes */
.sf-benefits { background: var(--sf-paper); border-top: 1px solid var(--sf-line); border-bottom: 1px solid var(--sf-line); margin-top: 48px; }
.sf-benefits__list { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; list-style: none; padding: 32px 20px; margin: 0; }
.sf-benefits__item { display: flex; align-items: center; gap: 14px; }
.sf-benefits__item svg { color: var(--sf-gold); flex-shrink: 0; width: 34px; height: 34px; }
.sf-benefits__label { display: flex; flex-direction: column; font-size: 13px; font-weight: 600; color: var(--sf-ink); letter-spacing: .06em; }
.sf-benefits__label small { font-weight: 400; color: #8a7d68; font-size: 12px; font-style: italic; }

.sf-contact__row { display: flex; gap: 20px; align-items: center; flex-wrap: wrap; justify-content: center; }
.sf-contact__row a:not(.sf-btn) { color: var(--sf-ink); font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; border-bottom: 1px solid var(--sf-gold); padding-bottom: 2px; }

/* rodapé vinho com colunas e newsletter */
.sf-footer { background: var(--sf-ink); color: #f3e6c8; margin-top: 0; border-top: 3px double var(--sf-gold); }
.sf-footer__inner { display: flex; justify-content: space-between; align-items: center; padding: 28px 20px; flex-wrap: wrap; gap: 12px; }
.sf-footer p { margin: 0; font-size: 13px; }

/* WhatsApp flutuante */
.sf-wa-float { position: fixed; bottom: 20px; right: 20px; width: 56px; height: 56px; border-radius: 50%; background: #25d366; color: #fff; display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 18px rgba(0,0,0,.25); z-index: 90; text-decoration: none; }
.sf-wa-float:hover { filter: brightness(1.05); }

.sf-empty-search { color: #8a7d68; font-size: 15px; text-align: center; padding: 24px 0; font-style: italic; }

@media (max-width: 1024px) {
  .sf-grid { grid-template-columns: repeat(3, 1fr); }
  .sf-benefits__list { grid-template-columns: repeat(2, 1fr); }
  .sf-cats__row { grid-template-columns: repeat(3, 1fr); }
  .sf-testimonials__row { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 720px) {
  .sf-header__inner { flex-wrap: wrap; }
  .sf-search { order: 3; min-width: 100%; }
  .sf-hero__viewport { height: 240px; }
  .sf-grid { grid-template-columns: repeat(2, 1fr); gap: 14px; }
  .sf-benefits__list { grid-template-columns: 1fr; }
  .sf-testimonials__row { grid-template-columns: 1fr; }
  .sf-about { grid-template-columns: 1fr; }
  .sf-cats__row { grid-template-columns: repeat(2, 1fr); }
  .sf-midbanner__img, .sf-midbanner__fallback { height: 170px; }
  .sf-carousel .sf-midbanner__frame { height: 170px; }
  .sf-insta__img, .sf-insta__fallback { height: 150px; }
  .sf-section { margin: 36px auto; }
  .sf-section__title { font-size: 24px; }
  .sf-logo span { font-size: 24px; }
}
`

// ------------------------------------------------------------
// 4. SUBCOMPONENTES REUTILIZÁVEIS
// ------------------------------------------------------------

/** Imagem por URL com fallback visual local (sem API externa). */
const SafeImage = ({ src, alt }: { src: string | null; alt: string }) => {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return (
      <div className="sf-img-fallback" role="img" aria-label={alt}>
        <span>{(alt || "?").charAt(0).toUpperCase()}</span>
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}

/** Faixa promocional com marquee infinito (texto repetido, como na referência). */
const PromoBar = ({ text }: { text: string }) => {
  const items = Array.from({ length: 10 })
  return (
    <div className="sf-promo">
      <div className="sf-promo__track">
        {items.map((_, i) => (
          <span key={i} className="sf-promo__item">
            <strong>{text.split("|")[0]?.trim() ?? text}</strong>
            {text.includes("|") && <> | {text.split("|")[1]?.trim()}</>}
          </span>
        ))}
      </div>
    </div>
  )
}

/** Mini-carrinho alimentado exclusivamente por props — sem estado próprio. */
const MiniCart = ({
  items,
  onClose,
  onUpdateQuantity,
  onRemoveFromCart,
  onCheckout,
}: {
  items: CartItem[]
  onClose: () => void
  onUpdateQuantity: (productId: string, quantity: number) => void
  onRemoveFromCart: (productId: string) => void
  onCheckout: () => void
}) => {
  const subtotal = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  )

  return (
    <div className="sf-minicart">
      <div className="sf-minicart__head">
        <strong>Carrinho</strong>
        <button className="sf-icon-btn" onClick={onClose} aria-label="Fechar carrinho">
          <X size={18} />
        </button>
      </div>

      {items.length === 0 ? (
        <div className="sf-minicart__empty">
          <ShoppingCart size={28} />
          <p>Seu carrinho está vazio</p>
        </div>
      ) : (
        <>
          <ul className="sf-minicart__list">
            {items.map((item) => (
              <li key={item.product.id} className="sf-minicart__item">
                <div className="sf-minicart__info">
                  <span className="sf-minicart__name">{item.product.name}</span>
                  <span className="sf-minicart__price">
                    {fmtPrice(item.product.price)}
                  </span>
                </div>
                <div className="sf-minicart__controls">
                  <button
                    className="sf-qty-btn"
                    onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                    aria-label="Diminuir quantidade"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="sf-minicart__qty">{item.quantity}</span>
                  <button
                    className="sf-qty-btn"
                    onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                    aria-label="Aumentar quantidade"
                  >
                    <Plus size={14} />
                  </button>
                  <button
                    className="sf-qty-btn sf-qty-btn--danger"
                    onClick={() => onRemoveFromCart(item.product.id)}
                    aria-label="Remover produto"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div className="sf-minicart__footer">
            <div className="sf-minicart__subtotal">
              <span>Subtotal</span>
              <strong>{fmtPrice(subtotal)}</strong>
            </div>
            {/* Finaliza no fluxo existente do SaaS: entrega, retirada,
                endereço, frete, PIX, cartão, dinheiro, troco e Mercado Pago
                permanecem no checkout atual, intactos. */}
            <button
              className="sf-btn sf-btn--primary sf-minicart__checkout"
              onClick={() => {
                onClose()
                onCheckout()
              }}
            >
              Finalizar compra
            </button>
          </div>
        </>
      )}
    </div>
  )
}

const Header = ({
  data,
  searchQuery,
  onSearchChange,
  cartCount,
  cartItems,
  onRemoveFromCart,
  onUpdateQuantity,
  onCheckout,
}: {
  data: StorefrontData
  searchQuery: string
  onSearchChange: (q: string) => void
  cartCount: number
  cartItems: CartItem[]
  onRemoveFromCart: (productId: string) => void
  onUpdateQuantity: (productId: string, quantity: number) => void
  onCheckout: () => void
}) => {
  const [cartOpen, setCartOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!cartOpen) return
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setCartOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [cartOpen])

  return (
    <header className="sf-header" id="topo">
      <div className="sf-container sf-header__inner">
        <a href="#topo" className="sf-logo">
          {data.storeLogoUrl
            ? <img src={data.storeLogoUrl} alt={data.storeName} />
            : <span>{data.storeName}</span>}
        </a>
        {/* Busca interna: filtra storefront.products via onSearchChange */}
        <form
          className="sf-search"
          role="search"
          onSubmit={(e) => e.preventDefault()}
        >
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar produtos..."
            aria-label="Buscar produtos"
          />
          <button type="submit" aria-label="Buscar">
            <Search size={18} />
          </button>
        </form>
        <nav className="sf-header__actions">
          <a href="#conta" aria-label="Minha conta">
            <User size={20} />
          </a>
          <div className="sf-cart-wrap" ref={wrapRef}>
            <button
              className="sf-icon-btn"
              onClick={() => setCartOpen((o) => !o)}
              aria-label="Abrir carrinho"
            >
              <ShoppingCart size={20} />
              {cartCount > 0 && (
                <span className="sf-cart-badge">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </button>
            {cartOpen && (
              <MiniCart
                items={cartItems}
                onClose={() => setCartOpen(false)}
                onUpdateQuantity={onUpdateQuantity}
                onRemoveFromCart={onRemoveFromCart}
                onCheckout={onCheckout}
              />
            )}
          </div>
        </nav>
      </div>
    </header>
  )
}

const CategoryNav = ({ items, onSelect }: { items: { id: string; name: string }[]; onSelect: (id: string) => void }) => (
  <nav className="sf-catnav">
    <ul className="sf-container sf-catnav__list">
      <li><button type="button" onClick={() => onSelect('')} className="sf-catnav__button">Todos</button></li>
      {items.map((c) => (
        <li key={c.id}>
          <button type="button" onClick={() => onSelect(c.id)} className="sf-catnav__button">{c.name}</button>
        </li>
      ))}
    </ul>
  </nav>
)

/** Carrossel full-bleed — apenas banners clicáveis, sem texto sobreposto. */
const HeroCarousel = ({ banners }: { banners: string[] }) => {
  const [idx, setIdx] = useState(0)
  const timer = useRef<number | null>(null)

  useEffect(() => {
    if (banners.length <= 1) return
    timer.current = window.setInterval(
      () => setIdx((i) => (i + 1) % banners.length),
      5000
    )
    return () => {
      if (timer.current) window.clearInterval(timer.current)
    }
  }, [banners.length])

  return (
    <section className="sf-hero" aria-label="Banners da loja">
      <div className="sf-hero__viewport">
        <div
          className="sf-hero__slides"
          style={{ transform: `translateX(-${idx * 100}%)`, height: "100%" }}
        >
          {banners.map((url, i) =>
            url ? (
              <a
                key={i}
                href="#produtos"
                className="sf-hero__slide"
                style={{ backgroundImage: `url(${url})` }}
                role="img"
                aria-label={`Banner ${i + 1}`}
              />
            ) : (
              <a
                key={i}
                href="#produtos"
                className="sf-hero__slide sf-hero__slide--fallback"
                role="img"
                aria-label={`Banner ${i + 1}`}
              />
            )
          )}
        </div>
      </div>

      {banners.length > 1 && (
        <>
          <button
            className="sf-hero__arrow sf-hero__arrow--left"
            onClick={() => setIdx((i) => (i - 1 + banners.length) % banners.length)}
            aria-label="Banner anterior"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            className="sf-hero__arrow sf-hero__arrow--right"
            onClick={() => setIdx((i) => (i + 1) % banners.length)}
            aria-label="Próximo banner"
          >
            <ChevronRight size={20} />
          </button>
          <div className="sf-hero__dots">
            {banners.map((_, i) => (
              <button
                key={i}
                className={i === idx ? "sf-dot sf-dot--active" : "sf-dot"}
                onClick={() => setIdx(i)}
                aria-label={`Ir para banner ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}

/** Banner intermediário full-width entre seções (como na referência). */
const MidBanner = ({ url, alt }: { url: string | null; alt: string }) => (
  <section className="sf-midbanner">
    <a href="#produtos" aria-label={alt}>
      {url ? (
        <img className="sf-midbanner__img" src={url} alt={alt} loading="lazy" />
      ) : (
        <div className="sf-midbanner__fallback" role="img" aria-label={alt} />
      )}
    </a>
  </section>
)

/** Carrossel de banner individual (cada camada tem suas próprias imagens). */
const BannerCarousel = ({ images, alt }: { images: string[]; alt: string }) => {
  const [idx, setIdx] = useState(0)
  const timer = useRef<number | null>(null)

  useEffect(() => {
    if (images.length <= 1) return
    timer.current = window.setInterval(
      () => setIdx((i) => (i + 1) % images.length),
      5000
    )
    return () => {
      if (timer.current) window.clearInterval(timer.current)
    }
  }, [images.length])

  return (
    <section className="sf-midbanner sf-carousel" aria-label={alt}>
      <div className="sf-midbanner__frame">
        <div
          className="sf-midbanner__slides"
          style={{ transform: `translateX(-${idx * 100}%)` }}
        >
          {images.map((url, i) => (
            <a
              key={i}
              href="#produtos"
              className="sf-midbanner__slide"
              style={{ backgroundImage: `url(${url})` }}
              role="img"
              aria-label={`${alt} — imagem ${i + 1}`}
            />
          ))}
        </div>
        {images.length > 1 && (
          <>
            <button
              className="sf-hero__arrow sf-hero__arrow--left"
              onClick={() => setIdx((i) => (i - 1 + images.length) % images.length)}
              aria-label="Imagem anterior"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              className="sf-hero__arrow sf-hero__arrow--right"
              onClick={() => setIdx((i) => (i + 1) % images.length)}
              aria-label="Próxima imagem"
            >
              <ChevronRight size={20} />
            </button>
            <div className="sf-hero__dots">
              {images.map((_, i) => (
                <button
                  key={i}
                  className={i === idx ? "sf-dot sf-dot--active" : "sf-dot"}
                  onClick={() => setIdx(i)}
                  aria-label={`Ir para imagem ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  )
}

const ProductCard = ({
  product,
  shippingNote,
  onAddToCart,
  onViewProduct,
}: {
  product: StoreProduct
  shippingNote: string | null
  onAddToCart: (product: StoreProduct) => void
  onViewProduct?: (product: StoreProduct) => void
}) => {
  const available = isAvailable(product)
  const installments = installmentLine(product)

  return (
    <article className="sf-card">
      <div
        className="sf-card__media"
        role={onViewProduct ? 'button' : undefined}
        tabIndex={onViewProduct ? 0 : undefined}
        onClick={() => onViewProduct?.(product)}
        onKeyDown={(e) => {
          if (onViewProduct && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            onViewProduct(product)
          }
        }}
      >
        {!available ? (
          <span className="sf-card__badge sf-card__badge--out">Esgotado</span>
        ) : (
          shippingNote && (
            <span className="sf-card__badge sf-card__badge--free">{shippingNote}</span>
          )
        )}
        <SafeImage src={mainImage(product)} alt={product.name} />
      </div>
      <div className="sf-card__body">
        {product.category && (
          <span className="sf-card__brand">{product.category.name}</span>
        )}
        <h3
          className="sf-card__name"
          role={onViewProduct ? 'button' : undefined}
          tabIndex={onViewProduct ? 0 : undefined}
          onClick={() => onViewProduct?.(product)}
          onKeyDown={(e) => {
            if (onViewProduct && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault()
              onViewProduct(product)
            }
          }}
        >
          {product.name}
        </h3>
        <span className="sf-card__price">{fmtPrice(product.price)}</span>
        {installments && (
          <span className="sf-card__installments">{installments}</span>
        )}
        <button
          className="sf-btn sf-btn--primary sf-card__cta"
          disabled={!available}
          onClick={() => onAddToCart(product)}
        >
          {available ? "Comprar" : "Esgotado"}
        </button>
      </div>
    </article>
  )
}

const ProductSection = ({
  title,
  products,
  id,
  shippingNote,
  onAddToCart,
  onViewProduct,
}: {
  title: string | ReactNode
  products: StoreProduct[]
  id?: string
  shippingNote: string | null
  onAddToCart: (product: StoreProduct) => void
  onViewProduct?: (product: StoreProduct) => void
}) => {
  if (!products.length) return null
  return (
    <section className="sf-section sf-container" id={id}>
      <h2 className="sf-section__title">{title}</h2>
      <div className="sf-grid">
        {products.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            shippingNote={shippingNote}
            onAddToCart={onAddToCart}
            onViewProduct={onViewProduct}
          />
        ))}
      </div>
    </section>
  )
}

/** "navegue por categoria" — cards circulares com imagem do produto. */
const CategoryCards = ({ items, products, images, onSelect }: {
  items: { id: string; name: string }[]
  products: StoreProduct[]
  images: Record<string, string>
  onSelect: (id: string) => void
}) => {
  if (!items.length) return null
  return (
    <section className="sf-section sf-container" id="categorias">
      <h2 className="sf-section__title">
        <span className="sf-kicker">Coleções</span>
        Navegue por <strong>categoria</strong>
      </h2>
      <div className="sf-cats__row">
        {items.slice(0, 8).map((c) => {
          const withImage = products.find(
            (p) => p.category?.id === c.id && mainImage(p)
          )
          return (
            <button key={c.id} type="button" onClick={() => onSelect(c.id)} className="sf-cat-card">
              <div className="sf-cat-card__media">
                <SafeImage
                  src={images[c.id] || (withImage ? mainImage(withImage) : null)}
                  alt={c.name}
                />
              </div>
              <span className="sf-cat-card__name">{c.name}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

/** "Nossas marcas" — cards verticais (logo via imagem da categoria/produto). */
const BrandsSection = ({ items, products }: {
  items: { id: string; name: string }[]
  products: StoreProduct[]
}) => {
  if (!items.length) return null
  return (
    <section className="sf-section sf-container">
      <h2 className="sf-section__title">
        <span className="sf-kicker">Ateliê</span>
        Nossas <strong>marcas</strong>
      </h2>
      <div className="sf-brands__row">
        {items.slice(0, 7).map((c) => {
          const withImage = products.find(
            (p) => p.category?.id === c.id && mainImage(p)
          )
          return (
            <a key={c.id} href={`#categoria-${c.id}`} className="sf-brand-chip">
              <div className="sf-brand-chip__media">
                <SafeImage
                  src={withImage ? mainImage(withImage) : null}
                  alt={c.name}
                />
              </div>
              <span className="sf-brand-chip__name">{c.name}</span>
            </a>
          )
        })}
      </div>
    </section>
  )
}

const Testimonials = ({ items: configured }: { items: Array<{ name: string; text: string }> }) => {
  const items = configured.length > 0 ? configured : [
    { name: "Cliente A", text: "Produto original! Chegou direitinho e bem embalado! Estou super feliz com minha compra! 🥰" },
    { name: "Cliente B", text: "Encomenda super bem embalada, chegou rápido, produto perfeito, vendedora super atenciosa. Recomendo!" },
    { name: "Cliente C", text: "Produto recebido. Bem embalado, caixa perfumada e produto como o anúncio. Recomendo." },
    { name: "Cliente D", text: "O vendedor enviou super rápido. Chegou em poucos dias! É original. Tô super satisfeita." },
  ]
  return (
    <section className="sf-section sf-container">
      <h2 className="sf-section__title">Depoimentos</h2>
      <div className="sf-testimonials__row">
        {items.map((t, i) => (
          <blockquote key={i} className="sf-testimonial">
            <div className="sf-testimonial__stars">
              {Array.from({ length: 5 }).map((_, s) => (
                <Star key={s} size={14} fill="currentColor" />
              ))}
            </div>
            <p>“{t.text}”</p>
            <footer>Cliente: {t.name}</footer>
          </blockquote>
        ))}
      </div>
    </section>
  )
}

const About = ({ data }: { data: StorefrontData }) => (
  <section className="sf-section sf-about sf-container" id="sobre">
    <div className="sf-about__text">
      <h2 className="sf-section__title" style={{ textAlign: "left" }}>
        Sobre a {data.storeName}
      </h2>
      <p>{data.storeDescription}</p>
      {data.legalName && (
        <a className="sf-about__address" href="#sobre">
          <MapPin size={16} />
          {data.legalName}
        </a>
      )}
    </div>
    <div className="sf-about__media">
      <SafeImage src={data.storeLayout?.aboutImage || data.storeBannerUrl} alt={data.storeName} />
    </div>
  </section>
)

/** Banner de Instagram — link configurável, visual em fallback se sem imagem. */
const InstagramBanner = ({ data }: { data: StorefrontData }) => {
  if (!data.storeInstagramUrl) return null
  return (
    <section className="sf-insta">
      <a href={data.storeInstagramUrl} target="_blank" rel="noopener noreferrer">
        <SafeImage
          src={data.storeLayout?.instagramImage || data.storeBannerUrls[0] || null}
          alt={`Siga a ${data.storeName} no Instagram`}
        />
        <span className="sf-insta__overlay">
          <Link2 size={24} />
          Siga a {data.storeName} no Instagram
        </span>
      </a>
    </section>
  )
}

/** Faixa de benefícios — posição fixa: fim da página (como na referência). */
const BenefitsStrip = ({ shippingNote }: { shippingNote: string | null }) => {
  const items = [
    { icon: <Gift />, label: "Ganhe brindes", sub: "em compras selecionadas" },
    { icon: <Truck />, label: shippingNote ?? "Frete para todo o Brasil", sub: "envio rápido e rastreado" },
    { icon: <Lock />, label: "Compra 100% segura", sub: "seus dados protegidos" },
    { icon: <MessageCircle />, label: "Atendimento via WhatsApp", sub: "segunda a sábado" },
  ]
  return (
    <section className="sf-benefits">
      <ul className="sf-container sf-benefits__list">
        {items.map((b, i) => (
          <li key={i} className="sf-benefits__item">
            {b.icon}
            <span className="sf-benefits__label">
              {b.label}
              <small>{b.sub}</small>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

const Contact = ({ data }: { data: StorefrontData }) => (
  <section className="sf-section sf-contact sf-container" id="contato">
    <h2 className="sf-section__title">Fale conosco</h2>
    <div className="sf-contact__row">
      {data.storeWhatsappNumber && (
        <a
          className="sf-btn sf-btn--primary"
          href={`https://wa.me/${data.storeWhatsappNumber}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <MessageCircle size={18} />
          WhatsApp
        </a>
      )}
      {data.storeInstagramUrl && (
        <a href={data.storeInstagramUrl} target="_blank" rel="noopener noreferrer">
          <Link2 size={18} />
          Instagram
        </a>
      )}
      {data.storeFacebookUrl && (
        <a href={data.storeFacebookUrl} target="_blank" rel="noopener noreferrer">
          <Link2 size={18} />
          Facebook
        </a>
      )}
      {data.storeTiktokUrl && (
        <a href={data.storeTiktokUrl} target="_blank" rel="noopener noreferrer">
          TikTok
        </a>
      )}
    </div>
  </section>
)

const Footer = ({ data }: { data: StorefrontData }) => (
  <footer className="sf-footer">
    <div className="sf-container sf-footer__inner">
      <div>
        <strong>{data.storeName}</strong>
        {data.legalName && <p>{data.legalName}</p>}
      </div>
      <p>© {new Date().getFullYear()} {data.storeName}. Todos os direitos reservados.</p>
    </div>
  </footer>
)

/** Botão flutuante de WhatsApp — comportamento da referência. */
const WhatsAppFloat = ({ number }: { number: string | null }) => {
  if (!number) return null
  return (
    <a
      className="sf-wa-float"
      href={`https://wa.me/${number}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Fale conosco pelo WhatsApp"
    >
      <MessageCircle size={28} />
    </a>
  )
}

// ------------------------------------------------------------
// 5. TEMPLATE PRINCIPAL — hierarquia fixa (espelha a referência)
// promoção → header → menu → carrossel full-bleed → seção em
// destaque → banner intermediário → catálogo → navegue por
// categoria → marcas → depoimentos → sobre → Instagram →
// benefícios → contato → rodapé → WhatsApp flutuante
// ------------------------------------------------------------

export function StorefrontTemplate({
  storefront,
  cartItems,
  onAddToCart,
  onRemoveFromCart,
  onUpdateQuantity,
  onCheckout,
  onViewProduct,
}: StorefrontTemplateProps) {
  // Busca interna sobre storefront.products — nenhum estado paralelo de carrinho
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("")

  const cats = useMemo(() => categoriesOf(storefront), [storefront])

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const categoryProducts = selectedCategory ? storefront.products.filter((p) => p.category?.id === selectedCategory) : storefront.products
    if (!q) return categoryProducts
    return categoryProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.description?.toLowerCase().includes(q) ?? false) ||
        (p.category?.name.toLowerCase().includes(q) ?? false)
    )
  }, [storefront, searchQuery, selectedCategory])

  // Seção curada: produtos com highlights preenchido
  const featured = useMemo(
    () =>
      filtered
        .filter((p) => p.highlights && p.highlights.trim().length > 0)
        .slice(0, 8),
    [filtered]
  )

  // Carrossel: todos os banners; banner intermediário: storeBannerUrl
  const heroBanners = useMemo(() => {
    if (storefront.storeBannerUrls?.length) return storefront.storeBannerUrls
    if (storefront.storeBannerUrl) return [storefront.storeBannerUrl]
    return [""] // "" → fallback visual local (gradiente), sem API externa
  }, [storefront])

  const cartCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  )

  // Cores configuráveis como CSS custom properties
  const rootRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    if (storefront.storePrimaryColor)
      root.style.setProperty("--sf-primary", storefront.storePrimaryColor)
    if (storefront.storeSecondaryColor)
      root.style.setProperty("--sf-secondary", storefront.storeSecondaryColor)
  }, [storefront.storePrimaryColor, storefront.storeSecondaryColor])

  const searching = searchQuery.trim().length > 0
  const visibility = storefront.storeLayout?.sectionVisibility ?? {}
  const selectCategory = (id: string) => {
    setSelectedCategory(id)
    document.getElementById('produtos')?.scrollIntoView({ behavior: 'smooth' })
  }

  // Sistema de camadas: ordem configurável das seções + carrosséis intercalados
  const sectionsOrder = storefront.storeLayout?.sections ?? []
  const bannerCarousels = storefront.storeLayout?.bannerCarousels ?? []
  const carouselAfter: Record<string, string[]> = {}
  bannerCarousels.forEach((carousel) => {
    const anchor = carousel.id.startsWith('after-') ? carousel.id.slice(6) : ''
    if (anchor) carouselAfter[anchor] = carousel.images
  })
  const carouselList = bannerCarousels.filter((carousel) => !carousel.id.startsWith('after-'))
  const sectionLabels: Record<string, string> = {
    featured: 'Produtos em destaque',
    catalog: 'Catálogo completo',
    categories: 'Categorias',
    brands: 'Marcas',
    testimonials: 'Depoimentos',
    about: 'Sobre a loja',
    instagram: 'Instagram',
    benefits: 'Benefícios',
    contact: 'Contato',
  }

  const renderSection = (key: string) => {
    switch (key) {
      case 'featured':
        return visibility.featured !== false ? (
          <ProductSection
            id="produtos"
            title={<><span className="sf-kicker">Seleção da casa</span>Produtos em <strong>destaque</strong></>}
            products={featured}
            shippingNote={storefront.storeShippingNote}
            onAddToCart={onAddToCart}
            onViewProduct={onViewProduct}
          />
        ) : null
      case 'catalog':
        return visibility.catalog !== false ? (
          <ProductSection
            title={<><span className="sf-kicker">Vitrine</span>Catálogo completo</>}
            products={filtered}
            shippingNote={storefront.storeShippingNote}
            onAddToCart={onAddToCart}
            onViewProduct={onViewProduct}
          />
        ) : null
      case 'categories':
        return visibility.categories !== false ? <CategoryCards items={cats} products={storefront.products} images={storefront.storeLayout?.categoryImages ?? {}} onSelect={selectCategory} /> : null
      case 'brands':
        return visibility.brands !== false ? <BrandsSection items={cats} products={storefront.products} /> : null
      case 'testimonials':
        return visibility.testimonials !== false ? <Testimonials items={storefront.storeLayout?.testimonials ?? []} /> : null
      case 'about':
        return visibility.about !== false ? <About data={storefront} /> : null
      case 'instagram':
        return visibility.instagram !== false ? <InstagramBanner data={storefront} /> : null
      case 'benefits':
        return visibility.benefits !== false ? <BenefitsStrip shippingNote={storefront.storeShippingNote} /> : null
      case 'contact':
        return visibility.contact !== false ? <Contact data={storefront} /> : null
      default:
        return null
    }
  }

  const renderLayer = (key: string, index: number) => {
    const nodes: ReactNode[] = []
    const section = renderSection(key)
    if (section) nodes.push(<Fragment key={`layer-${key}-${index}`}>{section}</Fragment>)
    const after = carouselAfter[key]
    if (after?.length) {
      nodes.push(<BannerCarousel key={`carousel-${key}-${index}`} images={after} alt={`Banner após ${sectionLabels[key] ?? key}`} />)
    }
    return nodes
  }

  return (
    <div className="sf-root" ref={rootRef}>
      <style>{CSS}</style>

      <PromoBar text={storefront.storeBadgeText} />

      <Header
        data={storefront}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        cartCount={cartCount}
        cartItems={cartItems}
        onRemoveFromCart={onRemoveFromCart}
        onUpdateQuantity={onUpdateQuantity}
        onCheckout={onCheckout}
      />

      <CategoryNav items={cats} onSelect={selectCategory} />

      <HeroCarousel banners={heroBanners} />

      {searching ? (
        <ProductSection
          id="produtos"
          title={filtered.length ? `Resultados para "${searchQuery.trim()}"` : "Nenhum produto encontrado"}
          products={filtered}
          shippingNote={storefront.storeShippingNote}
          onAddToCart={onAddToCart}
          onViewProduct={onViewProduct}
        />
      ) : (
        <>
          {sectionsOrder.length > 0 ? (
            <>
              {sectionsOrder.flatMap((key, index) => renderLayer(key, index))}
              {carouselList.filter((carousel) => carousel.images.length > 0).map((carousel) => (
                <BannerCarousel key={carousel.id} images={carousel.images} alt="Banner da loja" />
              ))}
            </>
          ) : (
            <>
              {renderLayer('featured', 0)}
              <MidBanner
                url={storefront.storeBannerUrl}
                alt={`Banner de ${storefront.storeName}`}
              />
              {renderLayer('catalog', 1)}
              {renderLayer('categories', 2)}
              {renderLayer('brands', 3)}
              {renderLayer('testimonials', 4)}
              {renderLayer('about', 5)}
              {renderLayer('instagram', 6)}
            </>
          )}
        </>
      )}

      {visibility.benefits !== false && <BenefitsStrip shippingNote={storefront.storeShippingNote} />}

      {visibility.contact !== false && <Contact data={storefront} />}

      <Footer data={storefront} />

      <WhatsAppFloat number={storefront.storeWhatsappNumber} />
    </div>
  )
}