import { useEffect, useState } from 'react'
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@renderer/components/Button'
import { ConfirmDialog } from '@renderer/components/ConfirmDialog'
import type { ApiBudget } from '@shared/finance-types'
import { BudgetFormModal } from './BudgetFormModal'

function formatAmount(n: number): string {
  return `${n.toLocaleString('fr-FR')} FCFA`
}

export function BudgetsTab(): JSX.Element {
  const [budgets, setBudgets] = useState<ApiBudget[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editing, setEditing] = useState<ApiBudget | null>(null)
  const [deleting, setDeleting] = useState<ApiBudget | null>(null)

  useEffect(() => {
    let cancelled = false
    window.api.finance.budgets.list().then((result) => {
      if (cancelled) return
      if (result.ok) setBudgets(result.data.budgets)
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
          Nouveau budget
        </Button>
      </div>

      {showCreateModal && (
        <BudgetFormModal
          onClose={() => setShowCreateModal(false)}
          onSaved={(b) => {
            setBudgets((prev) => [b, ...prev])
            setShowCreateModal(false)
          }}
        />
      )}
      {editing && (
        <BudgetFormModal
          editing={editing}
          onClose={() => setEditing(null)}
          onSaved={(b) => {
            setBudgets((prev) => prev.map((x) => (x.id === b.id ? b : x)))
            setEditing(null)
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Supprimer le budget"
          message={`Voulez-vous vraiment supprimer le budget ${deleting.reference} (${deleting.service} ${deleting.year}) ?`}
          onCancel={() => setDeleting(null)}
          onConfirm={() => window.api.finance.budgets.delete(deleting.id)}
          onConfirmed={() => {
            setBudgets((prev) => prev.filter((x) => x.id !== deleting.id))
            setDeleting(null)
          }}
        />
      )}

      {budgets.length === 0 ? (
        <p className="px-6 py-12 text-center text-sm text-gray-400">Aucun budget enregistré.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                <th className="px-6 py-2.5 font-medium">Référence</th>
                <th className="px-6 py-2.5 font-medium">Service</th>
                <th className="px-6 py-2.5 font-medium">Année</th>
                <th className="px-6 py-2.5 font-medium">Alloué</th>
                <th className="px-6 py-2.5 font-medium">Consommé</th>
                <th className="px-6 py-2.5 font-medium">Reste</th>
                <th className="px-6 py-2.5 font-medium" />
              </tr>
            </thead>
            <tbody>
              {budgets.map((b) => {
                const percent = b.allocatedAmount === 0 ? 0 : Math.min(100, Math.round((b.consumedAmount / b.allocatedAmount) * 100))
                return (
                  <tr key={b.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-900">{b.reference}</td>
                    <td className="px-6 py-3 text-gray-600">{b.service}</td>
                    <td className="px-6 py-3 text-gray-600">{b.year}</td>
                    <td className="px-6 py-3 text-gray-600">{formatAmount(b.allocatedAmount)}</td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100">
                          <div
                            className={`h-full rounded-full ${percent >= 100 ? 'bg-red-500' : 'bg-accent-500'}`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{formatAmount(b.consumedAmount)}</span>
                      </div>
                    </td>
                    <td className={`px-6 py-3 font-medium ${b.remainingAmount < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                      {formatAmount(b.remainingAmount)}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditing(b)}
                          title="Modifier"
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleting(b)}
                          title="Supprimer"
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
