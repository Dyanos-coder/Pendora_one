import { useEffect, useMemo, useState } from 'react'
import {
  Telescope,
  Loader2,
  Hourglass,
  CheckCircle2,
  TriangleAlert,
  Clock,
  Users,
  Search,
  FileSpreadsheet,
  Columns3,
  Printer,
  Eye,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2
} from 'lucide-react'
import { Card } from '@renderer/components/Card'
import { PageHeader } from '@renderer/components/PageHeader'
import { Button } from '@renderer/components/Button'
import { StatusBadge } from '@renderer/components/StatusBadge'
import { BarChart } from '@renderer/components/BarChart'
import { ConfirmDialog } from '@renderer/components/ConfirmDialog'
import type { ApiEndoscopyPriority, ApiEndoscopyProcedure, ApiEndoscopyStatus } from '@shared/endoscopy-types'
import { endoscopyStatusTone, endoscopyPriorityTone, PROCEDURE_TYPE_CHART_COLOR } from './status'
import type { EndoscopyProcedure, EndoscopyStatus } from './types'
import { isSameDay } from '@renderer/features/appointments/week'
import { EndoscopyProcedureFormModal } from './EndoscopyProcedureFormModal'

interface EndoscopyPageProps {
  onOpenPatient: (patientId: string) => void
}

type Tab = 'all' | 'waiting' | 'inProgress' | 'done' | 'urgent' | 'cancelled'

const STATUS_LABEL: Record<ApiEndoscopyStatus, EndoscopyStatus> = {
  REALISE: 'Réalisé',
  EN_COURS: 'En cours',
  EN_ATTENTE: 'En attente',
  PROGRAMME: 'Programmé',
  ANNULE: 'Annulé'
}

const PRIORITY_LABEL: Record<ApiEndoscopyPriority, 'Normale' | 'Urgent'> = { NORMALE: 'Normale', URGENT: 'Urgent' }

const STATUS_DONUT_COLOR: Record<EndoscopyStatus, string> = {
  Programmé: '#9ca3af',
  Réalisé: '#10b981',
  'En attente': '#f59e0b',
  'En cours': '#3b82f6',
  Annulé: '#d1d5db'
}

function toRecord(p: ApiEndoscopyProcedure): EndoscopyProcedure {
  return {
    id: p.id,
    patientId: p.patientId,
    patientCode: p.patientCode ?? '—',
    patientName: p.patientName ?? 'Patient',
    age: p.age,
    gender: p.gender ?? 'M',
    requestedAt: new Date(p.requestedAt),
    resultAt: p.resultAt ? new Date(p.resultAt) : null,
    procedureType: p.procedureType,
    indication: p.indication ?? '—',
    endoscopist: p.endoscopistName ?? '—',
    endoscopistId: p.endoscopistId,
    status: STATUS_LABEL[p.status],
    priority: PRIORITY_LABEL[p.priority],
    expectedDurationMin: p.expectedDurationMin,
    room: p.room ?? '—'
  }
}

