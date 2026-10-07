import { useEffect, useMemo, useState } from 'react'
import {
  HeartPulse,
  Activity,
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
  CalendarPlus,
  FileUp,
  ClipboardList,
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
import type { ApiCardioExam, ApiCardioPriority, ApiCardioStatus } from '@shared/cardiology-types'
import { cardioStatusTone, cardioPriorityTone, EXAM_TYPE_CHART_COLOR } from './status'
import type { CardioExam, CardioStatus } from './types'
import { dayIndexInWeek, isSameDay, mondayOf } from '@renderer/features/appointments/week'
import { CardioExamFormModal } from './CardioExamFormModal'
import { SortableGroup } from '@renderer/components/SortableGroup'
import { PulseLoader } from '@renderer/components/ui/Feedback'

interface CardiologyPageProps {
  onOpenPatient: (patientId: string) => void
}

type Tab = 'all' | 'waiting' | 'inProgress' | 'validated' | 'urgent' | 'cancelled'

const STATUS_LABEL: Record<ApiCardioStatus, CardioStatus> = {
  RESULTAT_VALIDE: 'Résultat validé',
  EN_COURS: 'En cours',
  EN_ATTENTE: 'En attente',
  PROGRAMME: 'Programmé',
  ANNULE: 'Annulé'
}

const PRIORITY_LABEL: Record<ApiCardioPriority, 'Normale' | 'Urgent'> = { NORMALE: 'Normale', URGENT: 'Urgent' }

const STATUS_DONUT_COLOR: Record<CardioStatus, string> = {
  Programmé: '#9ca3af',
  'Résultat validé': '#14b8a6',
  'En attente': '#dea127',
  'En cours': '#3b82f6',
  Annulé: '#d1d5db'
}

function toRecord(e: ApiCardioExam): CardioExam {
  return {
    id: e.id,
    patientId: e.patientId,
    patientCode: e.patientCode ?? '—',
    patientName: e.patientName ?? 'Patient',
    age: e.age,
    gender: e.gender ?? 'M',
    requestedAt: new Date(e.requestedAt),
    resultAt: e.resultAt ? new Date(e.resultAt) : null,
    examType: e.examType,
    indication: e.indication ?? '—',
    doctor: e.doctorName ?? '—',
    doctorId: e.doctorId,
    status: STATUS_LABEL[e.status],
    priority: PRIORITY_LABEL[e.priority],
    expectedDurationMin: e.expectedDurationMin,
    room: e.room ?? '—',
    resultFileName: e.resultFileName,
    paid: e.paid
  }
}

const ALL_FILTER = '__all__'
type PeriodFilter = 'today' | 'week' | 'month' | 'all'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
}

