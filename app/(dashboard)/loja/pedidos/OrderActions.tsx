'use client'

import { useState, useTransition } from 'react'
import { Check, Edit3, Loader2, X } from 'lucide-react'
import { approveStoreOrder, cancelStoreOrder, editStoreOrder } from '@/lib/store-actions'

type Order = {
  id: string
  status: string
  deliveryMethod: string
  customerName: string | null
  customerEmail: string | null
  customerPhone: string | null
  notes: string | null
  shippingAddress: unknown
}

function addressValue(value: unknown, key: string) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ''
  return String((value as Record<string, unknown>)[key] ?? '')
}

export function OrderActions({ order }: { order: Order }) {
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState({
    customerName: order.customerName ?? '',
    customerEmail: order.customerEmail ?? '',
    customerPhone: order.customerPhone ?? '',
    notes: order.notes ?? '',
    street: addressValue(order.shippingAddress, 'street'),
    number: addressValue(order.shippingAddress, 'number'),
    complement: addressValue(order.shippingAddress, 'complement'),
    neighborhood: addressValue(order.shippingAddress, 'neighborhood'),
    city: addressValue(order.shippingAddress, 'city'),
    state: addressValue(order.shippingAddress, 'state'),
    postalCode: addressValue(order.shippingAddress, 'postalCode'),
  })

  const run = (action: () => Promise<void>) => {
    setError('')
    startTransition(async () => {
      try { await action() } catch (actionError) { setError(actionError instanceof Error ? actionError.message : 'Não foi possível atualizar o pedido.') }
    })
  }

  const save = () => run(async () => {
    await editStoreOrder(order.id, {
      customerName: form.customerName,
      customerEmail: form.customerEmail,
      customerPhone: form.customerPhone,
      notes: form.notes,
      shippingAddress: { street: form.street, number: form.number, complement: form.complement, neighborhood: form.neighborhood, city: form.city, state: form.state, postalCode: form.postalCode },
    })
    setEditing(false)
  })

  return (
    <div className="border-t border-border bg-muted/10 p-5">
      <div className="flex flex-wrap items-center gap-2">
        {order.status !== 'APPROVED' && order.status !== 'CANCELLED' && <button type="button" disabled={pending} onClick={() => run(() => approveStoreOrder(order.id))} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"><Check className="h-4 w-4" /> Aprovar pagamento</button>}
        {order.status !== 'APPROVED' && order.status !== 'CANCELLED' && <button type="button" disabled={pending} onClick={() => run(() => cancelStoreOrder(order.id))} className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"><X className="h-4 w-4" /> Cancelar pedido</button>}
        {order.status !== 'APPROVED' && <button type="button" disabled={pending} onClick={() => setEditing((value) => !value)} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted disabled:opacity-60"><Edit3 className="h-4 w-4" /> {editing ? 'Fechar edição' : 'Editar pedido'}</button>}
        {pending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
      {error && <p className="mt-3 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      {editing && (
        <div className="mt-4 grid gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-2">
          {(['customerName', 'customerEmail', 'customerPhone'] as const).map((field) => <input key={field} value={form[field]} onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))} placeholder={field === 'customerName' ? 'Nome' : field === 'customerEmail' ? 'E-mail' : 'Telefone'} className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />)}
          {order.deliveryMethod === 'DELIVERY' && (['street', 'number', 'complement', 'neighborhood', 'city', 'state', 'postalCode'] as const).map((field) => <input key={field} value={form[field]} onChange={(event) => setForm((current) => ({ ...current, [field]: event.target.value }))} placeholder={field} className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />)}
          <textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Observações" className="min-h-20 rounded-lg border border-border bg-background px-3 py-2 text-sm md:col-span-2" />
          <button type="button" disabled={pending} onClick={save} className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground md:col-span-2">Salvar alterações</button>
        </div>
      )}
    </div>
  )
}