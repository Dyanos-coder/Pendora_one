import { useEffect, useState } from 'react'
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@renderer/components/Button'
import { StatusBadge, type StatusTone } from '@renderer/components/StatusBadge'
import { ConfirmDialog } from '@renderer/components/ConfirmDialog'
import type { ApiSupplierInvoice, ApiTransactionStatus } from '@shared/finance-types'
import type { ApiSupplier } from '@shared/procurement-types'
import { SupplierInvoiceFormModal } from './SupplierInvoiceFormModal'

const STATUS_LABEL: Record<ApiTransactionStatus, string> = {
  PAYE: 'Payée',
  EN_ATTENTE: 'En attente',
  EN_RETARD: 'En retard',
  ANNULE: 'Annulée'
}

const STATUS_TONE: Record<ApiTransactionStatus, StatusTone> = {
  PAYE: 'success',
  EN_ATTENTE: 'warning',
  EN_RETARD: 'danger',
  ANNULE: 'neutral'
}

function formatAmount(n: number): string {
  return `${n.toLocaleString('fr-FR')} FCFA`
}

function formatDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString('fr-FR') : '—'
}

export function SupplierInvoicesTab(): JSX.Element {
  const [invoices, setInvoices] = useState<ApiSupplierInvoice[]>([])
  const [suppliers, setSuppliers] = useState<ApiSupplier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editing, setEditing] = useState<ApiSupplierInvoice | null>(null)
  const [deleting, setDeleting] = useState<ApiSupplierInvoice | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([window.api.finance.invoices.list(), window.api.procurement.suppliers()]).then(
      ([invoicesResult, suppliersResult]) => {
        if (cancelled) return
        if (invoicesResult.ok) setInvoices(invoicesResult.data.invoices)
        else setError(invoicesResult.error)
        if (suppliersResult.ok) setSuppliers(suppliersResult.data.suppliers)
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
        <Button size="sm" onClick={() => setShowCreateModal(true)}>
          <Plus className="h-3.5 w-3.5" />
          Nouvelle facture
        </Button>
      </div>

      {showCreateModal && (
        <SupplierInvoiceFormModal
          suppliers={suppliers}
          onClose={() => setShowCreateModal(false)}
          onSaved={(i) => {
            setInvoices((prev) => [i, ...prev])
            setShowCreateModal(false)
          }}
        />
      )}
      {editing && (
        <SupplierInvoiceFormModal
          suppliers={suppliers}
          editing={editing}
          onClose={() => setEditing(null)}
          onSaved={(i) => {
            setInvoices((prev) => prev.map((x) => (x.id === i.id ? i : x)))
            setEditing(null)
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Supprimer la facture"
          message={`Voulez-vous vraiment supprimer la facture ${deleting.reference} ?`}
          onCancel={() => setDeleting(null)}
          onConfirm={() => window.api.finance.invoices.delete(deleting.id)}
          onConfirmed={() => {
            setInvoices((prev) => prev.filter((x) => x.id !== deleting.id))
            setDeleting(null)
          }}
        />
      )}

      {invoices.length === 0 ? (
        <p className="px-6 py-12 text-center text-sm text-gray-400">Aucune facture fournisseur enregistrée.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                <th className="px-6 py-2.5 font-medium">Référence</th>
                <th className="px-6 py-2.5 font-medium">Fournisseur</th>
                <th className="px-6 py-2.5 font-medium">Montant</th>
                <th className="px-6 py-2.5 font-medium">Date de facture</th>
                <th className="px-6 py-2.5 font-medium">Échéance</th>
                <th className="px-6 py-2.5 font-medium">Statut</th>
                <th className="px-6 py-2.5 font-medium" />
              </tr>
            </thead>
            <tbody>
              {invoices.map((i) => (
                <tr key={i.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-900">{i.reference}</td>
                  <td className="px-6 py-3 text-gray-600">{i.supplierName ?? '—'}</td>
                  <td className="px-6 py-3 text-gray-600">{formatAmount(i.amount)}</td>
                  <td className="px-6 py-3 text-gray-600">{formatDate(i.issuedAt)}</td>
                  <td className="px-6 py-3 text-gray-600">{formatDate(i.dueAt)}</td>
                  <td className="px-6 py-3">
                    <StatusBadge label={STATUS_LABEL[i.status]} tone={STATUS_TONE[i.status]} />
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditing(i)}
                        title="Modifier"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleting(i)}
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
