import { useEffect, useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Modal } from '@renderer/components/Modal'
import { Button } from '@renderer/components/Button'
import type { ApiLabPriority, ApiLabRequest, ApiLabStatus, CreateLabRequestInput } from '@shared/laboratory-types'
import type { ApiEmployee } from '@shared/appointment-types'
import type { PatientSummary } from '@shared/patient-types'
import type { LabRequest } from './types'

interface LabRequestFormModalProps {
  onClose: () => void
  onCreated: (request: ApiLabRequest) => void
  editing?: LabRequest
}

const inputClass =
  'w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-800 focus:border-accent-500 focus:outline-none'
const labelClass = 'mb-1 block text-xs font-medium text-gray-500'

const PRIORITY_OPTIONS: { value: ApiLabPriority; label: string }[] = [
  { value: 'NORMALE', label: 'Normale' },
  { value: 'ELEVEE', label: 'Élevée' },
  { value: 'CRITIQUE', label: 'Critique' }
]

const LABEL_TO_API_PRIORITY: Record<string, ApiLabPriority> = {
  Normale: 'NORMALE',
  Élevée: 'ELEVEE',
  Critique: 'CRITIQUE'
}

const STATUS_OPTIONS: { value: ApiLabStatus; label: string }[] = [
  { value: 'EN_ATTENTE_PRELEVEMENT', label: 'En attente prélèvement' },
  { value: 'EN_COURS', label: 'En cours' },
  { value: 'RESULTAT_VALIDE', label: 'Résultat validé' },
  { value: 'ANNULEE', label: 'Annulée' }
]

const LABEL_TO_API_STATUS: Record<string, ApiLabStatus> = {
  'Résultat validé': 'RESULTAT_VALIDE',
  'En cours': 'EN_COURS',
  'En attente prélèvement': 'EN_ATTENTE_PRELEVEMENT',
  Annulée: 'ANNULEE'
}

export function LabRequestFormModal({ onClose, onCreated, editing }: LabRequestFormModalProps): JSX.Element {
  const [patients, setPatients] = useState<PatientSummary[]>([])
  const [technicians, setTechnicians] = useState<ApiEmployee[]>([])
  const [patientId, setPatientId] = useState(editing?.patientId ?? '')
  const [technicianId, setTechnicianId] = useState(editing?.technicianId ?? '')
  const [analysisType, setAnalysisType] = useState(editing?.analysisType ?? '')
  const [priority, setPriority] = useState<ApiLabPriority>(
    editing ? (LABEL_TO_API_PRIORITY[editing.priority] ?? 'NORMALE') : 'NORMALE'
  )
  const [service, setService] = useState(editing && editing.service !== '—' ? editing.service : '')
  const [sample, setSample] = useState(editing && editing.sample !== '—' ? editing.sample : '')
  const [status, setStatus] = useState<ApiLabStatus>(
    editing ? (LABEL_TO_API_STATUS[editing.status] ?? 'EN_ATTENTE_PRELEVEMENT') : 'EN_ATTENTE_PRELEVEMENT'
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    window.api.patients.list().then((result) => {
      if (result.ok) setPatients(result.data.patients)
    })
    window.api.appointments.listDoctors().then((result) => {
      if (result.ok) setTechnicians(result.data.employees)
    })
  }, [])

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!analysisType.trim()) {
      setError("Le type d'analyse est requis.")
      return
    }

    setSubmitting(true)
    setError(null)

    const result = editing
      ? await window.api.laboratory.update(editing.id, {
          patientId: patientId || null,
          technicianId: technicianId || null,
          analysisType: analysisType.trim(),
          priority,
          service: service.trim() || null,
          sample: sample.trim() || null,
          status
        })
      : await window.api.laboratory.create({
          patientId: patientId || undefined,
          technicianId: technicianId || undefined,
          analysisType: analysisType.trim(),
          priority,
          service: service.trim() || undefined,
          sample: sample.trim() || undefined
        } as CreateLabRequestInput)
    setSubmitting(false)
    if (result.ok) {
      onCreated(result.data.request)
    } else {
      setError(result.error)
    }
  }

  return (
    <Modal title={editing ? 'Modifier la demande de laboratoire' : 'Nouvelle demande de laboratoire'} onClose={onClose} widthClassName="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className={labelClass}>Type d&apos;analyse *</label>
            <input value={analysisType} onChange={(e) => setAnalysisType(e.target.value)} className={inputClass} />
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
            <label className={labelClass}>Technicien</label>
            <select value={technicianId} onChange={(e) => setTechnicianId(e.target.value)} className={inputClass}>
              <option value="">— Non assigné —</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.firstName}. {t.lastName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Priorité</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value as ApiLabPriority)} className={inputClass}>
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Service</label>
            <input value={service} onChange={(e) => setService(e.target.value)} className={inputClass} />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Échantillon</label>
            <input value={sample} onChange={(e) => setSample(e.target.value)} className={inputClass} />
          </div>
          {editing && (
            <div>
              <label className={labelClass}>Statut</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as ApiLabStatus)} className={inputClass}>
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
