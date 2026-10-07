import { useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Modal } from '@renderer/components/Modal'
import { Button } from '@renderer/components/Button'
import type { ApiQualityIndicator, ApiQualityIndicatorStatus, CreateQualityIndicatorInput } from '@shared/quality-types'

interface QualityIndicatorFormModalProps {
  onClose: () => void
  onCreated: (indicator: ApiQualityIndicator) => void
  editing?: ApiQualityIndicator
}

const inputClass =
  'w-full rounded-[10px] border border-gray-300 px-3 py-1.5 text-sm text-gray-800 focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15'
const labelClass = 'mb-1.5 block text-xs font-semibold text-gray-700'

const STATUS_OPTIONS: { value: ApiQualityIndicatorStatus; label: string }[] = [
  { value: 'CONFORME', label: 'Conforme' },
  { value: 'A_SURVEILLER', label: 'À surveiller' },
  { value: 'NON_CONFORME', label: 'Non conforme' }
]

export function QualityIndicatorFormModal({ onClose, onCreated, editing }: QualityIndicatorFormModalProps): JSX.Element {
  const [name, setName] = useState(editing?.name ?? '')
  const [category, setCategory] = useState(editing?.category ?? '')
  const [currentValue, setCurrentValue] = useState(editing?.currentValue ?? '')
  const [target, setTarget] = useState(editing?.target ?? '')
  const [status, setStatus] = useState<ApiQualityIndicatorStatus>(editing?.status ?? 'CONFORME')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!name.trim() || !category.trim() || !currentValue.trim() || !target.trim()) {
      setError('Tous les champs sont requis.')
      return
    }

    setSubmitting(true)
    setError(null)

    const result = editing
      ? await window.api.quality.updateIndicator(editing.id, {
          name: name.trim(),
          category: category.trim(),
          currentValue: currentValue.trim(),
          target: target.trim(),
          status
        })
      : await window.api.quality.createIndicator({
          name: name.trim(),
          category: category.trim(),
          currentValue: currentValue.trim(),
          target: target.trim(),
          status
        } as CreateQualityIndicatorInput)
    setSubmitting(false)
    if (result.ok) {
      onCreated(result.data.indicator)
    } else {
      setError(result.error)
    }
  }

  return (
    <Modal title={editing ? "Modifier l'indicateur qualité" : 'Nouvel indicateur qualité'} onClose={onClose} widthClassName="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className={labelClass}>Nom de l&apos;indicateur *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Catégorie *</label>
            <input value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Valeur actuelle *</label>
            <input value={currentValue} onChange={(e) => setCurrentValue(e.target.value)} placeholder="ex. 1,2%" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Cible *</label>
            <input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="ex. < 1,5%" className={inputClass} />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Statut</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as ApiQualityIndicatorStatus)} className={inputClass}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
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
              "Créer l'indicateur"
            )}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
