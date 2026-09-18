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
import { isSameDay } from '@renderer/features/appointments/week'
import { SurgeryFormModal } from './SurgeryFormModal'

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
  OCCUPIED: 'bg-emerald-500',
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

const FILTER_FIELDS = [
  { label: 'Période', value: "Aujourd'hui" },
  { label: 'Service', value: 'Tous les services' },
  { label: 'Chirurgien', value: 'Tous les chirurgiens' },
  { label: 'Anesthésiste', value: 'Tous les anesthésistes' },
  { label: 'Salle', value: 'Toutes les salles' },
  { label: 'Statut', value: 'Tous les statuts' }
]

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

  const today = useMemo(() => new Date(), [])
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

  const rows = useMemo(() => {
    const base = TAB_ROWS[activeTab]
    const term = search.trim().toLowerCase()
    if (!term) return base
    return base.filter((s) => `${s.patientName} ${s.procedure} ${s.surgeon} ${s.room}`.toLowerCase().includes(term))
  }, [activeTab, search, surgeries])

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
        <div className="flex items-center justify-center gap-2 py-24 text-sm text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement du bloc opératoire…
        </div>
      ) : error ? (
        <p className="py-12 text-center text-sm text-red-500">{error}</p>
      ) : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <Card className="border-t-4 border-t-violet-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50">
                <Scissors className="h-5 w-5 text-violet-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Interventions aujourd&apos;hui</p>
              <p className="mt-0.5 text-xl font-bold text-gray-900">{todaySurgeries.length}</p>
            </Card>
            <Card className="border-t-4 border-t-blue-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                <CalendarClock className="h-5 w-5 text-blue-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Interventions programmées</p>
              <p className="mt-0.5 text-xl font-bold text-gray-900">{waiting.length}</p>
            </Card>
            <Card className="border-t-4 border-t-amber-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50">
                <Hourglass className="h-5 w-5 text-amber-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">En cours</p>
              <p className="mt-0.5 text-xl font-bold text-gray-900">{inProgress.length}</p>
              <p className="text-xs text-gray-400">En ce moment</p>
            </Card>
            <Card className="border-t-4 border-t-emerald-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Terminées aujourd&apos;hui</p>
              <p className="mt-0.5 text-xl font-bold text-gray-900">{done.length}</p>
            </Card>
            <Card className="border-t-4 border-t-red-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Annulées aujourd&apos;hui</p>
              <p className="mt-0.5 text-xl font-bold text-gray-900">{annule.length}</p>
            </Card>
            <Card className="border-t-4 border-t-violet-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50">
                <Timer className="h-5 w-5 text-violet-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Durée moyenne</p>
              <p className="mt-0.5 text-xl font-bold text-gray-900">
                {avgDurationMin === null ? '—' : `${Math.floor(avgDurationMin / 60)}h ${String(avgDurationMin % 60).padStart(2, '0')}m`}
              </p>
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
                <p className="px-6 py-8 text-center text-sm text-gray-400">Aucune intervention dans cette catégorie.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                        <th className="px-6 py-2.5 font-medium">Heure</th>
                        <th className="px-6 py-2.5 font-medium">Patient</th>
                        <th className="px-6 py-2.5 font-medium">Âge / Sexe</th>
                        <th className="px-6 py-2.5 font-medium">Intervention</th>
                        <th className="px-6 py-2.5 font-medium">Chirurgien</th>
                        <th className="px-6 py-2.5 font-medium">Salle</th>
                        <th className="px-6 py-2.5 font-medium">Anesthésiste</th>
                        <th className="px-6 py-2.5 font-medium">Statut</th>
                        <th className="px-6 py-2.5 font-medium">Durée</th>
                        <th className="px-6 py-2.5 font-medium" />
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((s) => (
                        <tr key={s.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
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
                <span>Affichage de {rows.length === 0 ? 0 : 1} à {rows.length} sur {TAB_ROWS[activeTab].length} interventions</span>
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
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">Salles opératoires</h3>
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
                  <h3 className="text-sm font-semibold text-gray-900">Actions rapides</h3>
                </div>
                <div className="p-2">
                  <QuickAction icon={Plus} label="Programmer une intervention" />
                  <QuickAction icon={Siren} label="Ajouter une intervention urgente" />
                  <QuickAction icon={LayoutGrid} label="Voir le planning du bloc" />
                  <QuickAction icon={Hourglass} label={`Voir les interventions en attente (${waiting.length})`} onClick={() => setActiveTab('waiting')} />
                  <QuickAction icon={XCircle} label={`Voir les interventions annulées (${annule.length})`} onClick={() => setActiveTab('annule')} />
                  <QuickAction icon={FileDown} label="Imprimer le programme du jour" />
                </div>
              </Card>
            </div>
          </div>

          {/* Panneaux du bas */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Répartition par spécialité</h3>
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
              <h3 className="mb-4 text-sm font-semibold text-gray-900">Interventions par tranche horaire</h3>
              <BarChart categories={HOURLY_SLOTS} values={hourlyCounts} />
            </Card>

            <Card className="p-0">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
                <h3 className="text-sm font-semibold text-gray-900">Interventions en attente ({waiting.length})</h3>
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
          </div>
        </>
      )}
    </div>
  )
}

function QuickAction({
  icon: Icon,
  label,
  onClick
}: {
  icon: typeof Plus
  label: string
  onClick?: () => void
}): JSX.Element {
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
