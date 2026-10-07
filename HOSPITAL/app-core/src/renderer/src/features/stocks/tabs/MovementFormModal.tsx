import { useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Modal } from '@renderer/components/Modal'
import { Button } from '@renderer/components/Button'
import type { ApiDepotItem, ApiStockMovement, ApiStockMovementType } from '@shared/stocks-types'

interface MovementFormModalProps {
  items: ApiDepotItem[]
  onClose: () => void
  onSaved: (movement: ApiStockMovement) => void
  editing?: ApiStockMovement
}

const inputClass =
  'w-full rounded-[10px] border border-gray-300 px-3 py-1.5 text-sm text-gray-800 focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15'
const labelClass = 'mb-1.5 block text-xs font-semibold text-gray-700'

const TYPE_OPTIONS: { value: ApiStockMovementType; label: string }[] = [
  { value: 'ENTREE', label: 'Entrée' },
  { value: 'SORTIE', label: 'Sortie' }
]

export function MovementFormModal({ items, onClose, onSaved, editing }: MovementFormModalProps): JSX.Element {
  const [itemId, setItemId] = useState(items[0]?.id ?? '')
  const [type, setType] = useState<ApiStockMovementType>('ENTREE')
  const [quantity, setQuantity] = useState('1')
  const [movementDate, setMovementDate] = useState(editing ? editing.movementDate.slice(0, 10) : new Date().toISOString().slice(0, 10))
  const [reason, setReason] = useState(editing?.reason ?? '')
  const [performedBy, setPerformedBy] = useState(editing?.performedBy ?? '')
  const [note, setNote] = useState(editing?.note ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!performedBy.trim() || (!editing && (!itemId || !quantity))) {
      setError('Article, quantité et responsable requis.')
      return
    }

    setSubmitting(true)
    setError(null)

    const result = editing
      ? await window.api.stocks.movements.update(editing.id, {
          movementDate: new Date(movementDate).toISOString(),
          reason: reason.trim() || null,
          performedBy: performedBy.trim(),
          note: note.trim() || null
        })
      : await window.api.stocks.movements.create({
          itemId,
          type,
          quantity: Number(quantity),
          movementDate: new Date(movementDate).toISOString(),
          reason: reason.trim() || undefined,
          performedBy: performedBy.trim(),
          note: note.trim() || undefined
        })
    setSubmitting(false)
    if (result.ok) {
      onSaved(result.data.movement)
    } else {
      setError(result.error)
    }
  }

  return (
    <Modal title={editing ? 'Modifier le mouvement' : 'Nouveau mouvement de stock'} onClose={onClose} widthClassName="max-w-md">
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
                <select value={type} onChange={(e) => setType(e.target.value as ApiStockMovementType)} className={inputClass}>
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
            <input type="date" value={movementDate} onChange={(e) => setMovementDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Responsable *</label>
            <input value={performedBy} onChange={(e) => setPerformedBy(e.target.value)} className={inputClass} />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Motif</label>
            <input value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass} />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Note</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} />
          </div>
        </div>
        <p className="text-xs text-gray-400">
          {editing
            ? "L'article, le type et la quantité ne sont plus modifiables après coup (le stock a déjà été ajusté)."
            : "Le stock disponible de l'article est mis à jour automatiquement."}
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
