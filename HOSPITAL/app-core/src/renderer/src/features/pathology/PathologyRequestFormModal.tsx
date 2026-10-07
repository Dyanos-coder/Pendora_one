import { useEffect, useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Modal } from '@renderer/components/Modal'
import { Button } from '@renderer/components/Button'
import type { ApiPathologyPriority, ApiPathologyRequest, ApiPathologyStatus, CreatePathologyRequestInput } from '@shared/pathology-types'
import type { ApiEmployee } from '@shared/appointment-types'
import type { PatientSummary } from '@shared/patient-types'
import type { PathologyRequest } from './types'

interface PathologyRequestFormModalProps {
  onClose: () => void
  onCreated: (request: ApiPathologyRequest) => void
  editing?: PathologyRequest
}

const inputClass =
  'w-full rounded-[10px] border border-gray-300 px-3 py-1.5 text-sm text-gray-800 focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15'
const labelClass = 'mb-1.5 block text-xs font-semibold text-gray-700'

const STATUS_OPTIONS: { value: ApiPathologyStatus; label: string }[] = [
  { value: 'EN_ATTENTE_PRELEVEMENT', label: 'En attente de prélèvement' },
  { value: 'EN_COURS', label: 'En cours' },
  { value: 'RESULTAT_VALIDE', label: 'Résultat validé' },
  { value: 'ANNULEE', label: 'Annulée' }
]

const LABEL_TO_API_STATUS: Record<string, ApiPathologyStatus> = {
  'Résultat validé': 'RESULTAT_VALIDE',
  'En cours': 'EN_COURS',
  'En attente de prélèvement': 'EN_ATTENTE_PRELEVEMENT',
  Annulée: 'ANNULEE'
}

const LABEL_TO_API_PRIORITY: Record<string, ApiPathologyPriority> = { Normale: 'NORMALE', Urgent: 'URGENT' }

export function PathologyRequestFormModal({ onClose, onCreated, editing }: PathologyRequestFormModalProps): JSX.Element {
  const [patients, setPatients] = useState<PatientSummary[]>([])
  const [doctors, setDoctors] = useState<ApiEmployee[]>([])
  const [patientId, setPatientId] = useState(editing?.patientId ?? '')
  const [doctorId, setDoctorId] = useState(editing?.doctorId ?? '')
  const [sampleType, setSampleType] = useState(editing?.sampleType ?? '')
  const [location, setLocation] = useState(editing && editing.location !== '—' ? editing.location : '')
  const [priority, setPriority] = useState<ApiPathologyPriority>(
    editing ? (LABEL_TO_API_PRIORITY[editing.priority] ?? 'NORMALE') : 'NORMALE'
  )
  const [service, setService] = useState(editing && editing.service !== '—' ? editing.service : '')
  const [status, setStatus] = useState<ApiPathologyStatus>(
    editing ? (LABEL_TO_API_STATUS[editing.status] ?? 'EN_ATTENTE_PRELEVEMENT') : 'EN_ATTENTE_PRELEVEMENT'
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
    if (!sampleType.trim()) {
      setError('Le type de prélèvement est requis.')
      return
    }

    setSubmitting(true)
    setError(null)

    const result = editing
      ? await window.api.pathology.update(editing.id, {
          patientId: patientId || null,
          doctorId: doctorId || null,
          sampleType: sampleType.trim(),
          location: location.trim() || null,
          priority,
          service: service.trim() || null,
          status
        })
      : await window.api.pathology.create({
          patientId: patientId || undefined,
          doctorId: doctorId || undefined,
          sampleType: sampleType.trim(),
          location: location.trim() || undefined,
          priority,
          service: service.trim() || undefined
        } as CreatePathologyRequestInput)
    setSubmitting(false)
    if (result.ok) {
      onCreated(result.data.request)
    } else {
      setError(result.error)
    }
  }

  return (
    <Modal
      title={editing ? "Modifier la demande d'anatomopathologie" : "Nouvelle demande d'anatomopathologie"}
      onClose={onClose}
      widthClassName="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className={labelClass}>Type de prélèvement *</label>
            <input value={sampleType} onChange={(e) => setSampleType(e.target.value)} className={inputClass} />
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
            <label className={labelClass}>Localisation</label>
            <input value={location} onChange={(e) => setLocation(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Priorité</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value as ApiPathologyPriority)} className={inputClass}>
              <option value="NORMALE">Normale</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Service</label>
            <input value={service} onChange={(e) => setService(e.target.value)} className={inputClass} />
          </div>
          {editing && (
            <div>
              <label className={labelClass}>Statut</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as ApiPathologyStatus)} className={inputClass}>
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
