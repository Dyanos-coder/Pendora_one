import { useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Modal } from '@renderer/components/Modal'
import { Button } from '@renderer/components/Button'
import type { ApiHrEmployee, ApiPayrollEntry, ApiPayrollStatus } from '@shared/hr-types'

interface PayrollFormModalProps {
  employees: ApiHrEmployee[]
  onClose: () => void
  onSaved: (entry: ApiPayrollEntry) => void
  editing?: ApiPayrollEntry
}

const inputClass =
  'w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-800 focus:border-accent-500 focus:outline-none'
const labelClass = 'mb-1 block text-xs font-medium text-gray-500'

const STATUS_OPTIONS: { value: ApiPayrollStatus; label: string }[] = [
  { value: 'EN_PREPARATION', label: 'En préparation' },
  { value: 'VALIDEE', label: 'Validée' },
  { value: 'PAYEE', label: 'Payée' }
]

function currentPeriod(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function PayrollFormModal({ employees, onClose, onSaved, editing }: PayrollFormModalProps): JSX.Element {
  const [employeeId, setEmployeeId] = useState(editing?.employeeId ?? employees[0]?.id ?? '')
  const [period, setPeriod] = useState(editing?.period ?? currentPeriod())
  const [baseSalary, setBaseSalary] = useState(editing?.baseSalary.toString() ?? '')
  const [bonuses, setBonuses] = useState(editing?.bonuses.toString() ?? '0')
  const [deductions, setDeductions] = useState(editing?.deductions.toString() ?? '0')
  const [status, setStatus] = useState<ApiPayrollStatus>(editing?.status ?? 'EN_PREPARATION')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!employeeId || !period.trim() || !baseSalary) {
      setError('Employé, période et salaire de base requis.')
      return
    }

    setSubmitting(true)
    setError(null)

    const base = {
      period: period.trim(),
      baseSalary: Number(baseSalary),
      bonuses: Number(bonuses) || 0,
      deductions: Number(deductions) || 0,
      status,
      paidAt: status === 'PAYEE' ? new Date().toISOString() : undefined
    }

    const result = editing
      ? await window.api.hr.payroll.update(editing.id, base)
      : await window.api.hr.payroll.create({ employeeId, ...base })
    setSubmitting(false)
    if (result.ok) {
      onSaved(result.data.entry)
    } else {
      setError(result.error)
    }
  }

  return (
    <Modal title={editing ? 'Modifier la paie' : 'Nouvelle fiche de paie'} onClose={onClose} widthClassName="max-w-md">
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
            <label className={labelClass}>Période * (AAAA-MM)</label>
            <input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="2026-09" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Statut</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as ApiPayrollStatus)} className={inputClass}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Salaire de base (FCFA) *</label>
            <input type="number" value={baseSalary} onChange={(e) => setBaseSalary(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Primes (FCFA)</label>
            <input type="number" value={bonuses} onChange={(e) => setBonuses(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Retenues (FCFA)</label>
            <input type="number" value={deductions} onChange={(e) => setDeductions(e.target.value)} className={inputClass} />
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
