'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { X, Package, Tag, DollarSign, Hash, Layers, Plus, Camera, Trash2, ArrowUp, ArrowDown } from 'lucide-react'
import { updateProduct, deleteProduct, createCategory, archiveProduct, addProductImage, removeProductImage, reorderProductImages } from '@/lib/actions'

interface Category { id: string; name: string }
interface Product {
  id: string; name: string; sku: string; size: string | null; color: string | null; purchaseCost: number; price: number
  stockQty: number; minStock: number; status: string
  ncm?: string | null; cfop?: string | null; cest?: string | null
  categoryId: string | null; category: Category | null
  isBox?: boolean
  unitsPerBox?: number | null
  description?: string | null
  highlights?: string | null
  images?: Array<{ id: string; imageUrl: string; displayOrder: number }>
}

interface Props {
  product: Product
  categories: Category[]
  existingProducts: Array<{ id: string; sku: string }>
  onClose: () => void
  onSuccess: () => void
}

function normalizeSku(sku: string) {
  return sku.trim()
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem selecionada.'))
    reader.readAsDataURL(file)
  })
}

export function EditProductModal({ product, categories, existingProducts, onClose, onSuccess }: Props) {
  const [isPending, startTransition] = useTransition()
  const [isDeleting, startDeleteTransition] = useTransition()
  const [isCreatingCategory, startCategoryTransition] = useTransition()
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deletionBlockedReason, setDeletionBlockedReason] = useState<string | null>(null)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [images, setImages] = useState(product.images ?? [])
  const [isSavingImages, startSaveImagesTransition] = useTransition()
  const [form, setForm] = useState({
    name: product.name,
    sku: product.sku,
    ncm: product.ncm ?? '',
    cfop: product.cfop ?? '',
    cest: product.cest ?? '',
    size: product.size ?? '',
    color: product.color ?? '',
    purchaseCost: (product.purchaseCost ?? '').toString(),
    price: product.price.toString(),
    stockQty: product.stockQty.toString(),
    minStock: product.minStock.toString(),
    categoryId: product.categoryId ?? '',
    isBox: (product as any).isBox ?? false,
    unitsPerBox: (product as any).unitsPerBox ? String((product as any).unitsPerBox) : '',
    storePublished: (product as any).storePublished ?? true,
    description: product.description ?? '',
    highlights: product.highlights ?? '',
  })

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    try {
      const converted = await Promise.all(Array.from(files).map((file) => readFileAsDataUrl(file)))

      startSaveImagesTransition(async () => {
        try {
          const created = await Promise.all(converted.map((src) => addProductImage(product.id, src)))
          setImages((current) => [...current, ...created].sort((a, b) => a.displayOrder - b.displayOrder))
          onSuccess()
        } catch (err: any) {
          setError(err.message || 'Erro ao adicionar imagem.')
        }
      })
    } catch (err: any) {
      setError(err.message || 'Erro ao ler a imagem selecionada.')
    }
  }

  const handleRemoveImage = (imageId: string) => {
    startSaveImagesTransition(async () => {
      try {
        await removeProductImage(imageId)
        setImages((current) => current.filter((image) => image.id !== imageId))
        onSuccess()
      } catch (err: any) {
        setError(err.message || 'Erro ao remover imagem.')
      }
    })
  }

  const handleMoveImage = (imageId: string, direction: 'up' | 'down') => {
    const currentIndex = images.findIndex((image) => image.id === imageId)
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= images.length) return

    const nextImages = [...images]
    const [movingImage] = nextImages.splice(currentIndex, 1)
    nextImages.splice(targetIndex, 0, movingImage)
    setImages(nextImages)

    startSaveImagesTransition(async () => {
      try {
        await reorderProductImages(product.id, nextImages.map((image) => image.id))
        onSuccess()
      } catch (err: any) {
        setError(err.message || 'Erro ao reorganizar imagens.')
      }
    })
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement
    if (type === 'checkbox') {
      setForm({ ...form, [name]: (e.target as HTMLInputElement).checked })
      return
    }
    setForm({ ...form, [name]: value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const normalizedSku = normalizeSku(form.sku)
    const originalSku = normalizeSku(product.sku)
    
    // Só valida duplicata se o SKU foi alterado
    if (normalizedSku !== originalSku) {
      const duplicateExists = existingProducts.some((current) => current.id !== product.id && normalizeSku(current.sku) === normalizedSku)
      if (duplicateExists) {
        setError(`Não foi possível salvar: o código "${normalizedSku}" já está cadastrado em outro produto. Informe um código diferente.`)
        return
      }
    }

    startTransition(async () => {
      try {
        await updateProduct(product.id, {
          name: form.name,
          sku: form.sku,
          ncm: form.ncm || undefined,
          cfop: form.cfop || undefined,
          cest: form.cest || undefined,
          size: form.size || undefined,
          color: form.color || undefined,
          description: form.description || undefined,
          highlights: form.highlights || undefined,
          purchaseCost: form.purchaseCost ? parseFloat(form.purchaseCost) : undefined,
          price: parseFloat(form.price),
          stockQty: parseInt(form.stockQty),
          isBox: Boolean(form.isBox),
          unitsPerBox: form.unitsPerBox ? parseInt(form.unitsPerBox) : undefined,
          minStock: parseInt(form.minStock),
          categoryId: form.categoryId || undefined,
          storePublished: Boolean(form.storePublished),
        })
        onSuccess()
        onClose()
      } catch (err: any) {
        const message = err?.message || ''
        if (message.includes('An error occurred in the Server Components render')) {
          setError(`Não foi possível salvar: o código "${normalizedSku}" já está cadastrado em outro produto. Informe um código diferente.`)
          return
        }
        setError(message || 'Erro ao atualizar produto.')
      }
    })
  }

  const handleDelete = () => {
    startDeleteTransition(async () => {
      try {
        const res: any = await deleteProduct(product.id)
        if (res && res.ok === false) {
          setDeletionBlockedReason(res.reason || null)
          setError(res.reason || 'Erro ao excluir produto.')
          return
        }
        onSuccess()
        onClose()
      } catch (err: any) {
        setError(err.message || 'Erro ao excluir produto.')
      }
    })
  }

  const handleArchive = () => {
    startDeleteTransition(async () => {
      try {
        await archiveProduct(product.id)
        onSuccess()
        onClose()
      } catch (err: any) {
        setError(err.message || 'Erro ao arquivar produto.')
      }
    })
  }

  const handleCreateCategory = () => {
    const categoryName = newCategoryName.trim()
    if (!categoryName) {
      setError('Informe o nome da categoria.')
      return
    }

    setError('')
    startCategoryTransition(async () => {
      try {
        const category = await createCategory(categoryName)
        setForm(current => ({ ...current, categoryId: category.id }))
        setNewCategoryName('')
        onSuccess()
      } catch (err: any) {
        setError(err.message || 'Erro ao criar categoria.')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-lg">Editar produto</h2>
              <p className="text-xs text-muted-foreground font-mono">{product.sku}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {error && <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3">{error}</p>}

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Nome do produto</label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input name="name" required value={form.name} onChange={handleChange}
                className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">SKU interno</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input name="sku" required value={form.sku} onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm font-mono outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Valor de compra (R$)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input name="purchaseCost" type="number" step="0.01" min="0" required value={form.purchaseCost} onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Preço (R$)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input name="price" type="number" step="0.01" min="0" required value={form.price} onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Preço de compra (R$) - opcional</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input name="purchaseCost" type="number" step="0.01" min="0" value={form.purchaseCost} onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Estoque mínimo</label>
              <div className="relative">
                <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input name="minStock" type="number" min="0" required value={form.minStock} onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">NCM</label>
              <input
                name="ncm"
                value={form.ncm}
                onChange={handleChange}
                placeholder="Ex: 85044030"
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm font-mono outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">CFOP</label>
              <input
                name="cfop"
                value={form.cfop}
                onChange={handleChange}
                placeholder="Ex: 5102"
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm font-mono outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">CEST (opcional)</label>
            <input
              name="cest"
              value={form.cest}
              onChange={handleChange}
              placeholder="Ex: 0100100"
              className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm font-mono outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Descrição (para a loja online)</label>
            <textarea
              name="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Descreva o produto para o cliente da loja online"
              rows={3}
              className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all resize-none"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Destaques (para a loja online)</label>
            <textarea
              name="highlights"
              value={form.highlights}
              onChange={(e) => setForm({ ...form, highlights: e.target.value })}
              placeholder="Principais características e benefícios"
              rows={3}
              className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all resize-none"
            />
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Fotos do produto</p>
                <p className="text-xs text-muted-foreground">A primeira imagem aparece como destaque na vitrine pública.</p>
              </div>
              <Camera className="w-4 h-4 text-muted-foreground" />
            </div>

            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => void handleImageUpload(event.target.files)}
              className="text-sm"
            />

            {images.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {images.map((image, index) => (
                  <div key={image.id} className="relative overflow-hidden rounded-lg border border-border bg-background">
                    <div className="relative aspect-square">
                      <Image src={image.imageUrl} alt={`${product.name} ${index + 1}`} fill className="object-cover" unoptimized />
                    </div>
                    <div className="flex items-center justify-between gap-2 p-2">
                      <span className="text-xs text-muted-foreground">Foto {index + 1}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleMoveImage(image.id, 'up')}
                          disabled={index === 0 || isSavingImages}
                          className="rounded-md border border-border p-1.5 hover:bg-muted disabled:opacity-50"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveImage(image.id, 'down')}
                          disabled={index === images.length - 1 || isSavingImages}
                          className="rounded-md border border-border p-1.5 hover:bg-muted disabled:opacity-50"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(image.id)}
                          disabled={isSavingImages}
                          className="rounded-md border border-destructive/30 p-1.5 text-destructive hover:bg-destructive/10 disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Nenhuma foto cadastrada ainda.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Variação</label>
              <input
                name="size"
                value={form.size}
                onChange={handleChange}
                placeholder="Ex: 500 ml, P, 50 cm, Único"
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Cor</label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  name="color"
                  value={form.color}
                  onChange={handleChange}
                  placeholder="Ex: Vermelho, Azul"
                  className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all"
                />

              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Qtd. em estoque</label>
              <div className="relative">
                <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input name="stockQty" type="number" min="0" required value={form.stockQty} onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Ponto de reposição</label>
              <div className="relative">
                <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input name="minStock" type="number" min="0" required value={form.minStock} onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all" />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Linha / Categoria</label>
            <select name="categoryId" value={form.categoryId} onChange={handleChange}
              className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all">
              <option value="">Sem categoria</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <label className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm">
            <input
              type="checkbox"
              name="storePublished"
              checked={Boolean(form.storePublished)}
              onChange={handleChange}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
            />
            <span>
              <span className="block font-medium">Exibir na loja online</span>
              <span className="block text-xs text-muted-foreground">Quando desmarcado, o produto não aparece na vitrine pública.</span>
            </span>
          </label>

          <div className="rounded-lg border border-border bg-muted/20 p-3 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Criar nova categoria</p>
                <p className="text-xs text-muted-foreground">Adicione uma categoria sem sair da edição.</p>
              </div>
              <Plus className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                placeholder="Ex: Eletrônicos, limpeza, escritório"
                className="flex-1 px-4 py-2.5 bg-background border border-border rounded-lg text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-all"
              />
              <button
                type="button"
                onClick={handleCreateCategory}
                disabled={isCreatingCategory || !newCategoryName.trim()}
                className="px-4 py-2.5 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors disabled:opacity-60"
              >
                {isCreatingCategory ? 'Criando...' : 'Criar'}
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            {confirmDelete ? (
              <>
                <span className="flex-1 text-sm text-destructive flex items-center">Confirmar exclusão?</span>
                <button type="button" onClick={() => setConfirmDelete(false)}
                  className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted transition-colors">
                  Não
                </button>
                <button type="button" onClick={handleDelete} disabled={isDeleting}
                  className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-semibold hover:bg-destructive/90 transition-colors disabled:opacity-60">
                  {isDeleting ? 'Excluindo...' : 'Sim, Excluir'}
                </button>
                {deletionBlockedReason && (
                  <button type="button" onClick={handleArchive} disabled={isDeleting}
                    className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-semibold hover:bg-secondary/90 transition-colors disabled:opacity-60">
                    {isDeleting ? 'Processando...' : 'Arquivar em vez de excluir'}
                  </button>
                )}
              </>
            ) : (
              <>
                <button type="button" onClick={() => setConfirmDelete(true)}
                  className="px-4 py-2 border border-destructive/40 text-destructive rounded-lg text-sm font-medium hover:bg-destructive/10 transition-colors">
                  Excluir
                </button>
                <button type="submit" disabled={isPending}
                  className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25 disabled:opacity-60">
                  {isPending ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
