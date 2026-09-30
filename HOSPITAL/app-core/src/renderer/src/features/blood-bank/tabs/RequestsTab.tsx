import { useEffect, useState } from 'react'
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@renderer/components/Button'
import { StatusBadge, type StatusTone } from '@renderer/components/StatusBadge'
import { ConfirmDialog } from '@renderer/components/ConfirmDialog'
import type { ApiTransfusionRequest, ApiTransfusionRequestStatus, ApiTransfusionRequestUrgency } from '@shared/blood-bank-types'
import { TransfusionRequestFormModal } from './TransfusionRequestFormModal'

const STATUS_LABEL: Record<ApiTransfusionRequestStatus, string> = {
  EN_ATTENTE: 'En attente',
  VALIDEE: 'Validée',
  REFUSEE: 'Refusée',
  HONOREE: 'Honorée'
}

const STATUS_TONE: Record<ApiTransfusionRequestStatus, StatusTone> = {
  EN_ATTENTE: 'warning',
  VALIDEE: 'info',
  REFUSEE: 'danger',
  HONOREE: 'success'
}

const URGENCY_LABEL: Record<ApiTransfusionRequestUrgency, string> = {
  NORMALE: 'Normale',
  URGENTE: 'Urgente'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR')
}

export function RequestsTab(): JSX.Element {
  const [requests, setRequests] = useState<ApiTransfusionRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editing, setEditing] = useState<ApiTransfusionRequest | null>(null)
  const [deleting, setDeleting] = useState<ApiTransfusionRequest | null>(null)

  useEffect(() => {
    let cancelled = false
    window.api.bloodBank.requests.list().then((result) => {
      if (cancelled) return
      if (result.ok) setRequests(result.data.requests)
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
          Nouvelle demande
        </Button>
      </div>

      {showCreateModal && (
        <TransfusionRequestFormModal
          onClose={() => setShowCreateModal(false)}
          onSaved={(r) => {
            setRequests((prev) => [r, ...prev])
            setShowCreateModal(false)
          }}
        />
      )}
      {editing && (
        <TransfusionRequestFormModal
          editing={editing}
          onClose={() => setEditing(null)}
          onSaved={(r) => {
            setRequests((prev) => prev.map((x) => (x.id === r.id ? r : x)))
            setEditing(null)
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Supprimer la demande"
          message={`Voulez-vous vraiment supprimer la demande ${deleting.reference} ?`}
          onCancel={() => setDeleting(null)}
          onConfirm={() => window.api.bloodBank.requests.delete(deleting.id)}
          onConfirmed={() => {
            setRequests((prev) => prev.filter((x) => x.id !== deleting.id))
            setDeleting(null)
          }}
        />
      )}

      {requests.length === 0 ? (
        <p className="px-6 py-12 text-center text-sm text-gray-400">Aucune demande transfusionnelle enregistrée.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                <th className="px-6 py-2.5 font-medium">Référence</th>
                <th className="px-6 py-2.5 font-medium">Patient</th>
                <th className="px-6 py-2.5 font-medium">Groupe / Composant</th>
                <th className="px-6 py-2.5 font-medium">Quantité</th>
                <th className="px-6 py-2.5 font-medium">Urgence</th>
                <th className="px-6 py-2.5 font-medium">Demandeur</th>
                <th className="px-6 py-2.5 font-medium">Date</th>
                <th className="px-6 py-2.5 font-medium">Statut</th>
                <th className="px-6 py-2.5 font-medium" />
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-900">{r.reference}</td>
                  <td className="px-6 py-3 text-gray-600">{r.patientName}</td>
                  <td className="px-6 py-3 text-gray-600">
                    {r.bloodGroup} — {r.component}
                  </td>
                  <td className="px-6 py-3 text-gray-600">{r.quantityUnits}</td>
                  <td className="px-6 py-3 text-gray-600">{URGENCY_LABEL[r.urgency]}</td>
                  <td className="px-6 py-3 text-gray-600">{r.requestedBy}</td>
                  <td className="px-6 py-3 text-gray-600">{formatDate(r.requestedAt)}</td>
                  <td className="px-6 py-3">
                    <StatusBadge label={STATUS_LABEL[r.status]} tone={STATUS_TONE[r.status]} />
                  </td>
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
