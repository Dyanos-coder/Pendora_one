import { useEffect, useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Modal } from '@renderer/components/Modal'
import { Button } from '@renderer/components/Button'
import { PicklistInput } from '@renderer/components/PicklistInput'
import { PICKLIST_KEYS } from '@shared/picklist-types'
import type { ApiBloodPouch } from '@shared/blood-bank-types'
import type { ApiDonation, ApiDonationStatus } from '@shared/blood-bank-types'
import type { PatientSummary } from '@shared/patient-types'

interface DonationFormModalProps {
  pouches: ApiBloodPouch[]
  onClose: () => void
  onSaved: (donation: ApiDonation) => void
  editing?: ApiDonation
}

const inputClass =
  'w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-800 focus:border-accent-500 focus:outline-none'
const labelClass = 'mb-1 block text-xs font-medium text-gray-500'

const BLOOD_GROUPS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']

const STATUS_OPTIONS: { value: ApiDonationStatus; label: string }[] = [
  { value: 'PLANIFIE', label: 'Planifié' },
  { value: 'COLLECTE', label: 'Collecté' },
  { value: 'AJOURNE', label: 'Ajourné' }
]

export function DonationFormModal({ pouches, onClose, onSaved, editing }: DonationFormModalProps): JSX.Element {
  const [donorMode, setDonorMode] = useState<'patient' | 'external'>(editing?.patientId ? 'patient' : 'external')
  const [patients, setPatients] = useState<PatientSummary[]>([])
  const [patientId, setPatientId] = useState(editing?.patientId ?? '')
  const [donorName, setDonorName] = useState(editing?.patientId ? '' : (editing?.donorName ?? ''))
  const [donorPhone, setDonorPhone] = useState(editing?.donorPhone ?? '')
  const [bloodGroup, setBloodGroup] = useState(editing?.bloodGroup ?? 'O+')
  const [donationDate, setDonationDate] = useState(
    editing ? editing.donationDate.slice(0, 10) : new Date().toISOString().slice(0, 10)
  )
  const [volumeMl, setVolumeMl] = useState<number | ''>(editing?.volumeMl ?? 450)
  const [status, setStatus] = useState<ApiDonationStatus>(editing?.status ?? 'PLANIFIE')
  const [pouchId, setPouchId] = useState(editing?.pouchId ?? '')
  const [note, setNote] = useState(editing?.note ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (donorMode !== 'patient') return
    window.api.patients.list().then((result) => {
      if (result.ok) setPatients(result.data.patients)
    })
  }, [donorMode])

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    const selectedPatient = donorMode === 'patient' ? patients.find((p) => p.id === patientId) : null
    if (donorMode === 'patient' && !selectedPatient) {
      setError('Sélectionnez un patient.')
      return
    }
    if (donorMode === 'external' && !donorName.trim()) {
      setError('Nom du donneur requis.')
      return
    }

    setSubmitting(true)
    setError(null)

    const base = {
      patientId: donorMode === 'patient' ? patientId : undefined,
      donorName: selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : donorName.trim(),
      donorPhone: donorPhone.trim() || undefined,
      bloodGroup,
      donationDate: new Date(donationDate).toISOString(),
      volumeMl: volumeMl === '' ? undefined : volumeMl,
      status,
      pouchId: pouchId || undefined,
      note: note.trim() || undefined
    }

    const result = editing
      ? await window.api.bloodBank.donations.update(editing.id, base)
      : await window.api.bloodBank.donations.create(base)
    setSubmitting(false)
    if (result.ok) {
      onSaved(result.data.donation)
    } else {
      setError(result.error)
    }
  }

  return (
    <Modal title={editing ? 'Modifier le don' : 'Nouveau don de sang'} onClose={onClose} widthClassName="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClass}>Donneur</label>
          <div className="mb-2 flex gap-1 rounded-lg bg-gray-100 p-1 text-xs font-medium">
            <button
              type="button"
              onClick={() => setDonorMode('patient')}
              className={`flex-1 rounded-md py-1.5 transition-colors ${donorMode === 'patient' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
            >
              Patient existant
            </button>
            <button
              type="button"
              onClick={() => {
                setDonorMode('external')
                setPatientId('')
              }}
              className={`flex-1 rounded-md py-1.5 transition-colors ${donorMode === 'external' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
            >
              Personne externe
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {donorMode === 'patient' ? (
            <div className="col-span-2">
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
          ) : (
            <div>
              <label className={labelClass}>Nom du donneur *</label>
              <PicklistInput
                listKey={PICKLIST_KEYS.BLOOD_DONOR_NAME}
                value={donorName}
                onChange={setDonorName}
                className={inputClass}
              />
            </div>
          )}
          <div>
            <label className={labelClass}>Téléphone</label>
            <input value={donorPhone} onChange={(e) => setDonorPhone(e.target.value)} className={inputClass} />
          </div>
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
            <label className={labelClass}>Volume (ml)</label>
            <input
              type="number"
              min={0}
              value={volumeMl}
              onChange={(e) => setVolumeMl(e.target.value === '' ? '' : Number(e.target.value))}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Date du don *</label>
            <input type="date" value={donationDate} onChange={(e) => setDonationDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Statut</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as ApiDonationStatus)} className={inputClass}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Poche associée (si déjà collectée)</label>
            <select value={pouchId} onChange={(e) => setPouchId(e.target.value)} className={inputClass}>
              <option value="">— Aucune —</option>
              {pouches.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.pouchNumber} — {p.bloodGroup} ({p.component})
                </option>
              ))}
            </select>
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
