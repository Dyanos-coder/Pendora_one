import { useMemo, useState } from 'react'
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
  Plus,
  ArrowLeftRight,
  CalendarCheck,
  FileDown,
  ChartBar,
  TriangleAlert,
  CalendarClock,
  FlaskConical,
  Pill
} from 'lucide-react'
import { Card } from '@renderer/components/Card'
import { PageHeader } from '@renderer/components/PageHeader'
import { Button } from '@renderer/components/Button'
import { StatusBadge } from '@renderer/components/StatusBadge'
import { MOCK_HOSPITALIZATIONS, BED_OCCUPANCY, TOTAL_BEDS } from './mock-data'
import { hospitalizationStatusTone, BED_CHART_COLOR } from './status'
import type { HospitalizationRecord } from './types'

interface HospitalizationPageProps {
  onOpenPatient: (patientId: string) => void
}

type Tab = 'all' | 'hospitalized' | 'waiting'

const TABS: { id: Tab; label: string; count: number }[] = [
  { id: 'all', label: 'Tous', count: 248 },
  { id: 'hospitalized', label: 'Hospitalisés', count: 248 },
  { id: 'waiting', label: "Entrées aujourd'hui", count: 23 }
]

const EXTRA_TABS = [
  { label: "Sorties aujourd'hui", count: 18 },
  { label: 'Transferts', count: 7 },
  { label: 'Sorties prévues', count: 31 },
  { label: 'Sorties récentes', count: 30 }
]

const FILTER_FIELDS = [
  { label: 'Période', value: 'Personnalisée · 21/05/2025' },
  { label: 'Service', value: 'Tous les services' },
  { label: 'Médecin responsable', value: 'Tous les médecins' },
  { label: 'Statut', value: 'Tous les statuts' },
  { label: "Type d'hospitalisation", value: 'Tous les types' }
]

const ALERTS = [
  { icon: TriangleAlert, tone: 'text-red-500', text: "4 patients en attente d'affectation de lit" },
  { icon: CalendarClock, tone: 'text-amber-500', text: "2 sorties prévues aujourd'hui" },
  { icon: FlaskConical, tone: 'text-blue-500', text: '5 examens non réalisés' },
  { icon: Pill, tone: 'text-blue-500', text: '8 traitements en retard' }
]

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
}

