import { useEffect, useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Modal } from '@renderer/components/Modal'
import { Button } from '@renderer/components/Button'
import type { ApiBloodPouch, ApiBloodPouchStatus, CreateBloodPouchInput } from '@shared/blood-bank-types'
import type { PatientSummary } from '@shared/patient-types'

interface BloodPouchFormModalProps {
  onClose: () => void
  onCreated: (pouch: ApiBloodPouch) => void
  editing?: ApiBloodPouch
}

const inputClass =
  'w-full rounded-[10px] border border-gray-300 px-3 py-1.5 text-sm text-gray-800 focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15'
const labelClass = 'mb-1.5 block text-xs font-semibold text-gray-700'

const BLOOD_GROUPS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']
const COMPONENTS = ['Concentré de globules rouges', 'Plasma frais congelé', 'Plasma thérapeutique', 'Plaquettes']

const STATUS_OPTIONS: { value: ApiBloodPouchStatus; label: string }[] = [
  { value: 'EN_ATTENTE_ANALYSE', label: 'En attente analyse' },
  { value: 'DISPONIBLE', label: 'Disponible' },
  { value: 'RESERVEE', label: 'Réservée' },
  { value: 'TRANSFUSEE', label: 'Transfusée' },
  { value: 'PERIMEE', label: 'Périmée' },
  { value: 'ECARTEE', label: 'Écartée' }
]

function todayLocal(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export function BloodPouchFormModal({ onClose, onCreated, editing }: BloodPouchFormModalProps): JSX.Element {
  const [patients, setPatients] = useState<PatientSummary[]>([])
  const [bloodGroup, setBloodGroup] = useState(editing?.bloodGroup ?? 'O+')
  const [component, setComponent] = useState(editing?.component ?? COMPONENTS[0])
  const [volumeMl, setVolumeMl] = useState<number | ''>(editing?.volumeMl ?? 450)
  const [donorName, setDonorName] = useState(editing?.donorName ?? '')
  const [patientId, setPatientId] = useState(editing?.patientId ?? '')
  const [collectionDate, setCollectionDate] = useState(editing ? editing.collectionDate.slice(0, 10) : todayLocal())
  const [expiryDate, setExpiryDate] = useState(editing ? editing.expiryDate.slice(0, 10) : '')
  const [status, setStatus] = useState<ApiBloodPouchStatus>(editing?.status ?? 'EN_ATTENTE_ANALYSE')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    window.api.patients.list().then((result) => {
      if (result.ok) setPatients(result.data.patients)
    })
  }, [])

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!donorName.trim() || !collectionDate || !expiryDate) {
      setError('Donneur, date de collecte et date d’expiration sont requis.')
      return
    }

    setSubmitting(true)
    setError(null)

    const result = editing
      ? await window.api.bloodBank.update(editing.id, {
          bloodGroup,
          component,
          volumeMl: volumeMl === '' ? null : volumeMl,
          donorName: donorName.trim(),
          patientId: patientId || null,
          collectionDate: new Date(collectionDate).toISOString(),
          expiryDate: new Date(expiryDate).toISOString(),
          status
        })
      : await window.api.bloodBank.create({
          bloodGroup,
          component,
          volumeMl: volumeMl === '' ? undefined : volumeMl,
          donorName: donorName.trim(),
          patientId: patientId || undefined,
          collectionDate: new Date(collectionDate).toISOString(),
          expiryDate: new Date(expiryDate).toISOString()
        } as CreateBloodPouchInput)
    setSubmitting(false)
    if (result.ok) {
      onCreated(result.data.pouch)
    } else {
      setError(result.error)
    }
  }

  return (
    <Modal title={editing ? 'Modifier la poche de sang' : 'Nouvelle poche de sang'} onClose={onClose} widthClassName="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
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
            <label className={labelClass}>Donneur *</label>
            <input value={donorName} onChange={(e) => setDonorName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Date de collecte *</label>
            <input type="date" value={collectionDate} onChange={(e) => setCollectionDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Date d&apos;expiration *</label>
            <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className={inputClass} />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Patient receveur (si connu)</label>
            <select value={patientId} onChange={(e) => setPatientId(e.target.value)} className={inputClass}>
              <option value="">— Aucun —</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.firstName} {p.lastName} ({p.code})
                </option>
              ))}
            </select>
          </div>
          {editing && (
            <div className="col-span-2">
              <label className={labelClass}>Statut</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as ApiBloodPouchStatus)} className={inputClass}>
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
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : editing ? 'Enregistrer les modifications' : 'Créer la poche'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
