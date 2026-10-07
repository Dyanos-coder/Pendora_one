import { useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Modal } from '@renderer/components/Modal'
import { Button } from '@renderer/components/Button'
import type { ApiHrEmployee, ApiPerformanceRating, ApiPerformanceReview } from '@shared/hr-types'

interface PerformanceFormModalProps {
  employees: ApiHrEmployee[]
  onClose: () => void
  onSaved: (review: ApiPerformanceReview) => void
  editing?: ApiPerformanceReview
}

const inputClass =
  'w-full rounded-[10px] border border-gray-300 px-3 py-1.5 text-sm text-gray-800 focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15'
const labelClass = 'mb-1.5 block text-xs font-semibold text-gray-700'

const RATING_OPTIONS: { value: ApiPerformanceRating; label: string }[] = [
  { value: 'INSUFFISANT', label: 'Insuffisant' },
  { value: 'A_AMELIORER', label: 'À améliorer' },
  { value: 'SATISFAISANT', label: 'Satisfaisant' },
  { value: 'BON', label: 'Bon' },
  { value: 'EXCELLENT', label: 'Excellent' }
]

export function PerformanceFormModal({ employees, onClose, onSaved, editing }: PerformanceFormModalProps): JSX.Element {
  const [employeeId, setEmployeeId] = useState(editing?.employeeId ?? employees[0]?.id ?? '')
  const [reviewDate, setReviewDate] = useState(editing?.reviewDate.slice(0, 10) ?? new Date().toISOString().slice(0, 10))
  const [reviewerName, setReviewerName] = useState(editing?.reviewerName ?? '')
  const [rating, setRating] = useState<ApiPerformanceRating>(editing?.rating ?? 'SATISFAISANT')
  const [comments, setComments] = useState(editing?.comments ?? '')
  const [nextReviewDate, setNextReviewDate] = useState(editing?.nextReviewDate?.slice(0, 10) ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!employeeId || !reviewDate || !reviewerName.trim()) {
      setError('Employé, date et évaluateur requis.')
      return
    }

    setSubmitting(true)
    setError(null)

    const base = {
      reviewDate: new Date(reviewDate).toISOString(),
      reviewerName: reviewerName.trim(),
      rating,
      comments: comments.trim() || undefined,
      nextReviewDate: nextReviewDate ? new Date(nextReviewDate).toISOString() : undefined
    }

    const result = editing
      ? await window.api.hr.performance.update(editing.id, base)
      : await window.api.hr.performance.create({ employeeId, ...base })
    setSubmitting(false)
    if (result.ok) {
      onSaved(result.data.review)
    } else {
      setError(result.error)
    }
  }

  return (
    <Modal title={editing ? "Modifier l'évaluation" : 'Nouvelle évaluation'} onClose={onClose} widthClassName="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClass}>Employé *</label>
          <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} disabled={!!editing} className={inputClass}>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.firstName} {emp.lastName}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Date de l&apos;évaluation *</label>
            <input type="date" value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Évaluateur *</label>
            <input value={reviewerName} onChange={(e) => setReviewerName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Note</label>
            <select value={rating} onChange={(e) => setRating(e.target.value as ApiPerformanceRating)} className={inputClass}>
              {RATING_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Prochaine évaluation</label>
            <input type="date" value={nextReviewDate} onChange={(e) => setNextReviewDate(e.target.value)} className={inputClass} />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Commentaires</label>
            <textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={3} className={inputClass} />
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