export function HospitalizationPage({ onOpenPatient }: HospitalizationPageProps): JSX.Element {
  const [activeTab, setActiveTab] = useState<Tab>('all')
  const [search, setSearch] = useState('')
  const [checked, setChecked] = useState<Set<string>>(new Set())

  const rows = useMemo(() => {
    const base: HospitalizationRecord[] =
      activeTab === 'hospitalized'
        ? MOCK_HOSPITALIZATIONS.filter((h) => h.status === 'Hospitalisé')
        : activeTab === 'waiting'
          ? MOCK_HOSPITALIZATIONS.filter((h) => h.status === 'En attente')
          : MOCK_HOSPITALIZATIONS

    const term = search.trim().toLowerCase()
    if (!term) return base
    return base.filter((h) => `${h.patientName} ${h.service} ${h.doctor} ${h.motive}`.toLowerCase().includes(term))
  }, [activeTab, search])

  function toggleRow(id: string): void {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const bedDonutBackground = useMemo(() => {
    let cursor = 0
    const stops = BED_OCCUPANCY.map(({ key, percent }) => {
      const start = cursor
      cursor += percent
      return `${BED_CHART_COLOR[key]} ${start}% ${cursor}%`
    })
    return `conic-gradient(${stops.join(', ')})`
  }, [])

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        breadcrumb={['Accueil', 'Hospitalisation']}
        title="Hospitalisation"
        subtitle="Centre de gestion des hospitalisations."
      />

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <Card className="border-t-4 border-t-violet-400 p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50">
            <BedDouble className="h-5 w-5 text-violet-600" />
          </div>
          <p className="mt-3 text-xs font-medium text-gray-500">Patients hospitalisés</p>
          <div className="mt-0.5 flex items-baseline justify-between">
            <p className="text-xl font-bold text-gray-900">248</p>
            <span className="text-xs font-medium text-emerald-600">↑ 8%</span>
          </div>
        </Card>
        <Card className="border-t-4 border-t-blue-400 p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
            <CalendarPlus className="h-5 w-5 text-blue-600" />
          </div>
          <p className="mt-3 text-xs font-medium text-gray-500">Entrées aujourd&apos;hui</p>
          <div className="mt-0.5 flex items-baseline justify-between">
            <p className="text-xl font-bold text-gray-900">23</p>
            <span className="text-xs font-medium text-emerald-600">↑ 15%</span>
          </div>
        </Card>
        <Card className="border-t-4 border-t-red-400 p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50">
            <LogOut className="h-5 w-5 text-red-600" />
          </div>
          <p className="mt-3 text-xs font-medium text-gray-500">Sorties aujourd&apos;hui</p>
          <div className="mt-0.5 flex items-baseline justify-between">
            <p className="text-xl font-bold text-gray-900">18</p>
            <span className="text-xs font-medium text-emerald-600">↑ 5%</span>
          </div>
        </Card>
        <Card className="border-t-4 border-t-cyan-400 p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-50">
            <Clock className="h-5 w-5 text-cyan-600" />
          </div>
          <p className="mt-3 text-xs font-medium text-gray-500">Durée moyenne de séjour</p>
          <div className="mt-0.5 flex items-baseline justify-between">
            <p className="text-xl font-bold text-gray-900">4,6 j</p>
            <span className="text-xs font-medium text-emerald-600">↓ 0,8 j</span>
          </div>
        </Card>
        <Card className="border-t-4 border-t-emerald-400 p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
            <Gauge className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="mt-3 text-xs font-medium text-gray-500">Taux d&apos;occupation</p>
          <div className="mt-0.5 flex items-baseline justify-between">
            <p className="text-xl font-bold text-gray-900">87%</p>
            <span className="text-xs font-medium text-emerald-600">↑ 3%</span>
          </div>
        </Card>
        <Card className="border-t-4 border-t-amber-400 p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50">
            <BedSingle className="h-5 w-5 text-amber-600" />
          </div>
          <p className="mt-3 text-xs font-medium text-gray-500">Lits disponibles</p>
          <p className="mt-0.5 text-xl font-bold text-gray-900">34 / 280</p>
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
            {EXTRA_TABS.map((tab) => (
              <span key={tab.label} className="cursor-default px-4 py-2.5 text-sm font-medium text-gray-300">
                {tab.label} <span className="text-xs text-gray-300">({tab.count})</span>
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
            <p className="px-6 py-8 text-center text-sm text-gray-400">Aucune hospitalisation dans cette catégorie.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                    <th className="w-10 px-6 py-2.5" />
                    <th className="px-6 py-2.5 font-medium">Patient</th>
                    <th className="px-6 py-2.5 font-medium">Admission</th>
                    <th className="px-6 py-2.5 font-medium">Service</th>
                    <th className="px-6 py-2.5 font-medium">Chambre / Lit</th>
                    <th className="px-6 py-2.5 font-medium">Médecin responsable</th>
                    <th className="px-6 py-2.5 font-medium">Motif</th>
                    <th className="px-6 py-2.5 font-medium">Statut</th>
                    <th className="px-6 py-2.5 font-medium">Durée</th>
                    <th className="px-6 py-2.5 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((h) => (
                    <tr key={h.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
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
                        <p>{h.admissionDate}</p>
                        <p className="text-xs text-gray-400">{h.admissionTime}</p>
                      </td>
                      <td className="px-6 py-3 text-gray-600">{h.service}</td>
                      <td className="px-6 py-3 text-gray-600">
                        {h.room} / {h.bed}
                      </td>
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

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 px-6 py-3 text-xs text-gray-400">
            <span>Affichage de 1 à {rows.length} sur 248 hospitalisations</span>
            <span>Données de démonstration — pagination et export réels à venir.</span>
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
              <h3 className="text-sm font-semibold text-gray-900">Occupation des lits</h3>
              <button className="text-xs font-medium text-accent-600 hover:text-accent-500">Voir le plan</button>
            </div>
            <div className="flex items-center gap-5">
              <div
                className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full"
                style={{ background: bedDonutBackground }}
              >
                <div className="flex h-14 w-14 flex-col items-center justify-center rounded-full bg-white text-center">
                  <span className="text-sm font-bold text-gray-900">87%</span>
                </div>
              </div>
              <div className="space-y-1.5">
                {BED_OCCUPANCY.map(({ label, count, percent, key }) => (
                  <div key={label} className="flex items-center gap-1.5 text-xs">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: BED_CHART_COLOR[key] }} />
                    <span className="text-gray-600">{label}</span>
                    <span className="font-medium text-gray-900">
                      {count} ({percent}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-3 text-center text-xs text-gray-400">Capacité totale : {TOTAL_BEDS} lits</p>
          </Card>

          <Card className="p-0">
            <div className="border-b border-gray-100 px-5 py-4">
              <h3 className="text-sm font-semibold text-gray-900">Actions rapides</h3>
            </div>
            <div className="p-2">
              <QuickAction icon={Plus} label="Nouvelle hospitalisation" />
              <QuickAction icon={ArrowLeftRight} label="Transférer un patient" />
              <QuickAction icon={CalendarCheck} label="Planifier une sortie" />
              <QuickAction icon={Printer} label="Imprimer liste d'hospitalisés" />
              <QuickAction icon={FileDown} label="Exporter statistique" />
              <QuickAction icon={ChartBar} label="Voir les sorties prévues (31)" />
            </div>
          </Card>

          <Card className="p-0">
            <div className="border-b border-gray-100 px-5 py-4">
              <h3 className="text-sm font-semibold text-gray-900">Alertes & Notifications</h3>
            </div>
            <div className="space-y-3 p-5">
              {ALERTS.map((alert) => (
                <div key={alert.text} className="flex items-start gap-2.5 text-xs">
                  <alert.icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${alert.tone}`} />
                  <span className="text-gray-600">{alert.text}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
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
