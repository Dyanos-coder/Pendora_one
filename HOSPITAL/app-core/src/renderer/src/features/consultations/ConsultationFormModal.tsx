import { useEffect, useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Modal } from '@renderer/components/Modal'
import { Button } from '@renderer/components/Button'
import type { ApiConsultation, ApiConsultationStatus, CreateConsultationInput } from '@shared/consultation-types'
import type { ApiEmployee } from '@shared/appointment-types'
import type { PatientSummary } from '@shared/patient-types'
import type { ConsultationRecord } from './types'

interface ConsultationFormModalProps {
  onClose: () => void
  onCreated: (consultation: ApiConsultation) => void
  editing?: ConsultationRecord
}

const inputClass =
  'w-full rounded-[10px] border border-gray-300 px-3 py-1.5 text-sm text-gray-800 focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15'
const labelClass = 'mb-1.5 block text-xs font-semibold text-gray-700'

const STATUS_OPTIONS: { value: ApiConsultationStatus; label: string }[] = [
  { value: 'EN_ATTENTE', label: 'En attente' },
  { value: 'EN_COURS', label: 'En cours' },
  { value: 'TERMINEE', label: 'Terminée' },
  { value: 'ANNULEE', label: 'Annulée' }
]

const LABEL_TO_API_STATUS: Record<string, ApiConsultationStatus> = {
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

export function ConsultationFormModal({ onClose, onCreated, editing }: ConsultationFormModalProps): JSX.Element {
  const [patients, setPatients] = useState<PatientSummary[]>([])
  const [doctors, setDoctors] = useState<ApiEmployee[]>([])
  const [patientId, setPatientId] = useState(editing?.patientId ?? '')
  const [doctorId, setDoctorId] = useState(editing?.doctorId ?? '')
  const initial = nowLocal()
  const [date, setDate] = useState(editing ? dateInputValue(editing.date) : initial.date)
  const [time, setTime] = useState(editing ? timeInputValue(editing.date) : initial.time)
  const [service, setService] = useState(editing && editing.service !== '—' ? editing.service : '')
  const [motive, setMotive] = useState(editing && editing.motive !== '—' ? editing.motive : '')
  const [status, setStatus] = useState<ApiConsultationStatus>(
    editing ? (LABEL_TO_API_STATUS[editing.status] ?? 'EN_ATTENTE') : 'EN_ATTENTE'
  )
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

    const isoDate = new Date(`${date}T${time}`).toISOString()

    const result = editing
      ? await window.api.consultations.update(editing.id, {
          patientId: patientId || null,
          doctorId: doctorId || null,
          date: isoDate,
          service: service.trim() || null,
          motive: motive.trim() || null,
          status
        })
      : await window.api.consultations.create({
          patientId: patientId || undefined,
          doctorId: doctorId || undefined,
          date: isoDate,
          service: service.trim() || undefined,
          motive: motive.trim() || undefined
        } as CreateConsultationInput)
    setSubmitting(false)
    if (result.ok) {
      onCreated(result.data.consultation)
    } else {
      setError(result.error)
    }
  }

  return (
    <Modal title={editing ? 'Modifier la consultation' : 'Nouvelle consultation'} onClose={onClose} widthClassName="max-w-2xl">
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
            <label className={labelClass}>Service</label>
            <input value={service} onChange={(e) => setService(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Motif</label>
            <input value={motive} onChange={(e) => setMotive(e.target.value)} className={inputClass} />
          </div>
          {editing && (
            <div>
              <label className={labelClass}>Statut</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as ApiConsultationStatus)} className={inputClass}>
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
              'Créer la consultation'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
