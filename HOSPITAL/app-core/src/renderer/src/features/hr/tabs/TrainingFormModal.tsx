import { useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Modal } from '@renderer/components/Modal'
import { Button } from '@renderer/components/Button'
import type { ApiHrEmployee, ApiTraining, ApiTrainingStatus } from '@shared/hr-types'

interface TrainingFormModalProps {
  employees: ApiHrEmployee[]
  onClose: () => void
  onSaved: (training: ApiTraining) => void
  editing?: ApiTraining
}

const inputClass =
  'w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-800 focus:border-accent-500 focus:outline-none'
const labelClass = 'mb-1 block text-xs font-medium text-gray-500'

const STATUS_OPTIONS: { value: ApiTrainingStatus; label: string }[] = [
  { value: 'PLANIFIEE', label: 'Planifiée' },
  { value: 'EN_COURS', label: 'En cours' },
  { value: 'TERMINEE', label: 'Terminée' },
  { value: 'ANNULEE', label: 'Annulée' }
]

export function TrainingFormModal({ employees, onClose, onSaved, editing }: TrainingFormModalProps): JSX.Element {
  const [employeeId, setEmployeeId] = useState(editing?.employeeId ?? employees[0]?.id ?? '')
  const [title, setTitle] = useState(editing?.title ?? '')
  const [provider, setProvider] = useState(editing?.provider ?? '')
  const [startDate, setStartDate] = useState(editing?.startDate.slice(0, 10) ?? new Date().toISOString().slice(0, 10))
  const [endDate, setEndDate] = useState(editing?.endDate?.slice(0, 10) ?? '')
  const [status, setStatus] = useState<ApiTrainingStatus>(editing?.status ?? 'PLANIFIEE')
  const [certified, setCertified] = useState(editing?.certified ?? false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!employeeId || !title.trim() || !startDate) {
      setError('Employé, intitulé et date de début requis.')
      return
    }

    setSubmitting(true)
    setError(null)

    const base = {
      title: title.trim(),
      provider: provider.trim() || undefined,
      startDate: new Date(startDate).toISOString(),
      endDate: endDate ? new Date(endDate).toISOString() : undefined,
      status,
      certified
    }

    const result = editing
      ? await window.api.hr.training.update(editing.id, base)
      : await window.api.hr.training.create({ employeeId, ...base })
    setSubmitting(false)
    if (result.ok) {
      onSaved(result.data.training)
    } else {
      setError(result.error)
    }
  }

  return (
    <Modal title={editing ? 'Modifier la formation' : 'Nouvelle formation'} onClose={onClose} widthClassName="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClass}>Employé *</label>
          <select
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            disabled={!!editing}
            className={inputClass}
          >
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.firstName} {emp.lastName}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className={labelClass}>Intitulé *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Organisme</label>
            <input value={provider} onChange={(e) => setProvider(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Date de début *</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Date de fin</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Statut</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as ApiTrainingStatus)} className={inputClass}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end pb-1.5">
            <label className="flex items-center gap-2 text-xs text-gray-600">
              <input type="checkbox" checked={certified} onChange={(e) => setCertified(e.target.checked)} />
              Certification obtenue
            </label>
          </div>
        </div>

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
