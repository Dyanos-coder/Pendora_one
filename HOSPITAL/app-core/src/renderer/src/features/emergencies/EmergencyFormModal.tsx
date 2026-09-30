import { useEffect, useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Modal } from '@renderer/components/Modal'
import { Button } from '@renderer/components/Button'
import { PicklistInput } from '@renderer/components/PicklistInput'
import { PICKLIST_KEYS } from '@shared/picklist-types'
import type { ApiEmergencyStatus, ApiEmergencyVisit, ApiSeverity, CreateEmergencyVisitInput } from '@shared/emergency-types'
import type { ApiEmployee } from '@shared/appointment-types'
import type { PatientSummary } from '@shared/patient-types'
import type { EmergencyRecord } from './types'

interface EmergencyFormModalProps {
  onClose: () => void
  onCreated: (visit: ApiEmergencyVisit) => void
  editing?: EmergencyRecord
}

const inputClass =
  'w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-800 focus:border-accent-500 focus:outline-none'
const labelClass = 'mb-1 block text-xs font-medium text-gray-500'

const SEVERITY_OPTIONS: { value: ApiSeverity; label: string }[] = [
  { value: 'CRITIQUE', label: 'Critique' },
  { value: 'ELEVE', label: 'Élevé' },
  { value: 'MOYEN', label: 'Moyen' },
  { value: 'FAIBLE', label: 'Faible' }
]

const LABEL_TO_API_SEVERITY: Record<string, ApiSeverity> = {
  Critique: 'CRITIQUE',
  Élevé: 'ELEVE',
  Moyen: 'MOYEN',
  Faible: 'FAIBLE'
}

const STATUS_OPTIONS: { value: ApiEmergencyStatus; label: string }[] = [
  { value: 'EN_ATTENTE_TRIAGE', label: 'En attente de triage' },
  { value: 'EN_COURS', label: 'En cours' },
  { value: 'EN_OBSERVATION', label: 'En observation' },
  { value: 'SORTI', label: 'Sorti' },
  { value: 'TRANSFERE', label: 'Transféré' },
  { value: 'ANNULE', label: 'Annulé' }
]

const LABEL_TO_API_STATUS: Record<string, ApiEmergencyStatus> = {
  'En cours': 'EN_COURS',
  'En observation': 'EN_OBSERVATION',
  'En attente de triage': 'EN_ATTENTE_TRIAGE',
  Sorti: 'SORTI',
  Transféré: 'TRANSFERE',
  Annulé: 'ANNULE'
}

export function EmergencyFormModal({ onClose, onCreated, editing }: EmergencyFormModalProps): JSX.Element {
  const [patients, setPatients] = useState<PatientSummary[]>([])
  const [doctors, setDoctors] = useState<ApiEmployee[]>([])
  const [patientId, setPatientId] = useState(editing?.patientId ?? '')
  const [doctorId, setDoctorId] = useState(editing?.doctorId ?? '')
  const [severity, setSeverity] = useState<ApiSeverity>(
    editing ? (LABEL_TO_API_SEVERITY[editing.severity] ?? 'MOYEN') : 'MOYEN'
  )
  const [zone, setZone] = useState(editing && editing.zone !== '—' ? editing.zone : '')
  const [motive, setMotive] = useState(editing && editing.motive !== '—' ? editing.motive : '')
  const [detail, setDetail] = useState(editing && editing.detail !== '—' ? editing.detail : '')
  const [status, setStatus] = useState<ApiEmergencyStatus>(
    editing ? (LABEL_TO_API_STATUS[editing.status] ?? 'EN_ATTENTE_TRIAGE') : 'EN_ATTENTE_TRIAGE'
  )
  const [outcome, setOutcome] = useState(editing?.outcome ?? '')
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

    setSubmitting(true)
    setError(null)

    const result = editing
      ? await window.api.emergencies.update(editing.id, {
          patientId: patientId || null,
          doctorId: doctorId || null,
          severity,
          zone: zone.trim() || null,
          motive: motive.trim() || null,
          detail: detail.trim() || null,
          status,
          outcome: outcome.trim() || null
        })
      : await window.api.emergencies.create({
          patientId: patientId || undefined,
          doctorId: doctorId || undefined,
          severity,
          zone: zone.trim() || undefined,
          motive: motive.trim() || undefined,
          detail: detail.trim() || undefined
        } as CreateEmergencyVisitInput)
    setSubmitting(false)
    if (result.ok) {
      onCreated(result.data.visit)
    } else {
      setError(result.error)
    }
  }

  return (
    <Modal title={editing ? 'Modifier le passage aux urgences' : 'Nouveau passage aux urgences'} onClose={onClose} widthClassName="max-w-2xl">
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
            <label className={labelClass}>Gravité *</label>
            <select value={severity} onChange={(e) => setSeverity(e.target.value as ApiSeverity)} className={inputClass}>
              {SEVERITY_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Zone</label>
            <PicklistInput listKey={PICKLIST_KEYS.EMERGENCY_ZONE} value={zone} onChange={setZone} className={inputClass} />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Motif</label>
            <input value={motive} onChange={(e) => setMotive(e.target.value)} className={inputClass} />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Détail</label>
            <textarea value={detail} onChange={(e) => setDetail(e.target.value)} rows={2} className={inputClass} />
          </div>
          {editing && (
            <>
              <div>
                <label className={labelClass}>Statut</label>
                <select value={status} onChange={(e) => setStatus(e.target.value as ApiEmergencyStatus)} className={inputClass}>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Issue</label>
                <input value={outcome} onChange={(e) => setOutcome(e.target.value)} className={inputClass} />
              </div>
            </>
          )}
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : editing ? 'Enregistrer les modifications' : 'Enregistrer'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