function formatDuration(minutes: number): string {
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

export function CardiologyPage({ onOpenPatient }: CardiologyPageProps): JSX.Element {
  const [exams, setExams] = useState<CardioExam[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingExam, setEditingExam] = useState<CardioExam | null>(null)
  const [deletingExam, setDeletingExam] = useState<CardioExam | null>(null)
  const [uploadingResultFor, setUploadingResultFor] = useState<string | null>(null)
  const [patientsFollowed, setPatientsFollowed] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('all')
  const [search, setSearch] = useState('')
  const [exporting, setExporting] = useState(false)
  const [filterPeriod, setFilterPeriod] = useState<PeriodFilter>('today')
  const [filterRoom, setFilterRoom] = useState(ALL_FILTER)
  const [filterType, setFilterType] = useState(ALL_FILTER)
  const [filterDoctor, setFilterDoctor] = useState(ALL_FILTER)
  const [filterPriority, setFilterPriority] = useState(ALL_FILTER)
  const [filterStatus, setFilterStatus] = useState(ALL_FILTER)

  useEffect(() => {
    let cancelled = false
    Promise.all([window.api.cardiology.list(), window.api.cardiology.patientsFollowed()]).then(([examsResult, followedResult]) => {
      if (cancelled) return
      if (examsResult.ok) {
        setExams(examsResult.data.exams.map(toRecord))
      } else {
        setError(examsResult.error)
      }
      if (followedResult.ok) setPatientsFollowed(followedResult.data.count)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const today = useMemo(() => new Date(), [])
  const realMonday = useMemo(() => mondayOf(today), [today])
  const todayExams = useMemo(() => exams.filter((e) => isSameDay(e.requestedAt, today)), [exams, today])
  const scheduled = useMemo(() => todayExams.filter((e) => e.status === 'Programmé'), [todayExams])
  const waiting = useMemo(() => todayExams.filter((e) => e.status === 'En attente'), [todayExams])
  const inProgress = useMemo(() => todayExams.filter((e) => e.status === 'En cours'), [todayExams])
  const validated = useMemo(() => todayExams.filter((e) => e.status === 'Résultat validé'), [todayExams])
  const urgent = useMemo(() => todayExams.filter((e) => e.priority === 'Urgent'), [todayExams])
  const urgentPending = useMemo(() => urgent.filter((e) => e.status !== 'Résultat validé' && e.status !== 'Annulé'), [urgent])

  // Périmètre de la liste/onglets, piloté par le filtre "Période" (les cartes KPI ci-dessus
  // restent volontairement figées sur "aujourd'hui").
  const periodExams = useMemo(
    () =>
      exams.filter((e) => {
        if (filterPeriod === 'today') return isSameDay(e.requestedAt, today)
        if (filterPeriod === 'week') {
          const idx = dayIndexInWeek(realMonday, e.requestedAt)
          return idx >= 0 && idx < 7
        }
        if (filterPeriod === 'month') {
          return e.requestedAt.getMonth() === today.getMonth() && e.requestedAt.getFullYear() === today.getFullYear()
        }
        return true
      }),
    [exams, filterPeriod, today, realMonday]
  )

  const TAB_ROWS: Record<Tab, CardioExam[]> = {
    all: periodExams,
    waiting: periodExams.filter((e) => e.status === 'En attente'),
    inProgress: periodExams.filter((e) => e.status === 'En cours'),
    validated: periodExams.filter((e) => e.status === 'Résultat validé'),
    urgent: periodExams.filter((e) => e.priority === 'Urgent'),
    cancelled: periodExams.filter((e) => e.status === 'Annulé')
  }

  const TABS: { id: Tab; label: string; count: number }[] = [
    { id: 'all', label: 'Tous les examens', count: TAB_ROWS.all.length },
    { id: 'waiting', label: 'En attente de réalisation', count: TAB_ROWS.waiting.length },
    { id: 'inProgress', label: 'En cours', count: TAB_ROWS.inProgress.length },
    { id: 'validated', label: 'Résultats validés', count: TAB_ROWS.validated.length },
    { id: 'urgent', label: 'Examens urgents', count: TAB_ROWS.urgent.length },
    { id: 'cancelled', label: 'Annulés', count: TAB_ROWS.cancelled.length }
  ]

  const rows = useMemo(() => {
    const base = TAB_ROWS[activeTab]
    const term = search.trim().toLowerCase()
    if (!term) return base
    return base.filter((e) => `${e.patientName} ${e.examType} ${e.indication} ${e.doctor}`.toLowerCase().includes(term))
  }, [activeTab, search, periodExams])

  const roomOptions = useMemo(() => Array.from(new Set(exams.map((e) => e.room).filter((r) => r && r !== '—'))).sort(), [exams])
  const typeOptions = useMemo(() => Array.from(new Set(exams.map((e) => e.examType).filter(Boolean))).sort(), [exams])
  const doctorOptions = useMemo(() => Array.from(new Set(exams.map((e) => e.doctor).filter((d) => d && d !== '—'))).sort(), [exams])

  const filteredRows = useMemo(
    () =>
      rows.filter((e) => {
        if (filterRoom !== ALL_FILTER && e.room !== filterRoom) return false
        if (filterType !== ALL_FILTER && e.examType !== filterType) return false
        if (filterDoctor !== ALL_FILTER && e.doctor !== filterDoctor) return false
        if (filterPriority !== ALL_FILTER && e.priority !== filterPriority) return false
        if (filterStatus !== ALL_FILTER && e.status !== filterStatus) return false
        return true
      }),
    [rows, filterRoom, filterType, filterDoctor, filterPriority, filterStatus]
  )

  function handleResetFilters(): void {
    setFilterPeriod('today')
    setFilterRoom(ALL_FILTER)
    setFilterType(ALL_FILTER)
    setFilterDoctor(ALL_FILTER)
    setFilterPriority(ALL_FILTER)
    setFilterStatus(ALL_FILTER)
  }

  const examTypeBreakdown = useMemo(() => {
    const counts = new Map<string, number>()
    for (const e of todayExams) counts.set(e.examType, (counts.get(e.examType) ?? 0) + 1)
    return Array.from(counts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
  }, [todayExams])
  const examTypeTotal = todayExams.length
  const maxExamType = Math.max(1, ...examTypeBreakdown.map((e) => e.count))

  const examTypeDonutBackground = useMemo(() => {
    let cursor = 0
    const stops = examTypeBreakdown.map(({ label, count }) => {
      const percent = examTypeTotal === 0 ? 0 : (count / examTypeTotal) * 100
      const start = cursor
      cursor += percent
      return `${EXAM_TYPE_CHART_COLOR[label] ?? EXAM_TYPE_CHART_COLOR.Autres} ${start}% ${cursor}%`
    })
    return `conic-gradient(${stops.join(', ')})`
  }, [examTypeBreakdown, examTypeTotal])

  const statusBreakdown = useMemo(() => {
    const counts: Record<CardioStatus, number> = { Programmé: 0, 'Résultat validé': 0, 'En attente': 0, 'En cours': 0, Annulé: 0 }
    for (const e of todayExams) counts[e.status] += 1
    return (Object.keys(counts) as CardioStatus[]).map((label) => ({ label, count: counts[label] }))
  }, [todayExams])
  const statusTotal = todayExams.length
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

  const recentValidated = useMemo(
    () =>
      [...validated]
        .filter((e) => e.resultAt)
        .sort((a, b) => (b.resultAt?.getTime() ?? 0) - (a.resultAt?.getTime() ?? 0))
        .slice(0, 5),
    [validated]
  )

  async function handleExportExcel(): Promise<void> {
    setExporting(true)
    await window.api.cardiology.exportExcel()
    setExporting(false)
  }

  async function handleResultFile(exam: CardioExam): Promise<void> {
    if (exam.resultFileName) {
      await window.api.cardiology.viewResultFile(exam.id)
      return
    }
    setUploadingResultFor(exam.id)
    const result = await window.api.cardiology.uploadResultFile(exam.id)
    setUploadingResultFor(null)
    if (result?.ok) {
      const updated = toRecord(result.data.exam)
      setExams((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
    }
  }

  const avgTurnaroundMin = useMemo(() => {
    const withResult = validated.filter((e) => e.resultAt)
    if (withResult.length === 0) return null
    const total = withResult.reduce((sum, e) => sum + (e.resultAt!.getTime() - e.requestedAt.getTime()) / 60000, 0)
    return Math.round(total / withResult.length)
  }, [validated])

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        breadcrumb={['Accueil', 'Cardiologie']}
        title="Cardiologie"
        subtitle="Centre de gestion des examens et activités de cardiologie."
        actions={
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4" />
            Nouvelle demande
          </Button>
        }
      />

      {showCreateModal && (
        <CardioExamFormModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(exam) => {
            setExams((prev) => [...prev, toRecord(exam)])
            setShowCreateModal(false)
          }}
        />
      )}

      {editingExam && (
        <CardioExamFormModal
          editing={editingExam}
          onClose={() => setEditingExam(null)}
          onCreated={(exam) => {
            const updated = toRecord(exam)
            setExams((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
            setEditingExam(null)
          }}
        />
      )}

      {deletingExam && (
        <ConfirmDialog
          title="Supprimer l'examen"
          message={`Voulez-vous vraiment supprimer l'examen de ${deletingExam.patientName} ?`}
          onCancel={() => setDeletingExam(null)}
          onConfirm={() => window.api.cardiology.delete(deletingExam.id)}
          onConfirmed={() => {
            setExams((prev) => prev.filter((e) => e.id !== deletingExam.id))
            setDeletingExam(null)
          }}
        />
      )}

      {loading ? (
        <PulseLoader label="Chargement de la cardiologie…" />
      ) : error ? (
        <p className="py-12 text-center text-sm text-red-500">{error}</p>
      ) : (
        <>
          {/* KPI row */}
          <SortableGroup id="cardiology.grid1" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            <Card className="p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-black/5 bg-accent-50">
                <HeartPulse className="h-5 w-5 text-accent-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Examens programmés</p>
              <p className="mt-0.5 text-xl font-display font-extrabold tabular-nums text-gray-900">{scheduled.length}</p>
            </Card>
            <Card className="p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-black/5 bg-red-50">
                <Activity className="h-5 w-5 text-red-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">En cours aujourd&apos;hui</p>
              <p className="mt-0.5 text-xl font-display font-extrabold tabular-nums text-gray-900">{inProgress.length}</p>
            </Card>
            <Card className="p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-black/5 bg-blue-50">
                <Hourglass className="h-5 w-5 text-blue-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">En attente de réalisation</p>
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
              <p className="mt-3 text-xs font-medium text-gray-500">Urgents</p>
              <p className="mt-0.5 text-xl font-bold text-red-600">{urgent.length}</p>
            </Card>
            <Card className="p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-black/5 bg-blue-50">
                <Clock className="h-5 w-5 text-blue-600" />
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

          <SortableGroup id="cardiology.grid2" className="grid grid-cols-1 gap-6 lg:grid-cols-3">
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
                  {rows.length === 0 ? 'Aucun examen dans cette catégorie.' : 'Aucun examen ne correspond aux filtres.'}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50/70 text-[11px] uppercase tracking-[0.08em] text-gray-500">
                        <th className="px-6 py-3 font-semibold">Date / Heure</th>
                        <th className="px-6 py-3 font-semibold">Patient</th>
                        <th className="px-6 py-3 font-semibold">Âge / Sexe</th>
                        <th className="px-6 py-3 font-semibold">Examen</th>
                        <th className="px-6 py-3 font-semibold">Motif</th>
                        <th className="px-6 py-3 font-semibold">Médecin</th>
                        <th className="px-6 py-3 font-semibold">Statut</th>
                        <th className="px-6 py-3 font-semibold">Priorité</th>
                        <th className="px-6 py-3 font-semibold">Salle / Appareil</th>
                        <th className="px-6 py-3 font-semibold" />
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.map((e) => (
                        <tr key={e.id} className="border-b border-gray-100 last:border-0 transition-colors hover:bg-accent-50/40">
                          <td className="px-6 py-3 text-gray-600">
                            <p>{formatDate(e.requestedAt)}</p>
                            <p className="text-xs text-gray-400">{formatTime(e.requestedAt)}</p>
                          </td>
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-2.5">
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-50 text-[11px] font-semibold text-accent-700">
                                {initials(e.patientName)}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate font-medium text-gray-900">{e.patientName}</p>
                                <p className="truncate text-xs text-gray-400">{e.patientCode}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-gray-600">
                            {e.age ? `${e.age} ans · ${e.gender === 'M' ? 'Homme' : 'Femme'}` : '—'}
                          </td>
                          <td className="px-6 py-3 text-gray-900">{e.examType}</td>
                          <td className="px-6 py-3 text-gray-600">{e.indication}</td>
                          <td className="px-6 py-3 text-gray-600">{e.doctor}</td>
                          <td className="px-6 py-3">
                            <StatusBadge label={e.status} tone={cardioStatusTone(e.status)} />
                            <PaidBadge paid={e.paid} />
                          </td>
                          <td className="px-6 py-3">
                            <StatusBadge label={e.priority} tone={cardioPriorityTone(e.priority)} />
                          </td>
                          <td className="px-6 py-3 text-gray-600">{e.room}</td>
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => e.patientId && onOpenPatient(e.patientId)}
                                disabled={!e.patientId}
                                title={e.patientId ? 'Voir le dossier patient' : 'Aucun dossier lié'}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setEditingExam(e)}
                                title="Modifier la demande"
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setDeletingExam(e)}
                                title="Supprimer l'examen"
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleResultFile(e)}
                                disabled={uploadingResultFor === e.id}
                                title={e.resultFileName ? `Voir le résultat (${e.resultFileName})` : 'Téléverser le résultat'}
                                className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 ${e.resultFileName ? 'text-accent-600' : 'text-gray-400 hover:text-gray-700'}`}
                              >
                                {uploadingResultFor === e.id ? (
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
                  Affichage de {filteredRows.length === 0 ? 0 : 1} à {filteredRows.length} sur {TAB_ROWS[activeTab].length} examens
                </span>
              </div>
            </Card>

            {/* Colonne latérale */}
            <SortableGroup id="cardiology.side1" className="space-y-6">
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
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">Salle / Appareil</label>
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
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">Type d&apos;examen</label>
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
                  <Button size="sm" className="w-full">
                    Filtrer
                  </Button>
                </div>
              </Card>

              <Card>
                <h3 className="mb-4 text-[15px] font-bold text-gray-900">Répartition par type d&apos;examen</h3>
                {examTypeBreakdown.length === 0 ? (
                  <p className="text-xs text-gray-400">Aucun examen aujourd&apos;hui.</p>
                ) : (
                  <div className="flex items-center gap-5">
                    <div
                      className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full"
                      style={{ background: examTypeDonutBackground }}
                    >
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-xs font-bold text-gray-900">
                        {examTypeTotal}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {examTypeBreakdown.map(({ label, count }) => (
                        <div key={label} className="flex items-center gap-1.5 text-xs">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: EXAM_TYPE_CHART_COLOR[label] ?? EXAM_TYPE_CHART_COLOR.Autres }}
                          />
                          <span className="text-gray-600">{label}</span>
                          <span className="font-medium text-gray-900">
                            {count} ({Math.round((count / examTypeTotal) * 100)}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>

              <Card className="p-0">
                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
                  <h3 className="text-[15px] font-bold text-gray-900">Derniers résultats validés</h3>
                </div>
                <div className="space-y-3 p-5">
                  {recentValidated.length === 0 ? (
                    <p className="text-xs text-gray-400">Aucun résultat validé aujourd&apos;hui.</p>
                  ) : (
                    recentValidated.map((r) => (
                      <div key={r.id} className="flex items-center gap-2 text-xs">
                        <span className="h-2 w-2 shrink-0 rounded-full bg-teal-500" />
                        <span className="min-w-0 flex-1 truncate text-gray-800">{r.patientName}</span>
                        <span className="shrink-0 text-gray-400">{r.examType}</span>
                        <span className="shrink-0 text-gray-400">{r.resultAt ? formatTime(r.resultAt) : ''}</span>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              <Card className="p-0">
                <div className="border-b border-gray-100 px-5 py-4">
                  <h3 className="text-[15px] font-bold text-gray-900">Actions rapides</h3>
                </div>
                <div className="p-2">
                  <QuickAction icon={Plus} label="Créer une nouvelle demande" onClick={() => setShowCreateModal(true)} />
                  <QuickAction icon={CalendarPlus} label="Programmer un examen" onClick={() => setShowCreateModal(true)} />
                  <QuickAction icon={FileUp} label="Enregistrer un résultat" onClick={() => setActiveTab('inProgress')} />
                  <QuickAction icon={ClipboardList} label="Consulter planning des appareils" />
                  <QuickAction icon={Printer} label="Imprimer la liste du jour" onClick={() => window.print()} />
                  <QuickAction icon={FileBarChart} label="Rapport d'activité cardiologie" onClick={handleExportExcel} />
                </div>
              </Card>
            </SortableGroup>
          </SortableGroup>

          {/* Panneaux du bas */}
          <SortableGroup id="cardiology.grid3" className="grid grid-cols-1 gap-6 lg:grid-cols-4">
            <Card>
              <h3 className="mb-4 text-[15px] font-bold text-gray-900">Examens par modalité (aujourd&apos;hui)</h3>
              {examTypeBreakdown.length === 0 ? (
                <p className="text-xs text-gray-400">Aucun examen aujourd&apos;hui.</p>
              ) : (
                <div className="space-y-3">
                  {examTypeBreakdown.map((e) => (
                    <div key={e.label}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-gray-600">{e.label}</span>
                        <span className="font-medium text-gray-900">{e.count}</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                        <div className="h-full rounded-full bg-accent-500" style={{ width: `${(e.count / maxExamType) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <h3 className="mb-4 text-[15px] font-bold text-gray-900">Statut des examens</h3>
              {statusTotal === 0 ? (
                <p className="text-xs text-gray-400">Aucun examen aujourd&apos;hui.</p>
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

            <Card className="p-0">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
                <h3 className="text-[15px] font-bold text-gray-900">Examens urgents ({urgent.length})</h3>
              </div>
              <div className="space-y-3 p-5">
                {urgent.length === 0 ? (
                  <p className="text-xs text-gray-400">Aucun examen urgent aujourd&apos;hui.</p>
                ) : (
                  urgent.map((u) => (
                    <div key={u.id} className="flex items-center gap-2 text-xs">
                      <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" />
                      <span className="min-w-0 flex-1 truncate text-gray-800">{u.patientName}</span>
                      <span className="shrink-0 text-gray-400">{u.examType}</span>
                      <span className="shrink-0 text-gray-400">{formatTime(u.requestedAt)}</span>
                    </div>
                  ))
                )}
              </div>
            </Card>

            <Card className="p-0">
              <div className="border-b border-gray-100 px-5 py-3.5">
                <h3 className="text-[15px] font-bold text-gray-900">Alertes cardiologie</h3>
              </div>
              <div className="space-y-3 p-5">
                {urgentPending.length === 0 && waiting.length === 0 ? (
                  <p className="text-xs text-gray-400">Aucune alerte pour le moment.</p>
                ) : (
                  <>
                    {urgentPending.length > 0 && (
                      <Alert
                        text={`${urgentPending.length} examen${urgentPending.length > 1 ? 's' : ''} urgent${urgentPending.length > 1 ? 's' : ''} à traiter`}
                        tone="text-red-500"
                      />
                    )}
                    {waiting.length > 0 && (
                      <Alert
                        text={`${waiting.length} examen${waiting.length > 1 ? 's' : ''} en attente de réalisation`}
                        tone="text-amber-500"
                      />
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
