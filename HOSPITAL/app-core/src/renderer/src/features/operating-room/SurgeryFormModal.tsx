import { useEffect, useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Modal } from '@renderer/components/Modal'
import { Button } from '@renderer/components/Button'
import type { ApiOperatingRoom, ApiSurgery, ApiSurgeryStatus, CreateSurgeryInput } from '@shared/operating-room-types'
import type { ApiEmployee } from '@shared/appointment-types'
import type { PatientSummary } from '@shared/patient-types'
import type { SurgeryRecord } from './types'

interface SurgeryFormModalProps {
  onClose: () => void
  onCreated: (surgery: ApiSurgery) => void
  editing?: SurgeryRecord
}

const inputClass =
  'w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-800 focus:border-accent-500 focus:outline-none'
const labelClass = 'mb-1 block text-xs font-medium text-gray-500'

const STATUS_OPTIONS: { value: ApiSurgeryStatus; label: string }[] = [
  { value: 'EN_ATTENTE', label: 'En attente' },
  { value: 'EN_COURS', label: 'En cours' },
  { value: 'TERMINEE', label: 'Terminée' },
  { value: 'ANNULEE', label: 'Annulée' }
]

const LABEL_TO_API_STATUS: Record<string, ApiSurgeryStatus> = {
  Terminée: 'TERMINEE',
  'En cours': 'EN_COURS',
  'En attente': 'EN_ATTENTE',
  Annulée: 'ANNULEE'
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function dateInputValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function timeInputValue(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function nowLocal(): { date: string; time: string } {
  const now = new Date()
  return { date: dateInputValue(now), time: timeInputValue(now) }
}

export function SurgeryFormModal({ onClose, onCreated, editing }: SurgeryFormModalProps): JSX.Element {
  const [patients, setPatients] = useState<PatientSummary[]>([])
  const [employees, setEmployees] = useState<ApiEmployee[]>([])
  const [rooms, setRooms] = useState<ApiOperatingRoom[]>([])
  const [patientId, setPatientId] = useState(editing?.patientId ?? '')
  const [surgeonId, setSurgeonId] = useState(editing?.surgeonId ?? '')
  const [anesthetistId, setAnesthetistId] = useState(editing?.anesthetistId ?? '')
  const [roomId, setRoomId] = useState(editing?.roomId ?? '')
  const initial = nowLocal()
  const [date, setDate] = useState(editing ? dateInputValue(editing.scheduledAt) : initial.date)
  const [time, setTime] = useState(editing ? timeInputValue(editing.scheduledAt) : initial.time)
  const [procedure, setProcedure] = useState(editing?.procedure ?? '')
  const [expectedDurationMin, setExpectedDurationMin] = useState(60)
  const [status, setStatus] = useState<ApiSurgeryStatus>(
    editing ? (LABEL_TO_API_STATUS[editing.status] ?? 'EN_ATTENTE') : 'EN_ATTENTE'
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    window.api.patients.list().then((result) => {
      if (result.ok) setPatients(result.data.patients)
    })
    window.api.appointments.listDoctors().then((result) => {
      if (result.ok) setEmployees(result.data.employees)
    })
    window.api.operatingRoom.rooms().then((result) => {
      if (result.ok) setRooms(result.data.rooms)
    })
  }, [])

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!procedure.trim() || !date || !time) {
      setError('Intervention, date et heure sont requises.')
      return
    }

    setSubmitting(true)
    setError(null)

    const scheduledAt = new Date(`${date}T${time}`).toISOString()

    const result = editing
      ? await window.api.operatingRoom.update(editing.id, {
          patientId: patientId || null,
          surgeonId: surgeonId || null,
          anesthetistId: anesthetistId || null,
          roomId: roomId || null,
          scheduledAt,
          procedure: procedure.trim(),
          status,
          expectedDurationMin
        })
      : await window.api.operatingRoom.create({
          patientId: patientId || undefined,
          surgeonId: surgeonId || undefined,
          anesthetistId: anesthetistId || undefined,
          roomId: roomId || undefined,
          scheduledAt,
          procedure: procedure.trim(),
          expectedDurationMin
        } as CreateSurgeryInput)
    setSubmitting(false)
    if (result.ok) {
      onCreated(result.data.surgery)
    } else {
      setError(result.error)
    }
  }

  return (
    <Modal title={editing ? "Modifier l'intervention" : 'Nouvelle intervention'} onClose={onClose} widthClassName="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className={labelClass}>Intervention *</label>
            <input value={procedure} onChange={(e) => setProcedure(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Patient</label>
            <select value={patientId} onChange={(e) => setPatientId(e.target.value)} className={inputClass}>
              <option value="">— Non spécifié —</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.firstName} {p.lastName} ({p.code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Salle</label>
            <select value={roomId} onChange={(e) => setRoomId(e.target.value)} className={inputClass}>
              <option value="">— Non assignée —</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Chirurgien</label>
            <select value={surgeonId} onChange={(e) => setSurgeonId(e.target.value)} className={inputClass}>
              <option value="">— Non assigné —</option>
              {employees.map((d) => (
                <option key={d.id} value={d.id}>
                  Dr. {d.lastName} {d.firstName}. {d.specialty ? `— ${d.specialty}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Anesthésiste</label>
            <select value={anesthetistId} onChange={(e) => setAnesthetistId(e.target.value)} className={inputClass}>
              <option value="">— Non assigné —</option>
              {employees.map((d) => (
                <option key={d.id} value={d.id}>
                  Dr. {d.lastName} {d.firstName}. {d.specialty ? `— ${d.specialty}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Date *</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Heure *</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Durée prévue (min)</label>
            <input
              type="number"
              min={15}
              step={15}
              value={expectedDurationMin}
              onChange={(e) => setExpectedDurationMin(Number(e.target.value))}
              className={inputClass}
            />
          </div>
          {editing && (
            <div>
              <label className={labelClass}>Statut</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as ApiSurgeryStatus)} className={inputClass}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          )}
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
              "Programmer l'intervention"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
