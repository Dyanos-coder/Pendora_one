import { useEffect, useState } from 'react'
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@renderer/components/Button'
import { StatusBadge, type StatusTone } from '@renderer/components/StatusBadge'
import { ConfirmDialog } from '@renderer/components/ConfirmDialog'
import type { ApiGoodsReception, ApiPurchaseOrder, ApiReceptionCondition } from '@shared/procurement-types'
import { ReceptionFormModal } from './ReceptionFormModal'

const CONDITION_LABEL: Record<ApiReceptionCondition, string> = {
  CONFORME: 'Conforme',
  PARTIELLE: 'Partielle',
  ENDOMMAGEE: 'Endommagée'
}

const CONDITION_TONE: Record<ApiReceptionCondition, StatusTone> = {
  CONFORME: 'success',
  PARTIELLE: 'warning',
  ENDOMMAGEE: 'danger'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR')
}

export function ReceptionsTab(): JSX.Element {
  const [receptions, setReceptions] = useState<ApiGoodsReception[]>([])
  const [orders, setOrders] = useState<ApiPurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editing, setEditing] = useState<ApiGoodsReception | null>(null)
  const [deleting, setDeleting] = useState<ApiGoodsReception | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([window.api.procurement.receptions.list(), window.api.procurement.orders.list()]).then(
      ([receptionsResult, ordersResult]) => {
        if (cancelled) return
        if (receptionsResult.ok) setReceptions(receptionsResult.data.receptions)
        else setError(receptionsResult.error)
        if (ordersResult.ok) setOrders(ordersResult.data.orders)
        setLoading(false)
      }
    )
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
        <Button size="sm" onClick={() => setShowCreateModal(true)} disabled={orders.length === 0}>
          <Plus className="h-3.5 w-3.5" />
          Nouvelle réception
        </Button>
      </div>

      {orders.length === 0 && (
        <p className="px-6 py-2 text-xs text-gray-400">Créez d&apos;abord une commande dans l&apos;onglet « Commandes ».</p>
      )}

      {showCreateModal && (
        <ReceptionFormModal
          orders={orders}
          onClose={() => setShowCreateModal(false)}
          onSaved={(r) => {
            setReceptions((prev) => [r, ...prev])
            setShowCreateModal(false)
          }}
        />
      )}
      {editing && (
        <ReceptionFormModal
          orders={orders}
          editing={editing}
          onClose={() => setEditing(null)}
          onSaved={(r) => {
            setReceptions((prev) => prev.map((x) => (x.id === r.id ? r : x)))
            setEditing(null)
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Supprimer la réception"
          message={`Voulez-vous vraiment supprimer la réception de la commande ${deleting.orderReference} ?`}
          onCancel={() => setDeleting(null)}
          onConfirm={() => window.api.procurement.receptions.delete(deleting.id)}
          onConfirmed={() => {
            setReceptions((prev) => prev.filter((x) => x.id !== deleting.id))
            setDeleting(null)
          }}
        />
      )}

      {receptions.length === 0 ? (
        <p className="px-6 py-12 text-center text-sm text-gray-400">Aucune réception enregistrée.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                <th className="px-6 py-2.5 font-medium">Commande</th>
                <th className="px-6 py-2.5 font-medium">Article</th>
                <th className="px-6 py-2.5 font-medium">Date</th>
                <th className="px-6 py-2.5 font-medium">Qté reçue / commandée</th>
                <th className="px-6 py-2.5 font-medium">État</th>
                <th className="px-6 py-2.5 font-medium">Réceptionné par</th>
                <th className="px-6 py-2.5 font-medium" />
              </tr>
            </thead>
            <tbody>
              {receptions.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-900">{r.orderReference}</td>
                  <td className="px-6 py-3 text-gray-600">{r.article}</td>
                  <td className="px-6 py-3 text-gray-600">{formatDate(r.receivedAt)}</td>
                  <td className="px-6 py-3 text-gray-600">
                    {r.receivedQty} / {r.orderedQty}
                  </td>
                  <td className="px-6 py-3">
                    <StatusBadge label={CONDITION_LABEL[r.condition]} tone={CONDITION_TONE[r.condition]} />
                  </td>
                  <td className="px-6 py-3 text-gray-600">{r.receivedBy}</td>
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
