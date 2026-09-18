import { useEffect, useMemo, useState } from 'react'
import {
  FlaskConical,
  Clock,
  Thermometer,
  CheckCircle2,
  TriangleAlert,
  Hourglass,
  Users,
  Search,
  FileSpreadsheet,
  Columns3,
  Printer,
  Eye,
  MoreHorizontal,
  Pencil,
  Plus,
  ClipboardCheck,
  Link2,
  ClipboardList,
  Tags,
  FileBarChart,
  Loader2,
  Trash2
} from 'lucide-react'
import { Card } from '@renderer/components/Card'
import { PageHeader } from '@renderer/components/PageHeader'
import { Button } from '@renderer/components/Button'
import { StatusBadge } from '@renderer/components/StatusBadge'
import { ConfirmDialog } from '@renderer/components/ConfirmDialog'
import type { ApiPathologyPriority, ApiPathologyRequest, ApiPathologyStatus } from '@shared/pathology-types'
import { pathologyStatusTone, pathologyPriorityTone, SAMPLE_TYPE_CHART_COLOR } from './status'
import type { PathologyRequest, PathologyStatus } from './types'
import { isSameDay } from '@renderer/features/appointments/week'
import { PathologyRequestFormModal } from './PathologyRequestFormModal'

interface PathologyPageProps {
  onOpenPatient: (patientId: string) => void
}

type Tab = 'all' | 'waiting' | 'inProgress' | 'validated' | 'urgent' | 'cancelled'

const STATUS_LABEL: Record<ApiPathologyStatus, PathologyStatus> = {
  RESULTAT_VALIDE: 'Résultat validé',
  EN_COURS: 'En cours',
  EN_ATTENTE_PRELEVEMENT: 'En attente de prélèvement',
  ANNULEE: 'Annulée'
}

const PRIORITY_LABEL: Record<ApiPathologyPriority, 'Normale' | 'Urgent'> = { NORMALE: 'Normale', URGENT: 'Urgent' }

const STATUS_DONUT_COLOR: Record<PathologyStatus, string> = {
  'Résultat validé': '#10b981',
  'En cours': '#3b82f6',
  'En attente de prélèvement': '#f59e0b',
  Annulée: '#9ca3af'
}

function toRecord(r: ApiPathologyRequest): PathologyRequest {
  return {
    id: r.id,
    patientId: r.patientId,
    patientCode: r.patientCode ?? '—',
    patientName: r.patientName ?? 'Patient',
    age: r.age,
    gender: r.gender ?? 'M',
    requestedAt: new Date(r.requestedAt),
    resultAt: r.resultAt ? new Date(r.resultAt) : null,
    sampleType: r.sampleType,
    location: r.location ?? '—',
    service: r.service ?? '—',
    doctor: r.doctorName ?? '—',
    doctorId: r.doctorId,
    status: STATUS_LABEL[r.status],
    priority: PRIORITY_LABEL[r.priority],
    expectedDurationMin: r.expectedDurationMin
  }
}

const FILTER_FIELDS = [
  { label: 'Période', value: "Aujourd'hui" },
  { label: 'Service demandeur', value: 'Tous les services' },
  { label: 'Type de prélèvement', value: 'Tous les types' },
  { label: 'Localisation / Organe', value: 'Toutes les localisations' },
  { label: 'Statut', value: 'Tous les statuts' },
  { label: 'Priorité', value: 'Toutes les priorités' },
  { label: 'Médecin demandeur', value: 'Tous les médecins' }
]

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
}

