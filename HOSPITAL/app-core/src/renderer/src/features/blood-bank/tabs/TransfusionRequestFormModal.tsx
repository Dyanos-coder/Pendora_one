import { useEffect, useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Modal } from '@renderer/components/Modal'
import { Button } from '@renderer/components/Button'
import type { ApiTransfusionRequest, ApiTransfusionRequestUrgency } from '@shared/blood-bank-types'
import type { PatientSummary } from '@shared/patient-types'

interface TransfusionRequestFormModalProps {
  onClose: () => void
  onSaved: (request: ApiTransfusionRequest) => void
  editing?: ApiTransfusionRequest
}

const inputClass =
  'w-full rounded-[10px] border border-gray-300 px-3 py-1.5 text-sm text-gray-800 focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15'
const labelClass = 'mb-1.5 block text-xs font-semibold text-gray-700'

const BLOOD_GROUPS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']
const COMPONENTS = ['Concentré de globules rouges', 'Plasma frais congelé', 'Plasma thérapeutique', 'Plaquettes']

const URGENCY_OPTIONS: { value: ApiTransfusionRequestUrgency; label: string }[] = [
  { value: 'NORMALE', label: 'Normale' },
  { value: 'URGENTE', label: 'Urgente' }
]

export function TransfusionRequestFormModal({ onClose, onSaved, editing }: TransfusionRequestFormModalProps): JSX.Element {
  const [patients, setPatients] = useState<PatientSummary[]>([])
  const [patientId, setPatientId] = useState(editing?.patientId ?? '')
  const [bloodGroup, setBloodGroup] = useState(editing?.bloodGroup ?? 'O+')
  const [component, setComponent] = useState(editing?.component ?? COMPONENTS[0])
  const [quantityUnits, setQuantityUnits] = useState(editing?.quantityUnits.toString() ?? '1')
  const [urgency, setUrgency] = useState<ApiTransfusionRequestUrgency>(editing?.urgency ?? 'NORMALE')
  const [requestedBy, setRequestedBy] = useState(editing?.requestedBy ?? '')
  const [requestedAt, setRequestedAt] = useState(editing ? editing.requestedAt.slice(0, 10) : new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState(editing?.note ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    window.api.patients.list().then((result) => {
      if (result.ok) setPatients(result.data.patients)
    })
  }, [])

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if ((!editing && !patientId) || !requestedBy.trim() || !quantityUnits) {
      setError('Patient, demandeur et quantité requis.')
      return
    }

    setSubmitting(true)
    setError(null)

    const base = {
      bloodGroup,
      component,
      quantityUnits: Number(quantityUnits),
      urgency,
      requestedBy: requestedBy.trim(),
      requestedAt: new Date(requestedAt).toISOString(),
      note: note.trim() || undefined
    }

    const result = editing
      ? await window.api.bloodBank.requests.update(editing.id, base)
      : await window.api.bloodBank.requests.create({ patientId, ...base })
    setSubmitting(false)
    if (result.ok) {
      onSaved(result.data.request)
    } else {
      setError(result.error)
    }
  }

  return (
    <Modal title={editing ? 'Modifier la demande' : 'Nouvelle demande transfusionnelle'} onClose={onClose} widthClassName="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {!editing && (
          <div>
            <label className={labelClass}>Patient *</label>
            <select value={patientId} onChange={(e) => setPatientId(e.target.value)} className={inputClass}>
              <option value="">— Sélectionner —</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.firstName} {p.lastName} ({p.code})
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Groupe sanguin *</label>
            <select value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)} className={inputClass}>
              {BLOOD_GROUPS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Composant *</label>
            <select value={component} onChange={(e) => setComponent(e.target.value)} className={inputClass}>
              {COMPONENTS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Quantité (unités) *</label>
            <input type="number" min={1} value={quantityUnits} onChange={(e) => setQuantityUnits(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Urgence</label>
            <select value={urgency} onChange={(e) => setUrgency(e.target.value as ApiTransfusionRequestUrgency)} className={inputClass}>
              {URGENCY_OPTIONS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Demandeur *</label>
            <input value={requestedBy} onChange={(e) => setRequestedBy(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Date de la demande *</label>
            <input type="date" value={requestedAt} onChange={(e) => setRequestedAt(e.target.value)} className={inputClass} />
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
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : editing ? 'Enregistrer' : 'Créer'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
