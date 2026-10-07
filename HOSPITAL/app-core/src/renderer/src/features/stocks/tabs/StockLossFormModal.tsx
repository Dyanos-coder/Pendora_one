import { useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Modal } from '@renderer/components/Modal'
import { Button } from '@renderer/components/Button'
import type { ApiDepotItem, ApiStockLoss, ApiStockLossType } from '@shared/stocks-types'

interface StockLossFormModalProps {
  items: ApiDepotItem[]
  onClose: () => void
  onSaved: (loss: ApiStockLoss) => void
  editing?: ApiStockLoss
}

const inputClass =
  'w-full rounded-[10px] border border-gray-300 px-3 py-1.5 text-sm text-gray-800 focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15'
const labelClass = 'mb-1.5 block text-xs font-semibold text-gray-700'

const TYPE_OPTIONS: { value: ApiStockLossType; label: string }[] = [
  { value: 'PERTE', label: 'Perte' },
  { value: 'RETOUR', label: 'Retour' }
]

export function StockLossFormModal({ items, onClose, onSaved, editing }: StockLossFormModalProps): JSX.Element {
  const [itemId, setItemId] = useState(items[0]?.id ?? '')
  const [type, setType] = useState<ApiStockLossType>('PERTE')
  const [quantity, setQuantity] = useState('1')
  const [reason, setReason] = useState(editing?.reason ?? '')
  const [occurredAt, setOccurredAt] = useState(editing ? editing.occurredAt.slice(0, 10) : new Date().toISOString().slice(0, 10))
  const [reportedBy, setReportedBy] = useState(editing?.reportedBy ?? '')
  const [note, setNote] = useState(editing?.note ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!reason.trim() || !reportedBy.trim() || (!editing && (!itemId || !quantity))) {
      setError('Article, motif et déclarant requis.')
      return
    }

    setSubmitting(true)
    setError(null)

    const result = editing
      ? await window.api.stocks.losses.update(editing.id, {
          reason: reason.trim(),
          occurredAt: new Date(occurredAt).toISOString(),
          reportedBy: reportedBy.trim(),
          note: note.trim() || null
        })
      : await window.api.stocks.losses.create({
          itemId,
          type,
          quantity: Number(quantity),
          reason: reason.trim(),
          occurredAt: new Date(occurredAt).toISOString(),
          reportedBy: reportedBy.trim(),
          note: note.trim() || undefined
        })
    setSubmitting(false)
    if (result.ok) {
      onSaved(result.data.loss)
    } else {
      setError(result.error)
    }
  }

  return (
    <Modal title={editing ? 'Modifier la perte / retour' : 'Nouvelle perte / retour'} onClose={onClose} widthClassName="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {!editing && (
          <div>
            <label className={labelClass}>Article *</label>
            <select value={itemId} onChange={(e) => setItemId(e.target.value)} className={inputClass}>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} — {i.depot} ({i.available} dispo.)
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          {!editing && (
            <>
              <div>
                <label className={labelClass}>Type *</label>
                <select value={type} onChange={(e) => setType(e.target.value as ApiStockLossType)} className={inputClass}>
                  {TYPE_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Quantité *</label>
                <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={inputClass} />
              </div>
            </>
          )}
          <div>
            <label className={labelClass}>Date *</label>
            <input type="date" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Déclaré par *</label>
            <input value={reportedBy} onChange={(e) => setReportedBy(e.target.value)} className={inputClass} />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Motif *</label>
            <input value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass} />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Note</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} />
          </div>
        </div>
        <p className="text-xs text-gray-400">Une perte décrémente le stock disponible, un retour le recrédite.</p>

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
