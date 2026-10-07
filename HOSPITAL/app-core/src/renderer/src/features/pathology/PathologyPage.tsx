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
  Trash2,
  Paperclip
} from 'lucide-react'
import { Card } from '@renderer/components/Card'
import { PageHeader } from '@renderer/components/PageHeader'
import { Button } from '@renderer/components/Button'
import { StatusBadge } from '@renderer/components/StatusBadge'
import { PaidBadge } from '@renderer/features/cashier/PaidBadge'
import { ConfirmDialog } from '@renderer/components/ConfirmDialog'
import type { ApiPathologyPriority, ApiPathologyRequest, ApiPathologyStatus } from '@shared/pathology-types'
import { pathologyStatusTone, pathologyPriorityTone, SAMPLE_TYPE_CHART_COLOR } from './status'
import type { PathologyRequest, PathologyStatus } from './types'
import { dayIndexInWeek, isSameDay, mondayOf } from '@renderer/features/appointments/week'
import { PathologyRequestFormModal } from './PathologyRequestFormModal'
import { SortableGroup } from '@renderer/components/SortableGroup'
import { PulseLoader } from '@renderer/components/ui/Feedback'

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
  'Résultat validé': '#14b8a6',
  'En cours': '#3b82f6',
  'En attente de prélèvement': '#dea127',
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
    expectedDurationMin: r.expectedDurationMin,
    resultFileName: r.resultFileName,
    paid: r.paid
  }
}

