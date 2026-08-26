import { useMemo, useState } from 'react'
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
  Plus,
  Zap,
  ArrowLeftRight,
  FileDown,
  ChartBar,
  TriangleAlert,
  Users2,
  BedSingle,
  FlaskConical
} from 'lucide-react'
import { Card } from '@renderer/components/Card'
import { PageHeader } from '@renderer/components/PageHeader'
import { Button } from '@renderer/components/Button'
import { StatusBadge } from '@renderer/components/StatusBadge'
import { LineChart } from '@renderer/components/LineChart'
import {
  MOCK_EMERGENCIES,
  SEVERITY_BREAKDOWN,
  WAITING_TRIAGE,
  CRITICAL_PATIENTS,
  TODAY_DISCHARGES,
  FLOW_CATEGORIES,
  FLOW_ENTRIES,
  FLOW_EXITS,
  FLOW_IN_PROGRESS
} from './mock-data'
import { severityTone, emergencyStatusTone, SEVERITY_CHART_COLOR } from './status'
import type { EmergencyRecord } from './types'

interface EmergenciesPageProps {
  onOpenPatient: (patientId: string) => void
}

type Tab = 'all' | 'triage' | 'inProgress' | 'observation'

const TABS: { id: Tab; label: string; count: number }[] = [
  { id: 'all', label: 'Tous les patients', count: 42 },
  { id: 'triage', label: 'En attente de triage', count: 7 },
  { id: 'inProgress', label: 'En cours de prise en charge', count: 30 },
  { id: 'observation', label: 'En observation', count: 8 }
]

const EXTRA_TABS = [
  { label: 'Sortis', count: 26 },
  { label: 'Transférés', count: 4 },
  { label: 'Annulés', count: 2 }
]

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

