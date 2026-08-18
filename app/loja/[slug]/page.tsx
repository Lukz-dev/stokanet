import prisma from '@/lib/prisma'
import { getStorefrontBySlug } from '@/lib/storefront'
import { EnhancedStorefrontClient } from './enhanced-storefront-client'

type RouteParams = {
  params: Promise<{ slug: string }>
}

export default async function PublicStorefrontPage({ params }: RouteParams) {
  const { slug } = await params
  const storefront = await getStorefrontBySlug(slug)

  if (!storefront) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-6">
        <div className="max-w-lg rounded-3xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-xl">
          <p className="text-xs uppercase tracking-[0.3em] text-white/45">Loja não encontrada</p>
          <h1 className="mt-3 text-3xl font-semibold">Esta loja não está disponível</h1>
          <p className="mt-3 text-sm text-white/65">Verifique a URL ou peça ao lojista para ativar a vitrine pública.</p>
        </div>
      </div>
    )
  }

  return <EnhancedStorefrontClient storefront={storefront} />
}