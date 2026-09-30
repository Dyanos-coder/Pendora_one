import { useEffect, useState } from 'react'
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@renderer/components/Button'
import { ConfirmDialog } from '@renderer/components/ConfirmDialog'
import type { ApiBloodPouch, ApiTransfusion, ApiTransfusionRequest } from '@shared/blood-bank-types'
import { TransfusionFormModal } from './TransfusionFormModal'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR')
}

export function TransfusionsTab({ pouches, requests }: { pouches: ApiBloodPouch[]; requests: ApiTransfusionRequest[] }): JSX.Element {
  const [transfusions, setTransfusions] = useState<ApiTransfusion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editing, setEditing] = useState<ApiTransfusion | null>(null)
  const [deleting, setDeleting] = useState<ApiTransfusion | null>(null)

  useEffect(() => {
    let cancelled = false
    window.api.bloodBank.transfusions.list().then((result) => {
      if (cancelled) return
      if (result.ok) setTransfusions(result.data.transfusions)
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
        <Button size="sm" onClick={() => setShowCreateModal(true)}>
          <Plus className="h-3.5 w-3.5" />
          Nouvelle transfusion
        </Button>
      </div>

      {showCreateModal && (
        <TransfusionFormModal
          pouches={pouches}
          requests={requests}
          onClose={() => setShowCreateModal(false)}
          onSaved={(t) => {
            setTransfusions((prev) => [t, ...prev])
            setShowCreateModal(false)
          }}
        />
      )}
      {editing && (
        <TransfusionFormModal
          pouches={pouches}
          requests={requests}
          editing={editing}
          onClose={() => setEditing(null)}
          onSaved={(t) => {
            setTransfusions((prev) => prev.map((x) => (x.id === t.id ? t : x)))
            setEditing(null)
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Supprimer la transfusion"
          message={`Voulez-vous vraiment supprimer la transfusion ${deleting.reference} ?`}
          onCancel={() => setDeleting(null)}
          onConfirm={() => window.api.bloodBank.transfusions.delete(deleting.id)}
          onConfirmed={() => {
            setTransfusions((prev) => prev.filter((x) => x.id !== deleting.id))
            setDeleting(null)
          }}
        />
      )}

      {transfusions.length === 0 ? (
        <p className="px-6 py-12 text-center text-sm text-gray-400">Aucune transfusion enregistrée.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                <th className="px-6 py-2.5 font-medium">Référence</th>
                <th className="px-6 py-2.5 font-medium">Patient</th>
                <th className="px-6 py-2.5 font-medium">Poche</th>
                <th className="px-6 py-2.5 font-medium">Demande liée</th>
                <th className="px-6 py-2.5 font-medium">Date</th>
                <th className="px-6 py-2.5 font-medium">Réalisée par</th>
                <th className="px-6 py-2.5 font-medium" />
              </tr>
            </thead>
            <tbody>
              {transfusions.map((t) => (
                <tr key={t.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-900">{t.reference}</td>
                  <td className="px-6 py-3 text-gray-600">{t.patientName}</td>
                  <td className="px-6 py-3 text-gray-600">{t.pouchNumber}</td>
                  <td className="px-6 py-3 text-gray-600">{t.requestReference ?? '—'}</td>
                  <td className="px-6 py-3 text-gray-600">{formatDate(t.transfusedAt)}</td>
                  <td className="px-6 py-3 text-gray-600">{t.administeredBy}</td>
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
