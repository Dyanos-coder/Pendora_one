import { useMemo, useState } from 'react'
import { Search, UserPlus, Users, UserCheck, UserPlus2, TriangleAlert } from 'lucide-react'
import { Card } from '@renderer/components/Card'
import { PageHeader } from '@renderer/components/PageHeader'
import { StatusBadge } from '@renderer/components/StatusBadge'
import { Button } from '@renderer/components/Button'
import { MOCK_PATIENTS } from './mock-data'
import { PatientAvatar } from './PatientAvatar'
import { statusInfo } from './status'

interface PatientsPageProps {
  onOpenPatient: (id: string) => void
}

export function PatientsPage({ onOpenPatient }: PatientsPageProps): JSX.Element {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return MOCK_PATIENTS
    return MOCK_PATIENTS.filter((patient) =>
      `${patient.firstName} ${patient.lastName} ${patient.code} ${patient.service}`.toLowerCase().includes(term)
    )
  }, [search])

  const activeCount = MOCK_PATIENTS.filter((p) => p.status === 'active').length
  const inactiveCount = MOCK_PATIENTS.length - activeCount

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        breadcrumb={['Accueil', 'Patients']}
        title="Patients"
        subtitle="Recherchez, consultez et gérez les dossiers de tous les patients de l'établissement."
        actions={
          <Button>
            <UserPlus className="h-4 w-4" />
            Nouveau patient
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-t-4 border-t-violet-400 p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50">
            <Users className="h-5 w-5 text-violet-600" />
          </div>
          <p className="mt-3 text-xs font-medium uppercase tracking-wide text-gray-500">Total patients</p>
          <p className="text-2xl font-bold text-gray-900">{MOCK_PATIENTS.length}</p>
        </Card>
        <Card className="border-t-4 border-t-emerald-400 p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
            <UserCheck className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="mt-3 text-xs font-medium uppercase tracking-wide text-gray-500">Dossiers actifs</p>
          <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
        </Card>
        <Card className="border-t-4 border-t-gray-300 p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
            <UserPlus2 className="h-5 w-5 text-gray-500" />
          </div>
          <p className="mt-3 text-xs font-medium uppercase tracking-wide text-gray-500">Dossiers inactifs</p>
          <p className="text-2xl font-bold text-gray-900">{inactiveCount}</p>
        </Card>
      </div>

      <Card className="mt-6 p-0">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Liste des patients</h2>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un patient..."
              className="w-64 rounded-lg border border-gray-200 py-1.5 pl-8 pr-3 text-xs text-gray-700 placeholder:text-gray-400 focus:border-accent-500 focus:outline-none"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-gray-400">Aucun patient ne correspond à cette recherche.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                <th className="px-6 py-2.5 font-medium">Patient</th>
                <th className="px-6 py-2.5 font-medium">Âge / Sexe</th>
                <th className="px-6 py-2.5 font-medium">Service</th>
                <th className="px-6 py-2.5 font-medium">Assurance</th>
                <th className="px-6 py-2.5 font-medium">Dernière visite</th>
                <th className="px-6 py-2.5 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((patient) => {
                const status = statusInfo(patient)
                return (
                  <tr
                    key={patient.id}
                    onClick={() => onOpenPatient(patient.id)}
                    className="cursor-pointer border-b border-gray-100 last:border-0 hover:bg-gray-50"
                  >
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <PatientAvatar patient={patient} />
                        <div>
                          <p className="font-medium text-gray-900">
                            {patient.firstName} {patient.lastName}
                          </p>
                          <p className="text-xs text-gray-400">{patient.code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-gray-600">
                      {patient.age} ans · {patient.gender === 'M' ? 'Homme' : 'Femme'}
                    </td>
                    <td className="px-6 py-3.5 text-gray-600">{patient.service}</td>
                    <td className="px-6 py-3.5 text-gray-600">{patient.insuranceProvider}</td>
                    <td className="px-6 py-3.5 text-gray-600">{patient.lastVisit}</td>
                    <td className="px-6 py-3.5">
                      <StatusBadge {...status} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>

      <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
        <TriangleAlert className="h-3.5 w-3.5" />
        Données de démonstration — la liste complète (filtres avancés, pagination, panneau
        latéral détaillé) sera étoffée avec la spécification du module Patients.
      </div>
    </div>
  )
}
