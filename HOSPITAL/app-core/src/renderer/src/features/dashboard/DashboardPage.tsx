import {
  Users,
  Stethoscope,
  Wallet,
  BedDouble,
  TriangleAlert,
  Siren,
  Scissors,
  BedSingle,
  FlaskConical,
  Pill,
  ChevronRight,
  UserPlus,
  CalendarPlus,
  FileText,
  CreditCard,
  ClipboardList,
  Send
} from 'lucide-react'
import { Card } from '@renderer/components/Card'
import { StatusBadge, type StatusTone } from '@renderer/components/StatusBadge'
import type { PageId } from '@renderer/features/shell/nav-types'

interface DashboardPageProps {
  userFirstName: string
  onNavigate: (page: PageId) => void
}

interface Kpi {
  label: string
  value: string
  trend: string
  icon: typeof Users
  iconBg: string
  iconColor: string
  accentBorder: string
}

const KPIS: Kpi[] = [
  {
    label: "Patients aujourd'hui",
    value: '256',
    trend: '↑ 18% vs hier',
    icon: Users,
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-600',
    accentBorder: 'border-t-violet-400'
  },
  {
    label: 'Consultations',
    value: '142',
    trend: '↑ 12% vs hier',
    icon: Stethoscope,
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    accentBorder: 'border-t-emerald-400'
  },
  {
    label: "Chiffre d'affaires (FCFA)",
    value: '28 450 000',
    trend: '↑ 15,4% vs mois dernier',
    icon: Wallet,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    accentBorder: 'border-t-blue-400'
  },
  {
    label: 'Lits occupés',
    value: '78%',
    trend: '↑ 5% vs hier',
    icon: BedDouble,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    accentBorder: 'border-t-amber-400'
  }
]

interface CommandTile {
  label: string
  value: string
  icon: typeof Siren
  tone: StatusTone
}

const COMMAND_TILES: CommandTile[] = [
  { label: 'Urgences', value: '18 en attente', icon: Siren, tone: 'danger' },
  { label: 'Bloc opératoire', value: '3 interventions', icon: Scissors, tone: 'info' },
  { label: 'Hospitalisation', value: '78% occupés', icon: BedSingle, tone: 'warning' },
  { label: 'Laboratoire', value: '15 résultats', icon: FlaskConical, tone: 'success' },
  { label: 'Pharmacie', value: '2 ruptures', icon: Pill, tone: 'danger' }
]

const PRIORITY_ACTIONS = [
  { icon: Siren, label: '3 urgences', description: 'Nécessitent une action immédiate', tone: 'danger' as StatusTone },
  { icon: ClipboardList, label: '12 validations', description: 'Résultats / documents en attente', tone: 'info' as StatusTone },
  { icon: CreditCard, label: '5 paiements', description: 'À encaisser aujourd’hui', tone: 'success' as StatusTone },
  { icon: TriangleAlert, label: '2 ruptures de stock', description: 'Médicaments / consommables critiques', tone: 'warning' as StatusTone }
]

const TONE_ICON_BG: Record<StatusTone, string> = {
  success: 'bg-emerald-50 text-emerald-600',
  info: 'bg-blue-50 text-blue-600',
  warning: 'bg-amber-50 text-amber-600',
  risk: 'bg-orange-50 text-orange-600',
  danger: 'bg-red-50 text-red-600',
  opportunity: 'bg-violet-50 text-violet-600',
  neutral: 'bg-gray-50 text-gray-600'
}

const QUICK_ACCESS = [
  { icon: UserPlus, label: 'Nouveau patient', page: 'patients' as PageId },
  { icon: CalendarPlus, label: 'Rendez-vous', page: 'appointments' as PageId },
  { icon: FileText, label: 'Ordonnance', page: 'pharmacy' as PageId },
  { icon: CreditCard, label: 'Paiement', page: 'finance' as PageId },
  { icon: Send, label: "Demande d'examen", page: 'laboratory' as PageId }
]

const MODULES = [
  { label: 'Cardiologie', page: 'cardiology' as PageId },
  { label: 'Laboratoire', page: 'laboratory' as PageId },
  { label: 'Imagerie', page: 'imaging' as PageId },
  { label: 'Pharmacie', page: 'pharmacy' as PageId },
  { label: 'Bloc opératoire', page: 'operating-room' as PageId },
  { label: 'Urgences', page: 'emergencies' as PageId }
]

