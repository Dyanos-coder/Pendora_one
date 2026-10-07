import { useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Modal } from '@renderer/components/Modal'
import { Button } from '@renderer/components/Button'
import type { ApiEmployeeContractType, ApiHrEmployee, ApiRole, CreateHrEmployeeInput } from '@shared/hr-types'

interface HrEmployeeFormModalProps {
  onClose: () => void
  onCreated: (employee: ApiHrEmployee) => void
  editing?: ApiHrEmployee
}

const inputClass =
  'w-full rounded-[10px] border border-gray-300 px-3 py-1.5 text-sm text-gray-800 focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15'
const labelClass = 'mb-1.5 block text-xs font-semibold text-gray-700'

const ROLE_OPTIONS: { value: ApiRole; label: string }[] = [
  { value: 'MEDECIN', label: 'Médecin' },
  { value: 'INFIRMIER', label: 'Infirmier' },
  { value: 'TECHNICIEN', label: 'Technicien' },
  { value: 'PHARMACIEN', label: 'Pharmacien' },
  { value: 'ADMINISTRATIF', label: 'Administratif' },
  { value: 'CAISSIER', label: 'Caissier(ère)' },
  { value: 'DIRIGEANT', label: 'Dirigeant' }
]

export function HrEmployeeFormModal({ onClose, onCreated, editing }: HrEmployeeFormModalProps): JSX.Element {
  const [firstName, setFirstName] = useState(editing?.firstName ?? '')
  const [lastName, setLastName] = useState(editing?.lastName ?? '')
  const [role, setRole] = useState<ApiRole>((editing?.role as ApiRole) ?? 'MEDECIN')
  const [specialty, setSpecialty] = useState(editing?.specialty ?? '')
  const [department, setDepartment] = useState(editing?.department ?? '')
  const [matricule, setMatricule] = useState(editing?.matricule ?? '')
  const [contractType, setContractType] = useState<ApiEmployeeContractType>(editing?.contractType ?? 'CDI')
  const [hireDate, setHireDate] = useState(editing?.hireDate ? editing.hireDate.slice(0, 10) : '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!firstName.trim() || !lastName.trim()) {
      setError('Prénom et nom sont requis.')
      return
    }

    setSubmitting(true)
    setError(null)

    const result = editing
      ? await window.api.hr.update(editing.id, {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          role,
          specialty: specialty.trim() || null,
          department: department.trim() || null,
          matricule: matricule.trim() || null,
          contractType,
          hireDate: hireDate || null
        })
      : await window.api.hr.create({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          role,
          specialty: specialty.trim() || undefined,
          department: department.trim() || undefined,
          matricule: matricule.trim() || undefined,
          contractType,
          hireDate: hireDate || undefined
        } as CreateHrEmployeeInput)
    setSubmitting(false)
    if (result.ok) {
      onCreated(result.data.employee)
    } else {
      setError(result.error)
    }
  }

  return (
    <Modal title={editing ? "Modifier l'employé" : 'Nouvel employé'} onClose={onClose} widthClassName="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Prénom *</label>
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Nom *</label>
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Rôle</label>
            <select value={role} onChange={(e) => setRole(e.target.value as ApiRole)} className={inputClass}>
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Type de contrat</label>
            <select
              value={contractType}
              onChange={(e) => setContractType(e.target.value as ApiEmployeeContractType)}
              className={inputClass}
            >
              <option value="CDI">CDI</option>
              <option value="CDD">CDD</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Spécialité</label>
            <input value={specialty} onChange={(e) => setSpecialty(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Service / Département</label>
            <input value={department} onChange={(e) => setDepartment(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Matricule</label>
            <input value={matricule} onChange={(e) => setMatricule(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Date d&apos;embauche</label>
            <input type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} className={inputClass} />
          </div>
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : editing ? 'Enregistrer les modifications' : "Créer l'employé"}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
