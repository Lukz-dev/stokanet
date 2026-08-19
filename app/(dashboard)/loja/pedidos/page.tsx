import { ShoppingCart, MapPin, PackageCheck } from 'lucide-react'
import prisma from '@/lib/prisma'
import { getActiveCompanyId } from '@/lib/access'
import { OrderActions } from './OrderActions'

const statusLabels: Record<string, string> = {
  PENDING: 'Aguardando pagamento',
  APPROVED: 'Pago',
  CANCELLED: 'Cancelado',
  ERROR: 'Erro no pagamento',
  STOCK_ERROR: 'Erro no estoque',
}

const statusClasses: Record<string, string> = {
  APPROVED: 'bg-emerald-500/10 text-emerald-600',
  CANCELLED: 'bg-red-500/10 text-red-600',
  ERROR: 'bg-red-500/10 text-red-600',
  STOCK_ERROR: 'bg-red-500/10 text-red-600',
  PENDING: 'bg-amber-500/10 text-amber-600',
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(value)
}

function formatAddress(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 'Endereço não informado'
  const address = value as Record<string, unknown>
  const line = [address.street, address.number, address.complement].filter(Boolean).join(', ')
  const locality = [address.neighborhood, address.city, address.state].filter(Boolean).join(' - ')
  const postalCode = address.postalCode ? `CEP ${address.postalCode}` : ''
  return [line, locality, postalCode].filter(Boolean).join(' | ') || 'Endereço não informado'
}

export default async function OnlineOrdersPage() {
  const companyId = await getActiveCompanyId()
  const orders = await prisma.storeOrder.findMany({
    where: { companyId },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground">
            <ShoppingCart className="h-3.5 w-3.5 text-primary" />
            Operação da loja
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight">Pedidos online</h1>
          <p className="mt-1 text-lg text-muted-foreground">Acompanhe compras, pagamentos, entrega e produtos vendidos pela vitrine.</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          <strong className="text-foreground">{orders.length}</strong> pedido{orders.length === 1 ? '' : 's'} registrado{orders.length === 1 ? '' : 's'}
        </div>
      </div>

      {orders.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <ShoppingCart className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold">Nenhum pedido online ainda</h2>
          <p className="mt-1 text-sm text-muted-foreground">Quando um cliente iniciar uma compra, ela aparecerá aqui.</p>
        </section>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <article key={order.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="flex flex-col gap-4 border-b border-border p-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="font-semibold">Pedido {order.code}</h2>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses[order.status] ?? 'bg-muted text-muted-foreground'}`}>
                      {statusLabels[order.status] ?? order.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Criado em {formatDate(order.createdAt)}{order.paidAt ? ` • Pago em ${formatDate(order.paidAt)}` : ''}</p>
                  <p className="mt-1 text-xs font-medium text-primary">{order.deliveryMethod === 'PICKUP' ? 'Retirada na loja' : 'Entrega'}</p>
                </div>
                <div className="text-left lg:text-right">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-xl font-bold">{formatCurrency(order.total)}</p>
                  <p className="text-xs text-muted-foreground">{order.mercadopagoStatus ?? 'Pagamento não confirmado'}</p>
                  {order.paymentMethod === 'CASH' && <p className="mt-1 text-xs text-amber-600">Dinheiro: {order.cashReceived ? formatCurrency(order.cashReceived) : 'não informado'} • Troco: {formatCurrency(order.changeDue ?? 0)}</p>}
                </div>
              </div>

              <div className="grid gap-6 p-5 lg:grid-cols-[0.8fr_1fr_1.2fr]">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Comprador</p>
                  <p className="mt-2 font-medium">{order.customerName ?? 'Não informado'}</p>
                  <p className="mt-1 break-all text-sm text-muted-foreground">{order.customerEmail ?? 'E-mail não informado'}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{order.customerPhone ?? 'Telefone não informado'}</p>
                </div>
                <div>
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><MapPin className="h-3.5 w-3.5" />Entrega</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{order.deliveryMethod === 'PICKUP' ? 'Cliente fará a retirada na loja.' : formatAddress(order.shippingAddress)}</p>
                  {order.notes && <p className="mt-2 text-sm text-muted-foreground">Observação: {order.notes}</p>}
                </div>
                <div>
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><PackageCheck className="h-3.5 w-3.5" />Produtos</p>
                  <div className="mt-2 divide-y divide-border rounded-xl border border-border">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-4 px-3 py-2.5 text-sm">
                        <div className="min-w-0"><p className="truncate font-medium">{item.productName}</p><p className="text-xs text-muted-foreground">SKU {item.sku} • {item.quantity} un.</p></div>
                        <span className="shrink-0 font-medium">{formatCurrency(item.total)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex justify-between text-sm text-muted-foreground"><span>Subtotal + frete</span><strong className="text-foreground">{formatCurrency(order.subtotal + order.shippingFee - order.discount)}</strong></div>
                </div>
              </div>

              <OrderActions order={order} />
            </article>
          ))}
        </div>
      )}
    </div>
  )
}