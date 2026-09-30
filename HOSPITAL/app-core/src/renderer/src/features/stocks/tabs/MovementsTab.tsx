import { useEffect, useState } from 'react'
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@renderer/components/Button'
import { StatusBadge, type StatusTone } from '@renderer/components/StatusBadge'
import { ConfirmDialog } from '@renderer/components/ConfirmDialog'
import type { ApiDepotItem, ApiStockMovement, ApiStockMovementType } from '@shared/stocks-types'
import { MovementFormModal } from './MovementFormModal'

const TYPE_LABEL: Record<ApiStockMovementType, string> = {
  ENTREE: 'Entrée',
  SORTIE: 'Sortie'
}

const TYPE_TONE: Record<ApiStockMovementType, StatusTone> = {
  ENTREE: 'success',
  SORTIE: 'warning'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR')
}

export function MovementsTab({ items }: { items: ApiDepotItem[] }): JSX.Element {
  const [movements, setMovements] = useState<ApiStockMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editing, setEditing] = useState<ApiStockMovement | null>(null)
  const [deleting, setDeleting] = useState<ApiStockMovement | null>(null)

  useEffect(() => {
    let cancelled = false
    window.api.stocks.movements.list().then((result) => {
      if (cancelled) return
      if (result.ok) setMovements(result.data.movements)
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
          Nouveau mouvement
        </Button>
      </div>

      {items.length === 0 && (
        <p className="px-6 py-2 text-xs text-gray-400">Créez d&apos;abord un article dans l&apos;onglet « Vue d&apos;ensemble ».</p>
      )}

      {showCreateModal && (
        <MovementFormModal
          items={items}
          onClose={() => setShowCreateModal(false)}
          onSaved={(m) => {
            setMovements((prev) => [m, ...prev])
            setShowCreateModal(false)
          }}
        />
      )}
      {editing && (
        <MovementFormModal
          items={items}
          editing={editing}
          onClose={() => setEditing(null)}
          onSaved={(m) => {
            setMovements((prev) => prev.map((x) => (x.id === m.id ? m : x)))
            setEditing(null)
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Supprimer le mouvement"
          message={`Voulez-vous vraiment supprimer le mouvement ${deleting.reference} ?`}
          onCancel={() => setDeleting(null)}
          onConfirm={() => window.api.stocks.movements.delete(deleting.id)}
          onConfirmed={() => {
            setMovements((prev) => prev.filter((x) => x.id !== deleting.id))
            setDeleting(null)
          }}
        />
      )}

      {movements.length === 0 ? (
        <p className="px-6 py-12 text-center text-sm text-gray-400">Aucun mouvement enregistré.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                <th className="px-6 py-2.5 font-medium">Référence</th>
                <th className="px-6 py-2.5 font-medium">Article</th>
                <th className="px-6 py-2.5 font-medium">Type</th>
                <th className="px-6 py-2.5 font-medium">Quantité</th>
                <th className="px-6 py-2.5 font-medium">Date</th>
                <th className="px-6 py-2.5 font-medium">Responsable</th>
                <th className="px-6 py-2.5 font-medium" />
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-900">{m.reference}</td>
                  <td className="px-6 py-3 text-gray-600">{m.itemName}</td>
                  <td className="px-6 py-3">
                    <StatusBadge label={TYPE_LABEL[m.type]} tone={TYPE_TONE[m.type]} />
                  </td>
                  <td className="px-6 py-3 text-gray-600">{m.quantity}</td>
                  <td className="px-6 py-3 text-gray-600">{formatDate(m.movementDate)}</td>
                  <td className="px-6 py-3 text-gray-600">{m.performedBy}</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditing(m)}
                        title="Modifier"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleting(m)}
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
