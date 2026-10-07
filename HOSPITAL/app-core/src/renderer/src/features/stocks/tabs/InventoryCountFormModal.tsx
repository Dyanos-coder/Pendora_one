import { useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Modal } from '@renderer/components/Modal'
import { Button } from '@renderer/components/Button'
import type { ApiDepotItem, ApiInventoryCount } from '@shared/stocks-types'

interface InventoryCountFormModalProps {
  items: ApiDepotItem[]
  onClose: () => void
  onSaved: (count: ApiInventoryCount) => void
  editing?: ApiInventoryCount
}

const inputClass =
  'w-full rounded-[10px] border border-gray-300 px-3 py-1.5 text-sm text-gray-800 focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15'
const labelClass = 'mb-1.5 block text-xs font-semibold text-gray-700'

export function InventoryCountFormModal({ items, onClose, onSaved, editing }: InventoryCountFormModalProps): JSX.Element {
  const [itemId, setItemId] = useState(items[0]?.id ?? '')
  const [countedQuantity, setCountedQuantity] = useState('0')
  const [conductedAt, setConductedAt] = useState(editing ? editing.conductedAt.slice(0, 10) : new Date().toISOString().slice(0, 10))
  const [conductedBy, setConductedBy] = useState(editing?.conductedBy ?? '')
  const [note, setNote] = useState(editing?.note ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedItem = items.find((i) => i.id === itemId)

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!conductedBy.trim() || (!editing && !itemId)) {
      setError('Article et responsable requis.')
      return
    }

    setSubmitting(true)
    setError(null)

    const result = editing
      ? await window.api.stocks.inventory.update(editing.id, {
          conductedAt: new Date(conductedAt).toISOString(),
          conductedBy: conductedBy.trim(),
          note: note.trim() || null
        })
      : await window.api.stocks.inventory.create({
          itemId,
          countedQuantity: Number(countedQuantity),
          conductedAt: new Date(conductedAt).toISOString(),
          conductedBy: conductedBy.trim(),
          note: note.trim() || undefined
        })
    setSubmitting(false)
    if (result.ok) {
      onSaved(result.data.count)
    } else {
      setError(result.error)
    }
  }

  return (
    <Modal title={editing ? "Modifier l'inventaire" : 'Nouveau comptage'} onClose={onClose} widthClassName="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {!editing && (
          <div>
            <label className={labelClass}>Article *</label>
            <select value={itemId} onChange={(e) => setItemId(e.target.value)} className={inputClass}>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} — {i.depot} (stock système : {i.available})
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          {!editing && (
            <div>
              <label className={labelClass}>Quantité comptée *</label>
              <input type="number" value={countedQuantity} onChange={(e) => setCountedQuantity(e.target.value)} className={inputClass} />
              {selectedItem && <p className="mt-1 text-[11px] text-gray-400">Stock système actuel : {selectedItem.available}</p>}
            </div>
          )}
          <div>
            <label className={labelClass}>Date de comptage *</label>
            <input type="date" value={conductedAt} onChange={(e) => setConductedAt(e.target.value)} className={inputClass} />
          </div>
          <div className={editing ? 'col-span-2' : ''}>
            <label className={labelClass}>Réalisé par *</label>
            <input value={conductedBy} onChange={(e) => setConductedBy(e.target.value)} className={inputClass} />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Note</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} />
          </div>
        </div>
        <p className="text-xs text-gray-400">
          En cas d&apos;écart avec le stock système, le stock disponible de l&apos;article est corrigé sur la quantité comptée.
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
