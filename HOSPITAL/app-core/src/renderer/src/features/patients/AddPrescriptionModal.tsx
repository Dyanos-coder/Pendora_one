import { useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Modal } from '@renderer/components/Modal'
import { Button } from '@renderer/components/Button'
import type { ApiPrescription } from '@shared/patient-types'

interface AddPrescriptionModalProps {
  patientId: string
  onClose: () => void
  onAdded: (prescription: ApiPrescription) => void
}

const inputClass =
  'w-full rounded-[10px] border border-gray-300 px-3 py-1.5 text-sm text-gray-800 focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15'
const labelClass = 'mb-1.5 block text-xs font-semibold text-gray-700'

export function AddPrescriptionModal({ patientId, onClose, onAdded }: AddPrescriptionModalProps): JSX.Element {
  const [name, setName] = useState('')
  const [dosage, setDosage] = useState('')
  const [endDate, setEndDate] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!name.trim() || !dosage.trim()) {
      setError('Nom du médicament et posologie requis.')
      return
    }

    setSubmitting(true)
    setError(null)
    const result = await window.api.patients.addPrescription(patientId, {
      name: name.trim(),
      dosage: dosage.trim(),
      endDate: endDate || undefined
    })
    setSubmitting(false)
    if (result.ok) {
      onAdded(result.data.prescription)
    } else {
      setError(result.error)
    }
  }

  return (
    <Modal title="Ajouter une ordonnance" onClose={onClose} widthClassName="max-w-sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClass}>Médicament *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Amoxicilline 500mg" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Posologie *</label>
          <input
            value={dosage}
            onChange={(e) => setDosage(e.target.value)}
            placeholder="1 comprimé 3 fois par jour"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Fin de traitement</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Ajouter'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
