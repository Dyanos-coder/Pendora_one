import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@renderer/components/Button'
import { ConfirmDialog } from '@renderer/components/ConfirmDialog'
import type { ApiDepot, ApiDepotItem, ApiStockTransfer } from '@shared/stocks-types'
import { TransferFormModal } from './TransferFormModal'
import { PulseLoader, EmptyState } from '@renderer/components/ui/Feedback'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR')
}

export function TransfersTab({ items, depots }: { items: ApiDepotItem[]; depots: ApiDepot[] }): JSX.Element {
  const [transfers, setTransfers] = useState<ApiStockTransfer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editing, setEditing] = useState<ApiStockTransfer | null>(null)
  const [deleting, setDeleting] = useState<ApiStockTransfer | null>(null)

  useEffect(() => {
    let cancelled = false
    window.api.stocks.transfers.list().then((result) => {
      if (cancelled) return
      if (result.ok) setTransfers(result.data.transfers)
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
        <Button size="sm" onClick={() => setShowCreateModal(true)} disabled={items.length === 0 || depots.length === 0}>
          <Plus className="h-3.5 w-3.5" />
          Nouveau transfert
        </Button>
      </div>

      {showCreateModal && (
        <TransferFormModal
          items={items}
          depots={depots}
          onClose={() => setShowCreateModal(false)}
          onSaved={(t) => {
            setTransfers((prev) => [t, ...prev])
            setShowCreateModal(false)
          }}
        />
      )}
      {editing && (
        <TransferFormModal
          items={items}
          depots={depots}
          editing={editing}
          onClose={() => setEditing(null)}
          onSaved={(t) => {
            setTransfers((prev) => prev.map((x) => (x.id === t.id ? t : x)))
            setEditing(null)
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Supprimer le transfert"
          message={`Voulez-vous vraiment supprimer le transfert ${deleting.reference} ?`}
          onCancel={() => setDeleting(null)}
          onConfirm={() => window.api.stocks.transfers.delete(deleting.id)}
          onConfirmed={() => {
            setTransfers((prev) => prev.filter((x) => x.id !== deleting.id))
            setDeleting(null)
          }}
        />
      )}

      {transfers.length === 0 ? (
        <EmptyState title="Aucun transfert enregistré." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/70 text-[11px] uppercase tracking-[0.08em] text-gray-500">
                <th className="px-6 py-3 font-semibold">Référence</th>
                <th className="px-6 py-3 font-semibold">Article source</th>
                <th className="px-6 py-3 font-semibold">Vers</th>
                <th className="px-6 py-3 font-semibold">Quantité</th>
                <th className="px-6 py-3 font-semibold">Date</th>
                <th className="px-6 py-3 font-semibold">Responsable</th>
                <th className="px-6 py-3 font-semibold" />
              </tr>
            </thead>
            <tbody>
              {transfers.map((t) => (
                <tr key={t.id} className="border-b border-gray-100 last:border-0 transition-colors hover:bg-accent-50/40">
                  <td className="px-6 py-3 font-medium text-gray-900">{t.reference}</td>
                  <td className="px-6 py-3 text-gray-600">{t.fromItemName}</td>
                  <td className="px-6 py-3 text-gray-600">{t.toDepotName}</td>
                  <td className="px-6 py-3 text-gray-600">{t.quantity}</td>
                  <td className="px-6 py-3 text-gray-600">{formatDate(t.transferDate)}</td>
                  <td className="px-6 py-3 text-gray-600">{t.performedBy}</td>
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
