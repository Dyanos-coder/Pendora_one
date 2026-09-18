import { useEffect, useMemo, useState } from 'react'
import {
  Siren,
  UserPlus,
  LogOut,
  Hourglass,
  Clock,
  HeartPulse,
  Search,
  FileSpreadsheet,
  Columns3,
  Printer,
  Eye,
  MoreHorizontal,
  Pencil,
  Plus,
  Zap,
  ArrowLeftRight,
  FileDown,
  ChartBar,
  TriangleAlert,
  Users2,
  Loader2,
  Trash2
} from 'lucide-react'
import { Card } from '@renderer/components/Card'
import { PageHeader } from '@renderer/components/PageHeader'
import { Button } from '@renderer/components/Button'
import { StatusBadge } from '@renderer/components/StatusBadge'
import { LineChart } from '@renderer/components/LineChart'
import { ConfirmDialog } from '@renderer/components/ConfirmDialog'
import type { ApiEmergencyStatus, ApiEmergencyVisit, ApiSeverity } from '@shared/emergency-types'
import { severityTone, emergencyStatusTone, SEVERITY_CHART_COLOR } from './status'
import type { EmergencyRecord, EmergencyStatus, Severity } from './types'
import { isSameDay } from '@renderer/features/appointments/week'
import { EmergencyFormModal } from './EmergencyFormModal'

interface EmergenciesPageProps {
  onOpenPatient: (patientId: string) => void
}

type Tab = 'all' | 'triage' | 'inProgress' | 'observation' | 'sorti' | 'transfere' | 'annule'

const SEVERITY_LABEL: Record<ApiSeverity, Severity> = {
  CRITIQUE: 'Critique',
  ELEVE: 'Élevé',
  MOYEN: 'Moyen',
  FAIBLE: 'Faible'
}

const STATUS_LABEL: Record<ApiEmergencyStatus, EmergencyStatus> = {
  EN_COURS: 'En cours',
  EN_OBSERVATION: 'En observation',
  EN_ATTENTE_TRIAGE: 'En attente de triage',
  SORTI: 'Sorti',
  TRANSFERE: 'Transféré',
  ANNULE: 'Annulé'
}

function toRecord(v: ApiEmergencyVisit): EmergencyRecord {
  const arrivalTime = new Date(v.arrivalTime)
  const dischargeTime = v.dischargeTime ? new Date(v.dischargeTime) : null
  const end = dischargeTime ?? new Date()
  return {
    id: v.id,
    patientId: v.patientId,
    patientCode: v.patientCode ?? '—',
    patientName: v.patientName ?? 'Patient',
    arrivalTime,
    dischargeTime,
    age: v.age,
    gender: v.gender ?? 'M',
    motive: v.motive ?? '—',
    detail: v.detail ?? '—',
    severity: SEVERITY_LABEL[v.severity],
    zone: v.zone ?? '—',
    doctor: v.doctorName ?? '—',
    doctorId: v.doctorId,
    status: STATUS_LABEL[v.status],
    outcome: v.outcome,
    duration: v.duration,
    waitMinutes: Math.round((end.getTime() - arrivalTime.getTime()) / 60000)
  }
}

