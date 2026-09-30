import { useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Modal } from '@renderer/components/Modal'
import { Button } from '@renderer/components/Button'
import type { ApiBloodAnalysis, ApiBloodAnalysisResult, ApiBloodPouch } from '@shared/blood-bank-types'

interface BloodAnalysisFormModalProps {
  pouches: ApiBloodPouch[]
  onClose: () => void
  onSaved: (analysis: ApiBloodAnalysis) => void
  editing?: ApiBloodAnalysis
}

const inputClass =
  'w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-800 focus:border-accent-500 focus:outline-none'
const labelClass = 'mb-1 block text-xs font-medium text-gray-500'

const TEST_TYPES = ['Groupage sanguin', 'Sérologie VIH', 'Sérologie hépatite B', 'Sérologie hépatite C', 'Syphilis (TPHA/VDRL)']

const RESULT_OPTIONS: { value: ApiBloodAnalysisResult; label: string }[] = [
  { value: 'EN_ATTENTE', label: 'En attente' },
  { value: 'NEGATIF', label: 'Négatif' },
  { value: 'POSITIF', label: 'Positif' }
]

export function BloodAnalysisFormModal({ pouches, onClose, onSaved, editing }: BloodAnalysisFormModalProps): JSX.Element {
  const [pouchId, setPouchId] = useState(editing?.pouchId ?? pouches[0]?.id ?? '')
  const [testType, setTestType] = useState(editing?.testType ?? TEST_TYPES[0])
  const [result, setResult] = useState<ApiBloodAnalysisResult>(editing?.result ?? 'EN_ATTENTE')
  const [performedBy, setPerformedBy] = useState(editing?.performedBy ?? '')
  const [performedAt, setPerformedAt] = useState(
    editing ? editing.performedAt.slice(0, 10) : new Date().toISOString().slice(0, 10)
  )
  const [note, setNote] = useState(editing?.note ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!performedBy.trim() || (!editing && !pouchId)) {
      setError('Poche et analyste requis.')
      return
    }

    setSubmitting(true)
    setError(null)

    const base = {
      testType,
      result,
      performedBy: performedBy.trim(),
      performedAt: new Date(performedAt).toISOString(),
      note: note.trim() || undefined
    }

    const result_ = editing
      ? await window.api.bloodBank.analyses.update(editing.id, base)
      : await window.api.bloodBank.analyses.create({ pouchId, ...base })
    setSubmitting(false)
    if (result_.ok) {
      onSaved(result_.data.analysis)
    } else {
      setError(result_.error)
    }
  }

  return (
    <Modal title={editing ? "Modifier l'analyse" : 'Nouvelle analyse'} onClose={onClose} widthClassName="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {!editing && (
          <div>
            <label className={labelClass}>Poche *</label>
            <select value={pouchId} onChange={(e) => setPouchId(e.target.value)} className={inputClass}>
              {pouches.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.pouchNumber} — {p.bloodGroup} ({p.component})
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className={labelClass}>Type d&apos;analyse *</label>
            <select value={testType} onChange={(e) => setTestType(e.target.value)} className={inputClass}>
              {TEST_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Résultat</label>
            <select value={result} onChange={(e) => setResult(e.target.value as ApiBloodAnalysisResult)} className={inputClass}>
              {RESULT_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Date *</label>
            <input type="date" value={performedAt} onChange={(e) => setPerformedAt(e.target.value)} className={inputClass} />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Réalisée par *</label>
            <input value={performedBy} onChange={(e) => setPerformedBy(e.target.value)} className={inputClass} />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Note</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} />
          </div>
        </div>
        <p className="text-xs text-gray-400">
          Un résultat positif écarte automatiquement la poche ; un résultat négatif sur une poche en attente la rend disponible.
        </p>

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
