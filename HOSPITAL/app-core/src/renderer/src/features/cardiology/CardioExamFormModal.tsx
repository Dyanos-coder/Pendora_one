import { useEffect, useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Modal } from '@renderer/components/Modal'
import { Button } from '@renderer/components/Button'
import type { ApiCardioExam, ApiCardioPriority, ApiCardioStatus, CreateCardioExamInput } from '@shared/cardiology-types'
import type { ApiEmployee } from '@shared/appointment-types'
import type { PatientSummary } from '@shared/patient-types'
import type { CardioExam } from './types'

interface CardioExamFormModalProps {
  onClose: () => void
  onCreated: (exam: ApiCardioExam) => void
  editing?: CardioExam
}

const inputClass =
  'w-full rounded-[10px] border border-gray-300 px-3 py-1.5 text-sm text-gray-800 focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15'
const labelClass = 'mb-1.5 block text-xs font-semibold text-gray-700'

const STATUS_OPTIONS: { value: ApiCardioStatus; label: string }[] = [
  { value: 'PROGRAMME', label: 'Programmé' },
  { value: 'EN_ATTENTE', label: 'En attente' },
  { value: 'EN_COURS', label: 'En cours' },
  { value: 'RESULTAT_VALIDE', label: 'Résultat validé' },
  { value: 'ANNULE', label: 'Annulé' }
]

const LABEL_TO_API_STATUS: Record<string, ApiCardioStatus> = {
  'Résultat validé': 'RESULTAT_VALIDE',
  'En cours': 'EN_COURS',
  'En attente': 'EN_ATTENTE',
  Programmé: 'PROGRAMME',
  Annulé: 'ANNULE'
}

const LABEL_TO_API_PRIORITY: Record<string, ApiCardioPriority> = { Normale: 'NORMALE', Urgent: 'URGENT' }

export function CardioExamFormModal({ onClose, onCreated, editing }: CardioExamFormModalProps): JSX.Element {
  const [patients, setPatients] = useState<PatientSummary[]>([])
  const [doctors, setDoctors] = useState<ApiEmployee[]>([])
  const [patientId, setPatientId] = useState(editing?.patientId ?? '')
  const [doctorId, setDoctorId] = useState(editing?.doctorId ?? '')
  const [examType, setExamType] = useState(editing?.examType ?? '')
  const [indication, setIndication] = useState(editing && editing.indication !== '—' ? editing.indication : '')
  const [priority, setPriority] = useState<ApiCardioPriority>(editing ? (LABEL_TO_API_PRIORITY[editing.priority] ?? 'NORMALE') : 'NORMALE')
  const [room, setRoom] = useState(editing && editing.room !== '—' ? editing.room : '')
  const [status, setStatus] = useState<ApiCardioStatus>(editing ? (LABEL_TO_API_STATUS[editing.status] ?? 'EN_ATTENTE') : 'EN_ATTENTE')
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
    if (!examType.trim()) {
      setError("Le type d'examen est requis.")
      return
    }

    setSubmitting(true)
    setError(null)

    const result = editing
      ? await window.api.cardiology.update(editing.id, {
          patientId: patientId || null,
          doctorId: doctorId || null,
          examType: examType.trim(),
          indication: indication.trim() || null,
          priority,
          room: room.trim() || null,
          status
        })
      : await window.api.cardiology.create({
          patientId: patientId || undefined,
          doctorId: doctorId || undefined,
          examType: examType.trim(),
          indication: indication.trim() || undefined,
          priority,
          room: room.trim() || undefined
        } as CreateCardioExamInput)
    setSubmitting(false)
    if (result.ok) {
      onCreated(result.data.exam)
    } else {
      setError(result.error)
    }
  }

  return (
    <Modal
      title={editing ? 'Modifier la demande de cardiologie' : 'Nouvelle demande de cardiologie'}
      onClose={onClose}
      widthClassName="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className={labelClass}>Type d&apos;examen *</label>
            <input
              value={examType}
              onChange={(e) => setExamType(e.target.value)}
              placeholder="ex. ECG, Echographie cardiaque"
              className={inputClass}
            />
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
            <label className={labelClass}>Médecin demandeur</label>
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
            <label className={labelClass}>Priorité</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value as ApiCardioPriority)} className={inputClass}>
              <option value="NORMALE">Normale</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Salle</label>
            <input value={room} onChange={(e) => setRoom(e.target.value)} className={inputClass} />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Indication</label>
            <input value={indication} onChange={(e) => setIndication(e.target.value)} className={inputClass} />
          </div>
          {editing && (
            <div>
              <label className={labelClass}>Statut</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as ApiCardioStatus)} className={inputClass}>
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
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : editing ? 'Enregistrer les modifications' : 'Créer la demande'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
