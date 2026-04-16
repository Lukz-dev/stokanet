'use client'

import { useState, useTransition } from 'react'
import { X, Package, Tag, DollarSign, Hash, Layers, Plus } from 'lucide-react'
import { updateProduct, deleteProduct, createCategory } from '@/lib/actions'

interface Category { id: string; name: string }
interface Product {
  id: string; name: string; sku: string; size: string | null; color: string | null; price: number
  stockQty: number; minStock: number; status: string
  categoryId: string | null; category: Category | null
}

interface Props {
  product: Product
  categories: Category[]
  onClose: () => void
  onSuccess: () => void
}

export function EditProductModal({ product, categories, onClose, onSuccess }: Props) {
  const [isPending, startTransition] = useTransition()
  const [isDeleting, startDeleteTransition] = useTransition()
  const [isCreatingCategory, startCategoryTransition] = useTransition()
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [form, setForm] = useState({
    name: product.name,
    sku: product.sku,
    size: product.size ?? '',
    color: product.color ?? '',
    price: product.price.toString(),
    stockQty: product.stockQty.toString(),
    minStock: product.minStock.toString(),
    categoryId: product.categoryId ?? '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    startTransition(async () => {
      try {
        await updateProduct(product.id, {
          name: form.name,
          sku: form.sku,
          size: form.size || undefined,
          color: form.color || undefined,
          price: parseFloat(form.price),
          stockQty: parseInt(form.stockQty),
          minStock: parseInt(form.minStock),
          categoryId: form.categoryId || undefined,
        })
        onSuccess()
        onClose()
      } catch (err: any) {
        setError(err.message || 'Erro ao atualizar produto.')
      }
    })
  }

  const handleDelete = () => {
    startDeleteTransition(async () => {
      try {
        await deleteProduct(product.id)
        onSuccess()
        onClose()
      } catch (err: any) {
        setError(err.message || 'Erro ao excluir produto.')
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
                  placeholder="Ex: Preto, branco, azul"
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
