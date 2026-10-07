import { useEffect, useMemo, useState } from 'react'
import {
  Stethoscope,
  CalendarDays,
  Clock,
  BarChart3,
  XCircle,
  Search,
  FileSpreadsheet,
  Columns3,
  Eye,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Plus,
  FileDown,
  FileBarChart,
  ClipboardList,
  Loader2,
  Pencil,
  Trash2,
  Paperclip,
  FlaskConical
} from 'lucide-react'
import { Card } from '@renderer/components/Card'
import { PageHeader } from '@renderer/components/PageHeader'
import { Button } from '@renderer/components/Button'
import { StatusBadge } from '@renderer/components/StatusBadge'
import { ConfirmDialog } from '@renderer/components/ConfirmDialog'
import { LabRequestFormModal } from '@renderer/features/laboratory/LabRequestFormModal'
import type { PageId } from '@renderer/features/shell/nav-types'
import type { ApiConsultation, ApiConsultationStatus } from '@shared/consultation-types'
import { consultationStatusTone, STATUS_CHART_COLOR } from './status'
import type { ConsultationRecord, ConsultationStatus } from './types'
import { dayIndexInWeek, formatFullDate, formatTime, isSameDay, mondayOf } from '@renderer/features/appointments/week'
import { ConsultationFormModal } from './ConsultationFormModal'
import { SortableGroup } from '@renderer/components/SortableGroup'
import { PulseLoader } from '@renderer/components/ui/Feedback'

interface ConsultationsPageProps {
  onOpenPatient: (patientId: string) => void
  onNavigate: (page: PageId) => void
}

type Tab = 'all' | 'waiting' | 'inProgress' | 'cancelled'

const TABS: { id: Tab; label: string }[] = [
  { id: 'all', label: 'Toutes les consultations' },
  { id: 'waiting', label: 'En attente' },
  { id: 'inProgress', label: 'En cours' },
  { id: 'cancelled', label: 'Consultations annulées' }
]

const STATUS_LABEL: Record<ApiConsultationStatus, ConsultationStatus> = {
  TERMINEE: 'Terminée',
  EN_COURS: 'En cours',
  EN_ATTENTE: 'En attente',
  ANNULEE: 'Annulée'
}

function toConsultation(c: ApiConsultation): ConsultationRecord {
  return {
    id: c.id,
    patientId: c.patientId,
    patientCode: c.patientCode ?? '—',
    patientName: c.patientName ?? 'Patient',
    age: c.age ?? 0,
    gender: c.gender ?? 'M',
    date: new Date(c.date),
    service: c.service ?? '—',
    doctor: c.doctorName ?? '—',
    doctorId: c.doctorId,
    motive: c.motive ?? '—',
    status: STATUS_LABEL[c.status],
    dossier: c.dossier,
    documentFileName: c.documentFileName
  }
}

const ALL_FILTER = '__all__'
type PeriodFilter = 'all' | 'today' | 'week' | 'month'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
}

