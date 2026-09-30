import { useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Modal } from '@renderer/components/Modal'
import { Button } from '@renderer/components/Button'
import type { ApiEmployeeDocument, ApiHrEmployee } from '@shared/hr-types'

interface EmployeeDocumentFormModalProps {
  employees: ApiHrEmployee[]
  onClose: () => void
  onCreated: (document: ApiEmployeeDocument) => void
}

const inputClass =
  'w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-800 focus:border-accent-500 focus:outline-none'
const labelClass = 'mb-1 block text-xs font-medium text-gray-500'

export function EmployeeDocumentFormModal({ employees, onClose, onCreated }: EmployeeDocumentFormModalProps): JSX.Element {
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? '')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!employeeId || !title.trim()) {
      setError('Employé et titre requis.')
      return
    }

    setSubmitting(true)
    setError(null)
    const result = await window.api.hr.documents.create({ employeeId, title: title.trim(), category: category.trim() || undefined })
    setSubmitting(false)
    if (result.ok) {
      onCreated(result.data.document)
    } else {
      setError(result.error)
    }
  }

  return (
    <Modal title="Nouveau document employé" onClose={onClose} widthClassName="max-w-sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClass}>Employé *</label>
          <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className={inputClass}>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.firstName} {emp.lastName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Titre *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="CV, Diplôme, Contrat..." className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Catégorie</label>
          <input value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass} />
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
