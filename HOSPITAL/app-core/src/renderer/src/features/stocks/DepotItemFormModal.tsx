import { useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Modal } from '@renderer/components/Modal'
import { Button } from '@renderer/components/Button'
import type { ApiDepot, ApiDepotItem, CreateDepotItemInput } from '@shared/stocks-types'
import type { DepotItem } from './types'

interface DepotItemFormModalProps {
  depots: ApiDepot[]
  onClose: () => void
  onCreated: (item: ApiDepotItem) => void
  editing?: DepotItem
}

const inputClass =
  'w-full rounded-[10px] border border-gray-300 px-3 py-1.5 text-sm text-gray-800 focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15'
const labelClass = 'mb-1.5 block text-xs font-semibold text-gray-700'

export function DepotItemFormModal({ depots, onClose, onCreated, editing }: DepotItemFormModalProps): JSX.Element {
  const [name, setName] = useState(editing?.name ?? '')
  const [category, setCategory] = useState(editing?.category ?? '')
  const [depotId, setDepotId] = useState(editing?.depotId ?? depots[0]?.id ?? '')
  const [available, setAvailable] = useState(editing?.available ?? 0)
  const [minThreshold, setMinThreshold] = useState(editing?.minThreshold ?? 10)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!name.trim() || !category.trim() || !depotId) {
      setError('Nom, catégorie et dépôt sont requis.')
      return
    }

    setSubmitting(true)
    setError(null)

    const result = editing
      ? await window.api.stocks.update(editing.id, {
          name: name.trim(),
          category: category.trim(),
          depotId,
          available,
          minThreshold
        })
      : await window.api.stocks.create({
          name: name.trim(),
          category: category.trim(),
          depotId,
          available,
          minThreshold
        } as CreateDepotItemInput)
    setSubmitting(false)
    if (result.ok) {
      onCreated(result.data.item)
    } else {
      setError(result.error)
    }
  }

  return (
    <Modal title={editing ? "Modifier l'article de dépôt" : 'Nouvel article de dépôt'} onClose={onClose} widthClassName="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className={labelClass}>Nom *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Catégorie *</label>
            <input value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Dépôt *</label>
            <select value={depotId} onChange={(e) => setDepotId(e.target.value)} className={inputClass}>
              {depots.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Stock disponible</label>
            <input type="number" min={0} value={available} onChange={(e) => setAvailable(Number(e.target.value))} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Seuil minimal</label>
            <input
              type="number"
              min={0}
              value={minThreshold}
              onChange={(e) => setMinThreshold(Number(e.target.value))}
              className={inputClass}
            />
          </div>
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : editing ? 'Enregistrer les modifications' : "Créer l'article"}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
