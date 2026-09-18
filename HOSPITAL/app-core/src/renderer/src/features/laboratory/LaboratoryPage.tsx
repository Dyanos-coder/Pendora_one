import { useEffect, useMemo, useState } from 'react'
import {
  FlaskConical,
  Loader2,
  Droplet,
  CalendarCheck,
  TriangleAlert,
  Clock,
  Search,
  FileSpreadsheet,
  Columns3,
  Printer,
  Eye,
  MoreHorizontal,
  Pencil,
  Plus,
  ClipboardCheck,
  FileUp,
  Link2,
  Tags,
  FileBarChart,
  Trash2
} from 'lucide-react'
import { Card } from '@renderer/components/Card'
import { PageHeader } from '@renderer/components/PageHeader'
import { Button } from '@renderer/components/Button'
import { StatusBadge } from '@renderer/components/StatusBadge'
import { ConfirmDialog } from '@renderer/components/ConfirmDialog'
import type { ApiLabPriority, ApiLabRequest, ApiLabStatus } from '@shared/laboratory-types'
import { labStatusTone, labPriorityTone, SAMPLE_CHART_COLOR } from './status'
import type { LabRequest, LabStatus } from './types'
import { isSameDay } from '@renderer/features/appointments/week'
import { LabRequestFormModal } from './LabRequestFormModal'

interface LaboratoryPageProps {
  onOpenPatient: (patientId: string) => void
}

type Tab = 'all' | 'waiting' | 'inProgress' | 'validated' | 'critical' | 'cancelled'

const STATUS_LABEL: Record<ApiLabStatus, LabStatus> = {
  RESULTAT_VALIDE: 'Résultat validé',
  EN_COURS: 'En cours',
  EN_ATTENTE_PRELEVEMENT: 'En attente prélèvement',
  ANNULEE: 'Annulée'
}

const PRIORITY_LABEL: Record<ApiLabPriority, 'Normale' | 'Élevée' | 'Critique'> = {
  NORMALE: 'Normale',
  ELEVEE: 'Élevée',
  CRITIQUE: 'Critique'
}

const STATUS_DONUT_COLOR: Record<LabStatus, string> = {
  'Résultat validé': '#10b981',
  'En cours': '#3b82f6',
  'En attente prélèvement': '#f59e0b',
  Annulée: '#9ca3af'
}

function toRecord(r: ApiLabRequest): LabRequest {
  return {
    id: r.id,
    requestNumber: r.requestNumber,
    patientId: r.patientId,
    patientCode: r.patientCode ?? '—',
    patientName: r.patientName ?? 'Patient',
    age: r.age,
    gender: r.gender ?? 'M',
    requestedAt: new Date(r.requestedAt),
    resultAt: r.resultAt ? new Date(r.resultAt) : null,
    service: r.service ?? '—',
    analysisType: r.analysisType,
    status: STATUS_LABEL[r.status],
    priority: PRIORITY_LABEL[r.priority],
    sample: r.sample ?? '—',
    technician: r.technicianName ?? '—',
    technicianId: r.technicianId
  }
}

const FILTER_FIELDS = [
  { label: 'Période', value: "Aujourd'hui" },
  { label: 'Service demandeur', value: 'Tous les services' },
  { label: "Type d'analyse", value: 'Tous les types' },
  { label: 'Statut', value: 'Tous les statuts' },
  { label: 'Priorité', value: 'Toutes les priorités' },
  { label: 'Technicien', value: 'Tous les techniciens' }
]

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const rest = Math.round(minutes % 60)
  return hours === 0 ? `${rest}min` : `${hours}h ${String(rest).padStart(2, '0')}min`
}