const FILTER_FIELDS = [
  { label: 'Période', value: "Aujourd'hui" },
  { label: 'Service', value: 'Tous les services' },
  { label: 'Niveau de gravité', value: 'Tous les niveaux' },
  { label: 'Statut', value: 'Tous les statuts' },
  { label: 'Médecin responsable', value: 'Tous les médecins' },
  { label: 'Zone / Salle', value: 'Toutes les zones' }
]

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`
}

function formatClock(date: Date): string {
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

const FLOW_BUCKET_LABELS = ['00h-04h', '04h-08h', '08h-12h', '12h-16h', '16h-20h', '20h-24h']

export function EmergenciesPage({ onOpenPatient }: EmergenciesPageProps): JSX.Element {
  const [visits, setVisits] = useState<EmergencyRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingVisit, setEditingVisit] = useState<EmergencyRecord | null>(null)
  const [deletingVisit, setDeletingVisit] = useState<EmergencyRecord | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    window.api.emergencies.list().then((result) => {
      if (cancelled) return
      if (result.ok) {
        setVisits(result.data.visits.map(toRecord))
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
  const active = useMemo(
    () => visits.filter((v) => v.status === 'En cours' || v.status === 'En observation' || v.status === 'En attente de triage'),
    [visits]
  )
  const discharged = useMemo(() => visits.filter((v) => v.dischargeTime !== null), [visits])
  const newToday = useMemo(() => visits.filter((v) => isSameDay(v.arrivalTime, today)), [visits, today])
  const dischargedToday = useMemo(
    () => discharged.filter((v) => v.dischargeTime && isSameDay(v.dischargeTime, today)),
    [discharged, today]
  )
  const critical = useMemo(() => active.filter((v) => v.severity === 'Critique'), [active])
  const waitingTriage = useMemo(
    () => active.filter((v) => v.status === 'En attente de triage').sort((a, b) => b.waitMinutes - a.waitMinutes),
    [active]
  )

  const TABS: { id: Tab; label: string; count: number }[] = [
    { id: 'all', label: 'Tous les patients', count: active.length },
    { id: 'triage', label: 'En attente de triage', count: waitingTriage.length },
    { id: 'inProgress', label: 'En cours de prise en charge', count: active.filter((v) => v.status === 'En cours').length },
    { id: 'observation', label: 'En observation', count: active.filter((v) => v.status === 'En observation').length },
    { id: 'sorti', label: 'Sortis', count: discharged.filter((v) => v.status === 'Sorti').length },
    { id: 'transfere', label: 'Transférés', count: discharged.filter((v) => v.status === 'Transféré').length },
    { id: 'annule', label: 'Annulés', count: discharged.filter((v) => v.status === 'Annulé').length }
  ]

  const TAB_ROWS: Record<Tab, EmergencyRecord[]> = {
    all: active,
    triage: waitingTriage,
    inProgress: active.filter((v) => v.status === 'En cours'),
    observation: active.filter((v) => v.status === 'En observation'),
    sorti: discharged.filter((v) => v.status === 'Sorti'),
    transfere: discharged.filter((v) => v.status === 'Transféré'),
    annule: discharged.filter((v) => v.status === 'Annulé')
  }

  const rows = useMemo(() => {
    const base = TAB_ROWS[activeTab]
    const term = search.trim().toLowerCase()
    if (!term) return base
    return base.filter((v) => `${v.patientName} ${v.motive} ${v.doctor} ${v.zone}`.toLowerCase().includes(term))
  }, [activeTab, search, visits])

  const severityBreakdown = useMemo(() => {
    const counts: Record<Severity, number> = { Critique: 0, Élevé: 0, Moyen: 0, Faible: 0 }
    for (const v of active) counts[v.severity] += 1
    const total = active.length
    return (['Critique', 'Élevé', 'Moyen', 'Faible'] as Severity[]).map((severity) => ({
      severity,
      count: counts[severity],
      percent: total === 0 ? 0 : Math.round((counts[severity] / total) * 100)
    }))
  }, [active])

  const severityDonutBackground = useMemo(() => {
    let cursor = 0
    const stops = severityBreakdown.map(({ severity, percent }) => {
      const start = cursor
      cursor += percent
      return `${SEVERITY_CHART_COLOR[severity]} ${start}% ${cursor}%`
    })
    return `conic-gradient(${stops.join(', ')})`
  }, [severityBreakdown])

  const avgTriageWait = useMemo(() => {
    if (waitingTriage.length === 0) return null
    return Math.round(waitingTriage.reduce((sum, v) => sum + v.waitMinutes, 0) / waitingTriage.length)
  }, [waitingTriage])

  const inCare = useMemo(() => active.filter((v) => v.status === 'En cours' || v.status === 'En observation'), [active])
  const avgCareTime = useMemo(() => {
    if (inCare.length === 0) return null
    return Math.round(inCare.reduce((sum, v) => sum + v.waitMinutes, 0) / inCare.length)
  }, [inCare])

  const avgTotalDuration = useMemo(() => {
    if (visits.length === 0) return null
    return Math.round(visits.reduce((sum, v) => sum + v.waitMinutes, 0) / visits.length)
  }, [visits])

  const longWaits = useMemo(() => active.filter((v) => v.waitMinutes > 60).length, [active])

  const flowData = useMemo(() => {
    const entries = new Array(6).fill(0)
    const exits = new Array(6).fill(0)
    for (const v of newToday) {
      const bucket = Math.min(5, Math.floor(v.arrivalTime.getHours() / 4))
      entries[bucket] += 1
    }
    for (const v of dischargedToday) {
      if (!v.dischargeTime) continue
      const bucket = Math.min(5, Math.floor(v.dischargeTime.getHours() / 4))
      exits[bucket] += 1
    }
    return { entries, exits }
  }, [newToday, dischargedToday])

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        breadcrumb={['Accueil', 'Urgences']}
        title="Urgences"
        subtitle="Centre de gestion des urgences."
        actions={
          <Button onClick={() => setShowCreateModal(true)}>
            <UserPlus className="h-4 w-4" />
            Nouveau patient urgent
          </Button>
        }
      />

      {showCreateModal && (
        <EmergencyFormModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(visit) => {
            setVisits((prev) => [...prev, toRecord(visit)])
            setShowCreateModal(false)
          }}
        />
      )}

      {editingVisit && (
        <EmergencyFormModal
          editing={editingVisit}
          onClose={() => setEditingVisit(null)}
          onCreated={(visit) => {
            const updated = toRecord(visit)
            setVisits((prev) => prev.map((v) => (v.id === updated.id ? updated : v)))
            setEditingVisit(null)
          }}
        />
      )}

      {deletingVisit && (
        <ConfirmDialog
          title="Supprimer le passage aux urgences"
          message={`Voulez-vous vraiment supprimer le passage aux urgences de ${deletingVisit.patientName} ?`}
          onCancel={() => setDeletingVisit(null)}
          onConfirm={() => window.api.emergencies.delete(deletingVisit.id)}
          onConfirmed={() => {
            setVisits((prev) => prev.filter((v) => v.id !== deletingVisit.id))
            setDeletingVisit(null)
          }}
        />
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-24 text-sm text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement des urgences…
        </div>
      ) : error ? (
        <p className="py-12 text-center text-sm text-red-500">{error}</p>
      ) : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <Card className="border-t-4 border-t-violet-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50">
                <Siren className="h-5 w-5 text-violet-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Patients en cours</p>
              <p className="mt-0.5 text-xl font-bold text-gray-900">{active.length}</p>
            </Card>
            <Card className="border-t-4 border-t-red-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50">
                <UserPlus className="h-5 w-5 text-red-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Nouveaux aujourd&apos;hui</p>
              <p className="mt-0.5 text-xl font-bold text-gray-900">{newToday.length}</p>
            </Card>
            <Card className="border-t-4 border-t-emerald-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
                <LogOut className="h-5 w-5 text-emerald-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Sortis aujourd&apos;hui</p>
              <p className="mt-0.5 text-xl font-bold text-gray-900">{dischargedToday.length}</p>
            </Card>
            <Card className="border-t-4 border-t-blue-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                <Hourglass className="h-5 w-5 text-blue-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">En attente de triage</p>
              <p className="mt-0.5 text-xl font-bold text-gray-900">{waitingTriage.length}</p>
            </Card>
            <Card className="border-t-4 border-t-violet-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50">
                <Clock className="h-5 w-5 text-violet-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Durée moyenne de passage</p>
              <p className="mt-0.5 text-xl font-bold text-gray-900">{avgTotalDuration === null ? '—' : formatDuration(avgTotalDuration)}</p>
            </Card>
            <Card className="border-t-4 border-t-red-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50">
                <HeartPulse className="h-5 w-5 text-red-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Patients critiques</p>
              <p className="mt-0.5 text-xl font-bold text-red-600">{critical.length}</p>
              <p className="text-xs text-gray-400">Nécessitent attention</p>
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
                <p className="px-6 py-8 text-center text-sm text-gray-400">Aucun patient dans cette catégorie.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                        <th className="px-6 py-2.5 font-medium">Arrivée</th>
                        <th className="px-6 py-2.5 font-medium">Patient</th>
                        <th className="px-6 py-2.5 font-medium">Âge / Sexe</th>
                        <th className="px-6 py-2.5 font-medium">Motif</th>
                        <th className="px-6 py-2.5 font-medium">Gravité</th>
                        <th className="px-6 py-2.5 font-medium">Zone / Salle</th>
                        <th className="px-6 py-2.5 font-medium">Médecin</th>
                        <th className="px-6 py-2.5 font-medium">Statut</th>
                        <th className="px-6 py-2.5 font-medium">Durée</th>
                        <th className="px-6 py-2.5 font-medium" />
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((v) => (
                        <tr key={v.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                          <td className="px-6 py-3 font-medium text-gray-900">{formatClock(v.arrivalTime)}</td>
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-2.5">
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-50 text-[11px] font-semibold text-accent-700">
                                {initials(v.patientName)}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate font-medium text-gray-900">{v.patientName}</p>
                                <p className="truncate text-xs text-gray-400">{v.patientCode}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-gray-600">{v.age ? `${v.age} ans · ${v.gender === 'M' ? 'Homme' : 'Femme'}` : '—'}</td>
                          <td className="px-6 py-3">
                            <p className="text-gray-900">{v.motive}</p>
                            <p className="text-xs text-gray-400">{v.detail}</p>
                          </td>
                          <td className="px-6 py-3">
                            <StatusBadge label={v.severity} tone={severityTone(v.severity)} />
                          </td>
                          <td className="px-6 py-3 text-gray-600">{v.zone}</td>
                          <td className="px-6 py-3 text-gray-600">{v.doctor}</td>
                          <td className="px-6 py-3">
                            <StatusBadge label={v.status} tone={emergencyStatusTone(v.status)} />
                          </td>
                          <td className="px-6 py-3 text-gray-600">{v.duration}</td>
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => v.patientId && onOpenPatient(v.patientId)}
                                disabled={!v.patientId}
                                title={v.patientId ? 'Voir le dossier patient' : 'Aucun dossier lié'}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setEditingVisit(v)}
                                title="Modifier le passage aux urgences"
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setDeletingVisit(v)}
                                title="Supprimer le passage aux urgences"
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
                <span>Affichage de {rows.length === 0 ? 0 : 1} à {rows.length} sur {TAB_ROWS[activeTab].length} patients</span>
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
                <h3 className="mb-4 text-sm font-semibold text-gray-900">Répartition par niveau de gravité</h3>
                <div className="flex items-center gap-5">
                  <div
                    className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full"
                    style={{ background: severityDonutBackground }}
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-xs font-bold text-gray-900">
                      {active.length}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {severityBreakdown.map(({ severity, count, percent }) => (
                      <div key={severity} className="flex items-center gap-1.5 text-xs">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: SEVERITY_CHART_COLOR[severity] }} />
                        <span className="text-gray-600">{severity}</span>
                        <span className="font-medium text-gray-900">
                          {count} ({percent}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              <Card>
                <h3 className="mb-3 text-sm font-semibold text-gray-900">Temps d&apos;attente moyen</h3>
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-gray-600">
                      <Hourglass className="h-3.5 w-3.5 text-gray-400" />
                      En attente de triage
                    </span>
                    <span className="font-semibold text-gray-900">{avgTriageWait === null ? '—' : formatDuration(avgTriageWait)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-gray-600">
                      <Clock className="h-3.5 w-3.5 text-gray-400" />
                      Prise en charge
                    </span>
                    <span className="font-semibold text-gray-900">{avgCareTime === null ? '—' : formatDuration(avgCareTime)}</span>
                  </div>
                </div>
              </Card>

              <Card className="p-0">
                <div className="border-b border-gray-100 px-5 py-4">
                  <h3 className="text-sm font-semibold text-gray-900">Actions rapides</h3>
                </div>
                <div className="p-2">
                  <QuickAction icon={Plus} label="Nouveau patient urgent" />
                  <QuickAction icon={Zap} label="Triage rapide" />
                  <QuickAction icon={ArrowLeftRight} label="Transférer un patient" />
                  <QuickAction icon={Printer} label="Imprimer la liste" />
                  <QuickAction icon={FileDown} label="Exporter statistiques urgences" />
                  <QuickAction icon={ChartBar} label={`Voir patients critiques (${critical.length})`} onClick={() => setActiveTab('all')} />
                </div>
              </Card>

              <Card className="p-0">
                <div className="border-b border-gray-100 px-5 py-4">
                  <h3 className="text-sm font-semibold text-gray-900">Alertes urgences</h3>
                </div>
                <div className="space-y-3 p-5">
                  {critical.length === 0 && longWaits === 0 ? (
                    <p className="text-xs text-gray-400">Aucune alerte pour le moment.</p>
                  ) : (
                    <>
                      {critical.length > 0 && (
                        <Alert
                          icon={TriangleAlert}
                          tone="text-red-500"
                          text={`${critical.length} patient${critical.length > 1 ? 's' : ''} critique${critical.length > 1 ? 's' : ''} nécessite${critical.length > 1 ? 'nt' : ''} attention`}
                        />
                      )}
                      {longWaits > 0 && (
                        <Alert
                          icon={Hourglass}
                          tone="text-amber-500"
                          text={`${longWaits} patient${longWaits > 1 ? 's' : ''} en attente > 1 heure`}
                        />
                      )}
                    </>
                  )}
                </div>
              </Card>
            </div>
          </div>

          {/* Panneaux du bas */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
            <Card className="p-0">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
                <h3 className="text-sm font-semibold text-gray-900">Patients en attente de triage ({waitingTriage.length})</h3>
              </div>
              <div className="space-y-3 p-5">
                {waitingTriage.length === 0 ? (
                  <p className="text-xs text-gray-400">Aucun patient en attente.</p>
                ) : (
                  waitingTriage.slice(0, 5).map((p) => (
                    <div key={p.id} className="flex items-center gap-2 text-xs">
                      <Users2 className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                      <span className="min-w-0 flex-1 truncate text-gray-800">{p.patientName}</span>
                      <span className="shrink-0 text-gray-400">{p.duration}</span>
                      <StatusBadge label={p.severity} tone={severityTone(p.severity)} />
                    </div>
                  ))
                )}
              </div>
            </Card>

            <Card className="p-0">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
                <h3 className="text-sm font-semibold text-gray-900">Patients critiques ({critical.length})</h3>
              </div>
              <div className="space-y-3 p-5">
                {critical.length === 0 ? (
                  <p className="text-xs text-gray-400">Aucun patient critique.</p>
                ) : (
                  critical
                    .sort((a, b) => b.waitMinutes - a.waitMinutes)
                    .map((p) => (
                      <div key={p.id} className="flex items-center gap-2 text-xs">
                        <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" />
                        <span className="min-w-0 flex-1 truncate text-gray-800">{p.patientName}</span>
                        <span className="shrink-0 text-gray-400">{p.duration}</span>
                        <span className="max-w-[40%] shrink truncate text-right text-gray-400">{p.motive}</span>
                      </div>
                    ))
                )}
              </div>
            </Card>

            <Card className="p-0">
              <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
                <h3 className="text-sm font-semibold text-gray-900">Sorties aujourd&apos;hui ({dischargedToday.length})</h3>
              </div>
              <div className="space-y-3 p-5">
                {dischargedToday.length === 0 ? (
                  <p className="text-xs text-gray-400">Aucune sortie aujourd&apos;hui.</p>
                ) : (
                  dischargedToday.map((d) => (
                    <div key={d.id} className="flex items-center gap-2 text-xs">
                      <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                      <span className="flex-1 truncate text-gray-800">{d.patientName}</span>
                      <span className="shrink-0 text-gray-400">{d.dischargeTime ? formatClock(d.dischargeTime) : '—'}</span>
                      <span className="shrink-0 text-emerald-600">{d.outcome}</span>
                    </div>
                  ))
                )}
              </div>
            </Card>

            <Card className="p-0">
              <div className="border-b border-gray-100 px-5 py-3.5">
                <h3 className="text-sm font-semibold text-gray-900">Flux des urgences (aujourd&apos;hui)</h3>
              </div>
              <div className="p-5">
                <div className="mb-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-500">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-blue-500" /> Entrées ({newToday.length})
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-amber-500" /> Sorties ({dischargedToday.length})
                  </span>
                </div>
                <LineChart
                  categories={FLOW_BUCKET_LABELS}
                  series={[
                    { label: 'Entrées', color: '#3b82f6', values: flowData.entries },
                    { label: 'Sorties', color: '#f59e0b', values: flowData.exits }
                  ]}
                />
              </div>
            </Card>
          </div>
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

function Alert({ icon: Icon, tone, text }: { icon: typeof TriangleAlert; tone: string; text: string }): JSX.Element {
  return (
    <div className="flex items-start gap-2.5 text-xs">
      <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${tone}`} />
      <span className="text-gray-600">{text}</span>
    </div>
  )
}
