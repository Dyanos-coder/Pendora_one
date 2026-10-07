import { useEffect, useMemo, useState } from 'react'
import {
  Scissors,
  CalendarClock,
  Hourglass,
  CheckCircle2,
  XCircle,
  Timer,
  Search,
  FileSpreadsheet,
  Columns3,
  Printer,
  Eye,
  MoreHorizontal,
  Pencil,
  Plus,
  Siren,
  LayoutGrid,
  ClipboardList,
  FileDown,
  Loader2,
  Trash2
} from 'lucide-react'
import { Card } from '@renderer/components/Card'
import { PageHeader } from '@renderer/components/PageHeader'
import { Button } from '@renderer/components/Button'
import { StatusBadge } from '@renderer/components/StatusBadge'
import { BarChart } from '@renderer/components/BarChart'
import { ConfirmDialog } from '@renderer/components/ConfirmDialog'
import type { ApiOperatingRoom, ApiOperatingRoomStatus, ApiSurgery, ApiSurgeryStatus } from '@shared/operating-room-types'
import { surgeryStatusTone, SPECIALTY_CHART_COLOR } from './status'
import type { SurgeryRecord, SurgeryStatus } from './types'
import { dayIndexInWeek, isSameDay, mondayOf } from '@renderer/features/appointments/week'
import { SurgeryFormModal } from './SurgeryFormModal'
import { SortableGroup } from '@renderer/components/SortableGroup'
import { PulseLoader } from '@renderer/components/ui/Feedback'

interface OperatingRoomPageProps {
  onOpenPatient: (patientId: string) => void
}

type Tab = 'all' | 'inProgress' | 'waiting' | 'done' | 'annule'

const STATUS_LABEL: Record<ApiSurgeryStatus, SurgeryStatus> = {
  TERMINEE: 'Terminée',
  EN_COURS: 'En cours',
  EN_ATTENTE: 'En attente',
  ANNULEE: 'Annulée'
}

const ROOM_STATUS_LABEL: Record<ApiOperatingRoomStatus, string> = {
  OCCUPIED: 'Occupée',
  AVAILABLE: 'Disponible',
  MAINTENANCE: 'En maintenance'
}

const ROOM_STATUS_DOT: Record<ApiOperatingRoomStatus, string> = {
  OCCUPIED: 'bg-teal-500',
  AVAILABLE: 'bg-gray-300',
  MAINTENANCE: 'bg-amber-400'
}

function toRecord(s: ApiSurgery): SurgeryRecord {
  return {
    id: s.id,
    patientId: s.patientId,
    patientCode: s.patientCode ?? '—',
    patientName: s.patientName ?? 'Patient',
    age: s.age,
    gender: s.gender ?? 'M',
    scheduledAt: new Date(s.scheduledAt),
    procedure: s.procedure,
    procedureDetail: s.procedureDetail ?? '',
    specialty: s.specialty ?? 'Autres',
    surgeon: s.surgeonName ?? '—',
    surgeonId: s.surgeonId,
    room: s.roomName ?? '—',
    roomId: s.roomId,
    anesthetist: s.anesthetistName ?? '—',
    anesthetistId: s.anesthetistId,
    status: STATUS_LABEL[s.status],
    expectedDuration: s.expectedDuration ?? '—'
  }
}

const ALL_FILTER = '__all__'
type PeriodFilter = 'all' | 'today' | 'week' | 'month'

