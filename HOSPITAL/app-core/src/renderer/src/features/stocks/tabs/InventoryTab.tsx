import { useEffect, useState } from 'react'
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@renderer/components/Button'
import { ConfirmDialog } from '@renderer/components/ConfirmDialog'
import type { ApiDepotItem, ApiInventoryCount } from '@shared/stocks-types'
import { InventoryCountFormModal } from './InventoryCountFormModal'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR')
}

export function InventoryTab({ items }: { items: ApiDepotItem[] }): JSX.Element {
  const [counts, setCounts] = useState<ApiInventoryCount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editing, setEditing] = useState<ApiInventoryCount | null>(null)
  const [deleting, setDeleting] = useState<ApiInventoryCount | null>(null)

  useEffect(() => {
    let cancelled = false
    window.api.stocks.inventory.list().then((result) => {
      if (cancelled) return
      if (result.ok) setCounts(result.data.counts)
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
          Nouveau comptage
        </Button>
      </div>

      {showCreateModal && (
        <InventoryCountFormModal
          items={items}
          onClose={() => setShowCreateModal(false)}
          onSaved={(c) => {
            setCounts((prev) => [c, ...prev])
            setShowCreateModal(false)
          }}
        />
      )}
      {editing && (
        <InventoryCountFormModal
          items={items}
          editing={editing}
          onClose={() => setEditing(null)}
          onSaved={(c) => {
            setCounts((prev) => prev.map((x) => (x.id === c.id ? c : x)))
            setEditing(null)
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Supprimer le comptage"
          message={`Voulez-vous vraiment supprimer le comptage ${deleting.reference} ?`}
          onCancel={() => setDeleting(null)}
          onConfirm={() => window.api.stocks.inventory.delete(deleting.id)}
          onConfirmed={() => {
            setCounts((prev) => prev.filter((x) => x.id !== deleting.id))
            setDeleting(null)
          }}
        />
      )}

      {counts.length === 0 ? (
        <p className="px-6 py-12 text-center text-sm text-gray-400">Aucun comptage enregistré.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                <th className="px-6 py-2.5 font-medium">Référence</th>
                <th className="px-6 py-2.5 font-medium">Article</th>
                <th className="px-6 py-2.5 font-medium">Attendu</th>
                <th className="px-6 py-2.5 font-medium">Compté</th>
                <th className="px-6 py-2.5 font-medium">Écart</th>
                <th className="px-6 py-2.5 font-medium">Date</th>
                <th className="px-6 py-2.5 font-medium" />
              </tr>
            </thead>
            <tbody>
              {counts.map((c) => (
                <tr key={c.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-900">{c.reference}</td>
                  <td className="px-6 py-3 text-gray-600">{c.itemName}</td>
                  <td className="px-6 py-3 text-gray-600">{c.expectedQuantity}</td>
                  <td className="px-6 py-3 text-gray-600">{c.countedQuantity}</td>
                  <td className={`px-6 py-3 font-medium ${c.discrepancy === 0 ? 'text-gray-500' : c.discrepancy > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {c.discrepancy > 0 ? '+' : ''}
                    {c.discrepancy}
                  </td>
                  <td className="px-6 py-3 text-gray-600">{formatDate(c.conductedAt)}</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditing(c)}
                        title="Modifier"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleting(c)}
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
