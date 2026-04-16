'use client'

import { useState, useMemo, useCallback } from 'react'
import { Plus, Search, Filter, Edit2, Package, ChevronLeft, ChevronRight } from 'lucide-react'
import { ProductModal } from '@/components/ProductModal'
import { EditProductModal } from '@/components/EditProductModal'
import { useRouter } from 'next/navigation'

interface Category { id: string; name: string }
interface Product {
  id: string; name: string; sku: string; size: string | null; color: string | null; price: number
  stockQty: number; minStock: number; status: string
  categoryId: string | null; category: Category | null
}

const STATUS_COLORS: Record<string, string> = {
  Normal: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  Baixo: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  Crítico: 'bg-destructive/10 text-destructive border-destructive/20',
  Esgotado: 'bg-destructive/10 text-destructive border-destructive/20',
}

const STATUS_OPTIONS = ['todos', 'Normal', 'Baixo', 'Crítico', 'Esgotado']
const PAGE_SIZE = 10

export function EstoqueClient({ initialProducts, categories, defaultMinStock }: { initialProducts: Product[]; categories: Category[]; defaultMinStock: number }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('todos')
  const [showCreate, setShowCreate] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    return initialProducts.filter(p => {
      const matchSearch = !search || [p.name, p.sku, p.size ?? '', p.color ?? '', p.category?.name ?? ''].some(field => field.toLowerCase().includes(search.toLowerCase()))
      const matchStatus = statusFilter === 'todos' || p.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [initialProducts, search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleSuccess = useCallback(() => {
    router.refresh()
  }, [router])

  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  return (
    <>
      {showCreate && (
        <ProductModal
          categories={categories}
          defaultMinStock={defaultMinStock}
          onClose={() => setShowCreate(false)}
          onSuccess={handleSuccess}
        />
      )}
      {editingProduct && (
        <EditProductModal
          product={editingProduct}
          categories={categories}
          onClose={() => setEditingProduct(null)}
          onSuccess={handleSuccess}
        />
      )}

      <div className="flex flex-col gap-6 h-full">
        {/* Cabeçalho */}
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Produtos e variações</h1>
            <p className="text-muted-foreground mt-1">
              {filtered.length} item{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/api/export/products"
              className="border border-border hover:bg-muted text-foreground px-4 py-2.5 rounded-lg flex items-center gap-2 font-medium transition-colors"
            >
              Exportar CSV
            </a>
            <button
              id="btn-novo-produto"
              onClick={() => setShowCreate(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2.5 rounded-lg flex items-center gap-2 font-medium transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40 active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              Novo Produto
            </button>
          </div>
        </div>

        {/* Tabela */}
        <div className="bg-card border border-border rounded-xl shadow-sm flex flex-col flex-1">
          {/* Filtros */}
          <div className="p-4 border-b border-border flex flex-wrap gap-3 bg-muted/10 rounded-t-xl">
            <div className="flex-1 min-w-48 flex items-center bg-background rounded-lg px-3 py-2 border border-border focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
              <Search className="w-4 h-4 text-muted-foreground mr-2 shrink-0" />
              <input
                id="search-products"
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Buscar por nome, SKU ou categoria..."
                className="bg-transparent border-none outline-none text-sm w-full placeholder:text-muted-foreground"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              {STATUS_OPTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => { setStatusFilter(s); setPage(1) }}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${
                    statusFilter === s
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-background border border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {s === 'todos' ? 'Todos' : s}
                </button>
              ))}
            </div>
          </div>

          {/* Tabela */}
          <div className="overflow-x-auto flex-1">
            {paginated.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Package className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-lg font-medium">Nenhum produto encontrado</p>
                <p className="text-sm mt-1">Tente ajustar os filtros ou cadastre um novo produto.</p>
              </div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted/30 text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-6 py-4 font-semibold tracking-wider">Produto</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">SKU interno</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Variação</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Cor</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Categoria</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Preço de venda</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Qtd. em estoque</th>
                    <th className="px-6 py-4 font-semibold tracking-wider">Situação</th>
                    <th className="px-6 py-4 font-semibold tracking-wider text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginated.map((p) => (
                    <tr key={p.id} className="bg-transparent hover:bg-muted/30 transition-colors group">
                      <td className="px-6 py-4 font-medium text-foreground max-w-[220px] truncate" title={p.name}>{p.name}</td>
                      <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{p.sku}</td>
                      <td className="px-6 py-4">
                        {p.size ? (
                          <span className="px-2 py-1 rounded-md border border-primary/20 bg-primary/10 text-xs font-semibold text-primary">{p.size}</span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {p.color ? (
                          <span className="text-xs font-medium text-foreground">{p.color}</span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {p.category ? (
                          <span className="px-2 py-1 bg-secondary rounded-md text-xs font-medium text-secondary-foreground">{p.category.name}</span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-medium text-muted-foreground">{formatCurrency(p.price)}</td>
                      <td className="px-6 py-4">
                        <span className={`font-bold text-base ${p.stockQty === 0 ? 'text-destructive' : p.stockQty <= p.minStock ? 'text-amber-500' : 'text-foreground'}`}>
                          {p.stockQty}
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">/ mín {p.minStock}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_COLORS[p.status] ?? ''}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => setEditingProduct(p)}
                          className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          title="Editar produto"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Paginação */}
          <div className="p-4 border-t border-border flex justify-between items-center text-sm text-muted-foreground bg-muted/10 rounded-b-xl">
            <span>
              Mostrando {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length} itens
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-md border border-border hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1).map((n, i, arr) => (
                <span key={n} className="flex items-center gap-2">
                  {i > 0 && arr[i - 1] !== n - 1 && <span className="px-1 text-muted-foreground">…</span>}
                  <button
                    onClick={() => setPage(n)}
                    className={`px-3 py-1.5 rounded-md border text-xs font-medium transition-colors ${
                      page === n ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted'
                    }`}
                  >
                    {n}
                  </button>
                </span>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-md border border-border hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
