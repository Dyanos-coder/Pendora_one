import { useEffect, useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Modal } from '@renderer/components/Modal'
import { Button } from '@renderer/components/Button'
import type { ApiBloodPouch, ApiTransfusion, ApiTransfusionRequest } from '@shared/blood-bank-types'
import type { PatientSummary } from '@shared/patient-types'

interface TransfusionFormModalProps {
  pouches: ApiBloodPouch[]
  requests: ApiTransfusionRequest[]
  onClose: () => void
  onSaved: (transfusion: ApiTransfusion) => void
  editing?: ApiTransfusion
}

const inputClass =
  'w-full rounded-[10px] border border-gray-300 px-3 py-1.5 text-sm text-gray-800 focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15'
const labelClass = 'mb-1.5 block text-xs font-semibold text-gray-700'

export function TransfusionFormModal({ pouches, requests, onClose, onSaved, editing }: TransfusionFormModalProps): JSX.Element {
  const [patients, setPatients] = useState<PatientSummary[]>([])
  const availablePouches = pouches.filter((p) => p.status === 'DISPONIBLE' || p.status === 'RESERVEE')
  const [patientId, setPatientId] = useState(editing?.patientId ?? '')
  const [pouchId, setPouchId] = useState(editing?.pouchId ?? availablePouches[0]?.id ?? '')
  const [requestId, setRequestId] = useState(editing?.requestId ?? '')
  const [transfusedAt, setTransfusedAt] = useState(editing ? editing.transfusedAt.slice(0, 10) : new Date().toISOString().slice(0, 10))
  const [administeredBy, setAdministeredBy] = useState(editing?.administeredBy ?? '')
  const [reaction, setReaction] = useState(editing?.reaction ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    window.api.patients.list().then((result) => {
      if (result.ok) setPatients(result.data.patients)
    })
  }, [])

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!administeredBy.trim() || (!editing && (!patientId || !pouchId))) {
      setError('Patient, poche et personnel soignant requis.')
      return
    }

    setSubmitting(true)
    setError(null)

    const result = editing
      ? await window.api.bloodBank.transfusions.update(editing.id, {
          transfusedAt: new Date(transfusedAt).toISOString(),
          administeredBy: administeredBy.trim(),
          reaction: reaction.trim() || null
        })
      : await window.api.bloodBank.transfusions.create({
          patientId,
          pouchId,
          requestId: requestId || undefined,
          transfusedAt: new Date(transfusedAt).toISOString(),
          administeredBy: administeredBy.trim(),
          reaction: reaction.trim() || undefined
        })
    setSubmitting(false)
    if (result.ok) {
      onSaved(result.data.transfusion)
    } else {
      setError(result.error)
    }
  }

  return (
    <Modal title={editing ? 'Modifier la transfusion' : 'Nouvelle transfusion'} onClose={onClose} widthClassName="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {!editing && (
          <>
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
            <div>
              <label className={labelClass}>Poche *</label>
              <select value={pouchId} onChange={(e) => setPouchId(e.target.value)} className={inputClass}>
                {availablePouches.length === 0 && <option value="">Aucune poche disponible</option>}
                {availablePouches.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.pouchNumber} — {p.bloodGroup} ({p.component})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Demande liée (facultatif)</label>
              <select value={requestId} onChange={(e) => setRequestId(e.target.value)} className={inputClass}>
                <option value="">— Aucune —</option>
                {requests.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.reference} — {r.patientName}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Date de transfusion *</label>
            <input type="date" value={transfusedAt} onChange={(e) => setTransfusedAt(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Réalisée par *</label>
            <input value={administeredBy} onChange={(e) => setAdministeredBy(e.target.value)} className={inputClass} />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Réaction observée</label>
            <input value={reaction} onChange={(e) => setReaction(e.target.value)} className={inputClass} />
          </div>
        </div>
        {!editing && (
          <p className="text-xs text-gray-400">
            La poche sera marquée « Transfusée », et la demande liée (si choisie) passera au statut « Honorée ».
          </p>
        )}

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