const HOURLY_SLOTS = ['06h-08h', '08h-10h', '10h-12h', '12h-14h', '14h-16h', '16h-18h', '18h-20h']

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export function OperatingRoomPage({ onOpenPatient }: OperatingRoomPageProps): JSX.Element {
  const [surgeries, setSurgeries] = useState<SurgeryRecord[]>([])
  const [rooms, setRooms] = useState<ApiOperatingRoom[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingSurgery, setEditingSurgery] = useState<SurgeryRecord | null>(null)
  const [deletingSurgery, setDeletingSurgery] = useState<SurgeryRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('all')
  const [search, setSearch] = useState('')
  const [exporting, setExporting] = useState(false)
  const [filterPeriod, setFilterPeriod] = useState<PeriodFilter>('all')
  const [filterService, setFilterService] = useState(ALL_FILTER)
  const [filterSurgeon, setFilterSurgeon] = useState(ALL_FILTER)
  const [filterAnesthetist, setFilterAnesthetist] = useState(ALL_FILTER)
  const [filterRoom, setFilterRoom] = useState(ALL_FILTER)
  const [filterStatus, setFilterStatus] = useState(ALL_FILTER)

  useEffect(() => {
    let cancelled = false
    Promise.all([window.api.operatingRoom.list(), window.api.operatingRoom.rooms()]).then(([surgResult, roomsResult]) => {
      if (cancelled) return
      if (surgResult.ok) {
        setSurgeries(surgResult.data.surgeries.map(toRecord))
      } else {
        setError(surgResult.error)
      }
      if (roomsResult.ok) setRooms(roomsResult.data.rooms)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleExportExcel(): Promise<void> {
    setExporting(true)
    await window.api.operatingRoom.exportExcel()
    setExporting(false)
  }

  const today = useMemo(() => new Date(), [])
  const realMonday = useMemo(() => mondayOf(today), [today])
  const todaySurgeries = useMemo(() => surgeries.filter((s) => isSameDay(s.scheduledAt, today)), [surgeries, today])
  const inProgress = useMemo(() => todaySurgeries.filter((s) => s.status === 'En cours'), [todaySurgeries])
  const waiting = useMemo(() => todaySurgeries.filter((s) => s.status === 'En attente'), [todaySurgeries])
  const done = useMemo(() => todaySurgeries.filter((s) => s.status === 'Terminée'), [todaySurgeries])
  const annule = useMemo(() => todaySurgeries.filter((s) => s.status === 'Annulée'), [todaySurgeries])

  const TABS: { id: Tab; label: string; count: number }[] = [
    { id: 'all', label: 'Toutes les interventions', count: todaySurgeries.length },
    { id: 'inProgress', label: 'En cours', count: inProgress.length },
    { id: 'waiting', label: 'En attente', count: waiting.length },
    { id: 'done', label: 'Terminées', count: done.length },
    { id: 'annule', label: 'Annulées', count: annule.length }
  ]

  const TAB_ROWS: Record<Tab, SurgeryRecord[]> = { all: todaySurgeries, inProgress, waiting, done, annule }
  const tabRows = TAB_ROWS[activeTab]

  // La « spécialité » est le champ le plus proche pour représenter le service concerné par
  // l'intervention (il n'existe pas de champ « service » distinct sur une intervention).
  const specialtyOptions = useMemo(
    () => Array.from(new Set(surgeries.map((s) => s.specialty).filter((sp) => sp && sp !== '—'))).sort(),
    [surgeries]
  )
  const surgeonOptions = useMemo(
    () => Array.from(new Set(surgeries.map((s) => s.surgeon).filter((s) => s && s !== '—'))).sort(),
    [surgeries]
  )
  const anesthetistOptions = useMemo(
    () => Array.from(new Set(surgeries.map((s) => s.anesthetist).filter((a) => a && a !== '—'))).sort(),
    [surgeries]
  )
  const roomOptions = useMemo(() => Array.from(new Set(rooms.map((r) => r.name))).sort(), [rooms])

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase()
    return tabRows.filter((s) => {
      if (term && !`${s.patientName} ${s.procedure} ${s.surgeon} ${s.room}`.toLowerCase().includes(term)) return false
      if (filterService !== ALL_FILTER && s.specialty !== filterService) return false
      if (filterSurgeon !== ALL_FILTER && s.surgeon !== filterSurgeon) return false
      if (filterAnesthetist !== ALL_FILTER && s.anesthetist !== filterAnesthetist) return false
      if (filterRoom !== ALL_FILTER && s.room !== filterRoom) return false
      if (filterStatus !== ALL_FILTER && s.status !== filterStatus) return false
      if (filterPeriod === 'today' && !isSameDay(s.scheduledAt, today)) return false
      if (filterPeriod === 'week') {
        const idx = dayIndexInWeek(realMonday, s.scheduledAt)
        if (idx < 0 || idx >= 7) return false
      }
      if (
        filterPeriod === 'month' &&
        (s.scheduledAt.getMonth() !== today.getMonth() || s.scheduledAt.getFullYear() !== today.getFullYear())
      ) {
        return false
      }
      return true
    })
  }, [tabRows, search, filterService, filterSurgeon, filterAnesthetist, filterRoom, filterStatus, filterPeriod, today, realMonday])

  function handleResetFilters(): void {
    setFilterPeriod('all')
    setFilterService(ALL_FILTER)
    setFilterSurgeon(ALL_FILTER)
    setFilterAnesthetist(ALL_FILTER)
    setFilterRoom(ALL_FILTER)
    setFilterStatus(ALL_FILTER)
  }

  const avgDurationMin = useMemo(() => {
    const withDuration = todaySurgeries.filter((s) => s.expectedDuration !== '—')
    if (withDuration.length === 0) return null
    const totalMin = withDuration.reduce((sum, s) => {
      const match = s.expectedDuration.match(/(?:(\d+)h)?\s*(?:(\d+)m)?/)
      const h = Number(match?.[1] ?? 0)
      const m = Number(match?.[2] ?? 0)
      return sum + h * 60 + m
    }, 0)
    return Math.round(totalMin / withDuration.length)
  }, [todaySurgeries])

  const specialtyBreakdown = useMemo(() => {
    const counts = new Map<string, number>()
    for (const s of todaySurgeries) counts.set(s.specialty, (counts.get(s.specialty) ?? 0) + 1)
    const total = todaySurgeries.length
    return Array.from(counts.entries()).map(([specialty, count]) => ({
      specialty,
      count,
      percent: total === 0 ? 0 : Math.round((count / total) * 100)
    }))
  }, [todaySurgeries])

  const specialtyDonutBackground = useMemo(() => {
    let cursor = 0
    const stops = specialtyBreakdown.map(({ specialty, percent }) => {
      const start = cursor
      cursor += percent
      return `${SPECIALTY_CHART_COLOR[specialty] ?? SPECIALTY_CHART_COLOR.Autres} ${start}% ${cursor}%`
    })
    return `conic-gradient(${stops.join(', ')})`
  }, [specialtyBreakdown])

  const hourlyCounts = useMemo(() => {
    const buckets = new Array(7).fill(0)
    for (const s of todaySurgeries) {
      const hour = s.scheduledAt.getHours()
      const bucket = Math.min(6, Math.max(0, Math.floor((hour - 6) / 2)))
      if (hour >= 6 && hour < 20) buckets[bucket] += 1
    }
    return buckets
  }, [todaySurgeries])

  const roomTodayCount = useMemo(() => {
    const counts = new Map<string, number>()
    for (const s of todaySurgeries) counts.set(s.room, (counts.get(s.room) ?? 0) + 1)
    return counts
  }, [todaySurgeries])

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        breadcrumb={['Accueil', 'Bloc opératoire']}
        title="Bloc opératoire"
        subtitle="Centre de gestion du bloc opératoire."
        actions={
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4" />
            Programmer une intervention
          </Button>
        }
      />

      {showCreateModal && (
        <SurgeryFormModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(surgery) => {
            setSurgeries((prev) => [...prev, toRecord(surgery)])
            setShowCreateModal(false)
          }}
        />
      )}

      {editingSurgery && (
        <SurgeryFormModal
          editing={editingSurgery}
          onClose={() => setEditingSurgery(null)}
          onCreated={(surgery) => {
            const updated = toRecord(surgery)
            setSurgeries((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
            setEditingSurgery(null)
          }}
        />
      )}

      {deletingSurgery && (
        <ConfirmDialog
          title="Supprimer l'intervention"
          message={`Voulez-vous vraiment supprimer l'intervention de ${deletingSurgery.patientName} ?`}
          onCancel={() => setDeletingSurgery(null)}
          onConfirm={() => window.api.operatingRoom.delete(deletingSurgery.id)}
          onConfirmed={() => {
            setSurgeries((prev) => prev.filter((s) => s.id !== deletingSurgery.id))
            setDeletingSurgery(null)
          }}
        />
      )}

      {loading ? (
        <PulseLoader label="Chargement du bloc opératoire…" />
      ) : error ? (
        <p className="py-12 text-center text-sm text-red-500">{error}</p>
      ) : (
        <>
          {/* KPI row */}
          <SortableGroup id="operatingRoom.grid1" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <Card className="p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-black/5 bg-accent-50">
                <Scissors className="h-5 w-5 text-accent-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Interventions aujourd&apos;hui</p>
              <p className="mt-0.5 text-xl font-display font-extrabold tabular-nums text-gray-900">{todaySurgeries.length}</p>
            </Card>
            <Card className="p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-black/5 bg-blue-50">
                <CalendarClock className="h-5 w-5 text-blue-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Interventions programmées</p>
              <p className="mt-0.5 text-xl font-display font-extrabold tabular-nums text-gray-900">{waiting.length}</p>
            </Card>
            <Card className="p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-black/5 bg-amber-50">
                <Hourglass className="h-5 w-5 text-amber-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">En cours</p>
              <p className="mt-0.5 text-xl font-display font-extrabold tabular-nums text-gray-900">{inProgress.length}</p>
              <p className="text-xs text-gray-400">En ce moment</p>
            </Card>
            <Card className="p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-black/5 bg-teal-50">
                <CheckCircle2 className="h-5 w-5 text-teal-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Terminées aujourd&apos;hui</p>
              <p className="mt-0.5 text-xl font-display font-extrabold tabular-nums text-gray-900">{done.length}</p>
            </Card>
            <Card className="p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-black/5 bg-red-50">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Annulées aujourd&apos;hui</p>
              <p className="mt-0.5 text-xl font-display font-extrabold tabular-nums text-gray-900">{annule.length}</p>
            </Card>
            <Card className="p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-black/5 bg-accent-50">
                <Timer className="h-5 w-5 text-accent-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Durée moyenne</p>
              <p className="mt-0.5 text-xl font-display font-extrabold tabular-nums text-gray-900">
                {avgDurationMin === null ? '—' : `${Math.floor(avgDurationMin / 60)}h ${String(avgDurationMin % 60).padStart(2, '0')}m`}
              </p>
            </Card>
          </SortableGroup>

          <SortableGroup id="operatingRoom.grid2" className="grid grid-cols-1 gap-6 lg:grid-cols-3">
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
                  {tabRows.length === 0 ? 'Aucune intervention dans cette catégorie.' : 'Aucune intervention ne correspond aux filtres.'}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50/70 text-[11px] uppercase tracking-[0.08em] text-gray-500">
                        <th className="px-6 py-3 font-semibold">Heure</th>
                        <th className="px-6 py-3 font-semibold">Patient</th>
                        <th className="px-6 py-3 font-semibold">Âge / Sexe</th>
                        <th className="px-6 py-3 font-semibold">Intervention</th>
                        <th className="px-6 py-3 font-semibold">Chirurgien</th>
                        <th className="px-6 py-3 font-semibold">Salle</th>
                        <th className="px-6 py-3 font-semibold">Anesthésiste</th>
                        <th className="px-6 py-3 font-semibold">Statut</th>
                        <th className="px-6 py-3 font-semibold">Durée</th>
                        <th className="px-6 py-3 font-semibold" />
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.map((s) => (
                        <tr key={s.id} className="border-b border-gray-100 last:border-0 transition-colors hover:bg-accent-50/40">
                          <td className="px-6 py-3 font-medium text-gray-900">{formatTime(s.scheduledAt)}</td>
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-2.5">
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-50 text-[11px] font-semibold text-accent-700">
                                {initials(s.patientName)}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate font-medium text-gray-900">{s.patientName}</p>
                                <p className="truncate text-xs text-gray-400">{s.patientCode}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-gray-600">
                            {s.age ? `${s.age} ans · ${s.gender === 'M' ? 'Homme' : 'Femme'}` : '—'}
                          </td>
                          <td className="px-6 py-3">
                            <p className="text-gray-900">{s.procedure}</p>
                            {s.procedureDetail && <p className="text-xs text-gray-400">{s.procedureDetail}</p>}
                          </td>
                          <td className="px-6 py-3 text-gray-600">{s.surgeon}</td>
                          <td className="px-6 py-3 text-gray-600">{s.room}</td>
                          <td className="px-6 py-3 text-gray-600">{s.anesthetist}</td>
                          <td className="px-6 py-3">
                            <StatusBadge label={s.status} tone={surgeryStatusTone(s.status)} />
                          </td>
                          <td className="px-6 py-3 text-gray-600">{s.expectedDuration}</td>
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => s.patientId && onOpenPatient(s.patientId)}
                                disabled={!s.patientId}
                                title={s.patientId ? 'Voir le dossier patient' : 'Aucun dossier lié'}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setEditingSurgery(s)}
                                title="Modifier l'intervention"
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setDeletingSurgery(s)}
                                title="Supprimer l'intervention"
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
                <span>
                  Affichage de {filteredRows.length === 0 ? 0 : 1} à {filteredRows.length} sur {tabRows.length} interventions
                </span>
              </div>
            </Card>

            {/* Colonne latérale */}
            <SortableGroup id="operatingRoom.side1" className="space-y-6">
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
                      <option value="all">Toutes les périodes</option>
                      <option value="today">Aujourd&apos;hui</option>
                      <option value="week">Cette semaine</option>
                      <option value="month">Ce mois-ci</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">Service</label>
                    <select
                      value={filterService}
                      onChange={(e) => setFilterService(e.target.value)}
                      className="w-full rounded-[10px] border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15"
                    >
                      <option value={ALL_FILTER}>Tous les services</option>
                      {specialtyOptions.map((sp) => (
                        <option key={sp} value={sp}>
                          {sp}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">Chirurgien</label>
                    <select
                      value={filterSurgeon}
                      onChange={(e) => setFilterSurgeon(e.target.value)}
                      className="w-full rounded-[10px] border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15"
                    >
                      <option value={ALL_FILTER}>Tous les chirurgiens</option>
                      {surgeonOptions.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">Anesthésiste</label>
                    <select
                      value={filterAnesthetist}
                      onChange={(e) => setFilterAnesthetist(e.target.value)}
                      className="w-full rounded-[10px] border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15"
                    >
                      <option value={ALL_FILTER}>Tous les anesthésistes</option>
                      {anesthetistOptions.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">Salle</label>
                    <select
                      value={filterRoom}
                      onChange={(e) => setFilterRoom(e.target.value)}
                      className="w-full rounded-[10px] border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15"
                    >
                      <option value={ALL_FILTER}>Toutes les salles</option>
                      {roomOptions.map((r) => (
                        <option key={r} value={r}>
                          {r}
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
                </div>
              </Card>

              <Card>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-[15px] font-bold text-gray-900">Salles opératoires</h3>
                </div>
                <div className="space-y-3">
                  {rooms.map((room) => (
                    <div key={room.id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${ROOM_STATUS_DOT[room.status]}`} />
                        <span className="font-medium text-gray-700">{room.name}</span>
                      </div>
                      <span className="text-gray-400">
                        {ROOM_STATUS_LABEL[room.status]} · {roomTodayCount.get(room.name) ?? 0} interv.
                      </span>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-0">
                <div className="border-b border-gray-100 px-5 py-4">
                  <h3 className="text-[15px] font-bold text-gray-900">Actions rapides</h3>
                </div>
                <div className="p-2">
                  <QuickAction icon={Plus} label="Programmer une intervention" onClick={() => setShowCreateModal(true)} />
                  <QuickAction icon={Siren} label="Ajouter une intervention urgente" onClick={() => setShowCreateModal(true)} />
                  <QuickAction icon={LayoutGrid} label="Voir le planning du bloc" onClick={() => setActiveTab('all')} />
                  <QuickAction
                    icon={Hourglass}
                    label={`Voir les interventions en attente (${waiting.length})`}
                    onClick={() => setActiveTab('waiting')}
                  />
                  <QuickAction
                    icon={XCircle}
                    label={`Voir les interventions annulées (${annule.length})`}
                    onClick={() => setActiveTab('annule')}
                  />
                  <QuickAction icon={FileDown} label="Imprimer le programme du jour" onClick={() => window.print()} />
                </div>
              </Card>
            </SortableGroup>
          </SortableGroup>

          {/* Panneaux du bas */}
          <SortableGroup id="operatingRoom.grid3" className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-[15px] font-bold text-gray-900">Répartition par spécialité</h3>
              </div>
              {todaySurgeries.length === 0 ? (
                <p className="text-xs text-gray-400">Aucune intervention aujourd&apos;hui.</p>
              ) : (
                <div className="flex items-center gap-4">
                  <div
                    className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full"
                    style={{ background: specialtyDonutBackground }}
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-xs font-bold text-gray-900">
                      {todaySurgeries.length}
                    </div>
                  </div>
                  <div className="space-y-1 text-[11px]">
                    {specialtyBreakdown.map(({ specialty, count, percent }) => (
                      <div key={specialty} className="flex items-center gap-1.5">
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: SPECIALTY_CHART_COLOR[specialty] ?? SPECIALTY_CHART_COLOR.Autres }}
                        />
                        <span className="text-gray-600">{specialty}</span>
                        <span className="font-medium text-gray-900">
                          {count} ({percent}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            <Card>
              <h3 className="mb-4 text-[15px] font-bold text-gray-900">Interventions par tranche horaire</h3>
              <BarChart categories={HOURLY_SLOTS} values={hourlyCounts} />
            </Card>

            <Card className="p-0">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
                <h3 className="text-[15px] font-bold text-gray-900">Interventions en attente ({waiting.length})</h3>
              </div>
              <div className="space-y-3 p-5">
                {waiting.length === 0 ? (
                  <p className="text-xs text-gray-400">Aucune intervention en attente.</p>
                ) : (
                  waiting.map((s) => (
                    <div key={s.id} className="flex items-center gap-2 text-xs">
                      <ClipboardList className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-gray-800">{s.patientName}</p>
                        <p className="truncate text-gray-400">{s.procedure}</p>
                      </div>
                      <span className="shrink-0 text-right text-gray-400">
                        {s.room}
                        <br />
                        {formatTime(s.scheduledAt)}
                      </span>
                    </div>
                  ))
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