const ALL_FILTER = '__all__'
type PeriodFilter = 'today' | 'week' | 'month' | 'all'

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
  const [uploadingResultFor, setUploadingResultFor] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('all')
  const [search, setSearch] = useState('')
  const [exporting, setExporting] = useState(false)
  const [filterPeriod, setFilterPeriod] = useState<PeriodFilter>('today')
  const [filterService, setFilterService] = useState(ALL_FILTER)
  const [filterType, setFilterType] = useState(ALL_FILTER)
  const [filterLocation, setFilterLocation] = useState(ALL_FILTER)
  const [filterStatus, setFilterStatus] = useState(ALL_FILTER)
  const [filterPriority, setFilterPriority] = useState(ALL_FILTER)
  const [filterDoctor, setFilterDoctor] = useState(ALL_FILTER)

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

  async function handleResultFile(request: PathologyRequest): Promise<void> {
    if (request.resultFileName) {
      await window.api.pathology.viewResultFile(request.id)
      return
    }
    setUploadingResultFor(request.id)
    const result = await window.api.pathology.uploadResultFile(request.id)
    setUploadingResultFor(null)
    if (result?.ok) {
      const updated = toRecord(result.data.request)
      setRequests((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
    }
  }

  async function handleExportExcel(): Promise<void> {
    setExporting(true)
    await window.api.pathology.exportExcel()
    setExporting(false)
  }

  const today = useMemo(() => new Date(), [])
  const realMonday = useMemo(() => mondayOf(today), [today])
  const todayRequests = useMemo(() => requests.filter((r) => isSameDay(r.requestedAt, today)), [requests, today])
  const waiting = useMemo(() => todayRequests.filter((r) => r.status === 'En attente de prélèvement'), [todayRequests])
  const inProgress = useMemo(() => todayRequests.filter((r) => r.status === 'En cours'), [todayRequests])
  const validated = useMemo(() => todayRequests.filter((r) => r.status === 'Résultat validé'), [todayRequests])
  const urgent = useMemo(() => todayRequests.filter((r) => r.priority === 'Urgent'), [todayRequests])
  const urgentPending = useMemo(() => urgent.filter((r) => r.status !== 'Résultat validé' && r.status !== 'Annulée'), [urgent])

  // Périmètre de la liste/onglets, piloté par le filtre "Période" (les cartes KPI ci-dessus
  // restent volontairement figées sur "aujourd'hui").
  const periodRequests = useMemo(
    () =>
      requests.filter((r) => {
        if (filterPeriod === 'today') return isSameDay(r.requestedAt, today)
        if (filterPeriod === 'week') {
          const idx = dayIndexInWeek(realMonday, r.requestedAt)
          return idx >= 0 && idx < 7
        }
        if (filterPeriod === 'month') {
          return r.requestedAt.getMonth() === today.getMonth() && r.requestedAt.getFullYear() === today.getFullYear()
        }
        return true
      }),
    [requests, filterPeriod, today, realMonday]
  )

  const TAB_ROWS: Record<Tab, PathologyRequest[]> = {
    all: periodRequests,
    waiting: periodRequests.filter((r) => r.status === 'En attente de prélèvement'),
    inProgress: periodRequests.filter((r) => r.status === 'En cours'),
    validated: periodRequests.filter((r) => r.status === 'Résultat validé'),
    urgent: periodRequests.filter((r) => r.priority === 'Urgent'),
    cancelled: periodRequests.filter((r) => r.status === 'Annulée')
  }

  const TABS: { id: Tab; label: string; count: number }[] = [
    { id: 'all', label: 'Toutes les demandes', count: TAB_ROWS.all.length },
    { id: 'waiting', label: 'En attente de prélèvement', count: TAB_ROWS.waiting.length },
    { id: 'inProgress', label: 'En cours', count: TAB_ROWS.inProgress.length },
    { id: 'validated', label: 'Résultats validés', count: TAB_ROWS.validated.length },
    { id: 'urgent', label: 'Demandes urgentes', count: TAB_ROWS.urgent.length },
    { id: 'cancelled', label: 'Annulées', count: TAB_ROWS.cancelled.length }
  ]

  const rows = useMemo(() => {
    const base = TAB_ROWS[activeTab]
    const term = search.trim().toLowerCase()
    if (!term) return base
    return base.filter((r) => `${r.patientName} ${r.sampleType} ${r.location} ${r.service}`.toLowerCase().includes(term))
  }, [activeTab, search, periodRequests])

  const serviceOptions = useMemo(() => Array.from(new Set(requests.map((r) => r.service).filter((s) => s && s !== '—'))).sort(), [requests])
  const typeOptions = useMemo(() => Array.from(new Set(requests.map((r) => r.sampleType).filter(Boolean))).sort(), [requests])
  const locationOptions = useMemo(
    () => Array.from(new Set(requests.map((r) => r.location).filter((l) => l && l !== '—'))).sort(),
    [requests]
  )
  const doctorOptions = useMemo(() => Array.from(new Set(requests.map((r) => r.doctor).filter((d) => d && d !== '—'))).sort(), [requests])

  const filteredRows = useMemo(
    () =>
      rows.filter((r) => {
        if (filterService !== ALL_FILTER && r.service !== filterService) return false
        if (filterType !== ALL_FILTER && r.sampleType !== filterType) return false
        if (filterLocation !== ALL_FILTER && r.location !== filterLocation) return false
        if (filterStatus !== ALL_FILTER && r.status !== filterStatus) return false
        if (filterPriority !== ALL_FILTER && r.priority !== filterPriority) return false
        if (filterDoctor !== ALL_FILTER && r.doctor !== filterDoctor) return false
        return true
      }),
    [rows, filterService, filterType, filterLocation, filterStatus, filterPriority, filterDoctor]
  )

  function handleResetFilters(): void {
    setFilterPeriod('today')
    setFilterService(ALL_FILTER)
    setFilterType(ALL_FILTER)
    setFilterLocation(ALL_FILTER)
    setFilterStatus(ALL_FILTER)
    setFilterPriority(ALL_FILTER)
    setFilterDoctor(ALL_FILTER)
  }

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
        <PulseLoader label="Chargement de l'anatomopathologie…" />
      ) : error ? (
        <p className="py-12 text-center text-sm text-red-500">{error}</p>
      ) : (
        <>
          {/* KPI row */}
          <SortableGroup id="pathology.grid1" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            <Card className="p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-black/5 bg-accent-50">
                <FlaskConical className="h-5 w-5 text-accent-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Demandes d&apos;analyses</p>
              <p className="mt-0.5 text-xl font-display font-extrabold tabular-nums text-gray-900">{todayRequests.length}</p>
            </Card>
            <Card className="p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-black/5 bg-orange-50">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">En cours aujourd&apos;hui</p>
              <p className="mt-0.5 text-xl font-display font-extrabold tabular-nums text-gray-900">{inProgress.length}</p>
            </Card>
            <Card className="p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-black/5 bg-blue-50">
                <Thermometer className="h-5 w-5 text-blue-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">En attente de prélèvement</p>
              <p className="mt-0.5 text-xl font-display font-extrabold tabular-nums text-gray-900">{waiting.length}</p>
            </Card>
            <Card className="p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-black/5 bg-teal-50">
                <CheckCircle2 className="h-5 w-5 text-teal-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Résultats validés</p>
              <p className="mt-0.5 text-xl font-display font-extrabold tabular-nums text-gray-900">{validated.length}</p>
            </Card>
            <Card className="p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-black/5 bg-red-50">
                <TriangleAlert className="h-5 w-5 text-red-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Demandes urgentes</p>
              <p className="mt-0.5 text-xl font-bold text-red-600">{urgent.length}</p>
            </Card>
            <Card className="p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-black/5 bg-blue-50">
                <Hourglass className="h-5 w-5 text-blue-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Délai moyen de rendu</p>
              <p className="mt-0.5 text-xl font-display font-extrabold tabular-nums text-gray-900">
                {avgTurnaroundMin === null ? '—' : formatDuration(avgTurnaroundMin)}
              </p>
            </Card>
            <Card className="p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-black/5 bg-accent-50">
                <Users className="h-5 w-5 text-accent-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Patients suivis</p>
              <p className="mt-0.5 text-xl font-display font-extrabold tabular-nums text-gray-900">{patientsFollowed ?? '—'}</p>
            </Card>
          </SortableGroup>

          <SortableGroup id="pathology.grid2" className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Liste principale */}
            <Card className="p-0 lg:col-span-2">
              <div className="flex flex-wrap items-center gap-1 border-b border-gray-100 px-4 pt-2">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={
                      'rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ' +
                      (activeTab === tab.id ? 'border-accent-500 text-accent-700' : 'border-transparent text-gray-500 hover:text-gray-800')
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
                    className="w-64 rounded-[10px] border border-gray-300 py-1.5 pl-8 pr-3 text-xs text-gray-700 placeholder:text-gray-400 focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={handleExportExcel} disabled={exporting}>
                    {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
                    Export Excel
                  </Button>
                  <Button variant="secondary" size="sm">
                    <Columns3 className="h-3.5 w-3.5" />
                    Colonnes
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => window.print()}>
                    <Printer className="h-3.5 w-3.5" />
                    Imprimer
                  </Button>
                </div>
              </div>

              {filteredRows.length === 0 ? (
                <p className="px-6 py-8 text-center text-sm text-gray-400">
                  {rows.length === 0 ? 'Aucune demande dans cette catégorie.' : 'Aucune demande ne correspond aux filtres.'}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50/70 text-[11px] uppercase tracking-[0.08em] text-gray-500">
                        <th className="px-6 py-3 font-semibold">Date / Heure</th>
                        <th className="px-6 py-3 font-semibold">Patient</th>
                        <th className="px-6 py-3 font-semibold">Âge / Sexe</th>
                        <th className="px-6 py-3 font-semibold">Prélèvement</th>
                        <th className="px-6 py-3 font-semibold">Localisation</th>
                        <th className="px-6 py-3 font-semibold">Service</th>
                        <th className="px-6 py-3 font-semibold">Statut</th>
                        <th className="px-6 py-3 font-semibold">Priorité</th>
                        <th className="px-6 py-3 font-semibold">Délai prévu</th>
                        <th className="px-6 py-3 font-semibold" />
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.map((r) => (
                        <tr key={r.id} className="border-b border-gray-100 last:border-0 transition-colors hover:bg-accent-50/40">
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
                          <td className="px-6 py-3 text-gray-600">
                            {r.age ? `${r.age} ans · ${r.gender === 'M' ? 'Homme' : 'Femme'}` : '—'}
                          </td>
                          <td className="px-6 py-3 text-gray-900">{r.sampleType}</td>
                          <td className="px-6 py-3 text-gray-600">{r.location}</td>
                          <td className="px-6 py-3 text-gray-600">{r.service}</td>
                          <td className="px-6 py-3">
                            <StatusBadge label={r.status} tone={pathologyStatusTone(r.status)} />
                            <PaidBadge paid={r.paid} />
                          </td>
                          <td className="px-6 py-3">
                            <StatusBadge label={r.priority} tone={pathologyPriorityTone(r.priority)} />
                          </td>
                          <td className="px-6 py-3 text-gray-600">
                            {r.expectedDurationMin === null ? '—' : formatDuration(r.expectedDurationMin)}
                          </td>
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
                              <button
                                onClick={() => handleResultFile(r)}
                                disabled={uploadingResultFor === r.id}
                                title={r.resultFileName ? `Voir le résultat (${r.resultFileName})` : 'Téléverser le résultat'}
                                className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 ${r.resultFileName ? 'text-accent-600' : 'text-gray-400 hover:text-gray-700'}`}
                              >
                                {uploadingResultFor === r.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Paperclip className="h-4 w-4" />
                                )}
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
                <span>
                  Affichage de {filteredRows.length === 0 ? 0 : 1} à {filteredRows.length} sur {TAB_ROWS[activeTab].length} demandes
                </span>
              </div>
            </Card>

            {/* Colonne latérale */}
            <SortableGroup id="pathology.side1" className="space-y-6">
              <Card>
                <h3 className="mb-4 flex items-center justify-between text-sm font-semibold text-gray-900">
                  Filtres
                  <button onClick={handleResetFilters} className="text-xs font-normal text-accent-600 hover:text-accent-500">
                    Réinitialiser
                  </button>
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">Période</label>
                    <select
                      value={filterPeriod}
                      onChange={(e) => setFilterPeriod(e.target.value as PeriodFilter)}
                      className="w-full rounded-[10px] border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15"
                    >
                      <option value="today">Aujourd&apos;hui</option>
                      <option value="week">Cette semaine</option>
                      <option value="month">Ce mois-ci</option>
                      <option value="all">Toutes les périodes</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">Service demandeur</label>
                    <select
                      value={filterService}
                      onChange={(e) => setFilterService(e.target.value)}
                      className="w-full rounded-[10px] border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15"
                    >
                      <option value={ALL_FILTER}>Tous les services</option>
                      {serviceOptions.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">Type de prélèvement</label>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="w-full rounded-[10px] border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15"
                    >
                      <option value={ALL_FILTER}>Tous les types</option>
                      {typeOptions.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">Localisation / Organe</label>
                    <select
                      value={filterLocation}
                      onChange={(e) => setFilterLocation(e.target.value)}
                      className="w-full rounded-[10px] border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15"
                    >
                      <option value={ALL_FILTER}>Toutes les localisations</option>
                      {locationOptions.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">Statut</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full rounded-[10px] border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15"
                    >
                      <option value={ALL_FILTER}>Tous les statuts</option>
                      {Object.values(STATUS_LABEL).map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">Priorité</label>
                    <select
                      value={filterPriority}
                      onChange={(e) => setFilterPriority(e.target.value)}
                      className="w-full rounded-[10px] border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15"
                    >
                      <option value={ALL_FILTER}>Toutes les priorités</option>
                      {Object.values(PRIORITY_LABEL).map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">Médecin demandeur</label>
                    <select
                      value={filterDoctor}
                      onChange={(e) => setFilterDoctor(e.target.value)}
                      className="w-full rounded-[10px] border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15"
                    >
                      <option value={ALL_FILTER}>Tous les médecins</option>
                      {doctorOptions.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button size="sm" className="w-full">
                    Filtrer
                  </Button>
                </div>
              </Card>

              <Card>
                <h3 className="mb-4 text-[15px] font-bold text-gray-900">Répartition par type de prélèvement</h3>
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
                  <h3 className="text-[15px] font-bold text-gray-900">Actions rapides</h3>
                </div>
                <div className="p-2">
                  <QuickAction icon={Plus} label="Créer une nouvelle demande" onClick={() => setShowCreateModal(true)} />
                  <QuickAction icon={ClipboardCheck} label="Enregistrer un prélèvement" onClick={() => setActiveTab('waiting')} />
                  <QuickAction icon={Link2} label="Associer un échantillon" onClick={() => setActiveTab('inProgress')} />
                  <QuickAction icon={ClipboardList} label="Consulter planning du laboratoire" />
                  <QuickAction icon={Tags} label="Imprimer étiquettes" />
                  <QuickAction icon={FileBarChart} label="Rapport quotidien d'anatomo-pathologie" onClick={handleExportExcel} />
                </div>
              </Card>
            </SortableGroup>
          </SortableGroup>

          {/* Panneaux du bas */}
          <SortableGroup id="pathology.grid3" className="grid grid-cols-1 gap-6 lg:grid-cols-3 xl:grid-cols-4">
            <Card>
              <h3 className="mb-4 text-[15px] font-bold text-gray-900">Demandes par service</h3>
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
                        <div className="h-full rounded-full bg-accent-500" style={{ width: `${(s.count / maxByService) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <h3 className="mb-4 text-[15px] font-bold text-gray-900">Délai moyen de rendu par type</h3>
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
              <h3 className="mb-4 text-[15px] font-bold text-gray-900">Statut des demandes</h3>
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
                <h3 className="text-[15px] font-bold text-gray-900">Alertes anatomopathologie</h3>
              </div>
              <div className="space-y-3 p-5">
                {urgentPending.length === 0 && waiting.length === 0 ? (
                  <p className="text-xs text-gray-400">Aucune alerte pour le moment.</p>
                ) : (
                  <>
                    {urgentPending.length > 0 && (
                      <Alert
                        text={`${urgentPending.length} demande${urgentPending.length > 1 ? 's' : ''} urgente${urgentPending.length > 1 ? 's' : ''} en attente`}
                        tone="text-red-500"
                      />
                    )}
                    {waiting.length > 0 && (
                      <Alert text={`${waiting.length} prélèvement${waiting.length > 1 ? 's' : ''} en attente`} tone="text-amber-500" />
                    )}
                  </>
                )}
              </div>
            </Card>
          </SortableGroup>
        </>
      )}
    </div>
  )
}

function QuickAction({ icon: Icon, label, onClick }: { icon: typeof Plus; label: string; onClick?: () => void }): JSX.Element {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
    >
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
