import { useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Modal } from '@renderer/components/Modal'
import { Button } from '@renderer/components/Button'
import type { ApiGoodsReception, ApiPurchaseOrder, ApiReceptionCondition } from '@shared/procurement-types'

interface ReceptionFormModalProps {
  orders: ApiPurchaseOrder[]
  onClose: () => void
  onSaved: (reception: ApiGoodsReception) => void
  editing?: ApiGoodsReception
}

const inputClass =
  'w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-800 focus:border-accent-500 focus:outline-none'
const labelClass = 'mb-1 block text-xs font-medium text-gray-500'

const CONDITION_OPTIONS: { value: ApiReceptionCondition; label: string }[] = [
  { value: 'CONFORME', label: 'Conforme' },
  { value: 'PARTIELLE', label: 'Partielle' },
  { value: 'ENDOMMAGEE', label: 'Endommagée' }
]

export function ReceptionFormModal({ orders, onClose, onSaved, editing }: ReceptionFormModalProps): JSX.Element {
  const [orderId, setOrderId] = useState(editing?.orderId ?? orders[0]?.id ?? '')
  const [receivedAt, setReceivedAt] = useState(editing?.receivedAt.slice(0, 10) ?? new Date().toISOString().slice(0, 10))
  const [receivedQty, setReceivedQty] = useState(editing?.receivedQty.toString() ?? '')
  const [condition, setCondition] = useState<ApiReceptionCondition>(editing?.condition ?? 'CONFORME')
  const [receivedBy, setReceivedBy] = useState(editing?.receivedBy ?? '')
  const [note, setNote] = useState(editing?.note ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!orderId || !receivedQty || !receivedBy.trim()) {
      setError('Commande, quantité reçue et réceptionnaire requis.')
      return
    }

    setSubmitting(true)
    setError(null)

    const base = {
      receivedAt: new Date(receivedAt).toISOString(),
      receivedQty: Number(receivedQty),
      condition,
      receivedBy: receivedBy.trim(),
      note: note.trim() || undefined
    }

    const result = editing
      ? await window.api.procurement.receptions.update(editing.id, base)
      : await window.api.procurement.receptions.create({ orderId, ...base })
    setSubmitting(false)
    if (result.ok) {
      onSaved(result.data.reception)
    } else {
      setError(result.error)
    }
  }

  return (
    <Modal title={editing ? 'Modifier la réception' : 'Nouvelle réception'} onClose={onClose} widthClassName="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClass}>Commande *</label>
          <select value={orderId} onChange={(e) => setOrderId(e.target.value)} disabled={!!editing} className={inputClass}>
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.reference} — {o.article} (qté {o.quantity})
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Date de réception *</label>
            <input type="date" value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Quantité reçue *</label>
            <input type="number" value={receivedQty} onChange={(e) => setReceivedQty(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>État</label>
            <select value={condition} onChange={(e) => setCondition(e.target.value as ApiReceptionCondition)} className={inputClass}>
              {CONDITION_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Réceptionné par *</label>
            <input value={receivedBy} onChange={(e) => setReceivedBy(e.target.value)} className={inputClass} />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Note</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} />
          </div>
        </div>
        <p className="text-xs text-gray-400">Une réception « Conforme » passe automatiquement la commande liée au statut « Livrée ».</p>

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
