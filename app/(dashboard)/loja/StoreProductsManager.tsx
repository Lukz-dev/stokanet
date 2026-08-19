'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { Eye, EyeOff, ImagePlus, Loader2, Trash2 } from 'lucide-react'
import { addStoreProductImage, removeStoreProductImage, setStoreProductPublished } from '@/lib/store-actions'

type Product = {
  id: string
  name: string
  sku: string
  price: number
  stockQty: number
  minStock: number
  status: string
  storePublished: boolean
  images: Array<{ id: string; imageUrl: string; displayOrder: number }>
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'))
    reader.readAsDataURL(file)
  })
}

export function StoreProductsManager({ products }: { products: Product[] }) {
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  const togglePublished = (product: Product) => {
    setError('')
    setPendingId(product.id)
    startTransition(async () => {
      try {
        await setStoreProductPublished(product.id, !product.storePublished)
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : 'Não foi possível atualizar o produto.')
      } finally {
        setPendingId(null)
      }
    })
  }

  const uploadImage = (productId: string, file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Escolha um arquivo de imagem.')
      return
    }
    if (file.size > 1_500_000) {
      setError('A imagem deve ter no máximo 1,5 MB.')
      return
    }

    setError('')
    setPendingId(productId)
    startTransition(async () => {
      try {
        await addStoreProductImage(productId, await fileToDataUrl(file))
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : 'Não foi possível adicionar a foto.')
      } finally {
        setPendingId(null)
      }
    })
  }

  const removeImage = (productId: string, imageId: string) => {
    setPendingId(productId)
    startTransition(async () => {
      try {
        await removeStoreProductImage(productId, imageId)
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : 'Não foi possível remover a foto.')
      } finally {
        setPendingId(null)
      }
    })
  }

  return (
    <div className="space-y-4">
      {error && <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
      <div className="overflow-hidden rounded-xl border border-border">
        <div className="divide-y divide-border">
          {products.map((product) => {
            const busy = isPending && pendingId === product.id
            return (
              <div key={product.id} className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:gap-6">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
                    {product.images[0] ? <Image src={product.images[0].imageUrl} alt={product.name} width={64} height={64} unoptimized className="h-full w-full object-cover" /> : <ImagePlus className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.sku} • {product.stockQty} em estoque</p>
                    <p className="mt-1 text-xs text-muted-foreground">{product.images.length} foto{product.images.length === 1 ? '' : 's'}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {product.images.slice(0, 4).map((image) => (
                    <div key={image.id} className="group relative h-10 w-10 overflow-hidden rounded border border-border">
                      <Image src={image.imageUrl} alt="" width={40} height={40} unoptimized className="h-full w-full object-cover" />
                      <button type="button" title="Remover foto" onClick={() => removeImage(product.id, image.id)} className="absolute inset-0 hidden items-center justify-center bg-black/60 text-white group-hover:flex"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  ))}
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted">
                    <ImagePlus className="h-4 w-4" /> Adicionar foto
                    <input type="file" accept="image/*" className="sr-only" disabled={busy} onChange={(event) => { uploadImage(product.id, event.target.files?.[0]); event.currentTarget.value = '' }} />
                  </label>
                </div>

                <button type="button" disabled={busy || product.status === 'Arquivado'} onClick={() => togglePublished(product)} className={`inline-flex min-w-36 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${product.storePublished ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : product.storePublished ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  {product.storePublished ? 'Publicado na loja' : 'Oculto da loja'}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}