const FILTER_FIELDS = [
  { label: 'Période', value: "Aujourd'hui" },
  { label: 'Service demandeur', value: 'Tous les services' },
  { label: "Type d'acte", value: 'Tous les types' },
  { label: 'Endoscopiste', value: 'Tous les endoscopistes' },
  { label: 'Statut', value: 'Tous les statuts' },
  { label: 'Priorité', value: 'Toutes les priorités' },
  { label: 'Salle / Appareil', value: 'Toutes les salles' }
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

const HOURLY_BUCKET_LABELS = ['08h-10h', '10h-12h', '12h-14h', '14h-16h', '16h-18h', '18h-20h']

export function EndoscopyPage({ onOpenPatient }: EndoscopyPageProps): JSX.Element {
  const [procedures, setProcedures] = useState<EndoscopyProcedure[]>([])
  const [patientsFollowed, setPatientsFollowed] = useState<number | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingProcedure, setEditingProcedure] = useState<EndoscopyProcedure | null>(null)
  const [deletingProcedure, setDeletingProcedure] = useState<EndoscopyProcedure | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([window.api.endoscopy.list(), window.api.endoscopy.patientsFollowed()]).then(([procResult, followedResult]) => {
      if (cancelled) return
      if (procResult.ok) {
        setProcedures(procResult.data.procedures.map(toRecord))
      } else {
        setError(procResult.error)
      }
      if (followedResult.ok) setPatientsFollowed(followedResult.data.count)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const today = useMemo(() => new Date(), [])
  const todayProcedures = useMemo(() => procedures.filter((p) => isSameDay(p.requestedAt, today)), [procedures, today])
  const scheduled = useMemo(() => todayProcedures.filter((p) => p.status === 'Programmé'), [todayProcedures])
  const waiting = useMemo(() => todayProcedures.filter((p) => p.status === 'En attente'), [todayProcedures])
  const inProgress = useMemo(() => todayProcedures.filter((p) => p.status === 'En cours'), [todayProcedures])
  const done = useMemo(() => todayProcedures.filter((p) => p.status === 'Réalisé'), [todayProcedures])
  const urgent = useMemo(() => todayProcedures.filter((p) => p.priority === 'Urgent'), [todayProcedures])
  const cancelled = useMemo(() => todayProcedures.filter((p) => p.status === 'Annulé'), [todayProcedures])
  const urgentPending = useMemo(() => urgent.filter((p) => p.status !== 'Réalisé' && p.status !== 'Annulé'), [urgent])

  const TABS: { id: Tab; label: string; count: number }[] = [
    { id: 'all', label: 'Tous les actes', count: todayProcedures.length },
    { id: 'waiting', label: 'En attente', count: waiting.length },
    { id: 'inProgress', label: 'En cours', count: inProgress.length },
    { id: 'done', label: 'Réalisés', count: done.length },
    { id: 'urgent', label: 'Urgents', count: urgent.length },
    { id: 'cancelled', label: 'Annulés', count: cancelled.length }
  ]

  const TAB_ROWS: Record<Tab, EndoscopyProcedure[]> = { all: todayProcedures, waiting, inProgress, done, urgent, cancelled }

  const rows = useMemo(() => {
    const base = TAB_ROWS[activeTab]
    const term = search.trim().toLowerCase()
    if (!term) return base
    return base.filter((p) => `${p.patientName} ${p.procedureType} ${p.indication} ${p.endoscopist}`.toLowerCase().includes(term))
  }, [activeTab, search, procedures])

  const typeBreakdown = useMemo(() => {
    const counts = new Map<string, number>()
    for (const p of todayProcedures) counts.set(p.procedureType, (counts.get(p.procedureType) ?? 0) + 1)
    const total = todayProcedures.length
    return Array.from(counts.entries())
      .map(([label, count]) => ({ label, count, percent: total === 0 ? 0 : Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count)
  }, [todayProcedures])

  const typeDonutBackground = useMemo(() => {
    let cursor = 0
    const stops = typeBreakdown.map(({ label, percent }) => {
      const start = cursor
      cursor += percent
      return `${PROCEDURE_TYPE_CHART_COLOR[label] ?? PROCEDURE_TYPE_CHART_COLOR.Autres} ${start}% ${cursor}%`
    })
    return `conic-gradient(${stops.join(', ')})`
  }, [typeBreakdown])

  const statusBreakdown = useMemo(() => {
    const counts: Record<EndoscopyStatus, number> = { Programmé: 0, Réalisé: 0, 'En attente': 0, 'En cours': 0, Annulé: 0 }
    for (const p of todayProcedures) counts[p.status] += 1
    return (Object.keys(counts) as EndoscopyStatus[]).map((label) => ({ label, count: counts[label] }))
  }, [todayProcedures])
  const statusTotal = todayProcedures.length
  const statusDonutBackground = useMemo(() => {
    let cursor = 0
    const stops = statusBreakdown.map(({ label, count }) => {
      const percent = statusTotal === 0 ? 0 : (count / statusTotal) * 100
      const start = cursor
      cursor += percent
      return `${STATUS_DONUT_COLOR[label]} ${start}% ${cursor}%`
    })
    return `conic-gradient(${stops.join(', ')})`
  }, [statusBreakdown, statusTotal])

  const delayByType = useMemo(() => {
    const groups = new Map<string, number[]>()
    for (const p of done) {
      if (!p.resultAt) continue
      const minutes = (p.resultAt.getTime() - p.requestedAt.getTime()) / 60000
      groups.set(p.procedureType, [...(groups.get(p.procedureType) ?? []), minutes])
    }
    return Array.from(groups.entries()).map(([label, values]) => ({
      label,
      avg: values.reduce((sum, v) => sum + v, 0) / values.length
    }))
  }, [done])

  const avgTurnaroundMin = useMemo(() => {
    const withResult = done.filter((p) => p.resultAt)
    if (withResult.length === 0) return null
    const total = withResult.reduce((sum, p) => sum + (p.resultAt!.getTime() - p.requestedAt.getTime()) / 60000, 0)
    return Math.round(total / withResult.length)
  }, [done])

  const hourlyActivity = useMemo(() => {
    const buckets = new Array(6).fill(0)
    for (const p of todayProcedures) {
      const hour = p.requestedAt.getHours()
      if (hour < 8 || hour >= 20) continue
      buckets[Math.floor((hour - 8) / 2)] += 1
    }
    return buckets
  }, [todayProcedures])

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        breadcrumb={['Accueil', 'Endoscopie']}
        title="Endoscopie"
        subtitle="Centre de gestion des actes et examens d'endoscopie."
        actions={
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4" />
            Nouvelle procédure
          </Button>
        }
      />

      {showCreateModal && (
        <EndoscopyProcedureFormModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(procedure) => {
            setProcedures((prev) => [...prev, toRecord(procedure)])
            setShowCreateModal(false)
          }}
        />
      )}

      {editingProcedure && (
        <EndoscopyProcedureFormModal
          editing={editingProcedure}
          onClose={() => setEditingProcedure(null)}
          onCreated={(procedure) => {
            const updated = toRecord(procedure)
            setProcedures((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
            setEditingProcedure(null)
          }}
        />
      )}

      {deletingProcedure && (
        <ConfirmDialog
          title="Supprimer la procédure"
          message={`Voulez-vous vraiment supprimer la procédure de ${deletingProcedure.patientName} ?`}
          onCancel={() => setDeletingProcedure(null)}
          onConfirm={() => window.api.endoscopy.delete(deletingProcedure.id)}
          onConfirmed={() => {
            setProcedures((prev) => prev.filter((p) => p.id !== deletingProcedure.id))
            setDeletingProcedure(null)
          }}
        />
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-24 text-sm text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement de l&apos;endoscopie…
        </div>
      ) : error ? (
        <p className="py-12 text-center text-sm text-red-500">{error}</p>
      ) : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            <Card className="border-t-4 border-t-violet-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50">
                <Telescope className="h-5 w-5 text-violet-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Actes programmés</p>
              <p className="mt-0.5 text-xl font-bold text-gray-900">{scheduled.length}</p>
            </Card>
            <Card className="border-t-4 border-t-orange-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50">
                <Loader2 className="h-5 w-5 text-orange-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">En cours aujourd&apos;hui</p>
              <p className="mt-0.5 text-xl font-bold text-gray-900">{inProgress.length}</p>
            </Card>
            <Card className="border-t-4 border-t-amber-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50">
                <Hourglass className="h-5 w-5 text-amber-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">En attente</p>
              <p className="mt-0.5 text-xl font-bold text-gray-900">{waiting.length}</p>
            </Card>
            <Card className="border-t-4 border-t-emerald-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Actes réalisés</p>
              <p className="mt-0.5 text-xl font-bold text-gray-900">{done.length}</p>
            </Card>
            <Card className="border-t-4 border-t-red-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50">
                <TriangleAlert className="h-5 w-5 text-red-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Urgents</p>
              <p className="mt-0.5 text-xl font-bold text-red-600">{urgent.length}</p>
            </Card>
            <Card className="border-t-4 border-t-blue-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                <Clock className="h-5 w-5 text-blue-600" />
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
                <p className="px-6 py-8 text-center text-sm text-gray-400">Aucun acte dans cette catégorie.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                        <th className="px-6 py-2.5 font-medium">Date / Heure</th>
                        <th className="px-6 py-2.5 font-medium">Patient</th>
                        <th className="px-6 py-2.5 font-medium">Âge / Sexe</th>
                        <th className="px-6 py-2.5 font-medium">Acte</th>
                        <th className="px-6 py-2.5 font-medium">Indication</th>
                        <th className="px-6 py-2.5 font-medium">Endoscopiste</th>
                        <th className="px-6 py-2.5 font-medium">Statut</th>
                        <th className="px-6 py-2.5 font-medium">Priorité</th>
                        <th className="px-6 py-2.5 font-medium">Salle / Appareil</th>
                        <th className="px-6 py-2.5 font-medium" />
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((p) => (
                        <tr key={p.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                          <td className="px-6 py-3 text-gray-600">
                            <p>{formatDate(p.requestedAt)}</p>
                            <p className="text-xs text-gray-400">{formatTime(p.requestedAt)}</p>
                          </td>
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-2.5">
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-50 text-[11px] font-semibold text-accent-700">
                                {initials(p.patientName)}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate font-medium text-gray-900">{p.patientName}</p>
                                <p className="truncate text-xs text-gray-400">{p.patientCode}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-gray-600">{p.age ? `${p.age} ans · ${p.gender === 'M' ? 'Homme' : 'Femme'}` : '—'}</td>
                          <td className="px-6 py-3 text-gray-900">{p.procedureType}</td>
                          <td className="px-6 py-3 text-gray-600">{p.indication}</td>
                          <td className="px-6 py-3 text-gray-600">{p.endoscopist}</td>
                          <td className="px-6 py-3">
                            <StatusBadge label={p.status} tone={endoscopyStatusTone(p.status)} />
                          </td>
                          <td className="px-6 py-3">
                            <StatusBadge label={p.priority} tone={endoscopyPriorityTone(p.priority)} />
                          </td>
                          <td className="px-6 py-3 text-gray-600">{p.room}</td>
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => p.patientId && onOpenPatient(p.patientId)}
                                disabled={!p.patientId}
                                title={p.patientId ? 'Voir le dossier patient' : 'Aucun dossier lié'}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setEditingProcedure(p)}
                                title="Modifier la procédure"
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setDeletingProcedure(p)}
                                title="Supprimer la procédure"
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
                <span>Affichage de {rows.length === 0 ? 0 : 1} à {rows.length} sur {TAB_ROWS[activeTab].length} actes</span>
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
                <h3 className="mb-4 text-sm font-semibold text-gray-900">Répartition par type d&apos;acte</h3>
                {typeBreakdown.length === 0 ? (
                  <p className="text-xs text-gray-400">Aucun acte aujourd&apos;hui.</p>
                ) : (
                  <div className="flex items-center gap-5">
                    <div
                      className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full"
                      style={{ background: typeDonutBackground }}
                    >
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-xs font-bold text-gray-900">
                        {todayProcedures.length}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {typeBreakdown.map(({ label, count, percent }) => (
                        <div key={label} className="flex items-center gap-1.5 text-xs">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: PROCEDURE_TYPE_CHART_COLOR[label] ?? PROCEDURE_TYPE_CHART_COLOR.Autres }}
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
                  <h3 className="text-sm font-semibold text-gray-900">Alertes & notifications</h3>
                </div>
                <div className="space-y-3 p-5">
                  {urgentPending.length === 0 && waiting.length === 0 ? (
                    <p className="text-xs text-gray-400">Aucune alerte pour le moment.</p>
                  ) : (
                    <>
                      {urgentPending.length > 0 && (
                        <Alert text={`${urgentPending.length} acte${urgentPending.length > 1 ? 's' : ''} urgent${urgentPending.length > 1 ? 's' : ''} en attente`} tone="text-red-500" />
                      )}
                      {waiting.length > 0 && (
                        <Alert text={`${waiting.length} acte${waiting.length > 1 ? 's' : ''} en attente de réalisation`} tone="text-amber-500" />
                      )}
                    </>
                  )}
                </div>
              </Card>
            </div>
          </div>

          {/* Panneaux du bas */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card>
              <h3 className="mb-4 text-sm font-semibold text-gray-900">Activité du jour par tranche horaire</h3>
              <BarChart categories={HOURLY_BUCKET_LABELS} values={hourlyActivity} />
            </Card>

            <Card>
              <h3 className="mb-4 text-sm font-semibold text-gray-900">Statut des actes</h3>
              {statusTotal === 0 ? (
                <p className="text-xs text-gray-400">Aucun acte aujourd&apos;hui.</p>
              ) : (
                <div className="flex items-center gap-4">
                  <div
                    className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full"
                    style={{ background: statusDonutBackground }}
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-xs font-bold text-gray-900">
                      {statusTotal}
                    </div>
                  </div>
                  <div className="space-y-1 text-[11px]">
                    {statusBreakdown.map(({ label, count }) => (
                      <div key={label} className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: STATUS_DONUT_COLOR[label] }} />
                        <span className="text-gray-600">{label}</span>
                        <span className="font-medium text-gray-900">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            <Card>
              <h3 className="mb-4 text-sm font-semibold text-gray-900">Délai moyen de rendu par type d&apos;acte</h3>
              {delayByType.length === 0 ? (
                <p className="text-xs text-gray-400">Aucun acte réalisé aujourd&apos;hui.</p>
              ) : (
                <div className="space-y-2.5">
                  {delayByType.map((d) => (
                    <div key={d.label} className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">{d.label}</span>
                      <span className="font-semibold text-gray-900">{formatDuration(Math.round(d.avg))}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
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
