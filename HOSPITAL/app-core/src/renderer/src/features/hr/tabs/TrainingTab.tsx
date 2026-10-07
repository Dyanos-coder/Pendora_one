import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, BadgeCheck } from 'lucide-react'
import { Button } from '@renderer/components/Button'
import { StatusBadge, type StatusTone } from '@renderer/components/StatusBadge'
import { ConfirmDialog } from '@renderer/components/ConfirmDialog'
import type { ApiHrEmployee, ApiTraining, ApiTrainingStatus } from '@shared/hr-types'
import { TrainingFormModal } from './TrainingFormModal'
import { PulseLoader, EmptyState } from '@renderer/components/ui/Feedback'

const STATUS_LABEL: Record<ApiTrainingStatus, string> = {
  PLANIFIEE: 'Planifiée',
  EN_COURS: 'En cours',
  TERMINEE: 'Terminée',
  ANNULEE: 'Annulée'
}

const STATUS_TONE: Record<ApiTrainingStatus, StatusTone> = {
  PLANIFIEE: 'info',
  EN_COURS: 'warning',
  TERMINEE: 'success',
  ANNULEE: 'neutral'
}

function formatDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString('fr-FR') : '—'
}

export function TrainingTab({ employees }: { employees: ApiHrEmployee[] }): JSX.Element {
  const [trainings, setTrainings] = useState<ApiTraining[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editing, setEditing] = useState<ApiTraining | null>(null)
  const [deleting, setDeleting] = useState<ApiTraining | null>(null)

  useEffect(() => {
    let cancelled = false
    window.api.hr.training.list().then((result) => {
      if (cancelled) return
      if (result.ok) setTrainings(result.data.trainings)
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
          Nouvelle formation
        </Button>
      </div>

      {showCreateModal && (
        <TrainingFormModal
          employees={employees}
          onClose={() => setShowCreateModal(false)}
          onSaved={(t) => {
            setTrainings((prev) => [t, ...prev])
            setShowCreateModal(false)
          }}
        />
      )}
      {editing && (
        <TrainingFormModal
          employees={employees}
          editing={editing}
          onClose={() => setEditing(null)}
          onSaved={(t) => {
            setTrainings((prev) => prev.map((x) => (x.id === t.id ? t : x)))
            setEditing(null)
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Supprimer la formation"
          message={`Voulez-vous vraiment supprimer la formation « ${deleting.title} » de ${deleting.employeeName} ?`}
          onCancel={() => setDeleting(null)}
          onConfirm={() => window.api.hr.training.delete(deleting.id)}
          onConfirmed={() => {
            setTrainings((prev) => prev.filter((x) => x.id !== deleting.id))
            setDeleting(null)
          }}
        />
      )}

      {trainings.length === 0 ? (
        <EmptyState title="Aucune formation enregistrée." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/70 text-[11px] uppercase tracking-[0.08em] text-gray-500">
                <th className="px-6 py-3 font-semibold">Employé</th>
                <th className="px-6 py-3 font-semibold">Formation</th>
                <th className="px-6 py-3 font-semibold">Organisme</th>
                <th className="px-6 py-3 font-semibold">Début</th>
                <th className="px-6 py-3 font-semibold">Fin</th>
                <th className="px-6 py-3 font-semibold">Statut</th>
                <th className="px-6 py-3 font-semibold">Certifié</th>
                <th className="px-6 py-3 font-semibold" />
              </tr>
            </thead>
            <tbody>
              {trainings.map((t) => (
                <tr key={t.id} className="border-b border-gray-100 last:border-0 transition-colors hover:bg-accent-50/40">
                  <td className="px-6 py-3 font-medium text-gray-900">{t.employeeName}</td>
                  <td className="px-6 py-3 text-gray-600">{t.title}</td>
                  <td className="px-6 py-3 text-gray-600">{t.provider ?? '—'}</td>
                  <td className="px-6 py-3 text-gray-600">{formatDate(t.startDate)}</td>
                  <td className="px-6 py-3 text-gray-600">{formatDate(t.endDate)}</td>
                  <td className="px-6 py-3">
                    <StatusBadge label={STATUS_LABEL[t.status]} tone={STATUS_TONE[t.status]} />
                  </td>
                  <td className="px-6 py-3">
                    {t.certified ? <BadgeCheck className="h-4 w-4 text-teal-500" /> : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditing(t)}
                        title="Modifier"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleting(t)}
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
