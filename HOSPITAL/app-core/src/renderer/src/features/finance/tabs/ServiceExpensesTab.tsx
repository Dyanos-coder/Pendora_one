import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@renderer/components/Button'
import { ConfirmDialog } from '@renderer/components/ConfirmDialog'
import type { ApiServiceExpense } from '@shared/finance-types'
import { ServiceExpenseFormModal } from './ServiceExpenseFormModal'
import { PulseLoader, EmptyState } from '@renderer/components/ui/Feedback'

function formatAmount(n: number): string {
  return `${n.toLocaleString('fr-FR')} FCFA`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR')
}

export function ServiceExpensesTab(): JSX.Element {
  const [expenses, setExpenses] = useState<ApiServiceExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editing, setEditing] = useState<ApiServiceExpense | null>(null)
  const [deleting, setDeleting] = useState<ApiServiceExpense | null>(null)

  useEffect(() => {
    let cancelled = false
    window.api.finance.expenses.list().then((result) => {
      if (cancelled) return
      if (result.ok) setExpenses(result.data.expenses)
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
          Nouvelle dépense
        </Button>
      </div>

      {showCreateModal && (
        <ServiceExpenseFormModal
          onClose={() => setShowCreateModal(false)}
          onSaved={(e) => {
            setExpenses((prev) => [e, ...prev])
            setShowCreateModal(false)
          }}
        />
      )}
      {editing && (
        <ServiceExpenseFormModal
          editing={editing}
          onClose={() => setEditing(null)}
          onSaved={(e) => {
            setExpenses((prev) => prev.map((x) => (x.id === e.id ? e : x)))
            setEditing(null)
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Supprimer la dépense"
          message={`Voulez-vous vraiment supprimer la dépense ${deleting.reference} (${deleting.service}) ?`}
          onCancel={() => setDeleting(null)}
          onConfirm={() => window.api.finance.expenses.delete(deleting.id)}
          onConfirmed={() => {
            setExpenses((prev) => prev.filter((x) => x.id !== deleting.id))
            setDeleting(null)
          }}
        />
      )}

      {expenses.length === 0 ? (
        <EmptyState title="Aucune dépense par service enregistrée." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/70 text-[11px] uppercase tracking-[0.08em] text-gray-500">
                <th className="px-6 py-3 font-semibold">Référence</th>
                <th className="px-6 py-3 font-semibold">Service</th>
                <th className="px-6 py-3 font-semibold">Catégorie</th>
                <th className="px-6 py-3 font-semibold">Montant</th>
                <th className="px-6 py-3 font-semibold">Date</th>
                <th className="px-6 py-3 font-semibold" />
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id} className="border-b border-gray-100 last:border-0 transition-colors hover:bg-accent-50/40">
                  <td className="px-6 py-3 font-medium text-gray-900">{e.reference}</td>
                  <td className="px-6 py-3 text-gray-600">{e.service}</td>
                  <td className="px-6 py-3 text-gray-600">{e.category}</td>
                  <td className="px-6 py-3 font-medium text-red-600">- {formatAmount(e.amount)}</td>
                  <td className="px-6 py-3 text-gray-600">{formatDate(e.spentAt)}</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditing(e)}
                        title="Modifier"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleting(e)}
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
