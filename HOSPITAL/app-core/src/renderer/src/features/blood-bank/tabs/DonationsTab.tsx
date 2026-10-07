import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@renderer/components/Button'
import { StatusBadge, type StatusTone } from '@renderer/components/StatusBadge'
import { ConfirmDialog } from '@renderer/components/ConfirmDialog'
import type { ApiBloodPouch, ApiDonation, ApiDonationStatus } from '@shared/blood-bank-types'
import { DonationFormModal } from './DonationFormModal'
import { PulseLoader, EmptyState } from '@renderer/components/ui/Feedback'

const STATUS_LABEL: Record<ApiDonationStatus, string> = {
  PLANIFIE: 'Planifié',
  COLLECTE: 'Collecté',
  AJOURNE: 'Ajourné'
}

const STATUS_TONE: Record<ApiDonationStatus, StatusTone> = {
  PLANIFIE: 'info',
  COLLECTE: 'success',
  AJOURNE: 'danger'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR')
}

export function DonationsTab({ pouches }: { pouches: ApiBloodPouch[] }): JSX.Element {
  const [donations, setDonations] = useState<ApiDonation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editing, setEditing] = useState<ApiDonation | null>(null)
  const [deleting, setDeleting] = useState<ApiDonation | null>(null)

  useEffect(() => {
    let cancelled = false
    window.api.bloodBank.donations.list().then((result) => {
      if (cancelled) return
      if (result.ok) setDonations(result.data.donations)
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
          Nouveau don
        </Button>
      </div>

      {showCreateModal && (
        <DonationFormModal
          pouches={pouches}
          onClose={() => setShowCreateModal(false)}
          onSaved={(d) => {
            setDonations((prev) => [d, ...prev])
            setShowCreateModal(false)
          }}
        />
      )}
      {editing && (
        <DonationFormModal
          pouches={pouches}
          editing={editing}
          onClose={() => setEditing(null)}
          onSaved={(d) => {
            setDonations((prev) => prev.map((x) => (x.id === d.id ? d : x)))
            setEditing(null)
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Supprimer le don"
          message={`Voulez-vous vraiment supprimer le don ${deleting.reference} (${deleting.donorName}) ?`}
          onCancel={() => setDeleting(null)}
          onConfirm={() => window.api.bloodBank.donations.delete(deleting.id)}
          onConfirmed={() => {
            setDonations((prev) => prev.filter((x) => x.id !== deleting.id))
            setDeleting(null)
          }}
        />
      )}

      {donations.length === 0 ? (
        <EmptyState title="Aucun don enregistré." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/70 text-[11px] uppercase tracking-[0.08em] text-gray-500">
                <th className="px-6 py-3 font-semibold">Référence</th>
                <th className="px-6 py-3 font-semibold">Donneur</th>
                <th className="px-6 py-3 font-semibold">Groupe</th>
                <th className="px-6 py-3 font-semibold">Date</th>
                <th className="px-6 py-3 font-semibold">Poche liée</th>
                <th className="px-6 py-3 font-semibold">Statut</th>
                <th className="px-6 py-3 font-semibold" />
              </tr>
            </thead>
            <tbody>
              {donations.map((d) => (
                <tr key={d.id} className="border-b border-gray-100 last:border-0 transition-colors hover:bg-accent-50/40">
                  <td className="px-6 py-3 font-medium text-gray-900">{d.reference}</td>
                  <td className="px-6 py-3 text-gray-600">{d.donorName}</td>
                  <td className="px-6 py-3 font-semibold text-gray-900">{d.bloodGroup}</td>
                  <td className="px-6 py-3 text-gray-600">{formatDate(d.donationDate)}</td>
                  <td className="px-6 py-3 text-gray-600">{d.pouchNumber ?? '—'}</td>
                  <td className="px-6 py-3">
                    <StatusBadge label={STATUS_LABEL[d.status]} tone={STATUS_TONE[d.status]} />
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditing(d)}
                        title="Modifier"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleting(d)}
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
