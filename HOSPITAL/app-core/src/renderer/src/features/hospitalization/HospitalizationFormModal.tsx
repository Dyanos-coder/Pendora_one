import { useEffect, useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Modal } from '@renderer/components/Modal'
import { Button } from '@renderer/components/Button'
import { PicklistInput } from '@renderer/components/PicklistInput'
import { PICKLIST_KEYS } from '@shared/picklist-types'
import type { ApiBed, ApiHospitalization, ApiHospitalizationStatus, CreateHospitalizationInput } from '@shared/hospitalization-types'
import type { ApiEmployee } from '@shared/appointment-types'
import type { PatientSummary } from '@shared/patient-types'
import type { HospitalizationRecord } from './types'

interface HospitalizationFormModalProps {
  onClose: () => void
  onCreated: (hospitalization: ApiHospitalization) => void
  editing?: HospitalizationRecord
}

const inputClass =
  'w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-800 focus:border-accent-500 focus:outline-none'
const labelClass = 'mb-1 block text-xs font-medium text-gray-500'

const STATUS_OPTIONS: { value: ApiHospitalizationStatus; label: string }[] = [
  { value: 'EN_ATTENTE', label: 'En attente' },
  { value: 'HOSPITALISE', label: 'Hospitalisé' },
  { value: 'SORTI', label: 'Sorti' }
]

const LABEL_TO_API_STATUS: Record<string, ApiHospitalizationStatus> = {
  Hospitalisé: 'HOSPITALISE',
  'En attente': 'EN_ATTENTE',
  Sorti: 'SORTI'
}

function todayLocal(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export function HospitalizationFormModal({ onClose, onCreated, editing }: HospitalizationFormModalProps): JSX.Element {
  const [patients, setPatients] = useState<PatientSummary[]>([])
  const [doctors, setDoctors] = useState<ApiEmployee[]>([])
  const [beds, setBeds] = useState<ApiBed[]>([])
  const [patientId, setPatientId] = useState(editing?.patientId ?? '')
  const [doctorId, setDoctorId] = useState(editing?.doctorId ?? '')
  const [bedId, setBedId] = useState(editing?.bedId ?? '')
  const [admissionDate, setAdmissionDate] = useState(
    editing ? editing.admissionDate.toISOString().slice(0, 10) : todayLocal()
  )
  const [service, setService] = useState(editing && editing.service !== '—' ? editing.service : '')
  const [motive, setMotive] = useState(editing && editing.motive !== '—' ? editing.motive : '')
  const [status, setStatus] = useState<ApiHospitalizationStatus>(
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
    window.api.hospitalizations.beds().then((result) => {
      if (result.ok) {
        setBeds(result.data.beds.filter((b) => b.status === 'AVAILABLE' || b.id === editing?.bedId))
      }
    })
  }, [])

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!admissionDate) {
      setError("La date d'admission est requise.")
      return
    }

    setSubmitting(true)
    setError(null)

    const isoAdmission = new Date(admissionDate).toISOString()

    const result = editing
      ? await window.api.hospitalizations.update(editing.id, {
          patientId: patientId || null,
          doctorId: doctorId || null,
          bedId: bedId || null,
          admissionDate: isoAdmission,
          service: service.trim() || null,
          motive: motive.trim() || null,
          status
        })
      : await window.api.hospitalizations.create({
          patientId: patientId || undefined,
          doctorId: doctorId || undefined,
          bedId: bedId || undefined,
          admissionDate: isoAdmission,
          service: service.trim() || undefined,
          motive: motive.trim() || undefined,
          status: bedId ? 'HOSPITALISE' : 'EN_ATTENTE'
        } as CreateHospitalizationInput)
    setSubmitting(false)
    if (result.ok) {
      onCreated(result.data.hospitalization)
    } else {
      setError(result.error)
    }
  }

  return (
    <Modal title={editing ? "Modifier l'hospitalisation" : 'Nouvelle hospitalisation'} onClose={onClose} widthClassName="max-w-2xl">
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
            <label className={labelClass}>Lit disponible</label>
            <select value={bedId} onChange={(e) => setBedId(e.target.value)} className={inputClass}>
              <option value="">— En attente d&apos;un lit —</option>
              {beds.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.room} / {b.label} {b.service ? `— ${b.service}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Date d&apos;admission *</label>
            <input type="date" value={admissionDate} onChange={(e) => setAdmissionDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Service</label>
            <PicklistInput
              listKey={PICKLIST_KEYS.HOSPITALIZATION_SERVICE}
              value={service}
              onChange={setService}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Motif</label>
            <input value={motive} onChange={(e) => setMotive(e.target.value)} className={inputClass} />
          </div>
          {editing && (
            <div>
              <label className={labelClass}>Statut</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as ApiHospitalizationStatus)} className={inputClass}>
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
              "Créer l'hospitalisation"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
