import { useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Modal } from '@renderer/components/Modal'
import { Button } from '@renderer/components/Button'
import { PicklistInput } from '@renderer/components/PicklistInput'
import { PICKLIST_KEYS } from '@shared/picklist-types'
import type { ApiPatientDocument } from '@shared/patient-types'

interface PatientDocumentFormModalProps {
  patientId: string
  onClose: () => void
  onCreated: (document: ApiPatientDocument) => void
}

const inputClass =
  'w-full rounded-[10px] border border-gray-300 px-3 py-1.5 text-sm text-gray-800 focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15'
const labelClass = 'mb-1.5 block text-xs font-semibold text-gray-700'

export function PatientDocumentFormModal({ patientId, onClose, onCreated }: PatientDocumentFormModalProps): JSX.Element {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!title.trim()) {
      setError('Titre requis.')
      return
    }

    setSubmitting(true)
    setError(null)
    const result = await window.api.patients.documents.create({ patientId, title: title.trim(), category: category.trim() || undefined })
    setSubmitting(false)
    if (result.ok) {
      onCreated(result.data.document)
    } else {
      setError(result.error)
    }
  }

  return (
    <Modal title="Nouveau document patient" onClose={onClose} widthClassName="max-w-sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClass}>Titre *</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Compte-rendu, ordonnance, résultat..."
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Catégorie</label>
          <PicklistInput
            listKey={PICKLIST_KEYS.PATIENT_DOCUMENT_CATEGORY}
            value={category}
            onChange={setCategory}
            className={inputClass}
          />
        </div>
        <p className="text-xs text-gray-400">Le fichier se téléverse ensuite depuis la liste (icône de téléversement).</p>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Créer'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