export function DashboardPage({ userFirstName, onNavigate }: DashboardPageProps): JSX.Element {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Bonjour, Dr. {userFirstName}</h1>
        <p className="mt-1 text-sm text-gray-500">Voici la vue d&apos;ensemble de l&apos;hôpital aujourd&apos;hui.</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPIS.map((kpi) => {
          const Icon = kpi.icon
          return (
            <Card key={kpi.label} className={`border-t-4 p-4 ${kpi.accentBorder}`}>
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${kpi.iconBg}`}>
                <Icon className={`h-5 w-5 ${kpi.iconColor}`} />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">{kpi.label}</p>
              <div className="mt-0.5 flex items-baseline justify-between">
                <p className="text-xl font-bold text-gray-900">{kpi.value}</p>
                <span className="text-xs font-medium text-emerald-600">{kpi.trend}</span>
              </div>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Centre de commandement */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-brand-900 via-brand-900 to-brand-800 p-0 text-white shadow-sm transition-shadow duration-200 hover:shadow-lg lg:col-span-2">
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              backgroundImage: 'radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)',
              backgroundSize: '18px 18px'
            }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(217,70,239,0.25),transparent_50%)]" />

          <div className="relative flex items-center justify-between border-b border-white/10 px-6 py-4">
            <div>
              <h2 className="text-sm font-semibold text-white">Centre de commandement 360°</h2>
              <p className="text-xs text-gray-300">Vue temps réel de l&apos;hôpital</p>
            </div>
            <button
              onClick={() => onNavigate('command-center')}
              className="flex items-center gap-1 text-sm font-medium text-accent-400 hover:text-accent-300"
            >
              Ouvrir
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="relative grid grid-cols-2 gap-3 p-6 sm:grid-cols-3">
            {COMMAND_TILES.map((tile) => {
              const Icon = tile.icon
              return (
                <div
                  key={tile.label}
                  className="rounded-lg border border-white/10 bg-white/5 p-3 backdrop-blur-sm transition-colors hover:bg-white/10"
                >
                  <div className="flex items-center justify-between">
                    <Icon className="h-4 w-4 text-gray-300" />
                    <StatusBadge label="" tone={tile.tone} variant="dot" />
                  </div>
                  <p className="mt-2 text-sm font-semibold text-white">{tile.value}</p>
                  <p className="text-xs text-gray-400">{tile.label}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Actions prioritaires */}
        <Card className="p-0">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <h2 className="text-sm font-semibold text-gray-900">Actions prioritaires</h2>
          </div>
          <div>
            {PRIORITY_ACTIONS.map((action) => {
              const Icon = action.icon
              return (
                <div
                  key={action.label}
                  className="flex items-center gap-3 border-b border-gray-100 px-6 py-3.5 last:border-0"
                >
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${TONE_ICON_BG[action.tone]}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">{action.label}</p>
                    <p className="truncate text-xs text-gray-500">{action.description}</p>
                  </div>
                  <StatusBadge label="" tone={action.tone} variant="dot" />
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      {/* Accès rapides */}
      <Card className="p-0">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Accès rapides</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 p-6 sm:grid-cols-5">
          {QUICK_ACCESS.map((action) => {
            const Icon = action.icon
            return (
              <button
                key={action.label}
                onClick={() => onNavigate(action.page)}
                className="group flex flex-col items-center gap-2 rounded-xl border border-gray-100 py-4 text-center transition-all hover:-translate-y-0.5 hover:border-transparent hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-50 text-accent-600 transition-colors group-hover:bg-gradient-to-br group-hover:from-fuchsia-500 group-hover:to-accent-500 group-hover:text-white">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium text-gray-700">{action.label}</span>
              </button>
            )
          })}
        </div>
      </Card>

      {/* Modules actifs */}
      <Card className="p-0">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Modules</h2>
          <span className="text-xs text-gray-400">Plus de modules dans la spécification complète</span>
        </div>
        <div className="grid grid-cols-2 gap-3 p-6 sm:grid-cols-3 lg:grid-cols-6">
          {MODULES.map((module) => (
            <button
              key={module.label}
              onClick={() => onNavigate(module.page)}
              className="flex items-center justify-between rounded-lg border border-gray-100 px-3.5 py-2.5 text-left text-sm font-medium text-gray-700 transition-all hover:-translate-y-0.5 hover:border-accent-200 hover:bg-accent-50/40 hover:shadow-sm"
            >
              {module.label}
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </button>
          ))}
        </div>
      </Card>
    </div>
  )
}
