'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { CreditCard, Plus, ScanLine, Trash2 } from 'lucide-react'
import { completeSale, findProductByCode } from '@/lib/actions'
import { useRouter } from 'next/navigation'

type Product = {
  id: string
  name: string
  sku: string
  price: number
  stockQty: number
  size: string | null
  color: string | null
}

type Sale = {
  id: string
  code: string
  subtotal: number
  discount: number
  total: number
  paymentMethod: string | null
  createdAt: string
  items: Array<{
    id: string
    productName: string
    sku: string
    quantity: number
    unitPrice: number
    total: number
  }>
}

type CartItem = {
  productId: string
  sku: string
  name: string
  unitPrice: number
  stockQty: number
  quantity: number
}

export function CaixaClient({ products, initialSales }: { products: Product[]; initialSales: Sale[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [code, setCode] = useState('')
  const [discount, setDiscount] = useState('0')
  const [paymentMethod, setPaymentMethod] = useState('DINHEIRO')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [scannerModeEnabled, setScannerModeEnabled] = useState(true)
  const [cart, setCart] = useState<CartItem[]>([])
  const scannerInputRef = useRef<HTMLInputElement | null>(null)
  const scannerBufferRef = useRef('')
  const lastKeyAtRef = useRef(0)

  const subtotal = useMemo(() => cart.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0), [cart])
  const parsedDiscount = Math.max(0, Number(discount) || 0)
  const boundedDiscount = Math.min(parsedDiscount, subtotal)
  const total = Math.max(0, subtotal - boundedDiscount)

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

  const addProductToCart = useCallback((product: Product) => {
    if (product.stockQty <= 0) {
      setError('Este produto está sem estoque.')
      return
    }

    setCart((current) => {
      const existing = current.find((item) => item.productId === product.id)
      if (!existing) {
        return [...current, {
          productId: product.id,
          sku: product.sku,
          name: product.name,
          unitPrice: product.price,
          stockQty: product.stockQty,
          quantity: 1,
        }]
      }

      if (existing.quantity >= existing.stockQty) {
        setError(`Estoque máximo atingido para ${existing.name}.`)
        return current
      }

      return current.map((item) => item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item)
    })
  }, [])

  const readCodeAndAddToCart = useCallback((rawCode: string) => {
    const value = rawCode.trim()
    if (!value) {
      setError('Informe um código para leitura.')
      return
    }

    startTransition(async () => {
      try {
        const product = await findProductByCode(value)
        addProductToCart(product as Product)
        setCode('')
      } catch (currentError: any) {
        setError(currentError?.message || 'Não foi possível ler o código.')
      }
    })
  }, [addProductToCart])

  const handleReadCode = (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    readCodeAndAddToCart(code)
  }

  useEffect(() => {
    if (!scannerModeEnabled) return
    scannerInputRef.current?.focus()
  }, [scannerModeEnabled])

  useEffect(() => {
    if (!scannerModeEnabled) {
      scannerBufferRef.current = ''
      return
    }

    const isEditableElement = (element: Element | null) => {
      if (!element) return false
      if (element instanceof HTMLInputElement) return true
      if (element instanceof HTMLTextAreaElement) return true
      if (element instanceof HTMLSelectElement) return true
      return (element as HTMLElement).isContentEditable
    }

    const handleGlobalScannerInput = (event: KeyboardEvent) => {
      const activeElement = document.activeElement
      const isScannerInputFocused = activeElement === scannerInputRef.current
      const shouldCapture = !isEditableElement(activeElement) || isScannerInputFocused

      if (!shouldCapture || event.ctrlKey || event.metaKey || event.altKey) return

      if (event.key === 'Enter') {
        const scannedCode = scannerBufferRef.current.trim()
        if (scannedCode.length > 0) {
          event.preventDefault()
          scannerBufferRef.current = ''
          setError('')
          setSuccess('')
          setCode(scannedCode)
          readCodeAndAddToCart(scannedCode)
        }
        return
      }

      if (event.key.length !== 1) return

      const now = Date.now()
      const elapsed = now - lastKeyAtRef.current
      lastKeyAtRef.current = now

      if (elapsed > 120) {
        scannerBufferRef.current = event.key
      } else {
        scannerBufferRef.current += event.key
      }
    }

    window.addEventListener('keydown', handleGlobalScannerInput)
    return () => {
      window.removeEventListener('keydown', handleGlobalScannerInput)
    }
  }, [readCodeAndAddToCart, scannerModeEnabled])

  const updateQuantity = (productId: string, quantity: number) => {
    setCart((current) => {
      if (quantity <= 0) return current.filter((item) => item.productId !== productId)
      return current.map((item) => {
        if (item.productId !== productId) return item
        return { ...item, quantity: Math.min(item.stockQty, quantity) }
      })
    })
  }

  const removeItem = (productId: string) => {
    setCart((current) => current.filter((item) => item.productId !== productId))
  }

  const finalizeSale = () => {
    setError('')
    setSuccess('')

    if (cart.length === 0) {
      setError('Adicione itens no carrinho antes de finalizar.')
      return
    }

    startTransition(async () => {
      try {
        const result = await completeSale({
          items: cart.map((item) => ({ productId: item.productId, quantity: item.quantity })),
          paymentMethod,
          discount: boundedDiscount,
        })
        setSuccess(`Venda ${result.code} finalizada com sucesso.`)
        setCart([])
        setDiscount('0')
        router.refresh()
      } catch (currentError: any) {
        setError(currentError?.message || 'Não foi possível finalizar a venda.')
      }
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Caixa e vendas</h1>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
                scannerModeEnabled
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600'
                  : 'border-amber-500/40 bg-amber-500/10 text-amber-600'
              }`}
            >
              Modo scanner: {scannerModeEnabled ? 'Ligado' : 'Desligado'}
            </span>
            <button
              type="button"
              onClick={() => setScannerModeEnabled((current) => !current)}
              className="border border-border hover:bg-muted text-foreground px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {scannerModeEnabled ? 'Desativar scanner' : 'Ativar scanner'}
            </button>
            <a
              href="/api/export/sales"
              className="border border-border hover:bg-muted text-foreground px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Exportar vendas CSV
            </a>
          </div>
        </div>
        <p className="text-muted-foreground mt-1">Registre vendas, aplique desconto e atualize o estoque automaticamente.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <section className="xl:col-span-2 bg-card border border-border rounded-xl p-5 shadow-sm">
          <form onSubmit={handleReadCode} className="grid grid-cols-1 md:grid-cols-[1fr_120px] gap-3 mb-4">
            <div className="relative">
              <ScanLine className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={scannerInputRef}
                type="text"
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="Leia ou digite o SKU do produto"
                autoFocus
                className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm font-mono outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {isPending ? 'Lendo...' : 'Adicionar'}
            </button>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
            <select
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value)}
              className="px-4 py-2.5 bg-background border border-border rounded-lg text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
            >
              <option value="DINHEIRO">Dinheiro</option>
              <option value="CARTAO_CREDITO">Cartão de crédito</option>
              <option value="CARTAO_DEBITO">Cartão de débito</option>
              <option value="PIX">PIX</option>
            </select>
            <input
              type="number"
              min="0"
              step="0.01"
              value={discount}
              onChange={e => setDiscount(e.target.value)}
              placeholder="Desconto"
              className="px-4 py-2.5 bg-background border border-border rounded-lg text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {error && <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3 mb-4">{error}</p>}
          {success && <p className="text-sm text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-4 py-3 mb-4">{success}</p>}

          <div className="overflow-x-auto border border-border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-muted/20 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">Produto</th>
                  <th className="px-4 py-3 text-left">Qtd</th>
                  <th className="px-4 py-3 text-left">Preço</th>
                  <th className="px-4 py-3 text-left">Total</th>
                  <th className="px-4 py-3 text-center">Ação</th>
                </tr>
              </thead>
              <tbody>
                {cart.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-muted-foreground" colSpan={5}>Carrinho vazio. Leia um código para começar.</td>
                  </tr>
                ) : cart.map((item) => (
                  <tr key={item.productId} className="border-t border-border">
                    <td className="px-4 py-3">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{item.sku}</p>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={1}
                        max={item.stockQty}
                        value={item.quantity}
                        onChange={e => updateQuantity(item.productId, Number(e.target.value) || 1)}
                        className="w-20 px-2 py-1.5 bg-background border border-border rounded text-sm"
                      />
                    </td>
                    <td className="px-4 py-3">{formatCurrency(item.unitPrice)}</td>
                    <td className="px-4 py-3 font-semibold">{formatCurrency(item.unitPrice * item.quantity)}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => removeItem(item.productId)}
                        className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-lg mb-4">Resumo da venda</h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Desconto</span><span>- {formatCurrency(boundedDiscount)}</span></div>
              <div className="h-px bg-border my-2" />
              <div className="flex items-center justify-between text-base font-bold"><span>Total</span><span>{formatCurrency(total)}</span></div>
            </div>
            <button
              type="button"
              onClick={finalizeSale}
              disabled={isPending || cart.length === 0}
              className="mt-4 w-full px-4 py-2.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-60"
            >
              <span className="inline-flex items-center gap-2"><CreditCard className="w-4 h-4" /> {isPending ? 'Finalizando...' : 'Finalizar venda'}</span>
            </button>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-lg mb-4">Vendas recentes</h2>
            <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
              {initialSales.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma venda registrada ainda.</p>
              ) : initialSales.map((sale) => (
                <div key={sale.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm">{sale.code}</p>
                    <span className="text-xs text-muted-foreground">{new Date(sale.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{sale.items.reduce((acc, item) => acc + item.quantity, 0)} item(ns)</p>
                  <p className="font-bold text-sm mt-2">{formatCurrency(sale.total)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold text-base mb-3">Atalhos de caixa</h2>
            <div className="space-y-2 text-sm">
              {products.slice(0, 5).map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => addProductToCart(product)}
                  className="w-full text-left px-3 py-2 rounded-lg border border-border hover:bg-muted transition-colors"
                >
                  <span className="inline-flex items-center gap-2">
                    <Plus className="w-3.5 h-3.5 text-primary" />
                    {product.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