export function ConsultationsPage({ onOpenPatient, onNavigate }: ConsultationsPageProps): JSX.Element {
  const [consultations, setConsultations] = useState<ConsultationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingConsultation, setEditingConsultation] = useState<ConsultationRecord | null>(null)
  const [deletingConsultation, setDeletingConsultation] = useState<ConsultationRecord | null>(null)
  const [uploadingDocumentFor, setUploadingDocumentFor] = useState<string | null>(null)
  const [requestingAnalysisFor, setRequestingAnalysisFor] = useState<ConsultationRecord | null>(null)
  const [search, setSearch] = useState('')
  const [exporting, setExporting] = useState(false)
  const [filterPeriod, setFilterPeriod] = useState<PeriodFilter>('all')
  const [filterService, setFilterService] = useState(ALL_FILTER)
  const [filterDoctor, setFilterDoctor] = useState(ALL_FILTER)
  const [filterStatus, setFilterStatus] = useState(ALL_FILTER)
  const [filterType, setFilterType] = useState(ALL_FILTER)

  useEffect(() => {
    let cancelled = false
    window.api.consultations.list().then((result) => {
      if (cancelled) return
      if (result.ok) {
        setConsultations(
          result.data.consultations.map(toConsultation).sort((a, b) => a.date.getTime() - b.date.getTime())
        )
      } else {
        setError(result.error)
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleExportExcel(): Promise<void> {
    setExporting(true)
    await window.api.consultations.exportExcel()
    setExporting(false)
  }

  async function handleDocument(consultation: ConsultationRecord): Promise<void> {
    if (consultation.documentFileName) {
      await window.api.consultations.viewDocument(consultation.id)
      return
    }
    setUploadingDocumentFor(consultation.id)
    const result = await window.api.consultations.uploadDocument(consultation.id)
    setUploadingDocumentFor(null)
    if (result?.ok) {
      const updated = toConsultation(result.data.consultation)
      setConsultations((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
    }
  }

  const today = useMemo(() => new Date(), [])
  const realMonday = useMemo(() => mondayOf(today), [today])
  const todayConsultations = useMemo(() => consultations.filter((c) => isSameDay(c.date, today)), [consultations, today])
  const waitingToday = useMemo(() => todayConsultations.filter((c) => c.status === 'En attente'), [todayConsultations])
  const inProgressToday = useMemo(() => todayConsultations.filter((c) => c.status === 'En cours'), [todayConsultations])
  const terminatedToday = useMemo(() => todayConsultations.filter((c) => c.status === 'Terminée'), [todayConsultations])
  const cancelled = useMemo(() => consultations.filter((c) => c.status === 'Annulée'), [consultations])

  const TAB_ROWS: Record<Tab, ConsultationRecord[]> = {
    all: todayConsultations,
    waiting: waitingToday,
    inProgress: inProgressToday,
    cancelled
  }

  const tabRows = TAB_ROWS[activeTab]

  const serviceOptions = useMemo(
    () => Array.from(new Set(consultations.map((c) => c.service).filter((s) => s && s !== '—'))).sort(),
    [consultations]
  )
  const doctorOptions = useMemo(
    () => Array.from(new Set(consultations.map((c) => c.doctor).filter((d) => d && d !== '—'))).sort(),
    [consultations]
  )
  // Il n'existe pas de champ « type » dédié pour une consultation : le motif est le champ le plus
  // proche pour catégoriser les consultations, on l'utilise donc pour ce filtre.
  const motiveOptions = useMemo(
    () => Array.from(new Set(consultations.map((c) => c.motive).filter((m) => m && m !== '—'))).sort(),
    [consultations]
  )

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase()
    return tabRows.filter((c) => {
      if (term && !`${c.patientName} ${c.service} ${c.doctor} ${c.motive}`.toLowerCase().includes(term)) return false
      if (filterService !== ALL_FILTER && c.service !== filterService) return false
      if (filterDoctor !== ALL_FILTER && c.doctor !== filterDoctor) return false
      if (filterStatus !== ALL_FILTER && c.status !== filterStatus) return false
      if (filterType !== ALL_FILTER && c.motive !== filterType) return false
      if (filterPeriod === 'today' && !isSameDay(c.date, today)) return false
      if (filterPeriod === 'week') {
        const idx = dayIndexInWeek(realMonday, c.date)
        if (idx < 0 || idx >= 7) return false
      }
      if (filterPeriod === 'month' && (c.date.getMonth() !== today.getMonth() || c.date.getFullYear() !== today.getFullYear())) {
        return false
      }
      return true
    })
  }, [tabRows, search, filterService, filterDoctor, filterStatus, filterType, filterPeriod, today, realMonday])

  function handleResetFilters(): void {
    setFilterPeriod('all')
    setFilterService(ALL_FILTER)
    setFilterDoctor(ALL_FILTER)
    setFilterStatus(ALL_FILTER)
    setFilterType(ALL_FILTER)
  }

  const completionRate =
    terminatedToday.length + cancelled.length === 0 ? null : Math.round((terminatedToday.length / (terminatedToday.length + cancelled.length)) * 100)

  const statusBreakdown = useMemo(() => {
    const total = todayConsultations.length
    const counts: Record<ConsultationStatus, number> = { Terminée: 0, 'En cours': 0, 'En attente': 0, Annulée: 0 }
    for (const c of todayConsultations) counts[c.status] += 1
    return (['Terminée', 'En cours', 'En attente', 'Annulée'] as ConsultationStatus[]).map((status) => ({
      status,
      count: counts[status],
      percent: total === 0 ? 0 : Math.round((counts[status] / total) * 1000) / 10
    }))
  }, [todayConsultations])

  const donutBackground = useMemo(() => {
    let cursor = 0
    const stops = statusBreakdown.map(({ status, percent }) => {
      const start = cursor
      cursor += percent
      return `${STATUS_CHART_COLOR[status]} ${start}% ${cursor}%`
    })
    return `conic-gradient(${stops.join(', ')})`
  }, [statusBreakdown])

  const miniAgenda = todayConsultations.slice(0, 5)

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        breadcrumb={['Accueil', 'Consultations']}
        title="Consultations"
        subtitle="Centre de gestion des consultations."
        actions={
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4" />
            Nouvelle consultation
          </Button>
        }
      />

      {showCreateModal && (
        <ConsultationFormModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(consultation) => {
            setConsultations((prev) => [...prev, toConsultation(consultation)])
            setShowCreateModal(false)
          }}
        />
      )}

      {editingConsultation && (
        <ConsultationFormModal
          editing={editingConsultation}
          onClose={() => setEditingConsultation(null)}
          onCreated={(consultation) => {
            const updated = toConsultation(consultation)
            setConsultations((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
            setEditingConsultation(null)
          }}
        />
      )}

      {deletingConsultation && (
        <ConfirmDialog
          title="Supprimer la consultation"
          message={`Voulez-vous vraiment supprimer la consultation de ${deletingConsultation.patientName} ?`}
          onCancel={() => setDeletingConsultation(null)}
          onConfirm={() => window.api.consultations.delete(deletingConsultation.id)}
          onConfirmed={() => {
            setConsultations((prev) => prev.filter((c) => c.id !== deletingConsultation.id))
            setDeletingConsultation(null)
          }}
        />
      )}

      {requestingAnalysisFor && requestingAnalysisFor.patientId && (
        <LabRequestFormModal
          initialPatientId={requestingAnalysisFor.patientId}
          onClose={() => setRequestingAnalysisFor(null)}
          onCreated={() => setRequestingAnalysisFor(null)}
        />
      )}

      {loading ? (
        <PulseLoader label="Chargement des consultations…" />
      ) : error ? (
        <p className="py-12 text-center text-sm text-red-500">{error}</p>
      ) : (
        <>
          {/* KPI row */}
          <SortableGroup id="consultations.grid1" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Card className="p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-black/5 bg-accent-50">
                <Stethoscope className="h-5 w-5 text-accent-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Consultations aujourd&apos;hui</p>
              <p className="mt-0.5 text-xl font-display font-extrabold tabular-nums text-gray-900">{todayConsultations.length}</p>
            </Card>
            <Card className="p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-black/5 bg-blue-50">
                <CalendarDays className="h-5 w-5 text-blue-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Total enregistré</p>
              <p className="mt-0.5 text-xl font-display font-extrabold tabular-nums text-gray-900">{consultations.length}</p>
            </Card>
            <Card className="p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-black/5 bg-amber-50">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">En attente de clôture</p>
              <p className="mt-0.5 text-xl font-display font-extrabold tabular-nums text-gray-900">{waitingToday.length}</p>
              <p className="text-xs text-gray-400">À valider</p>
            </Card>
            <Card className="p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-black/5 bg-teal-50">
                <BarChart3 className="h-5 w-5 text-teal-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Consultations clôturées</p>
              <p className="mt-0.5 text-xl font-display font-extrabold tabular-nums text-gray-900">{completionRate === null ? '—' : `${completionRate}%`}</p>
              <p className="text-xs text-gray-400">Taux de clôture</p>
            </Card>
            <Card className="p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-black/5 bg-red-50">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Consultations annulées</p>
              <p className="mt-0.5 text-xl font-display font-extrabold tabular-nums text-gray-900">{cancelled.length}</p>
            </Card>
          </SortableGroup>

          <SortableGroup id="consultations.grid2" className="grid grid-cols-1 gap-6 lg:grid-cols-3">
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
                    {tab.label} <span className="text-xs text-gray-400">({TAB_ROWS[tab.id].length})</span>
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
                </div>
              </div>

              {filteredRows.length === 0 ? (
                <p className="px-6 py-8 text-center text-sm text-gray-400">
                  {tabRows.length === 0 ? 'Aucune consultation dans cette catégorie.' : 'Aucune consultation ne correspond aux filtres.'}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50/70 text-[11px] uppercase tracking-[0.08em] text-gray-500">
                        <th className="px-6 py-3 font-semibold">Heure</th>
                        <th className="px-6 py-3 font-semibold">Patient</th>
                        <th className="px-6 py-3 font-semibold">Âge / Sexe</th>
                        <th className="px-6 py-3 font-semibold">Service</th>
                        <th className="px-6 py-3 font-semibold">Médecin</th>
                        <th className="px-6 py-3 font-semibold">Motif</th>
                        <th className="px-6 py-3 font-semibold">Statut</th>
                        <th className="px-6 py-3 font-semibold">Dossier</th>
                        <th className="px-6 py-3 font-semibold" />
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.map((c) => (
                        <tr key={c.id} className="border-b border-gray-100 last:border-0 transition-colors hover:bg-accent-50/40">
                          <td className="px-6 py-3 font-medium text-gray-900">{formatTime(c.date)}</td>
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-2.5">
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-50 text-[11px] font-semibold text-accent-700">
                                {initials(c.patientName)}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate font-medium text-gray-900">{c.patientName}</p>
                                <p className="truncate text-xs text-gray-400">{c.patientCode}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-gray-600">
                            {c.age} ans · {c.gender === 'M' ? 'Homme' : 'Femme'}
                          </td>
                          <td className="px-6 py-3 text-gray-600">{c.service}</td>
                          <td className="px-6 py-3 text-gray-600">{c.doctor}</td>
                          <td className="px-6 py-3 text-gray-600">{c.motive}</td>
                          <td className="px-6 py-3">
                            <StatusBadge label={c.status} tone={consultationStatusTone(c.status)} />
                          </td>
                          <td className="px-6 py-3 text-xs text-gray-400">{c.dossier}</td>
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => c.patientId && onOpenPatient(c.patientId)}
                                disabled={!c.patientId}
                                title={c.patientId ? 'Voir le dossier patient' : 'Aucun dossier lié'}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setEditingConsultation(c)}
                                title="Modifier la consultation"
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setDeletingConsultation(c)}
                                title="Supprimer la consultation"
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDocument(c)}
                                disabled={uploadingDocumentFor === c.id}
                                title={c.documentFileName ? `Voir le document (${c.documentFileName})` : 'Téléverser un document'}
                                className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 ${c.documentFileName ? 'text-accent-600' : 'text-gray-400 hover:text-gray-700'}`}
                              >
                                {uploadingDocumentFor === c.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Paperclip className="h-4 w-4" />
                                )}
                              </button>
                              <button
                                onClick={() => setRequestingAnalysisFor(c)}
                                disabled={!c.patientId}
                                title={c.patientId ? 'Demander une analyse de laboratoire' : 'Aucun patient lié'}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                              >
                                <FlaskConical className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 px-6 py-3 text-xs text-gray-400">
                <span>
                  Affichage de {filteredRows.length === 0 ? 0 : 1} à {filteredRows.length} sur {tabRows.length} consultations
                </span>
              </div>
            </Card>

            {/* Colonne latérale */}
            <SortableGroup id="consultations.side1" className="space-y-6">
              <Card>
                <h3 className="mb-4 text-[15px] font-bold text-gray-900">Filtres</h3>
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
                      {serviceOptions.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">Médecin</label>
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
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">Type de consultation</label>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="w-full rounded-[10px] border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15"
                    >
                      <option value={ALL_FILTER}>Tous les types</option>
                      {motiveOptions.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button variant="secondary" size="sm" className="w-full" onClick={handleResetFilters}>
                    <RotateCcw className="h-3.5 w-3.5" />
                    Réinitialiser les filtres
                  </Button>
                </div>
              </Card>

              <Card className="p-0">
                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                  <h3 className="text-[15px] font-bold text-gray-900">Calendrier</h3>
                  <div className="flex items-center gap-1">
                    <button className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-gray-100">
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <button className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-gray-100">
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="p-5">
                  <p className="mb-3 text-xs font-semibold text-gray-700">{formatFullDate(today)}</p>
                  {miniAgenda.length === 0 ? (
                    <p className="text-xs text-gray-400">Aucune consultation aujourd&apos;hui.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {miniAgenda.map((c) => (
                        <div key={c.id} className="flex items-center justify-between text-xs">
                          <span className="w-12 shrink-0 font-medium text-gray-500">{formatTime(c.date)}</span>
                          <span className="flex-1 truncate text-gray-800">{c.patientName}</span>
                          <span className="shrink-0 text-gray-400">{c.service}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => onNavigate('appointments')}
                    className="mt-4 text-xs font-medium text-accent-600 hover:text-accent-500"
                  >
                    Voir tout le planning →
                  </button>
                </div>
              </Card>

              <Card>
                <h3 className="mb-4 text-[15px] font-bold text-gray-900">Résumé des statuts</h3>
                <div className="flex items-center gap-5">
                  <div
                    className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full"
                    style={{ background: donutBackground }}
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-xs font-bold text-gray-900">
                      {todayConsultations.length}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {statusBreakdown.map(({ status, count, percent }) => (
                      <div key={status} className="flex items-center gap-1.5 text-xs">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_CHART_COLOR[status] }} />
                        <span className="text-gray-600">{status}</span>
                        <span className="font-medium text-gray-900">
                          {count} ({percent}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              <Card className="p-0">
                <div className="border-b border-gray-100 px-5 py-4">
                  <h3 className="text-[15px] font-bold text-gray-900">Actions rapides</h3>
                </div>
                <div className="p-2">
                  <QuickAction icon={Plus} label="Créer une nouvelle consultation" onClick={() => setShowCreateModal(true)} />
                  <QuickAction
                    icon={ClipboardList}
                    label={`Voir les consultations en attente (${waitingToday.length})`}
                    onClick={() => setActiveTab('waiting')}
                  />
                  <QuickAction
                    icon={XCircle}
                    label={`Voir les consultations annulées (${cancelled.length})`}
                    onClick={() => setActiveTab('cancelled')}
                  />
                  <QuickAction icon={FileDown} label="Export des consultations" onClick={handleExportExcel} />
                  <QuickAction icon={FileBarChart} label="Rapport des consultations" onClick={handleExportExcel} />
                </div>
              </Card>
            </SortableGroup>
          </SortableGroup>
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
