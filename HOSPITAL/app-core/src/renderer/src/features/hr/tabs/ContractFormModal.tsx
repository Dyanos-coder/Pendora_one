import { useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Modal } from '@renderer/components/Modal'
import { Button } from '@renderer/components/Button'
import type { ApiContract, ApiEmployeeContractStatus, ApiEmployeeContractType, ApiHrEmployee } from '@shared/hr-types'

interface ContractFormModalProps {
  employees: ApiHrEmployee[]
  onClose: () => void
  onSaved: (contract: ApiContract) => void
  editing?: ApiContract
}

const inputClass =
  'w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-800 focus:border-accent-500 focus:outline-none'
const labelClass = 'mb-1 block text-xs font-medium text-gray-500'

const STATUS_OPTIONS: { value: ApiEmployeeContractStatus; label: string }[] = [
  { value: 'ACTIF', label: 'Actif' },
  { value: 'TERMINE', label: 'Terminé' },
  { value: 'RESILIE', label: 'Résilié' }
]

export function ContractFormModal({ employees, onClose, onSaved, editing }: ContractFormModalProps): JSX.Element {
  const [employeeId, setEmployeeId] = useState(editing?.employeeId ?? employees[0]?.id ?? '')
  const [type, setType] = useState<ApiEmployeeContractType>(editing?.type ?? 'CDI')
  const [contractNumber, setContractNumber] = useState(editing?.contractNumber ?? '')
  const [position, setPosition] = useState(editing?.position ?? '')
  const [startDate, setStartDate] = useState(editing?.startDate.slice(0, 10) ?? new Date().toISOString().slice(0, 10))
  const [endDate, setEndDate] = useState(editing?.endDate?.slice(0, 10) ?? '')
  const [salary, setSalary] = useState(editing?.salary?.toString() ?? '')
  const [status, setStatus] = useState<ApiEmployeeContractStatus>(editing?.status ?? 'ACTIF')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!employeeId || !contractNumber.trim() || !position.trim() || !startDate) {
      setError('Employé, numéro de contrat, poste et date de début requis.')
      return
    }

    setSubmitting(true)
    setError(null)

    const base = {
      type,
      contractNumber: contractNumber.trim(),
      position: position.trim(),
      startDate: new Date(startDate).toISOString(),
      endDate: endDate ? new Date(endDate).toISOString() : undefined,
      salary: salary ? Number(salary) : undefined,
      status
    }

    const result = editing
      ? await window.api.hr.contracts.update(editing.id, base)
      : await window.api.hr.contracts.create({ employeeId, ...base })
    setSubmitting(false)
    if (result.ok) {
      onSaved(result.data.contract)
    } else {
      setError(result.error)
    }
  }

  return (
    <Modal title={editing ? 'Modifier le contrat' : 'Nouveau contrat'} onClose={onClose} widthClassName="max-w-md">
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
          <div>
            <label className={labelClass}>Type *</label>
            <select value={type} onChange={(e) => setType(e.target.value as ApiEmployeeContractType)} className={inputClass}>
              <option value="CDI">CDI</option>
              <option value="CDD">CDD</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>N° contrat *</label>
            <input value={contractNumber} onChange={(e) => setContractNumber(e.target.value)} className={inputClass} />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Poste *</label>
            <input value={position} onChange={(e) => setPosition(e.target.value)} className={inputClass} />
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
            <label className={labelClass}>Salaire (FCFA)</label>
            <input type="number" value={salary} onChange={(e) => setSalary(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Statut</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as ApiEmployeeContractStatus)} className={inputClass}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
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
