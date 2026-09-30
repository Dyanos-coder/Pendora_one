import { useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Modal } from '@renderer/components/Modal'
import { Button } from '@renderer/components/Button'
import type { ApiAttendance, ApiEmployeeDailyStatus, ApiHrEmployee } from '@shared/hr-types'

interface AttendanceFormModalProps {
  employees: ApiHrEmployee[]
  onClose: () => void
  onSaved: (attendance: ApiAttendance) => void
  editing?: ApiAttendance
}

const inputClass =
  'w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-800 focus:border-accent-500 focus:outline-none'
const labelClass = 'mb-1 block text-xs font-medium text-gray-500'

const STATUS_OPTIONS: { value: ApiEmployeeDailyStatus; label: string }[] = [
  { value: 'PRESENT', label: 'Présent' },
  { value: 'ABSENT', label: 'Absent' },
  { value: 'CONGE', label: 'Congé' },
  { value: 'RETARD', label: 'Retard' }
]

function toDateInput(iso: string | undefined): string {
  return iso ? iso.slice(0, 10) : new Date().toISOString().slice(0, 10)
}

function toTimeInput(iso: string | null | undefined): string {
  return iso ? new Date(iso).toISOString().slice(11, 16) : ''
}

export function AttendanceFormModal({ employees, onClose, onSaved, editing }: AttendanceFormModalProps): JSX.Element {
  const [employeeId, setEmployeeId] = useState(editing?.employeeId ?? employees[0]?.id ?? '')
  const [date, setDate] = useState(toDateInput(editing?.date))
  const [status, setStatus] = useState<ApiEmployeeDailyStatus>(editing?.status ?? 'PRESENT')
  const [checkIn, setCheckIn] = useState(toTimeInput(editing?.checkIn))
  const [checkOut, setCheckOut] = useState(toTimeInput(editing?.checkOut))
  const [note, setNote] = useState(editing?.note ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!employeeId || !date) {
      setError('Employé et date requis.')
      return
    }

    setSubmitting(true)
    setError(null)

    const input = {
      employeeId,
      date: new Date(date).toISOString(),
      status,
      checkIn: checkIn ? new Date(`${date}T${checkIn}:00`).toISOString() : undefined,
      checkOut: checkOut ? new Date(`${date}T${checkOut}:00`).toISOString() : undefined,
      note: note.trim() || undefined
    }

    const result = editing
      ? await window.api.hr.attendance.update(editing.id, input)
      : await window.api.hr.attendance.create(input)
    setSubmitting(false)
    if (result.ok) {
      onSaved(result.data.attendance)
    } else {
      setError(result.error)
    }
  }

  return (
    <Modal title={editing ? 'Modifier la présence' : 'Nouvelle présence'} onClose={onClose} widthClassName="max-w-md">
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
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Date *</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Statut *</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as ApiEmployeeDailyStatus)} className={inputClass}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Heure d&apos;arrivée</label>
            <input type="time" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Heure de départ</label>
            <input type="time" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className={inputClass} />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Note</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} />
          </div>
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : editing ? 'Enregistrer' : 'Ajouter'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
