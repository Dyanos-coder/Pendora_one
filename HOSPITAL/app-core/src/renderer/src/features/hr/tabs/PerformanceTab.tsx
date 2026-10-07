import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@renderer/components/Button'
import { StatusBadge, type StatusTone } from '@renderer/components/StatusBadge'
import { ConfirmDialog } from '@renderer/components/ConfirmDialog'
import type { ApiHrEmployee, ApiPerformanceRating, ApiPerformanceReview } from '@shared/hr-types'
import { PerformanceFormModal } from './PerformanceFormModal'
import { PulseLoader, EmptyState } from '@renderer/components/ui/Feedback'

const RATING_LABEL: Record<ApiPerformanceRating, string> = {
  INSUFFISANT: 'Insuffisant',
  A_AMELIORER: 'À améliorer',
  SATISFAISANT: 'Satisfaisant',
  BON: 'Bon',
  EXCELLENT: 'Excellent'
}

const RATING_TONE: Record<ApiPerformanceRating, StatusTone> = {
  INSUFFISANT: 'danger',
  A_AMELIORER: 'warning',
  SATISFAISANT: 'neutral',
  BON: 'info',
  EXCELLENT: 'success'
}

function formatDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString('fr-FR') : '—'
}

export function PerformanceTab({ employees }: { employees: ApiHrEmployee[] }): JSX.Element {
  const [reviews, setReviews] = useState<ApiPerformanceReview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editing, setEditing] = useState<ApiPerformanceReview | null>(null)
  const [deleting, setDeleting] = useState<ApiPerformanceReview | null>(null)

  useEffect(() => {
    let cancelled = false
    window.api.hr.performance.list().then((result) => {
      if (cancelled) return
      if (result.ok) setReviews(result.data.reviews)
      else setError(result.error)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return <PulseLoader label="Chargement…" />
  }
  if (error) return <p className="px-6 py-8 text-center text-sm text-red-500">{error}</p>

  return (
    <>
      <div className="flex items-center justify-end border-b border-gray-100 px-6 py-3">
        <Button size="sm" onClick={() => setShowCreateModal(true)}>
          <Plus className="h-3.5 w-3.5" />
          Nouvelle évaluation
        </Button>
      </div>

      {showCreateModal && (
        <PerformanceFormModal
          employees={employees}
          onClose={() => setShowCreateModal(false)}
          onSaved={(r) => {
            setReviews((prev) => [r, ...prev])
            setShowCreateModal(false)
          }}
        />
      )}
      {editing && (
        <PerformanceFormModal
          employees={employees}
          editing={editing}
          onClose={() => setEditing(null)}
          onSaved={(r) => {
            setReviews((prev) => prev.map((x) => (x.id === r.id ? r : x)))
            setEditing(null)
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Supprimer l'évaluation"
          message={`Voulez-vous vraiment supprimer l'évaluation de ${deleting.employeeName} du ${formatDate(deleting.reviewDate)} ?`}
          onCancel={() => setDeleting(null)}
          onConfirm={() => window.api.hr.performance.delete(deleting.id)}
          onConfirmed={() => {
            setReviews((prev) => prev.filter((x) => x.id !== deleting.id))
            setDeleting(null)
          }}
        />
      )}

      {reviews.length === 0 ? (
        <EmptyState title="Aucune évaluation enregistrée." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/70 text-[11px] uppercase tracking-[0.08em] text-gray-500">
                <th className="px-6 py-3 font-semibold">Employé</th>
                <th className="px-6 py-3 font-semibold">Date</th>
                <th className="px-6 py-3 font-semibold">Évaluateur</th>
                <th className="px-6 py-3 font-semibold">Note</th>
                <th className="px-6 py-3 font-semibold">Prochaine éval.</th>
                <th className="px-6 py-3 font-semibold" />
              </tr>
            </thead>
            <tbody>
              {reviews.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 last:border-0 transition-colors hover:bg-accent-50/40">
                  <td className="px-6 py-3 font-medium text-gray-900">{r.employeeName}</td>
                  <td className="px-6 py-3 text-gray-600">{formatDate(r.reviewDate)}</td>
                  <td className="px-6 py-3 text-gray-600">{r.reviewerName}</td>
                  <td className="px-6 py-3">
                    <StatusBadge label={RATING_LABEL[r.rating]} tone={RATING_TONE[r.rating]} />
                  </td>
                  <td className="px-6 py-3 text-gray-600">{formatDate(r.nextReviewDate)}</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditing(r)}
                        title="Modifier"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleting(r)}
                        title="Supprimer"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
