import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@renderer/components/Button'
import { ConfirmDialog } from '@renderer/components/ConfirmDialog'
import type { ApiPaymentReceived } from '@shared/finance-types'
import { PaymentFormModal } from './PaymentFormModal'
import { PulseLoader, EmptyState } from '@renderer/components/ui/Feedback'

function formatAmount(n: number): string {
  return `${n.toLocaleString('fr-FR')} FCFA`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR')
}

export function PaymentsReceivedTab(): JSX.Element {
  const [payments, setPayments] = useState<ApiPaymentReceived[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editing, setEditing] = useState<ApiPaymentReceived | null>(null)
  const [deleting, setDeleting] = useState<ApiPaymentReceived | null>(null)

  useEffect(() => {
    let cancelled = false
    window.api.finance.payments.list().then((result) => {
      if (cancelled) return
      if (result.ok) setPayments(result.data.payments)
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
          Nouveau paiement
        </Button>
      </div>

      {showCreateModal && (
        <PaymentFormModal
          onClose={() => setShowCreateModal(false)}
          onSaved={(p) => {
            setPayments((prev) => [p, ...prev])
            setShowCreateModal(false)
          }}
        />
      )}
      {editing && (
        <PaymentFormModal
          editing={editing}
          onClose={() => setEditing(null)}
          onSaved={(p) => {
            setPayments((prev) => prev.map((x) => (x.id === p.id ? p : x)))
            setEditing(null)
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Supprimer le paiement"
          message={`Voulez-vous vraiment supprimer le paiement ${deleting.reference} (${deleting.payer}) ?`}
          onCancel={() => setDeleting(null)}
          onConfirm={() => window.api.finance.payments.delete(deleting.id)}
          onConfirmed={() => {
            setPayments((prev) => prev.filter((x) => x.id !== deleting.id))
            setDeleting(null)
          }}
        />
      )}

      {payments.length === 0 ? (
        <EmptyState title="Aucun paiement reçu enregistré." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/70 text-[11px] uppercase tracking-[0.08em] text-gray-500">
                <th className="px-6 py-3 font-semibold">Référence</th>
                <th className="px-6 py-3 font-semibold">Payeur</th>
                <th className="px-6 py-3 font-semibold">Catégorie</th>
                <th className="px-6 py-3 font-semibold">Montant</th>
                <th className="px-6 py-3 font-semibold">Date</th>
                <th className="px-6 py-3 font-semibold">Mode</th>
                <th className="px-6 py-3 font-semibold" />
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-gray-100 last:border-0 transition-colors hover:bg-accent-50/40">
                  <td className="px-6 py-3 font-medium text-gray-900">{p.reference}</td>
                  <td className="px-6 py-3 text-gray-600">{p.payer}</td>
                  <td className="px-6 py-3 text-gray-600">{p.category}</td>
                  <td className="px-6 py-3 font-medium text-teal-600">+ {formatAmount(p.amount)}</td>
                  <td className="px-6 py-3 text-gray-600">{formatDate(p.receivedAt)}</td>
                  <td className="px-6 py-3 text-gray-600">{p.paymentMode}</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditing(p)}
                        title="Modifier"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleting(p)}
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
