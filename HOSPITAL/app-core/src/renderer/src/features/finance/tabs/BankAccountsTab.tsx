import { useEffect, useState } from 'react'
import { Loader2, Plus, Pencil, Trash2, Landmark } from 'lucide-react'
import { Button } from '@renderer/components/Button'
import { Card } from '@renderer/components/Card'
import { ConfirmDialog } from '@renderer/components/ConfirmDialog'
import type { ApiBankAccount } from '@shared/finance-types'
import { BankAccountFormModal } from './BankAccountFormModal'

function formatAmount(n: number): string {
  return `${n.toLocaleString('fr-FR')} FCFA`
}

export function BankAccountsTab(): JSX.Element {
  const [accounts, setAccounts] = useState<ApiBankAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editing, setEditing] = useState<ApiBankAccount | null>(null)
  const [deleting, setDeleting] = useState<ApiBankAccount | null>(null)

  useEffect(() => {
    let cancelled = false
    window.api.finance.bankAccounts.list().then((result) => {
      if (cancelled) return
      if (result.ok) setAccounts(result.data.accounts)
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
          Nouveau compte
        </Button>
      </div>

      {showCreateModal && (
        <BankAccountFormModal
          onClose={() => setShowCreateModal(false)}
          onSaved={(a) => {
            setAccounts((prev) => [a, ...prev])
            setShowCreateModal(false)
          }}
        />
      )}
      {editing && (
        <BankAccountFormModal
          editing={editing}
          onClose={() => setEditing(null)}
          onSaved={(a) => {
            setAccounts((prev) => prev.map((x) => (x.id === a.id ? a : x)))
            setEditing(null)
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Supprimer le compte"
          message={`Voulez-vous vraiment supprimer le compte ${deleting.name} ?`}
          onCancel={() => setDeleting(null)}
          onConfirm={() => window.api.finance.bankAccounts.delete(deleting.id)}
          onConfirmed={() => {
            setAccounts((prev) => prev.filter((x) => x.id !== deleting.id))
            setDeleting(null)
          }}
        />
      )}

      {accounts.length === 0 ? (
        <p className="px-6 py-12 text-center text-sm text-gray-400">Aucun compte bancaire enregistré.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
          {accounts.map((a) => (
            <Card key={a.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-50 text-accent-600">
                    <Landmark className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{a.name}</p>
                    <p className="text-xs text-gray-400">{a.bankName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditing(a)}
                    title="Modifier"
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeleting(a)}
                    title="Supprimer"
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="mt-3 text-xs text-gray-400">N° {a.accountNumber}</p>
              <p className="mt-1 text-lg font-bold text-gray-900">{formatAmount(a.balance)}</p>
              {a.note && <p className="mt-2 text-xs text-gray-500">{a.note}</p>}
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
