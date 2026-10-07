import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@renderer/components/Button'
import { StatusBadge, type StatusTone } from '@renderer/components/StatusBadge'
import { ConfirmDialog } from '@renderer/components/ConfirmDialog'
import type { ApiProcurementRequest, ApiPurchaseOrder, ApiPurchaseOrderStatus, ApiSupplier } from '@shared/procurement-types'
import { OrderFormModal } from './OrderFormModal'
import { PulseLoader, EmptyState } from '@renderer/components/ui/Feedback'

const STATUS_LABEL: Record<ApiPurchaseOrderStatus, string> = {
  EN_PREPARATION: 'En préparation',
  ENVOYEE: 'Envoyée',
  CONFIRMEE: 'Confirmée',
  LIVREE: 'Livrée',
  ANNULEE: 'Annulée'
}

const STATUS_TONE: Record<ApiPurchaseOrderStatus, StatusTone> = {
  EN_PREPARATION: 'neutral',
  ENVOYEE: 'info',
  CONFIRMEE: 'warning',
  LIVREE: 'success',
  ANNULEE: 'danger'
}

function formatAmount(n: number | null): string {
  return n === null ? '—' : `${n.toLocaleString('fr-FR')} FCFA`
}

function formatDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString('fr-FR') : '—'
}

export function OrdersTab({ requests, suppliers }: { requests: ApiProcurementRequest[]; suppliers: ApiSupplier[] }): JSX.Element {
  const [orders, setOrders] = useState<ApiPurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editing, setEditing] = useState<ApiPurchaseOrder | null>(null)
  const [deleting, setDeleting] = useState<ApiPurchaseOrder | null>(null)

  useEffect(() => {
    let cancelled = false
    window.api.procurement.orders.list().then((result) => {
      if (cancelled) return
      if (result.ok) setOrders(result.data.orders)
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
          Nouvelle commande
        </Button>
      </div>

      {showCreateModal && (
        <OrderFormModal
          requests={requests}
          suppliers={suppliers}
          onClose={() => setShowCreateModal(false)}
          onSaved={(o) => {
            setOrders((prev) => [o, ...prev])
            setShowCreateModal(false)
          }}
        />
      )}
      {editing && (
        <OrderFormModal
          requests={requests}
          suppliers={suppliers}
          editing={editing}
          onClose={() => setEditing(null)}
          onSaved={(o) => {
            setOrders((prev) => prev.map((x) => (x.id === o.id ? o : x)))
            setEditing(null)
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Supprimer la commande"
          message={`Voulez-vous vraiment supprimer la commande ${deleting.reference} ?`}
          onCancel={() => setDeleting(null)}
          onConfirm={() => window.api.procurement.orders.delete(deleting.id)}
          onConfirmed={() => {
            setOrders((prev) => prev.filter((x) => x.id !== deleting.id))
            setDeleting(null)
          }}
        />
      )}

      {orders.length === 0 ? (
        <EmptyState title="Aucune commande enregistrée." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/70 text-[11px] uppercase tracking-[0.08em] text-gray-500">
                <th className="px-6 py-3 font-semibold">Référence</th>
                <th className="px-6 py-3 font-semibold">Article</th>
                <th className="px-6 py-3 font-semibold">Fournisseur</th>
                <th className="px-6 py-3 font-semibold">Quantité</th>
                <th className="px-6 py-3 font-semibold">Montant</th>
                <th className="px-6 py-3 font-semibold">Commandée le</th>
                <th className="px-6 py-3 font-semibold">Livraison prévue</th>
                <th className="px-6 py-3 font-semibold">Statut</th>
                <th className="px-6 py-3 font-semibold" />
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-gray-100 last:border-0 transition-colors hover:bg-accent-50/40">
                  <td className="px-6 py-3 font-medium text-gray-900">{o.reference}</td>
                  <td className="px-6 py-3 text-gray-600">{o.article}</td>
                  <td className="px-6 py-3 text-gray-600">{o.supplierName ?? '—'}</td>
                  <td className="px-6 py-3 text-gray-600">{o.quantity}</td>
                  <td className="px-6 py-3 text-gray-600">{formatAmount(o.totalAmount)}</td>
                  <td className="px-6 py-3 text-gray-600">{formatDate(o.orderedAt)}</td>
                  <td className="px-6 py-3 text-gray-600">{formatDate(o.expectedDeliveryAt)}</td>
                  <td className="px-6 py-3">
                    <StatusBadge label={STATUS_LABEL[o.status]} tone={STATUS_TONE[o.status]} />
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditing(o)}
                        title="Modifier"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleting(o)}
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