export function EmergenciesPage({ onOpenPatient }: EmergenciesPageProps): JSX.Element {
  const [activeTab, setActiveTab] = useState<Tab>('all')
  const [search, setSearch] = useState('')

  const rows = useMemo(() => {
    const base: EmergencyRecord[] =
      activeTab === 'triage'
        ? MOCK_EMERGENCIES.filter((e) => e.status === 'En attente de triage')
        : activeTab === 'inProgress'
          ? MOCK_EMERGENCIES.filter((e) => e.status === 'En cours')
          : activeTab === 'observation'
            ? MOCK_EMERGENCIES.filter((e) => e.status === 'En observation')
            : MOCK_EMERGENCIES

    const term = search.trim().toLowerCase()
    if (!term) return base
    return base.filter((e) => `${e.patientName} ${e.motive} ${e.doctor} ${e.zone}`.toLowerCase().includes(term))
  }, [activeTab, search])

  const severityDonutBackground = useMemo(() => {
    let cursor = 0
    const stops = SEVERITY_BREAKDOWN.map(({ severity, percent }) => {
      const start = cursor
      cursor += percent
      return `${SEVERITY_CHART_COLOR[severity]} ${start}% ${cursor}%`
    })
    return `conic-gradient(${stops.join(', ')})`
  }, [])

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader breadcrumb={['Accueil', 'Urgences']} title="Urgences" subtitle="Centre de gestion des urgences." />

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <Card className="border-t-4 border-t-violet-400 p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50">
            <Siren className="h-5 w-5 text-violet-600" />
          </div>
          <p className="mt-3 text-xs font-medium text-gray-500">Patients en cours</p>
          <div className="mt-0.5 flex items-baseline justify-between">
            <p className="text-xl font-bold text-gray-900">42</p>
            <span className="text-xs font-medium text-emerald-600">↑ 12%</span>
          </div>
        </Card>
        <Card className="border-t-4 border-t-red-400 p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50">
            <UserPlus className="h-5 w-5 text-red-600" />
          </div>
          <p className="mt-3 text-xs font-medium text-gray-500">Nouveaux aujourd&apos;hui</p>
          <div className="mt-0.5 flex items-baseline justify-between">
            <p className="text-xl font-bold text-gray-900">68</p>
            <span className="text-xs font-medium text-emerald-600">↑ 18%</span>
          </div>
        </Card>
        <Card className="border-t-4 border-t-emerald-400 p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
            <LogOut className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="mt-3 text-xs font-medium text-gray-500">Sortis aujourd&apos;hui</p>
          <div className="mt-0.5 flex items-baseline justify-between">
            <p className="text-xl font-bold text-gray-900">26</p>
            <span className="text-xs font-medium text-emerald-600">↑ 8%</span>
          </div>
        </Card>
        <Card className="border-t-4 border-t-blue-400 p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
            <Hourglass className="h-5 w-5 text-blue-600" />
          </div>
          <p className="mt-3 text-xs font-medium text-gray-500">En attente de triage</p>
          <div className="mt-0.5 flex items-baseline justify-between">
            <p className="text-xl font-bold text-gray-900">7</p>
            <span className="text-xs font-medium text-emerald-600">↓ 2</span>
          </div>
        </Card>
        <Card className="border-t-4 border-t-violet-400 p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50">
            <Clock className="h-5 w-5 text-violet-600" />
          </div>
          <p className="mt-3 text-xs font-medium text-gray-500">Durée moyenne de passage</p>
          <div className="mt-0.5 flex items-baseline justify-between">
            <p className="text-xl font-bold text-gray-900">2h 35m</p>
            <span className="text-xs font-medium text-emerald-600">↓ 15m</span>
          </div>
        </Card>
        <Card className="border-t-4 border-t-red-400 p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50">
            <HeartPulse className="h-5 w-5 text-red-600" />
          </div>
          <p className="mt-3 text-xs font-medium text-gray-500">Patients critiques</p>
          <p className="mt-0.5 text-xl font-bold text-red-600">5</p>
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
                  {rows.map((e) => (
                    <tr key={e.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium text-gray-900">{e.arrivalTime}</td>
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
                        {e.age} ans · {e.gender === 'M' ? 'Homme' : 'Femme'}
                      </td>
                      <td className="px-6 py-3">
                        <p className="text-gray-900">{e.motive}</p>
                        <p className="text-xs text-gray-400">{e.detail}</p>
                      </td>
                      <td className="px-6 py-3">
                        <StatusBadge label={e.severity} tone={severityTone(e.severity)} />
                      </td>
                      <td className="px-6 py-3 text-gray-600">{e.zone}</td>
                      <td className="px-6 py-3 text-gray-600">{e.doctor}</td>
                      <td className="px-6 py-3">
                        <StatusBadge label={e.status} tone={emergencyStatusTone(e.status)} />
                      </td>
                      <td className="px-6 py-3 text-gray-600">{e.duration}</td>
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
            <span>Affichage de 1 à {rows.length} sur 42 patients</span>
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
            <h3 className="mb-4 text-sm font-semibold text-gray-900">Répartition par niveau de gravité</h3>
            <div className="flex items-center gap-5">
              <div
                className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full"
                style={{ background: severityDonutBackground }}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-xs font-bold text-gray-900">
                  42
                </div>
              </div>
              <div className="space-y-1.5">
                {SEVERITY_BREAKDOWN.map(({ severity, count, percent }) => (
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
                <span className="font-semibold text-gray-900">36 min</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-gray-600">
                  <Clock className="h-3.5 w-3.5 text-gray-400" />
                  Prise en charge
                </span>
                <span className="font-semibold text-gray-900">58 min</span>
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
              <QuickAction icon={ChartBar} label="Voir patients critiques (5)" />
            </div>
          </Card>

          <Card className="p-0">
            <div className="border-b border-gray-100 px-5 py-4">
              <h3 className="text-sm font-semibold text-gray-900">Alertes urgences</h3>
            </div>
            <div className="space-y-3 p-5">
              <Alert icon={TriangleAlert} tone="text-red-500" text="5 patients critiques nécessitent attention" />
              <Alert icon={Hourglass} tone="text-amber-500" text="2 patients en attente > 1 heure" />
              <Alert icon={BedSingle} tone="text-red-500" text="1 salle de réanimation pleine" />
              <Alert icon={FlaskConical} tone="text-blue-500" text="3 examens en attente de réalisation" />
            </div>
          </Card>
        </div>
      </div>

      {/* Panneaux du bas */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <Card className="p-0">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
            <h3 className="text-sm font-semibold text-gray-900">Patients en attente de triage (7)</h3>
          </div>
          <div className="space-y-3 p-5">
            {WAITING_TRIAGE.map((p) => (
              <div key={p.name} className="flex items-center gap-2 text-xs">
                <Users2 className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                <span className="min-w-0 flex-1 truncate text-gray-800">{p.name}</span>
                <span className="shrink-0 text-gray-400">{p.wait}</span>
                <StatusBadge label={p.severity} tone={severityTone(p.severity)} />
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-0">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
            <h3 className="text-sm font-semibold text-gray-900">Patients critiques (5)</h3>
          </div>
          <div className="space-y-3 p-5">
            {CRITICAL_PATIENTS.map((p) => (
              <div key={p.name} className="flex items-center gap-2 text-xs">
                <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" />
                <span className="min-w-0 flex-1 truncate text-gray-800">{p.name}</span>
                <span className="shrink-0 text-gray-400">{p.wait}</span>
                <span className="max-w-[40%] shrink truncate text-right text-gray-400">{p.motive}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-0">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
            <h3 className="text-sm font-semibold text-gray-900">Sorties aujourd&apos;hui (26)</h3>
          </div>
          <div className="space-y-3 p-5">
            {TODAY_DISCHARGES.map((d) => (
              <div key={d.name} className="flex items-center gap-2 text-xs">
                <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                <span className="flex-1 truncate text-gray-800">{d.name}</span>
                <span className="shrink-0 text-gray-400">{d.time}</span>
                <span className="shrink-0 text-emerald-600">{d.outcome}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-0">
          <div className="border-b border-gray-100 px-5 py-3.5">
            <h3 className="text-sm font-semibold text-gray-900">Flux des urgences (aujourd&apos;hui)</h3>
          </div>
          <div className="p-5">
            <div className="mb-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-500">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-blue-500" /> Entrées (68)
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-500" /> Sorties (26)
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> En cours (42)
              </span>
            </div>
            <LineChart
              categories={FLOW_CATEGORIES}
              series={[
                { label: 'Entrées', color: '#3b82f6', values: FLOW_ENTRIES },
                { label: 'Sorties', color: '#f59e0b', values: FLOW_EXITS },
                { label: 'En cours', color: '#10b981', values: FLOW_IN_PROGRESS }
              ]}
            />
          </div>
        </Card>
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

function Alert({ icon: Icon, tone, text }: { icon: typeof TriangleAlert; tone: string; text: string }): JSX.Element {
  return (
    <div className="flex items-start gap-2.5 text-xs">
      <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${tone}`} />
      <span className="text-gray-600">{text}</span>
    </div>
  )
}
