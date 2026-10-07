import { useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Modal } from '@renderer/components/Modal'
import { Button } from '@renderer/components/Button'
import type { ApiDepot, ApiDepotItem, ApiStockTransfer } from '@shared/stocks-types'

interface TransferFormModalProps {
  items: ApiDepotItem[]
  depots: ApiDepot[]
  onClose: () => void
  onSaved: (transfer: ApiStockTransfer) => void
  editing?: ApiStockTransfer
}

const inputClass =
  'w-full rounded-[10px] border border-gray-300 px-3 py-1.5 text-sm text-gray-800 focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15'
const labelClass = 'mb-1.5 block text-xs font-semibold text-gray-700'

export function TransferFormModal({ items, depots, onClose, onSaved, editing }: TransferFormModalProps): JSX.Element {
  const [fromItemId, setFromItemId] = useState(items[0]?.id ?? '')
  const [toDepotId, setToDepotId] = useState(depots[0]?.id ?? '')
  const [quantity, setQuantity] = useState('1')
  const [transferDate, setTransferDate] = useState(editing ? editing.transferDate.slice(0, 10) : new Date().toISOString().slice(0, 10))
  const [performedBy, setPerformedBy] = useState(editing?.performedBy ?? '')
  const [note, setNote] = useState(editing?.note ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!performedBy.trim() || (!editing && (!fromItemId || !toDepotId || !quantity))) {
      setError('Article source, dépôt de destination, quantité et responsable requis.')
      return
    }

    setSubmitting(true)
    setError(null)

    const result = editing
      ? await window.api.stocks.transfers.update(editing.id, {
          transferDate: new Date(transferDate).toISOString(),
          performedBy: performedBy.trim(),
          note: note.trim() || null
        })
      : await window.api.stocks.transfers.create({
          fromItemId,
          toDepotId,
          quantity: Number(quantity),
          transferDate: new Date(transferDate).toISOString(),
          performedBy: performedBy.trim(),
          note: note.trim() || undefined
        })
    setSubmitting(false)
    if (result.ok) {
      onSaved(result.data.transfer)
    } else {
      setError(result.error)
    }
  }

  return (
    <Modal title={editing ? 'Modifier le transfert' : 'Nouveau transfert'} onClose={onClose} widthClassName="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {!editing && (
          <>
            <div>
              <label className={labelClass}>Article source *</label>
              <select value={fromItemId} onChange={(e) => setFromItemId(e.target.value)} className={inputClass}>
                {items.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} — {i.depot} ({i.available} dispo.)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Dépôt de destination *</label>
              <select value={toDepotId} onChange={(e) => setToDepotId(e.target.value)} className={inputClass}>
                {depots.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
        <div className="grid grid-cols-2 gap-3">
          {!editing && (
            <div>
              <label className={labelClass}>Quantité *</label>
              <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={inputClass} />
            </div>
          )}
          <div>
            <label className={labelClass}>Date *</label>
            <input type="date" value={transferDate} onChange={(e) => setTransferDate(e.target.value)} className={inputClass} />
          </div>
          <div className={editing ? 'col-span-2' : ''}>
            <label className={labelClass}>Responsable *</label>
            <input value={performedBy} onChange={(e) => setPerformedBy(e.target.value)} className={inputClass} />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Note</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} />
          </div>
        </div>
        <p className="text-xs text-gray-400">
          L&apos;article source est débité, et un article de même nom est crédité (ou créé) dans le dépôt de destination.
        </p>

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
