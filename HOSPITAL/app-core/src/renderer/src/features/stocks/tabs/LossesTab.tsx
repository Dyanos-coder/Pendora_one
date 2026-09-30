import { useEffect, useState } from 'react'
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@renderer/components/Button'
import { StatusBadge, type StatusTone } from '@renderer/components/StatusBadge'
import { ConfirmDialog } from '@renderer/components/ConfirmDialog'
import type { ApiDepotItem, ApiStockLoss, ApiStockLossType } from '@shared/stocks-types'
import { StockLossFormModal } from './StockLossFormModal'

const TYPE_LABEL: Record<ApiStockLossType, string> = {
  PERTE: 'Perte',
  RETOUR: 'Retour'
}

const TYPE_TONE: Record<ApiStockLossType, StatusTone> = {
  PERTE: 'danger',
  RETOUR: 'success'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR')
}

export function LossesTab({ items }: { items: ApiDepotItem[] }): JSX.Element {
  const [losses, setLosses] = useState<ApiStockLoss[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editing, setEditing] = useState<ApiStockLoss | null>(null)
  const [deleting, setDeleting] = useState<ApiStockLoss | null>(null)

  useEffect(() => {
    let cancelled = false
    window.api.stocks.losses.list().then((result) => {
      if (cancelled) return
      if (result.ok) setLosses(result.data.losses)
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
        <Button size="sm" onClick={() => setShowCreateModal(true)} disabled={items.length === 0}>
          <Plus className="h-3.5 w-3.5" />
          Nouvelle perte / retour
        </Button>
      </div>

      {showCreateModal && (
        <StockLossFormModal
          items={items}
          onClose={() => setShowCreateModal(false)}
          onSaved={(l) => {
            setLosses((prev) => [l, ...prev])
            setShowCreateModal(false)
          }}
        />
      )}
      {editing && (
        <StockLossFormModal
          items={items}
          editing={editing}
          onClose={() => setEditing(null)}
          onSaved={(l) => {
            setLosses((prev) => prev.map((x) => (x.id === l.id ? l : x)))
            setEditing(null)
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Supprimer l'entrée"
          message={`Voulez-vous vraiment supprimer l'entrée ${deleting.reference} ?`}
          onCancel={() => setDeleting(null)}
          onConfirm={() => window.api.stocks.losses.delete(deleting.id)}
          onConfirmed={() => {
            setLosses((prev) => prev.filter((x) => x.id !== deleting.id))
            setDeleting(null)
          }}
        />
      )}

      {losses.length === 0 ? (
        <p className="px-6 py-12 text-center text-sm text-gray-400">Aucune perte ni retour enregistré.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                <th className="px-6 py-2.5 font-medium">Référence</th>
                <th className="px-6 py-2.5 font-medium">Article</th>
                <th className="px-6 py-2.5 font-medium">Type</th>
                <th className="px-6 py-2.5 font-medium">Quantité</th>
                <th className="px-6 py-2.5 font-medium">Motif</th>
                <th className="px-6 py-2.5 font-medium">Date</th>
                <th className="px-6 py-2.5 font-medium" />
              </tr>
            </thead>
            <tbody>
              {losses.map((l) => (
                <tr key={l.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-900">{l.reference}</td>
                  <td className="px-6 py-3 text-gray-600">{l.itemName}</td>
                  <td className="px-6 py-3">
                    <StatusBadge label={TYPE_LABEL[l.type]} tone={TYPE_TONE[l.type]} />
                  </td>
                  <td className="px-6 py-3 text-gray-600">{l.quantity}</td>
                  <td className="px-6 py-3 text-gray-600">{l.reason}</td>
                  <td className="px-6 py-3 text-gray-600">{formatDate(l.occurredAt)}</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditing(l)}
                        title="Modifier"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleting(l)}
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