function formatDuration(minutes: number): string {
  if (minutes >= 1440) {
    const days = Math.floor(minutes / 1440)
    const hours = Math.round((minutes % 1440) / 60)
    return `${days}j ${String(hours).padStart(2, '0')}h`
  }
  const hours = Math.floor(minutes / 60)
  const rest = Math.round(minutes % 60)
  return hours === 0 ? `${rest}min` : `${hours}h ${String(rest).padStart(2, '0')}min`
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export function PathologyPage({ onOpenPatient }: PathologyPageProps): JSX.Element {
  const [requests, setRequests] = useState<PathologyRequest[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingRequest, setEditingRequest] = useState<PathologyRequest | null>(null)
  const [deletingRequest, setDeletingRequest] = useState<PathologyRequest | null>(null)
  const [patientsFollowed, setPatientsFollowed] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([window.api.pathology.list(), window.api.pathology.patientsFollowed()]).then(([reqResult, followedResult]) => {
      if (cancelled) return
      if (reqResult.ok) {
        setRequests(reqResult.data.requests.map(toRecord))
      } else {
        setError(reqResult.error)
      }
      if (followedResult.ok) setPatientsFollowed(followedResult.data.count)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const today = useMemo(() => new Date(), [])
  const todayRequests = useMemo(() => requests.filter((r) => isSameDay(r.requestedAt, today)), [requests, today])
  const waiting = useMemo(() => todayRequests.filter((r) => r.status === 'En attente de prélèvement'), [todayRequests])
  const inProgress = useMemo(() => todayRequests.filter((r) => r.status === 'En cours'), [todayRequests])
  const validated = useMemo(() => todayRequests.filter((r) => r.status === 'Résultat validé'), [todayRequests])
  const urgent = useMemo(() => todayRequests.filter((r) => r.priority === 'Urgent'), [todayRequests])
  const cancelled = useMemo(() => todayRequests.filter((r) => r.status === 'Annulée'), [todayRequests])
  const urgentPending = useMemo(() => urgent.filter((r) => r.status !== 'Résultat validé' && r.status !== 'Annulée'), [urgent])

  const TABS: { id: Tab; label: string; count: number }[] = [
    { id: 'all', label: 'Toutes les demandes', count: todayRequests.length },
    { id: 'waiting', label: 'En attente de prélèvement', count: waiting.length },
    { id: 'inProgress', label: 'En cours', count: inProgress.length },
    { id: 'validated', label: 'Résultats validés', count: validated.length },
    { id: 'urgent', label: 'Demandes urgentes', count: urgent.length },
    { id: 'cancelled', label: 'Annulées', count: cancelled.length }
  ]

  const TAB_ROWS: Record<Tab, PathologyRequest[]> = { all: todayRequests, waiting, inProgress, validated, urgent, cancelled }

  const rows = useMemo(() => {
    const base = TAB_ROWS[activeTab]
    const term = search.trim().toLowerCase()
    if (!term) return base
    return base.filter((r) => `${r.patientName} ${r.sampleType} ${r.location} ${r.service}`.toLowerCase().includes(term))
  }, [activeTab, search, requests])

  const sampleBreakdown = useMemo(() => {
    const counts = new Map<string, number>()
    for (const r of todayRequests) counts.set(r.sampleType, (counts.get(r.sampleType) ?? 0) + 1)
    const total = todayRequests.length
    return Array.from(counts.entries())
      .map(([label, count]) => ({ label, count, percent: total === 0 ? 0 : Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count)
  }, [todayRequests])

  const sampleDonutBackground = useMemo(() => {
    let cursor = 0
    const stops = sampleBreakdown.map(({ label, percent }) => {
      const start = cursor
      cursor += percent
      return `${SAMPLE_TYPE_CHART_COLOR[label] ?? SAMPLE_TYPE_CHART_COLOR.Autres} ${start}% ${cursor}%`
    })
    return `conic-gradient(${stops.join(', ')})`
  }, [sampleBreakdown])

  const requestsByService = useMemo(() => {
    const counts = new Map<string, number>()
    for (const r of todayRequests) counts.set(r.service, (counts.get(r.service) ?? 0) + 1)
    return Array.from(counts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
  }, [todayRequests])
  const maxByService = Math.max(1, ...requestsByService.map((s) => s.count))

  const statusBreakdown = useMemo(() => {
    const counts: Record<PathologyStatus, number> = {
      'Résultat validé': 0,
      'En cours': 0,
      'En attente de prélèvement': 0,
      Annulée: 0
    }
    for (const r of todayRequests) counts[r.status] += 1
    const total = todayRequests.length
    return (Object.keys(counts) as PathologyStatus[]).map((label) => ({
      label,
      count: counts[label],
      percent: total === 0 ? 0 : Math.round((counts[label] / total) * 100)
    }))
  }, [todayRequests])

  const statusDonutBackground = useMemo(() => {
    let cursor = 0
    const stops = statusBreakdown.map(({ label, percent }) => {
      const start = cursor
      cursor += percent
      return `${STATUS_DONUT_COLOR[label]} ${start}% ${cursor}%`
    })
    return `conic-gradient(${stops.join(', ')})`
  }, [statusBreakdown])

  const delayBySampleType = useMemo(() => {
    const groups = new Map<string, number[]>()
    for (const r of validated) {
      if (!r.resultAt) continue
      const minutes = (r.resultAt.getTime() - r.requestedAt.getTime()) / 60000
      groups.set(r.sampleType, [...(groups.get(r.sampleType) ?? []), minutes])
    }
    return Array.from(groups.entries()).map(([label, values]) => ({
      label,
      avg: values.reduce((sum, v) => sum + v, 0) / values.length
    }))
  }, [validated])

  const avgTurnaroundMin = useMemo(() => {
    const withResult = validated.filter((r) => r.resultAt)
    if (withResult.length === 0) return null
    const total = withResult.reduce((sum, r) => sum + (r.resultAt!.getTime() - r.requestedAt.getTime()) / 60000, 0)
    return Math.round(total / withResult.length)
  }, [validated])

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        breadcrumb={['Accueil', 'Anatomopathologie']}
        title="Anatomopathologie"
        subtitle="Centre de gestion des prélèvements et analyses anatomopathologiques."
        actions={
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4" />
            Nouvelle demande
          </Button>
        }
      />

      {showCreateModal && (
        <PathologyRequestFormModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(request) => {
            setRequests((prev) => [...prev, toRecord(request)])
            setShowCreateModal(false)
          }}
        />
      )}

      {editingRequest && (
        <PathologyRequestFormModal
          editing={editingRequest}
          onClose={() => setEditingRequest(null)}
          onCreated={(request) => {
            const updated = toRecord(request)
            setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
            setEditingRequest(null)
          }}
        />
      )}

      {deletingRequest && (
        <ConfirmDialog
          title="Supprimer la demande"
          message={`Voulez-vous vraiment supprimer la demande d'analyse de ${deletingRequest.patientName} ?`}
          onCancel={() => setDeletingRequest(null)}
          onConfirm={() => window.api.pathology.delete(deletingRequest.id)}
          onConfirmed={() => {
            setRequests((prev) => prev.filter((r) => r.id !== deletingRequest.id))
            setDeletingRequest(null)
          }}
        />
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-24 text-sm text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement de l&apos;anatomopathologie…
        </div>
      ) : error ? (
        <p className="py-12 text-center text-sm text-red-500">{error}</p>
      ) : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            <Card className="border-t-4 border-t-violet-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50">
                <FlaskConical className="h-5 w-5 text-violet-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Demandes d&apos;analyses</p>
              <p className="mt-0.5 text-xl font-bold text-gray-900">{todayRequests.length}</p>
            </Card>
            <Card className="border-t-4 border-t-orange-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">En cours aujourd&apos;hui</p>
              <p className="mt-0.5 text-xl font-bold text-gray-900">{inProgress.length}</p>
            </Card>
            <Card className="border-t-4 border-t-blue-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                <Thermometer className="h-5 w-5 text-blue-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">En attente de prélèvement</p>
              <p className="mt-0.5 text-xl font-bold text-gray-900">{waiting.length}</p>
            </Card>
            <Card className="border-t-4 border-t-emerald-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Résultats validés</p>
              <p className="mt-0.5 text-xl font-bold text-gray-900">{validated.length}</p>
            </Card>
            <Card className="border-t-4 border-t-red-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50">
                <TriangleAlert className="h-5 w-5 text-red-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Demandes urgentes</p>
              <p className="mt-0.5 text-xl font-bold text-red-600">{urgent.length}</p>
            </Card>
            <Card className="border-t-4 border-t-blue-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                <Hourglass className="h-5 w-5 text-blue-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Délai moyen de rendu</p>
              <p className="mt-0.5 text-xl font-bold text-gray-900">{avgTurnaroundMin === null ? '—' : formatDuration(avgTurnaroundMin)}</p>
            </Card>
            <Card className="border-t-4 border-t-violet-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50">
                <Users className="h-5 w-5 text-violet-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Patients suivis</p>
              <p className="mt-0.5 text-xl font-bold text-gray-900">{patientsFollowed ?? '—'}</p>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Liste principale */}
            <Card className="p-0 lg:col-span-2">
              <div className="flex flex-wrap items-center gap-1 border-b border-gray-100 px-4 pt-2">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={
                      'rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ' +
                      (activeTab === tab.id
                        ? 'border-accent-500 text-accent-700'
                        : 'border-transparent text-gray-500 hover:text-gray-800')
                    }
                  >
                    {tab.label} <span className="text-xs text-gray-400">({tab.count})</span>
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-6 py-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Rechercher dans la liste..."
                    className="w-64 rounded-lg border border-gray-200 py-1.5 pl-8 pr-3 text-xs text-gray-700 placeholder:text-gray-400 focus:border-accent-500 focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm">
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    Export Excel
                  </Button>
                  <Button variant="secondary" size="sm">
                    <Columns3 className="h-3.5 w-3.5" />
                    Colonnes
                  </Button>
                  <Button variant="secondary" size="sm">
                    <Printer className="h-3.5 w-3.5" />
                    Imprimer
                  </Button>
                </div>
              </div>

              {rows.length === 0 ? (
                <p className="px-6 py-8 text-center text-sm text-gray-400">Aucune demande dans cette catégorie.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                        <th className="px-6 py-2.5 font-medium">Date / Heure</th>
                        <th className="px-6 py-2.5 font-medium">Patient</th>
                        <th className="px-6 py-2.5 font-medium">Âge / Sexe</th>
                        <th className="px-6 py-2.5 font-medium">Prélèvement</th>
                        <th className="px-6 py-2.5 font-medium">Localisation</th>
                        <th className="px-6 py-2.5 font-medium">Service</th>
                        <th className="px-6 py-2.5 font-medium">Statut</th>
                        <th className="px-6 py-2.5 font-medium">Priorité</th>
                        <th className="px-6 py-2.5 font-medium">Délai prévu</th>
                        <th className="px-6 py-2.5 font-medium" />
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                          <td className="px-6 py-3 text-gray-600">
                            <p>{formatDate(r.requestedAt)}</p>
                            <p className="text-xs text-gray-400">{formatTime(r.requestedAt)}</p>
                          </td>
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-2.5">
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-50 text-[11px] font-semibold text-accent-700">
                                {initials(r.patientName)}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate font-medium text-gray-900">{r.patientName}</p>
                                <p className="truncate text-xs text-gray-400">{r.patientCode}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-gray-600">{r.age ? `${r.age} ans · ${r.gender === 'M' ? 'Homme' : 'Femme'}` : '—'}</td>
                          <td className="px-6 py-3 text-gray-900">{r.sampleType}</td>
                          <td className="px-6 py-3 text-gray-600">{r.location}</td>
                          <td className="px-6 py-3 text-gray-600">{r.service}</td>
                          <td className="px-6 py-3">
                            <StatusBadge label={r.status} tone={pathologyStatusTone(r.status)} />
                          </td>
                          <td className="px-6 py-3">
                            <StatusBadge label={r.priority} tone={pathologyPriorityTone(r.priority)} />
                          </td>
                          <td className="px-6 py-3 text-gray-600">{r.expectedDurationMin === null ? '—' : formatDuration(r.expectedDurationMin)}</td>
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => r.patientId && onOpenPatient(r.patientId)}
                                disabled={!r.patientId}
                                title={r.patientId ? 'Voir le dossier patient' : 'Aucun dossier lié'}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setEditingRequest(r)}
                                title="Modifier la demande"
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setDeletingRequest(r)}
                                title="Supprimer la demande"
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                              <button className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700">
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex items-center justify-between gap-2 border-t border-gray-100 px-6 py-3 text-xs text-gray-400">
                <span>Affichage de {rows.length === 0 ? 0 : 1} à {rows.length} sur {TAB_ROWS[activeTab].length} demandes</span>
              </div>
            </Card>

            {/* Colonne latérale */}
            <div className="space-y-6">
              <Card>
                <h3 className="mb-4 flex items-center justify-between text-sm font-semibold text-gray-900">
                  Filtres
                  <button className="text-xs font-normal text-accent-600 hover:text-accent-500">Réinitialiser</button>
                </h3>
                <div className="space-y-3">
                  {FILTER_FIELDS.map((field) => (
                    <div key={field.label}>
                      <label className="mb-1 block text-xs font-medium text-gray-500">{field.label}</label>
                      <select className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 focus:border-accent-500 focus:outline-none">
                        <option>{field.value}</option>
                      </select>
                    </div>
                  ))}
                  <Button size="sm" className="w-full">
                    Filtrer
                  </Button>
                </div>
              </Card>

              <Card>
                <h3 className="mb-4 text-sm font-semibold text-gray-900">Répartition par type de prélèvement</h3>
                {sampleBreakdown.length === 0 ? (
                  <p className="text-xs text-gray-400">Aucune demande aujourd&apos;hui.</p>
                ) : (
                  <div className="flex items-center gap-5">
                    <div
                      className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full"
                      style={{ background: sampleDonutBackground }}
                    >
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-xs font-bold text-gray-900">
                        {todayRequests.length}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {sampleBreakdown.map(({ label, count, percent }) => (
                        <div key={label} className="flex items-center gap-1.5 text-xs">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: SAMPLE_TYPE_CHART_COLOR[label] ?? SAMPLE_TYPE_CHART_COLOR.Autres }}
                          />
                          <span className="text-gray-600">{label}</span>
                          <span className="font-medium text-gray-900">
                            {count} ({percent}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>

              <Card className="p-0">
                <div className="border-b border-gray-100 px-5 py-4">
                  <h3 className="text-sm font-semibold text-gray-900">Actions rapides</h3>
                </div>
                <div className="p-2">
                  <QuickAction icon={Plus} label="Créer une nouvelle demande" />
                  <QuickAction icon={ClipboardCheck} label="Enregistrer un prélèvement" />
                  <QuickAction icon={Link2} label="Associer un échantillon" />
                  <QuickAction icon={ClipboardList} label="Consulter planning du laboratoire" />
                  <QuickAction icon={Tags} label="Imprimer étiquettes" />
                  <QuickAction icon={FileBarChart} label="Rapport quotidien d'anatomo-pathologie" />
                </div>
              </Card>
            </div>
          </div>

          {/* Panneaux du bas */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 xl:grid-cols-4">
            <Card>
              <h3 className="mb-4 text-sm font-semibold text-gray-900">Demandes par service</h3>
              {requestsByService.length === 0 ? (
                <p className="text-xs text-gray-400">Aucune demande aujourd&apos;hui.</p>
              ) : (
                <div className="space-y-3">
                  {requestsByService.map((s) => (
                    <div key={s.label}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-gray-600">{s.label}</span>
                        <span className="font-medium text-gray-900">{s.count}</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                        <div className="h-full rounded-full bg-violet-500" style={{ width: `${(s.count / maxByService) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <h3 className="mb-4 text-sm font-semibold text-gray-900">Délai moyen de rendu par type</h3>
              {delayBySampleType.length === 0 ? (
                <p className="text-xs text-gray-400">Aucun résultat validé aujourd&apos;hui.</p>
              ) : (
                <div className="space-y-2.5">
                  {delayBySampleType.map((d) => (
                    <div key={d.label} className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">{d.label}</span>
                      <span className="font-semibold text-gray-900">{formatDuration(Math.round(d.avg))}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <h3 className="mb-4 text-sm font-semibold text-gray-900">Statut des demandes</h3>
              {todayRequests.length === 0 ? (
                <p className="text-xs text-gray-400">Aucune demande aujourd&apos;hui.</p>
              ) : (
                <div className="flex items-center gap-4">
                  <div
                    className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full"
                    style={{ background: statusDonutBackground }}
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-xs font-bold text-gray-900">
                      {todayRequests.length}
                    </div>
                  </div>
                  <div className="space-y-1 text-[11px]">
                    {statusBreakdown.map(({ label, count, percent }) => (
                      <div key={label} className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: STATUS_DONUT_COLOR[label] }} />
                        <span className="text-gray-600">{label}</span>
                        <span className="font-medium text-gray-900">
                          {count} ({percent}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            <Card className="p-0">
              <div className="border-b border-gray-100 px-5 py-3.5">
                <h3 className="text-sm font-semibold text-gray-900">Alertes anatomopathologie</h3>
              </div>
              <div className="space-y-3 p-5">
                {urgentPending.length === 0 && waiting.length === 0 ? (
                  <p className="text-xs text-gray-400">Aucune alerte pour le moment.</p>
                ) : (
                  <>
                    {urgentPending.length > 0 && (
                      <Alert text={`${urgentPending.length} demande${urgentPending.length > 1 ? 's' : ''} urgente${urgentPending.length > 1 ? 's' : ''} en attente`} tone="text-red-500" />
                    )}
                    {waiting.length > 0 && (
                      <Alert text={`${waiting.length} prélèvement${waiting.length > 1 ? 's' : ''} en attente`} tone="text-amber-500" />
                    )}
                  </>
                )}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

function QuickAction({ icon: Icon, label }: { icon: typeof Plus; label: string }): JSX.Element {
  return (
    <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900">
      <Icon className="h-3.5 w-3.5 text-gray-400" />
      {label}
    </button>
  )
}

function Alert({ text, tone }: { text: string; tone: string }): JSX.Element {
  return (
    <div className="flex items-start gap-2.5 text-xs">
      <TriangleAlert className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${tone}`} />
      <span className="text-gray-600">{text}</span>
    </div>
  )
}
