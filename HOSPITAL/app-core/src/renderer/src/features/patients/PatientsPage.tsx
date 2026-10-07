import { useEffect, useMemo, useState } from 'react'
import { Search, UserPlus, Users, UserCheck, UserPlus2, Trash2 } from 'lucide-react'
import { Card } from '@renderer/components/Card'
import { PageHeader } from '@renderer/components/PageHeader'
import { StatusBadge } from '@renderer/components/StatusBadge'
import { Button } from '@renderer/components/Button'
import { ConfirmDialog } from '@renderer/components/ConfirmDialog'
import { PatientAvatar } from './PatientAvatar'
import { PatientFormModal } from './PatientFormModal'
import type { PatientSummary } from '@shared/patient-types'
import { PulseLoader, EmptyState } from '@renderer/components/ui/Feedback'

interface PatientsPageProps {
  onOpenPatient: (id: string) => void
}

function statusInfo(patient: Pick<PatientSummary, 'status'>): {
  label: string
  tone: 'success' | 'neutral'
} {
  return patient.status === 'ACTIVE' ? { label: 'Actif', tone: 'success' } : { label: 'Inactif', tone: 'neutral' }
}

export function PatientsPage({ onOpenPatient }: PatientsPageProps): JSX.Element {
  const [search, setSearch] = useState('')
  const [patients, setPatients] = useState<PatientSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [deletingPatient, setDeletingPatient] = useState<PatientSummary | null>(null)

  useEffect(() => {
    let cancelled = false
    window.api.patients.list().then((result) => {
      if (cancelled) return
      if (result.ok) {
        setPatients(result.data.patients)
      } else {
        setError(result.error)
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return patients
    return patients.filter((patient) =>
      `${patient.firstName} ${patient.lastName} ${patient.code} ${patient.service ?? ''}`.toLowerCase().includes(term)
    )
  }, [search, patients])

  const activeCount = patients.filter((p) => p.status === 'ACTIVE').length
  const inactiveCount = patients.length - activeCount

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        breadcrumb={['Accueil', 'Patients']}
        title="Patients"
        subtitle="Recherchez, consultez et gérez les dossiers de tous les patients de l'établissement."
        actions={
          <Button onClick={() => setShowCreateModal(true)}>
            <UserPlus className="h-4 w-4" />
            Nouveau patient
          </Button>
        }
      />

      {showCreateModal && (
        <PatientFormModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(patient) => {
            setPatients((prev) => [patient, ...prev])
            setShowCreateModal(false)
          }}
        />
      )}

      {deletingPatient && (
        <ConfirmDialog
          title="Supprimer le patient"
          message={`Voulez-vous vraiment supprimer le dossier de ${deletingPatient.firstName} ${deletingPatient.lastName} ? Cette action est réversible uniquement par un administrateur.`}
          onCancel={() => setDeletingPatient(null)}
          onConfirm={() => window.api.patients.delete(deletingPatient.id)}
          onConfirmed={() => {
            setPatients((prev) => prev.filter((p) => p.id !== deletingPatient.id))
            setDeletingPatient(null)
          }}
        />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-black/5 bg-accent-50">
            <Users className="h-5 w-5 text-accent-600" />
          </div>
          <p className="mt-3 text-xs font-medium uppercase tracking-wide text-gray-500">Total patients</p>
          <p className="text-2xl font-display font-extrabold tabular-nums text-gray-900">{patients.length}</p>
        </Card>
        <Card className="p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-black/5 bg-teal-50">
            <UserCheck className="h-5 w-5 text-teal-600" />
          </div>
          <p className="mt-3 text-xs font-medium uppercase tracking-wide text-gray-500">Dossiers actifs</p>
          <p className="text-2xl font-display font-extrabold tabular-nums text-gray-900">{activeCount}</p>
        </Card>
        <Card className="p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-black/5 bg-gray-100">
            <UserPlus2 className="h-5 w-5 text-gray-500" />
          </div>
          <p className="mt-3 text-xs font-medium uppercase tracking-wide text-gray-500">Dossiers inactifs</p>
          <p className="text-2xl font-display font-extrabold tabular-nums text-gray-900">{inactiveCount}</p>
        </Card>
      </div>

      <Card className="mt-6 p-0">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-[15px] font-bold text-gray-900">Liste des patients</h2>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un patient..."
              className="w-64 rounded-[10px] border border-gray-300 py-1.5 pl-8 pr-3 text-xs text-gray-700 placeholder:text-gray-400 focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15"
            />
          </div>
        </div>

        {loading ? (
          <PulseLoader label="Chargement des patients…" />
        ) : error ? (
          <p className="px-6 py-8 text-center text-sm text-red-500">{error}</p>
        ) : filtered.length === 0 ? (
          <EmptyState title="Aucun patient ne correspond à cette recherche." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/70 text-[11px] uppercase tracking-[0.08em] text-gray-500">
                  <th className="px-6 py-3 font-semibold whitespace-nowrap">Patient</th>
                  <th className="px-6 py-3 font-semibold whitespace-nowrap">Âge / Sexe</th>
                  <th className="px-6 py-3 font-semibold whitespace-nowrap">Service</th>
                  <th className="px-6 py-3 font-semibold whitespace-nowrap">Assurance</th>
                  <th className="px-6 py-3 font-semibold whitespace-nowrap">Dernière visite</th>
                  <th className="px-6 py-3 font-semibold whitespace-nowrap">Statut</th>
                  <th className="px-6 py-3 font-semibold" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((patient) => {
                  const status = statusInfo(patient)
                  return (
                    <tr
                      key={patient.id}
                      onClick={() => onOpenPatient(patient.id)}
                      className="cursor-pointer border-b border-gray-100 last:border-0 transition-colors hover:bg-accent-50/40"
                    >
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <PatientAvatar patient={patient} />
                          <div>
                            <p className="font-semibold whitespace-nowrap text-gray-900">
                              {patient.firstName} {patient.lastName}
                            </p>
                            <p className="font-mono text-[11px] whitespace-nowrap text-gray-400">{patient.code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 whitespace-nowrap text-gray-600">
                        {patient.age} ans · {patient.gender === 'M' ? 'Homme' : 'Femme'}
                      </td>
                      <td className="px-6 py-3.5 text-gray-600">{patient.service ?? '—'}</td>
                      <td className="px-6 py-3.5 text-gray-600">{patient.insuranceProvider ?? '—'}</td>
                      <td className="px-6 py-3.5 text-gray-600">{patient.lastVisit ?? '—'}</td>
                      <td className="px-6 py-3.5">
                        <StatusBadge {...status} />
                      </td>
                      <td className="px-6 py-3.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeletingPatient(patient)
                          }}
                          title="Supprimer le patient"
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
