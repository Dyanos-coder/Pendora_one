import { useEffect, useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Modal } from '@renderer/components/Modal'
import { Button } from '@renderer/components/Button'
import type { ApiAppointment, ApiAppointmentType, ApiEmployee, CreateAppointmentInput } from '@shared/appointment-types'
import type { PatientSummary } from '@shared/patient-types'
import type { Appointment } from './types'

interface AppointmentFormModalProps {
  onClose: () => void
  onCreated: (appointment: ApiAppointment) => void
  editing?: Appointment
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

const inputClass =
  'w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-800 focus:border-accent-500 focus:outline-none'
const labelClass = 'mb-1 block text-xs font-medium text-gray-500'

const TYPE_OPTIONS: { value: ApiAppointmentType; label: string }[] = [
  { value: 'CONSULTATION', label: 'Consultation' },
  { value: 'SUIVI', label: 'Suivi' },
  { value: 'EXAMEN', label: 'Examen' },
  { value: 'RESULTAT', label: 'Résultat' },
  { value: 'CHIRURGIE', label: 'Chirurgie' },
  { value: 'CAMPAGNE', label: 'Campagne' },
  { value: 'AUTRE', label: 'Autre' }
]

const LABEL_TO_API_TYPE: Record<string, ApiAppointmentType> = {
  Consultation: 'CONSULTATION',
  Suivi: 'SUIVI',
  Examen: 'EXAMEN',
  Résultat: 'RESULTAT',
  Chirurgie: 'CHIRURGIE',
  Campagne: 'CAMPAGNE',
  Autre: 'AUTRE'
}

export function AppointmentFormModal({ onClose, onCreated, editing }: AppointmentFormModalProps): JSX.Element {
  const [patients, setPatients] = useState<PatientSummary[]>([])
  const [doctors, setDoctors] = useState<ApiEmployee[]>([])
  const [patientId, setPatientId] = useState(editing?.patientId ?? '')
  const [doctorId, setDoctorId] = useState(editing?.doctorId ?? '')
  const [date, setDate] = useState(editing ? dateInputValue(editing.date) : '')
  const [time, setTime] = useState(editing ? timeInputValue(editing.date) : '09:00')
  const [durationMin, setDurationMin] = useState(editing?.durationMin ?? 30)
  const [service, setService] = useState(editing && editing.service !== '—' ? editing.service : '')
  const [room, setRoom] = useState(editing && editing.room !== '—' ? editing.room : '')
  const [type, setType] = useState<ApiAppointmentType>(editing ? (LABEL_TO_API_TYPE[editing.type] ?? 'CONSULTATION') : 'CONSULTATION')
  const [motive, setMotive] = useState(editing && editing.motive !== '—' ? editing.motive : '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    window.api.patients.list().then((result) => {
      if (result.ok) setPatients(result.data.patients)
    })
    window.api.appointments.listDoctors().then((result) => {
      if (result.ok) setDoctors(result.data.employees)
    })
  }, [])

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!date || !time) {
      setError('Date et heure sont requises.')
      return
    }

    setSubmitting(true)
    setError(null)

    const input: CreateAppointmentInput = {
      patientId: patientId || undefined,
      doctorId: doctorId || undefined,
      date: new Date(`${date}T${time}`).toISOString(),
      durationMin,
      service: service.trim() || undefined,
      room: room.trim() || undefined,
      type,
      motive: motive.trim() || undefined
    }

    const result = editing
      ? await window.api.appointments.update(editing.id, {
          patientId: patientId || null,
          doctorId: doctorId || null,
          date: input.date,
          durationMin: input.durationMin,
          service: input.service ?? null,
          room: input.room ?? null,
          type: input.type,
          motive: input.motive ?? null
        })
      : await window.api.appointments.create(input)
    setSubmitting(false)
    if (result.ok) {
      onCreated(result.data.appointment)
    } else {
      setError(result.error)
    }
  }

  return (
    <Modal title={editing ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous'} onClose={onClose} widthClassName="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
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
            <label className={labelClass}>Médecin</label>
            <select value={doctorId} onChange={(e) => setDoctorId(e.target.value)} className={inputClass}>
              <option value="">— Non assigné —</option>
              {doctors.map((d) => (
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
            <label className={labelClass}>Durée (min)</label>
            <input
              type="number"
              min={5}
              step={5}
              value={durationMin}
              onChange={(e) => setDurationMin(Number(e.target.value))}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Type</label>
            <select value={type} onChange={(e) => setType(e.target.value as ApiAppointmentType)} className={inputClass}>
              {TYPE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Service</label>
            <input value={service} onChange={(e) => setService(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Salle</label>
            <input value={room} onChange={(e) => setRoom(e.target.value)} className={inputClass} />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Motif</label>
            <input value={motive} onChange={(e) => setMotive(e.target.value)} className={inputClass} />
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
              'Créer le rendez-vous'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
