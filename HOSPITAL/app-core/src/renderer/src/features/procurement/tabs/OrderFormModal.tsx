import { useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Modal } from '@renderer/components/Modal'
import { Button } from '@renderer/components/Button'
import type { ApiProcurementRequest, ApiPurchaseOrder, ApiPurchaseOrderStatus, ApiSupplier } from '@shared/procurement-types'

interface OrderFormModalProps {
  requests: ApiProcurementRequest[]
  suppliers: ApiSupplier[]
  onClose: () => void
  onSaved: (order: ApiPurchaseOrder) => void
  editing?: ApiPurchaseOrder
}

const inputClass =
  'w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-800 focus:border-accent-500 focus:outline-none'
const labelClass = 'mb-1 block text-xs font-medium text-gray-500'

const STATUS_OPTIONS: { value: ApiPurchaseOrderStatus; label: string }[] = [
  { value: 'EN_PREPARATION', label: 'En préparation' },
  { value: 'ENVOYEE', label: 'Envoyée' },
  { value: 'CONFIRMEE', label: 'Confirmée' },
  { value: 'LIVREE', label: 'Livrée' },
  { value: 'ANNULEE', label: 'Annulée' }
]

export function OrderFormModal({ requests, suppliers, onClose, onSaved, editing }: OrderFormModalProps): JSX.Element {
  const [requestId, setRequestId] = useState(editing?.requestId ?? '')
  const [supplierId, setSupplierId] = useState(editing?.supplierId ?? '')
  const [article, setArticle] = useState(editing?.article ?? '')
  const [quantity, setQuantity] = useState(editing?.quantity.toString() ?? '1')
  const [unitPrice, setUnitPrice] = useState(editing?.unitPrice?.toString() ?? '')
  const [orderedAt, setOrderedAt] = useState(editing?.orderedAt.slice(0, 10) ?? new Date().toISOString().slice(0, 10))
  const [expectedDeliveryAt, setExpectedDeliveryAt] = useState(editing?.expectedDeliveryAt?.slice(0, 10) ?? '')
  const [status, setStatus] = useState<ApiPurchaseOrderStatus>(editing?.status ?? 'EN_PREPARATION')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!article.trim() || !quantity) {
      setError('Article et quantité requis.')
      return
    }

    setSubmitting(true)
    setError(null)

    const base = {
      supplierId: supplierId || undefined,
      article: article.trim(),
      quantity: Number(quantity),
      unitPrice: unitPrice ? Number(unitPrice) : undefined,
      orderedAt: new Date(orderedAt).toISOString(),
      expectedDeliveryAt: expectedDeliveryAt ? new Date(expectedDeliveryAt).toISOString() : undefined,
      status
    }

    const result = editing
      ? await window.api.procurement.orders.update(editing.id, base)
      : await window.api.procurement.orders.create({ requestId: requestId || undefined, ...base })
    setSubmitting(false)
    if (result.ok) {
      onSaved(result.data.order)
    } else {
      setError(result.error)
    }
  }

  return (
    <Modal title={editing ? 'Modifier la commande' : 'Nouvelle commande'} onClose={onClose} widthClassName="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {!editing && (
          <div>
            <label className={labelClass}>Demande d&apos;achat liée</label>
            <select value={requestId} onChange={(e) => setRequestId(e.target.value)} className={inputClass}>
              <option value="">Aucune (commande directe)</option>
              {requests.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.reference} — {r.article}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className={labelClass}>Fournisseur</label>
          <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={inputClass}>
            <option value="">Non assigné</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className={labelClass}>Article *</label>
            <input value={article} onChange={(e) => setArticle(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Quantité *</label>
            <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Prix unitaire (FCFA)</label>
            <input type="number" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Date de commande *</label>
            <input type="date" value={orderedAt} onChange={(e) => setOrderedAt(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Livraison prévue</label>
            <input
              type="date"
              value={expectedDeliveryAt}
              onChange={(e) => setExpectedDeliveryAt(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Statut</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as ApiPurchaseOrderStatus)} className={inputClass}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : editing ? 'Enregistrer' : 'Créer'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
