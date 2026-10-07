import { useEffect, useMemo, useState } from 'react'
import {
  BedDouble,
  CalendarPlus,
  LogOut,
  Clock,
  Gauge,
  BedSingle,
  Search,
  FileSpreadsheet,
  Columns3,
  Printer,
  Eye,
  MoreHorizontal,
  Pencil,
  Plus,
  ArrowLeftRight,
  CalendarCheck,
  FileDown,
  ChartBar,
  TriangleAlert,
  Loader2,
  Trash2
} from 'lucide-react'
import { Card } from '@renderer/components/Card'
import { PageHeader } from '@renderer/components/PageHeader'
import { Button } from '@renderer/components/Button'
import { StatusBadge } from '@renderer/components/StatusBadge'
import { ConfirmDialog } from '@renderer/components/ConfirmDialog'
import type { ApiBedOccupancy, ApiHospitalization, ApiHospitalizationStatus } from '@shared/hospitalization-types'
import { hospitalizationStatusTone, BED_CHART_COLOR } from './status'
import type { HospitalizationRecord, HospitalizationStatus } from './types'
import { isSameDay } from '@renderer/features/appointments/week'
import { HospitalizationFormModal } from './HospitalizationFormModal'
import { SortableGroup } from '@renderer/components/SortableGroup'
import { PulseLoader } from '@renderer/components/ui/Feedback'

interface HospitalizationPageProps {
  onOpenPatient: (patientId: string) => void
}

type Tab = 'all' | 'hospitalized' | 'waiting'

const STATUS_LABEL: Record<ApiHospitalizationStatus, HospitalizationStatus> = {
  HOSPITALISE: 'Hospitalisé',
  EN_ATTENTE: 'En attente',
  SORTI: 'Sorti'
}

function toRecord(h: ApiHospitalization): HospitalizationRecord {
  return {
    id: h.id,
    patientId: h.patientId,
    patientCode: h.patientCode ?? '—',
    patientName: h.patientName ?? 'Patient',
    admissionDate: new Date(h.admissionDate),
    service: h.service ?? '—',
    room: h.room,
    bed: h.bed,
    bedId: h.bedId,
    doctor: h.doctorName ?? '—',
    doctorId: h.doctorId,
    motive: h.motive ?? '—',
    status: STATUS_LABEL[h.status],
    stayDuration: h.stayDuration
  }
}

const EXTRA_TABS = ["Sorties aujourd'hui", 'Transferts', 'Sorties prévues', 'Sorties récentes']

