import { useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Modal } from '@renderer/components/Modal'
import { Button } from '@renderer/components/Button'
import type { ApiRisk, ApiRiskStatus, CreateRiskInput } from '@shared/risk-types'
import type { Risk } from './types'

interface RiskFormModalProps {
  onClose: () => void
  onCreated: (risk: ApiRisk) => void
  editing?: Risk
}

const inputClass =
  'w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-800 focus:border-accent-500 focus:outline-none'
const labelClass = 'mb-1 block text-xs font-medium text-gray-500'

const SCALE_OPTIONS = [
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' }
]

const STATUS_OPTIONS: { value: ApiRiskStatus; label: string }[] = [
  { value: 'OUVERT', label: 'Ouvert' },
  { value: 'EN_TRAITEMENT', label: 'En traitement' },
  { value: 'CLOS', label: 'Clos' }
]

const LABEL_TO_API_STATUS: Record<string, ApiRiskStatus> = {
  Ouvert: 'OUVERT',
  'En traitement': 'EN_TRAITEMENT',
  Clos: 'CLOS'
}

export function RiskFormModal({ onClose, onCreated, editing }: RiskFormModalProps): JSX.Element {
  const [title, setTitle] = useState(editing?.title ?? '')
  const [category, setCategory] = useState(editing?.category ?? '')
  const [probability, setProbability] = useState<number>(editing?.probability ?? 2)
  const [impact, setImpact] = useState<number>(editing?.impact ?? 2)
  const [owner, setOwner] = useState(editing?.owner ?? '')
  const [status, setStatus] = useState<ApiRiskStatus>(
    editing ? (LABEL_TO_API_STATUS[editing.status] ?? 'OUVERT') : 'OUVERT'
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!title.trim() || !category.trim() || !owner.trim()) {
      setError('Titre, catégorie et responsable sont requis.')
      return
    }

    setSubmitting(true)
    setError(null)

    const result = editing
      ? await window.api.risk.update(editing.id, {
          title: title.trim(),
          category: category.trim(),
          probability,
          impact,
          owner: owner.trim(),
          status
        })
      : await window.api.risk.create({
          title: title.trim(),
          category: category.trim(),
          probability,
          impact,
          owner: owner.trim()
        } as CreateRiskInput)
    setSubmitting(false)
    if (result.ok) {
      onCreated(result.data.risk)
    } else {
      setError(result.error)
    }
  }

  return (
    <Modal title={editing ? 'Modifier le risque' : 'Déclarer un risque'} onClose={onClose} widthClassName="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className={labelClass}>Titre du risque *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Catégorie *</label>
            <input value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Probabilité (1-4)</label>
            <select value={probability} onChange={(e) => setProbability(Number(e.target.value))} className={inputClass}>
              {SCALE_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Impact (1-4)</label>
            <select value={impact} onChange={(e) => setImpact(Number(e.target.value))} className={inputClass}>
              {SCALE_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Responsable *</label>
            <input value={owner} onChange={(e) => setOwner(e.target.value)} className={inputClass} />
          </div>
          {editing && (
            <div className="col-span-2">
              <label className={labelClass}>Statut</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as ApiRiskStatus)} className={inputClass}>
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
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : editing ? 'Enregistrer les modifications' : 'Déclarer le risque'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