export function LaboratoryPage({ onOpenPatient }: LaboratoryPageProps): JSX.Element {
  const [requests, setRequests] = useState<LabRequest[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingRequest, setEditingRequest] = useState<LabRequest | null>(null)
  const [deletingRequest, setDeletingRequest] = useState<LabRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    window.api.laboratory.list().then((result) => {
      if (cancelled) return
      if (result.ok) {
        setRequests(result.data.requests.map(toRecord))
      } else {
        setError(result.error)
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const today = useMemo(() => new Date(), [])
  const todayRequests = useMemo(() => requests.filter((r) => isSameDay(r.requestedAt, today)), [requests, today])
  const waiting = useMemo(() => todayRequests.filter((r) => r.status === 'En attente prélèvement'), [todayRequests])
  const inProgress = useMemo(() => todayRequests.filter((r) => r.status === 'En cours'), [todayRequests])
  const validated = useMemo(() => todayRequests.filter((r) => r.status === 'Résultat validé'), [todayRequests])
  const critical = useMemo(() => todayRequests.filter((r) => r.priority === 'Critique'), [todayRequests])
  const cancelled = useMemo(() => todayRequests.filter((r) => r.status === 'Annulée'), [todayRequests])

  const TABS: { id: Tab; label: string; count: number }[] = [
    { id: 'all', label: 'Toutes les analyses', count: todayRequests.length },
    { id: 'waiting', label: 'En attente prélèvement', count: waiting.length },
    { id: 'inProgress', label: 'En cours', count: inProgress.length },
    { id: 'validated', label: 'Résultats validés', count: validated.length },
    { id: 'critical', label: 'Résultats critiques', count: critical.length },
    { id: 'cancelled', label: 'Annulées', count: cancelled.length }
  ]

  const TAB_ROWS: Record<Tab, LabRequest[]> = { all: todayRequests, waiting, inProgress, validated, critical, cancelled }

  const rows = useMemo(() => {
    const base = TAB_ROWS[activeTab]
    const term = search.trim().toLowerCase()
    if (!term) return base
    return base.filter((r) => `${r.patientName} ${r.analysisType} ${r.service} ${r.technician}`.toLowerCase().includes(term))
  }, [activeTab, search, requests])

  const statusBreakdown = useMemo(() => {
    const counts: Record<LabStatus, number> = { 'Résultat validé': 0, 'En cours': 0, 'En attente prélèvement': 0, Annulée: 0 }
    for (const r of todayRequests) counts[r.status] += 1
    const total = todayRequests.length
    return (Object.keys(counts) as LabStatus[]).map((label) => ({
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

  const sampleBreakdown = useMemo(() => {
    const counts = new Map<string, number>()
    for (const r of todayRequests) counts.set(r.sample, (counts.get(r.sample) ?? 0) + 1)
    const total = todayRequests.length
    return Array.from(counts.entries()).map(([label, count]) => ({
      label,
      count,
      percent: total === 0 ? 0 : Math.round((count / total) * 100)
    }))
  }, [todayRequests])

  const sampleDonutBackground = useMemo(() => {
    let cursor = 0
    const stops = sampleBreakdown.map(({ label, percent }) => {
      const start = cursor
      cursor += percent
      return `${SAMPLE_CHART_COLOR[label] ?? SAMPLE_CHART_COLOR.Autres} ${start}% ${cursor}%`
    })
    return `conic-gradient(${stops.join(', ')})`
  }, [sampleBreakdown])

  const turnaroundByPriority = useMemo(() => {
    const groups: Record<LabRequest['priority'], number[]> = { Critique: [], Élevée: [], Normale: [] }
    for (const r of validated) {
      if (!r.resultAt) continue
      groups[r.priority].push((r.resultAt.getTime() - r.requestedAt.getTime()) / 60000)
    }
    return (['Critique', 'Élevée', 'Normale'] as const).map((priority) => {
      const values = groups[priority]
      const avg = values.length === 0 ? null : values.reduce((sum, v) => sum + v, 0) / values.length
      return { priority, avg }
    })
  }, [validated])

  const topAnalyses = useMemo(() => {
    const counts = new Map<string, number>()
    for (const r of todayRequests) counts.set(r.analysisType, (counts.get(r.analysisType) ?? 0) + 1)
    return Array.from(counts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }, [todayRequests])

  const maxTopAnalysis = Math.max(1, ...topAnalyses.map((a) => a.count))
  const avgTurnaroundMin = useMemo(() => {
    if (validated.length === 0) return null
    const total = validated.reduce((sum, r) => sum + (r.resultAt ? (r.resultAt.getTime() - r.requestedAt.getTime()) / 60000 : 0), 0)
    return Math.round(total / validated.length)
  }, [validated])

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        breadcrumb={['Accueil', 'Laboratoire']}
        title="Laboratoire"
        subtitle="Centre de gestion des analyses et échantillons."
        actions={
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4" />
            Nouvelle demande
          </Button>
        }
      />

      {showCreateModal && (
        <LabRequestFormModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(request) => {
            setRequests((prev) => [...prev, toRecord(request)])
            setShowCreateModal(false)
          }}
        />
      )}

      {editingRequest && (
        <LabRequestFormModal
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
          title="Supprimer la demande d'analyse"
          message={`Voulez-vous vraiment supprimer la demande d'analyse de ${deletingRequest.patientName} ?`}
          onCancel={() => setDeletingRequest(null)}
          onConfirm={() => window.api.laboratory.delete(deletingRequest.id)}
          onConfirmed={() => {
            setRequests((prev) => prev.filter((r) => r.id !== deletingRequest.id))
            setDeletingRequest(null)
          }}
        />
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-24 text-sm text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement du laboratoire…
        </div>
      ) : error ? (
        <p className="py-12 text-center text-sm text-red-500">{error}</p>
      ) : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <Card className="border-t-4 border-t-violet-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50">
                <FlaskConical className="h-5 w-5 text-violet-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Analyses demandées</p>
              <p className="mt-0.5 text-xl font-bold text-gray-900">{todayRequests.length}</p>
            </Card>
            <Card className="border-t-4 border-t-orange-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50">
                <Loader2 className="h-5 w-5 text-orange-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Analyses en cours</p>
              <p className="mt-0.5 text-xl font-bold text-gray-900">{inProgress.length}</p>
            </Card>
            <Card className="border-t-4 border-t-blue-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                <Droplet className="h-5 w-5 text-blue-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">En attente de prélèvement</p>
              <p className="mt-0.5 text-xl font-bold text-gray-900">{waiting.length}</p>
            </Card>
            <Card className="border-t-4 border-t-emerald-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
                <CalendarCheck className="h-5 w-5 text-emerald-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Résultats validés (aujourd&apos;hui)</p>
              <p className="mt-0.5 text-xl font-bold text-gray-900">{validated.length}</p>
            </Card>
            <Card className="border-t-4 border-t-red-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50">
                <TriangleAlert className="h-5 w-5 text-red-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Critiques à notifier</p>
              <p className="mt-0.5 text-xl font-bold text-red-600">{critical.length}</p>
            </Card>
            <Card className="border-t-4 border-t-blue-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Délai moyen de rendu</p>
              <p className="mt-0.5 text-xl font-bold text-gray-900">{avgTurnaroundMin === null ? '—' : formatDuration(avgTurnaroundMin)}</p>
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
                        <th className="px-6 py-2.5 font-medium">N° Demande</th>
                        <th className="px-6 py-2.5 font-medium">Patient</th>
                        <th className="px-6 py-2.5 font-medium">Âge / Sexe</th>
                        <th className="px-6 py-2.5 font-medium">Service</th>
                        <th className="px-6 py-2.5 font-medium">Analyse</th>
                        <th className="px-6 py-2.5 font-medium">Statut</th>
                        <th className="px-6 py-2.5 font-medium">Priorité</th>
                        <th className="px-6 py-2.5 font-medium">Échantillon</th>
                        <th className="px-6 py-2.5 font-medium">Technicien</th>
                        <th className="px-6 py-2.5 font-medium" />
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                          <td className="px-6 py-3 text-xs text-gray-500">{r.requestNumber}</td>
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
                          <td className="px-6 py-3 text-gray-600">{r.service}</td>
                          <td className="px-6 py-3 text-gray-600">{r.analysisType}</td>
                          <td className="px-6 py-3">
                            <StatusBadge label={r.status} tone={labStatusTone(r.status)} />
                          </td>
                          <td className="px-6 py-3">
                            <StatusBadge label={r.priority} tone={labPriorityTone(r.priority)} />
                          </td>
                          <td className="px-6 py-3 text-gray-600">{r.sample}</td>
                          <td className="px-6 py-3 text-gray-600">{r.technician}</td>
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
                <span>Affichage de {rows.length === 0 ? 0 : 1} à {rows.length} sur {TAB_ROWS[activeTab].length} analyses</span>
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
                <h3 className="mb-4 text-sm font-semibold text-gray-900">Répartition par statut</h3>
                {todayRequests.length === 0 ? (
                  <p className="text-xs text-gray-400">Aucune demande aujourd&apos;hui.</p>
                ) : (
                  <div className="flex items-center gap-5">
                    <div
                      className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full"
                      style={{ background: statusDonutBackground }}
                    >
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-xs font-bold text-gray-900">
                        {todayRequests.length}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {statusBreakdown.map(({ label, count, percent }) => (
                        <div key={label} className="flex items-center gap-1.5 text-xs">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_DONUT_COLOR[label] }} />
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
                  <QuickAction icon={FileUp} label="Importer des résultats" />
                  <QuickAction icon={Link2} label="Associer des résultats" />
                  <QuickAction icon={Tags} label="Imprimer des étiquettes" />
                  <QuickAction icon={FileBarChart} label="Rapport quotidien du laboratoire" />
                </div>
              </Card>
            </div>
          </div>

          {/* Panneaux du bas */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
            <Card>
              <h3 className="mb-4 text-sm font-semibold text-gray-900">Délai moyen de rendu</h3>
              <div className="space-y-3">
                {turnaroundByPriority.map(({ priority, avg }) => (
                  <div key={priority} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-gray-600">
                      <span className={`h-2 w-2 rounded-full ${labPriorityDot(priority)}`} />
                      {priority}
                    </span>
                    <span className="font-semibold text-gray-900">{avg === null ? '—' : formatDuration(avg)}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <h3 className="mb-4 text-sm font-semibold text-gray-900">Analyses les plus demandées</h3>
              {topAnalyses.length === 0 ? (
                <p className="text-xs text-gray-400">Aucune analyse aujourd&apos;hui.</p>
              ) : (
                <div className="space-y-3">
                  {topAnalyses.map((a) => (
                    <div key={a.label}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-gray-600">{a.label}</span>
                        <span className="font-medium text-gray-900">{a.count}</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                        <div className="h-full rounded-full bg-violet-500" style={{ width: `${(a.count / maxTopAnalysis) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <h3 className="mb-4 text-sm font-semibold text-gray-900">Échantillons par type</h3>
              {todayRequests.length === 0 ? (
                <p className="text-xs text-gray-400">Aucune demande aujourd&apos;hui.</p>
              ) : (
                <div className="flex items-center gap-4">
                  <div
                    className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full"
                    style={{ background: sampleDonutBackground }}
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-xs font-bold text-gray-900">
                      {todayRequests.length}
                    </div>
                  </div>
                  <div className="space-y-1 text-[11px]">
                    {sampleBreakdown.map(({ label, count, percent }) => (
                      <div key={label} className="flex items-center gap-1.5">
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: SAMPLE_CHART_COLOR[label] ?? SAMPLE_CHART_COLOR.Autres }}
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
              <div className="border-b border-gray-100 px-5 py-3.5">
                <h3 className="text-sm font-semibold text-gray-900">Alertes laboratoire</h3>
              </div>
              <div className="space-y-3 p-5">
                {critical.length === 0 && waiting.length === 0 ? (
                  <p className="text-xs text-gray-400">Aucune alerte pour le moment.</p>
                ) : (
                  <>
                    {critical.length > 0 && (
                      <Alert
                        text={`${critical.length} résultat${critical.length > 1 ? 's' : ''} critique${critical.length > 1 ? 's' : ''} à notifier`}
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
          </div>
        </>
      )}
    </div>
  )
}

function labPriorityDot(priority: 'Critique' | 'Élevée' | 'Normale'): string {
  if (priority === 'Critique') return 'bg-red-500'
  if (priority === 'Élevée') return 'bg-orange-500'
  return 'bg-blue-500'
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