const ALL_FILTER = '__all__'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export function HospitalizationPage({ onOpenPatient }: HospitalizationPageProps): JSX.Element {
  const [hospitalizations, setHospitalizations] = useState<HospitalizationRecord[]>([])
  const [occupancy, setOccupancy] = useState<ApiBedOccupancy | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingHospitalization, setEditingHospitalization] = useState<HospitalizationRecord | null>(null)
  const [deletingHospitalization, setDeletingHospitalization] = useState<HospitalizationRecord | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('all')
  const [search, setSearch] = useState('')
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [exporting, setExporting] = useState(false)
  const [filterService, setFilterService] = useState(ALL_FILTER)
  const [filterDoctor, setFilterDoctor] = useState(ALL_FILTER)
  const [filterStatus, setFilterStatus] = useState(ALL_FILTER)
  const [filterType, setFilterType] = useState(ALL_FILTER)

  useEffect(() => {
    let cancelled = false
    Promise.all([window.api.hospitalizations.list(), window.api.hospitalizations.occupancy()]).then(([hospResult, occResult]) => {
      if (cancelled) return
      if (hospResult.ok) {
        setHospitalizations(hospResult.data.hospitalizations.map(toRecord))
      } else {
        setError(hospResult.error)
      }
      if (occResult.ok) setOccupancy(occResult.data.occupancy)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const today = useMemo(() => new Date(), [])
  const hospitalized = useMemo(() => hospitalizations.filter((h) => h.status === 'Hospitalisé'), [hospitalizations])
  const waiting = useMemo(() => hospitalizations.filter((h) => h.status === 'En attente'), [hospitalizations])
  const admittedToday = useMemo(() => hospitalizations.filter((h) => isSameDay(h.admissionDate, today)), [hospitalizations, today])

  const TABS: { id: Tab; label: string; count: number }[] = [
    { id: 'all', label: 'Tous', count: hospitalizations.length },
    { id: 'hospitalized', label: 'Hospitalisés', count: hospitalized.length },
    { id: 'waiting', label: 'En attente de lit', count: waiting.length }
  ]

  const TAB_ROWS: Record<Tab, HospitalizationRecord[]> = { all: hospitalizations, hospitalized, waiting }
  const tabRows = TAB_ROWS[activeTab]

  const serviceOptions = useMemo(
    () => Array.from(new Set(hospitalizations.map((h) => h.service).filter((s) => s && s !== '—'))).sort(),
    [hospitalizations]
  )
  const doctorOptions = useMemo(
    () => Array.from(new Set(hospitalizations.map((h) => h.doctor).filter((d) => d && d !== '—'))).sort(),
    [hospitalizations]
  )
  // Il n'existe pas de champ « type d'hospitalisation » dédié : le motif est le champ le plus
  // proche pour catégoriser les hospitalisations, on l'utilise donc pour ce filtre.
  const motiveOptions = useMemo(
    () => Array.from(new Set(hospitalizations.map((h) => h.motive).filter((m) => m && m !== '—'))).sort(),
    [hospitalizations]
  )

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase()
    return tabRows.filter((h) => {
      if (term && !`${h.patientName} ${h.service} ${h.doctor} ${h.motive}`.toLowerCase().includes(term)) return false
      if (filterService !== ALL_FILTER && h.service !== filterService) return false
      if (filterDoctor !== ALL_FILTER && h.doctor !== filterDoctor) return false
      if (filterStatus !== ALL_FILTER && h.status !== filterStatus) return false
      if (filterType !== ALL_FILTER && h.motive !== filterType) return false
      return true
    })
  }, [tabRows, search, filterService, filterDoctor, filterStatus, filterType])

  function handleResetFilters(): void {
    setFilterService(ALL_FILTER)
    setFilterDoctor(ALL_FILTER)
    setFilterStatus(ALL_FILTER)
    setFilterType(ALL_FILTER)
  }

  async function handleExportExcel(): Promise<void> {
    setExporting(true)
    await window.api.hospitalizations.exportExcel()
    setExporting(false)
  }

  function toggleRow(id: string): void {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const averageStayDays = useMemo(() => {
    if (hospitalized.length === 0) return null
    const totalMs = hospitalized.reduce((sum, h) => sum + (today.getTime() - h.admissionDate.getTime()), 0)
    return (totalMs / hospitalized.length / 86400000).toFixed(1)
  }, [hospitalized, today])

  const occupancyRate = occupancy && occupancy.total > 0 ? Math.round((occupancy.OCCUPIED / occupancy.total) * 100) : null

  const bedDonutBackground = useMemo(() => {
    if (!occupancy || occupancy.total === 0) return undefined
    const parts: { key: keyof typeof BED_CHART_COLOR; value: number }[] = [
      { key: 'occupied', value: occupancy.OCCUPIED },
      { key: 'available', value: occupancy.AVAILABLE },
      { key: 'cleaning', value: occupancy.CLEANING },
      { key: 'maintenance', value: occupancy.MAINTENANCE }
    ]
    let cursor = 0
    const stops = parts.map(({ key, value }) => {
      const percent = (value / occupancy.total) * 100
      const start = cursor
      cursor += percent
      return `${BED_CHART_COLOR[key]} ${start}% ${cursor}%`
    })
    return `conic-gradient(${stops.join(', ')})`
  }, [occupancy])

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        breadcrumb={['Accueil', 'Hospitalisation']}
        title="Hospitalisation"
        subtitle="Centre de gestion des hospitalisations."
        actions={
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4" />
            Nouvelle hospitalisation
          </Button>
        }
      />

      {showCreateModal && (
        <HospitalizationFormModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(hospitalization) => {
            setHospitalizations((prev) => [...prev, toRecord(hospitalization)])
            setShowCreateModal(false)
          }}
        />
      )}

      {editingHospitalization && (
        <HospitalizationFormModal
          editing={editingHospitalization}
          onClose={() => setEditingHospitalization(null)}
          onCreated={(hospitalization) => {
            const updated = toRecord(hospitalization)
            setHospitalizations((prev) => prev.map((h) => (h.id === updated.id ? updated : h)))
            setEditingHospitalization(null)
          }}
        />
      )}

      {deletingHospitalization && (
        <ConfirmDialog
          title="Supprimer l'hospitalisation"
          message={`Voulez-vous vraiment supprimer l'hospitalisation de ${deletingHospitalization.patientName} ?`}
          onCancel={() => setDeletingHospitalization(null)}
          onConfirm={() => window.api.hospitalizations.delete(deletingHospitalization.id)}
          onConfirmed={() => {
            setHospitalizations((prev) => prev.filter((h) => h.id !== deletingHospitalization.id))
            setDeletingHospitalization(null)
          }}
        />
      )}

      {loading ? (
        <PulseLoader label="Chargement des hospitalisations…" />
      ) : error ? (
        <p className="py-12 text-center text-sm text-red-500">{error}</p>
      ) : (
        <>
          {/* KPI row */}
          <SortableGroup id="hospitalization.grid1" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <Card className="p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-black/5 bg-accent-50">
                <BedDouble className="h-5 w-5 text-accent-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Patients hospitalisés</p>
              <p className="mt-0.5 text-xl font-display font-extrabold tabular-nums text-gray-900">{hospitalized.length}</p>
            </Card>
            <Card className="p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-black/5 bg-blue-50">
                <CalendarPlus className="h-5 w-5 text-blue-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Entrées aujourd&apos;hui</p>
              <p className="mt-0.5 text-xl font-display font-extrabold tabular-nums text-gray-900">{admittedToday.length}</p>
            </Card>
            <Card className="p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-black/5 bg-red-50">
                <LogOut className="h-5 w-5 text-red-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Sorties aujourd&apos;hui</p>
              <p className="mt-0.5 text-xl font-display font-extrabold tabular-nums text-gray-900">
                {hospitalizations.filter((h) => h.status === 'Sorti' && isSameDay(h.admissionDate, today)).length}
              </p>
            </Card>
            <Card className="p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-black/5 bg-cyan-50">
                <Clock className="h-5 w-5 text-cyan-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Durée moyenne de séjour</p>
              <p className="mt-0.5 text-xl font-display font-extrabold tabular-nums text-gray-900">
                {averageStayDays === null ? '—' : `${averageStayDays} j`}
              </p>
            </Card>
            <Card className="p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-black/5 bg-teal-50">
                <Gauge className="h-5 w-5 text-teal-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Taux d&apos;occupation</p>
              <p className="mt-0.5 text-xl font-display font-extrabold tabular-nums text-gray-900">
                {occupancyRate === null ? '—' : `${occupancyRate}%`}
              </p>
            </Card>
            <Card className="p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-black/5 bg-amber-50">
                <BedSingle className="h-5 w-5 text-amber-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Lits disponibles</p>
              <p className="mt-0.5 text-xl font-display font-extrabold tabular-nums text-gray-900">
                {occupancy?.AVAILABLE ?? '—'} / {occupancy?.total ?? '—'}
              </p>
            </Card>
          </SortableGroup>

          <SortableGroup id="hospitalization.grid2" className="grid grid-cols-1 gap-6 lg:grid-cols-3">
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
                {EXTRA_TABS.map((label) => (
                  <span key={label} className="cursor-default px-4 py-2.5 text-sm font-medium text-gray-300">
                    {label}
                  </span>
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
                  {tabRows.length === 0
                    ? 'Aucune hospitalisation dans cette catégorie.'
                    : 'Aucune hospitalisation ne correspond aux filtres.'}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50/70 text-[11px] uppercase tracking-[0.08em] text-gray-500">
                        <th className="w-10 px-6 py-2.5" />
                        <th className="px-6 py-3 font-semibold">Patient</th>
                        <th className="px-6 py-3 font-semibold">Admission</th>
                        <th className="px-6 py-3 font-semibold">Service</th>
                        <th className="px-6 py-3 font-semibold">Chambre / Lit</th>
                        <th className="px-6 py-3 font-semibold">Médecin responsable</th>
                        <th className="px-6 py-3 font-semibold">Motif</th>
                        <th className="px-6 py-3 font-semibold">Statut</th>
                        <th className="px-6 py-3 font-semibold">Durée</th>
                        <th className="px-6 py-3 font-semibold" />
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.map((h) => (
                        <tr key={h.id} className="border-b border-gray-100 last:border-0 transition-colors hover:bg-accent-50/40">
                          <td className="px-6 py-3">
                            <input
                              type="checkbox"
                              checked={checked.has(h.id)}
                              onChange={() => toggleRow(h.id)}
                              className="h-3.5 w-3.5 rounded border-gray-300 text-accent-500 focus:ring-accent-500"
                            />
                          </td>
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-2.5">
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-50 text-[11px] font-semibold text-accent-700">
                                {initials(h.patientName)}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate font-medium text-gray-900">{h.patientName}</p>
                                <p className="truncate text-xs text-gray-400">{h.patientCode}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-gray-600">
                            <p>{formatDate(h.admissionDate)}</p>
                            <p className="text-xs text-gray-400">{formatTime(h.admissionDate)}</p>
                          </td>
                          <td className="px-6 py-3 text-gray-600">{h.service}</td>
                          <td className="px-6 py-3 text-gray-600">{h.room ? `${h.room} / ${h.bed}` : '—'}</td>
                          <td className="px-6 py-3 text-gray-600">{h.doctor}</td>
                          <td className="px-6 py-3 text-gray-600">{h.motive}</td>
                          <td className="px-6 py-3">
                            <StatusBadge label={h.status} tone={hospitalizationStatusTone(h.status)} />
                          </td>
                          <td className="px-6 py-3 text-gray-600">{h.stayDuration}</td>
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => h.patientId && onOpenPatient(h.patientId)}
                                disabled={!h.patientId}
                                title={h.patientId ? 'Voir le dossier patient' : 'Aucun dossier lié'}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setEditingHospitalization(h)}
                                title="Modifier l'hospitalisation"
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setDeletingHospitalization(h)}
                                title="Supprimer l'hospitalisation"
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
                  Affichage de {filteredRows.length === 0 ? 0 : 1} à {filteredRows.length} sur {tabRows.length} hospitalisations
                </span>
              </div>
            </Card>

            {/* Colonne latérale */}
            <SortableGroup id="hospitalization.side1" className="space-y-6">
              <Card>
                <h3 className="mb-4 text-[15px] font-bold text-gray-900">Filtres</h3>
                <div className="space-y-3">
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
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">Médecin responsable</label>
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
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">Type d&apos;hospitalisation</label>
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
                  <Button size="sm" className="w-full" onClick={handleResetFilters}>
                    Réinitialiser les filtres
                  </Button>
                </div>
              </Card>

              <Card>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-[15px] font-bold text-gray-900">Occupation des lits</h3>
                </div>
                <div className="flex items-center gap-5">
                  <div
                    className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full"
                    style={{ background: bedDonutBackground }}
                  >
                    <div className="flex h-14 w-14 flex-col items-center justify-center rounded-full bg-white text-center">
                      <span className="text-sm font-bold text-gray-900">{occupancyRate === null ? '—' : `${occupancyRate}%`}</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {occupancy && (
                      <>
                        <BedLegendRow label="Occupés" count={occupancy.OCCUPIED} color={BED_CHART_COLOR.occupied} />
                        <BedLegendRow label="Disponibles" count={occupancy.AVAILABLE} color={BED_CHART_COLOR.available} />
                        <BedLegendRow label="En nettoyage" count={occupancy.CLEANING} color={BED_CHART_COLOR.cleaning} />
                        <BedLegendRow label="En maintenance" count={occupancy.MAINTENANCE} color={BED_CHART_COLOR.maintenance} />
                      </>
                    )}
                  </div>
                </div>
                <p className="mt-3 text-center text-xs text-gray-400">Capacité totale : {occupancy?.total ?? '—'} lits</p>
              </Card>

              <Card className="p-0">
                <div className="border-b border-gray-100 px-5 py-4">
                  <h3 className="text-[15px] font-bold text-gray-900">Actions rapides</h3>
                </div>
                <div className="p-2">
                  <QuickAction icon={Plus} label="Nouvelle hospitalisation" onClick={() => setShowCreateModal(true)} />
                  <QuickAction icon={ArrowLeftRight} label="Transférer un patient" />
                  <QuickAction icon={CalendarCheck} label="Planifier une sortie" />
                  <QuickAction icon={Printer} label="Imprimer liste d'hospitalisés" onClick={() => window.print()} />
                  <QuickAction icon={FileDown} label="Exporter statistique" onClick={handleExportExcel} />
                  <QuickAction icon={ChartBar} label="Voir les sorties prévues" />
                </div>
              </Card>

              <Card className="p-0">
                <div className="border-b border-gray-100 px-5 py-4">
                  <h3 className="text-[15px] font-bold text-gray-900">Alertes & Notifications</h3>
                </div>
                <div className="p-5">
                  {waiting.length > 0 ? (
                    <div className="flex items-start gap-2.5 text-xs">
                      <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                      <span className="text-gray-600">
                        {waiting.length} patient{waiting.length > 1 ? 's' : ''} en attente d&apos;affectation de lit
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">Aucune alerte pour le moment.</p>
                  )}
                </div>
              </Card>
            </SortableGroup>
          </SortableGroup>
        </>
      )}
    </div>
  )
}

function BedLegendRow({ label, count, color }: { label: string; count: number; color: string }): JSX.Element {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-gray-600">{label}</span>
      <span className="font-medium text-gray-900">{count}</span>
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
