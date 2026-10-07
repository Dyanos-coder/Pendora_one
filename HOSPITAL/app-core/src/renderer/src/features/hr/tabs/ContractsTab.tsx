import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@renderer/components/Button'
import { StatusBadge, type StatusTone } from '@renderer/components/StatusBadge'
import { ConfirmDialog } from '@renderer/components/ConfirmDialog'
import type { ApiContract, ApiEmployeeContractStatus, ApiHrEmployee } from '@shared/hr-types'
import { ContractFormModal } from './ContractFormModal'
import { PulseLoader, EmptyState } from '@renderer/components/ui/Feedback'

const STATUS_LABEL: Record<ApiEmployeeContractStatus, string> = {
  ACTIF: 'Actif',
  TERMINE: 'Terminé',
  RESILIE: 'Résilié'
}

const STATUS_TONE: Record<ApiEmployeeContractStatus, StatusTone> = {
  ACTIF: 'success',
  TERMINE: 'neutral',
  RESILIE: 'danger'
}

function formatDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString('fr-FR') : '—'
}

export function ContractsTab({ employees }: { employees: ApiHrEmployee[] }): JSX.Element {
  const [contracts, setContracts] = useState<ApiContract[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editing, setEditing] = useState<ApiContract | null>(null)
  const [deleting, setDeleting] = useState<ApiContract | null>(null)

  useEffect(() => {
    let cancelled = false
    window.api.hr.contracts.list().then((result) => {
      if (cancelled) return
      if (result.ok) setContracts(result.data.contracts)
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
          Nouveau contrat
        </Button>
      </div>

      {showCreateModal && (
        <ContractFormModal
          employees={employees}
          onClose={() => setShowCreateModal(false)}
          onSaved={(c) => {
            setContracts((prev) => [c, ...prev])
            setShowCreateModal(false)
          }}
        />
      )}
      {editing && (
        <ContractFormModal
          employees={employees}
          editing={editing}
          onClose={() => setEditing(null)}
          onSaved={(c) => {
            setContracts((prev) => prev.map((x) => (x.id === c.id ? c : x)))
            setEditing(null)
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Supprimer le contrat"
          message={`Voulez-vous vraiment supprimer le contrat ${deleting.contractNumber} de ${deleting.employeeName} ?`}
          onCancel={() => setDeleting(null)}
          onConfirm={() => window.api.hr.contracts.delete(deleting.id)}
          onConfirmed={() => {
            setContracts((prev) => prev.filter((x) => x.id !== deleting.id))
            setDeleting(null)
          }}
        />
      )}

      {contracts.length === 0 ? (
        <EmptyState title="Aucun contrat enregistré." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/70 text-[11px] uppercase tracking-[0.08em] text-gray-500">
                <th className="px-6 py-3 font-semibold">Employé</th>
                <th className="px-6 py-3 font-semibold">Type</th>
                <th className="px-6 py-3 font-semibold">N° contrat</th>
                <th className="px-6 py-3 font-semibold">Poste</th>
                <th className="px-6 py-3 font-semibold">Début</th>
                <th className="px-6 py-3 font-semibold">Fin</th>
                <th className="px-6 py-3 font-semibold">Statut</th>
                <th className="px-6 py-3 font-semibold" />
              </tr>
            </thead>
            <tbody>
              {contracts.map((c) => (
                <tr key={c.id} className="border-b border-gray-100 last:border-0 transition-colors hover:bg-accent-50/40">
                  <td className="px-6 py-3 font-medium text-gray-900">{c.employeeName}</td>
                  <td className="px-6 py-3 text-gray-600">{c.type}</td>
                  <td className="px-6 py-3 text-gray-600">{c.contractNumber}</td>
                  <td className="px-6 py-3 text-gray-600">{c.position}</td>
                  <td className="px-6 py-3 text-gray-600">{formatDate(c.startDate)}</td>
                  <td className="px-6 py-3 text-gray-600">{formatDate(c.endDate)}</td>
                  <td className="px-6 py-3">
                    <StatusBadge label={STATUS_LABEL[c.status]} tone={STATUS_TONE[c.status]} />
                  </td>
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
