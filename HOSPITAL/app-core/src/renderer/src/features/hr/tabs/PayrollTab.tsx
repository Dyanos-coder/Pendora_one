import { useEffect, useState } from 'react'
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@renderer/components/Button'
import { StatusBadge, type StatusTone } from '@renderer/components/StatusBadge'
import { ConfirmDialog } from '@renderer/components/ConfirmDialog'
import type { ApiHrEmployee, ApiPayrollEntry, ApiPayrollStatus } from '@shared/hr-types'
import { PayrollFormModal } from './PayrollFormModal'

const STATUS_LABEL: Record<ApiPayrollStatus, string> = {
  EN_PREPARATION: 'En préparation',
  VALIDEE: 'Validée',
  PAYEE: 'Payée'
}

const STATUS_TONE: Record<ApiPayrollStatus, StatusTone> = {
  EN_PREPARATION: 'neutral',
  VALIDEE: 'info',
  PAYEE: 'success'
}

function formatAmount(n: number): string {
  return `${n.toLocaleString('fr-FR')} FCFA`
}

export function PayrollTab({ employees }: { employees: ApiHrEmployee[] }): JSX.Element {
  const [entries, setEntries] = useState<ApiPayrollEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editing, setEditing] = useState<ApiPayrollEntry | null>(null)
  const [deleting, setDeleting] = useState<ApiPayrollEntry | null>(null)

  useEffect(() => {
    let cancelled = false
    window.api.hr.payroll.list().then((result) => {
      if (cancelled) return
      if (result.ok) setEntries(result.data.entries)
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
          Nouvelle fiche de paie
        </Button>
      </div>

      {showCreateModal && (
        <PayrollFormModal
          employees={employees}
          onClose={() => setShowCreateModal(false)}
          onSaved={(e) => {
            setEntries((prev) => [e, ...prev])
            setShowCreateModal(false)
          }}
        />
      )}
      {editing && (
        <PayrollFormModal
          employees={employees}
          editing={editing}
          onClose={() => setEditing(null)}
          onSaved={(e) => {
            setEntries((prev) => prev.map((x) => (x.id === e.id ? e : x)))
            setEditing(null)
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Supprimer la fiche de paie"
          message={`Voulez-vous vraiment supprimer la fiche de paie ${deleting.period} de ${deleting.employeeName} ?`}
          onCancel={() => setDeleting(null)}
          onConfirm={() => window.api.hr.payroll.delete(deleting.id)}
          onConfirmed={() => {
            setEntries((prev) => prev.filter((x) => x.id !== deleting.id))
            setDeleting(null)
          }}
        />
      )}

      {entries.length === 0 ? (
        <p className="px-6 py-12 text-center text-sm text-gray-400">Aucune fiche de paie enregistrée.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                <th className="px-6 py-2.5 font-medium">Employé</th>
                <th className="px-6 py-2.5 font-medium">Période</th>
                <th className="px-6 py-2.5 font-medium">Salaire de base</th>
                <th className="px-6 py-2.5 font-medium">Primes</th>
                <th className="px-6 py-2.5 font-medium">Retenues</th>
                <th className="px-6 py-2.5 font-medium">Net</th>
                <th className="px-6 py-2.5 font-medium">Statut</th>
                <th className="px-6 py-2.5 font-medium" />
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-900">{e.employeeName}</td>
                  <td className="px-6 py-3 text-gray-600">{e.period}</td>
                  <td className="px-6 py-3 text-gray-600">{formatAmount(e.baseSalary)}</td>
                  <td className="px-6 py-3 text-emerald-600">{formatAmount(e.bonuses)}</td>
                  <td className="px-6 py-3 text-red-500">{formatAmount(e.deductions)}</td>
                  <td className="px-6 py-3 font-semibold text-gray-900">{formatAmount(e.netPay)}</td>
                  <td className="px-6 py-3">
                    <StatusBadge label={STATUS_LABEL[e.status]} tone={STATUS_TONE[e.status]} />
                  </td>
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
