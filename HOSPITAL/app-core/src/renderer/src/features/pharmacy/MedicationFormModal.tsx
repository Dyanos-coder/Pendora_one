import { useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Modal } from '@renderer/components/Modal'
import { Button } from '@renderer/components/Button'
import type { ApiMedication, CreateMedicationInput } from '@shared/pharmacy-types'

interface MedicationFormModalProps {
  onClose: () => void
  onCreated: (medication: ApiMedication) => void
  editing?: ApiMedication
}

const inputClass =
  'w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-800 focus:border-accent-500 focus:outline-none'
const labelClass = 'mb-1 block text-xs font-medium text-gray-500'

export function MedicationFormModal({ onClose, onCreated, editing }: MedicationFormModalProps): JSX.Element {
  const [name, setName] = useState(editing?.name ?? '')
  const [category, setCategory] = useState(editing?.category ?? '')
  const [location, setLocation] = useState(editing?.location ?? 'Pharmacie Centrale')
  const [available, setAvailable] = useState(editing?.available ?? 0)
  const [minThreshold, setMinThreshold] = useState(editing?.minThreshold ?? 10)
  const [nearestExpiry, setNearestExpiry] = useState(editing?.nearestExpiry ? editing.nearestExpiry.slice(0, 10) : '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!name.trim() || !category.trim() || !location.trim()) {
      setError('Nom, catégorie et emplacement sont requis.')
      return
    }

    setSubmitting(true)
    setError(null)

    const result = editing
      ? await window.api.pharmacy.update(editing.id, {
          name: name.trim(),
          category: category.trim(),
          location: location.trim(),
          available,
          minThreshold,
          nearestExpiry: nearestExpiry || null
        })
      : await window.api.pharmacy.create({
          name: name.trim(),
          category: category.trim(),
          location: location.trim(),
          available,
          minThreshold,
          nearestExpiry: nearestExpiry || undefined
        } as CreateMedicationInput)
    setSubmitting(false)
    if (result.ok) {
      onCreated(result.data.medication)
    } else {
      setError(result.error)
    }
  }

  return (
    <Modal title={editing ? 'Modifier le médicament' : 'Nouveau médicament'} onClose={onClose} widthClassName="max-w-lg">
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
            <label className={labelClass}>Emplacement *</label>
            <input value={location} onChange={(e) => setLocation(e.target.value)} className={inputClass} />
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
          <div className="col-span-2">
            <label className={labelClass}>Péremption la plus proche</label>
            <input type="date" value={nearestExpiry} onChange={(e) => setNearestExpiry(e.target.value)} className={inputClass} />
          </div>
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : editing ? (
              'Enregistrer les modifications'
            ) : (
              'Créer le médicament'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
