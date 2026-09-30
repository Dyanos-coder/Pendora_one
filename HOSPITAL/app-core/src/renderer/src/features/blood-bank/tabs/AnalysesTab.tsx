import { useEffect, useState } from 'react'
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@renderer/components/Button'
import { StatusBadge, type StatusTone } from '@renderer/components/StatusBadge'
import { ConfirmDialog } from '@renderer/components/ConfirmDialog'
import type { ApiBloodAnalysis, ApiBloodAnalysisResult, ApiBloodPouch } from '@shared/blood-bank-types'
import { BloodAnalysisFormModal } from './BloodAnalysisFormModal'

const RESULT_LABEL: Record<ApiBloodAnalysisResult, string> = {
  EN_ATTENTE: 'En attente',
  NEGATIF: 'Négatif',
  POSITIF: 'Positif'
}

const RESULT_TONE: Record<ApiBloodAnalysisResult, StatusTone> = {
  EN_ATTENTE: 'neutral',
  NEGATIF: 'success',
  POSITIF: 'danger'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR')
}

export function AnalysesTab({ pouches }: { pouches: ApiBloodPouch[] }): JSX.Element {
  const [analyses, setAnalyses] = useState<ApiBloodAnalysis[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editing, setEditing] = useState<ApiBloodAnalysis | null>(null)
  const [deleting, setDeleting] = useState<ApiBloodAnalysis | null>(null)

  useEffect(() => {
    let cancelled = false
    window.api.bloodBank.analyses.list().then((result) => {
      if (cancelled) return
      if (result.ok) setAnalyses(result.data.analyses)
      else setError(result.error)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 px-6 py-12 text-sm text-gray-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Chargement…
      </div>
    )
  }
  if (error) return <p className="px-6 py-8 text-center text-sm text-red-500">{error}</p>

  return (
    <>
      <div className="flex items-center justify-end border-b border-gray-100 px-6 py-3">
        <Button size="sm" onClick={() => setShowCreateModal(true)} disabled={pouches.length === 0}>
          <Plus className="h-3.5 w-3.5" />
          Nouvelle analyse
        </Button>
      </div>

      {showCreateModal && (
        <BloodAnalysisFormModal
          pouches={pouches}
          onClose={() => setShowCreateModal(false)}
          onSaved={(a) => {
            setAnalyses((prev) => [a, ...prev])
            setShowCreateModal(false)
          }}
        />
      )}
      {editing && (
        <BloodAnalysisFormModal
          pouches={pouches}
          editing={editing}
          onClose={() => setEditing(null)}
          onSaved={(a) => {
            setAnalyses((prev) => prev.map((x) => (x.id === a.id ? a : x)))
            setEditing(null)
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Supprimer l'analyse"
          message={`Voulez-vous vraiment supprimer l'analyse ${deleting.reference} ?`}
          onCancel={() => setDeleting(null)}
          onConfirm={() => window.api.bloodBank.analyses.delete(deleting.id)}
          onConfirmed={() => {
            setAnalyses((prev) => prev.filter((x) => x.id !== deleting.id))
            setDeleting(null)
          }}
        />
      )}

      {analyses.length === 0 ? (
        <p className="px-6 py-12 text-center text-sm text-gray-400">Aucune analyse enregistrée.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                <th className="px-6 py-2.5 font-medium">Référence</th>
                <th className="px-6 py-2.5 font-medium">Poche</th>
                <th className="px-6 py-2.5 font-medium">Type</th>
                <th className="px-6 py-2.5 font-medium">Résultat</th>
                <th className="px-6 py-2.5 font-medium">Date</th>
                <th className="px-6 py-2.5 font-medium">Réalisée par</th>
                <th className="px-6 py-2.5 font-medium" />
              </tr>
            </thead>
            <tbody>
              {analyses.map((a) => (
                <tr key={a.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-900">{a.reference}</td>
                  <td className="px-6 py-3 text-gray-600">{a.pouchNumber}</td>
                  <td className="px-6 py-3 text-gray-600">{a.testType}</td>
                  <td className="px-6 py-3">
                    <StatusBadge label={RESULT_LABEL[a.result]} tone={RESULT_TONE[a.result]} />
                  </td>
                  <td className="px-6 py-3 text-gray-600">{formatDate(a.performedAt)}</td>
                  <td className="px-6 py-3 text-gray-600">{a.performedBy}</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditing(a)}
                        title="Modifier"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleting(a)}
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
