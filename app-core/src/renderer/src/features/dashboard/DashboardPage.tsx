import {
  TrendingUp,
  Wallet,
  Bell,
  Landmark,
  ShoppingCart,
  Archive,
  Users,
  UserSearch,
  AlertOctagon,
  ChevronRight,
  ArrowUpRight
} from 'lucide-react'
import { Card } from '@renderer/components/Card'
import { StatusBadge, type StatusTone } from '@renderer/components/StatusBadge'
import type { PageId } from '@renderer/features/shell/nav-types'

interface DashboardPageProps {
  userFirstName: string
  onNavigate: (page: PageId) => void
}

interface Domain {
  label: string
  status: string
  tone: StatusTone
  icon: typeof Landmark
  highlight?: boolean
}

const DOMAINS: Domain[] = [
  { label: 'Finance', status: 'Stable', tone: 'success', icon: Landmark },
  { label: 'Ventes', status: 'Croissance', tone: 'info', icon: ShoppingCart },
  { label: 'Stocks', status: 'Attention', tone: 'warning', icon: Archive },
  { label: 'RH', status: 'Stable', tone: 'success', icon: Users },
  { label: 'Clients', status: 'Risque', tone: 'risk', icon: UserSearch },
  { label: 'Opérations', status: 'Critique', tone: 'danger', icon: AlertOctagon, highlight: true }
]

const ALERTS = [
  {
    tone: 'danger' as StatusTone,
    title: 'Stock de Produit X proche du seuil critique',
    description: 'Rupture prévue dans 48h. Réapprovisionnement urgent requis.'
  },
  {
    tone: 'warning' as StatusTone,
    title: 'Client habituel Sodexim SARL inactif depuis 15 jours',
    description: "Dernière commande : 2.5M FCFA le 12/05. Risque d'attrition identifié."
  },
  {
    tone: 'opportunity' as StatusTone,
    title: 'Opportunité : Pic de demande détecté sur la région Nord',
    description: "Analyse IA : Augmentation de 12% des intentions d'achat locale."
  }
]

function HealthScoreRing({ score }: { score: number }): JSX.Element {
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="relative flex h-[136px] w-[136px] shrink-0 items-center justify-center">
      <svg width="136" height="136" viewBox="0 0 136 136" className="-rotate-90">
        <circle cx="68" cy="68" r={radius} fill="none" stroke="#E5E7EB" strokeWidth="12" />
        <circle
          cx="68"
          cy="68"
          r={radius}
          fill="none"
          stroke="#10B981"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold text-gray-900">
          {score}
          <span className="text-base font-medium text-gray-400">/100</span>
        </span>
        <span className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-green-600">
          <ArrowUpRight className="h-3.5 w-3.5" />
          +3 pts
        </span>
      </div>
    </div>
  )
}

export function DashboardPage({ userFirstName, onNavigate }: DashboardPageProps): JSX.Element {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Bienvenue, {userFirstName}</h1>
        <p className="mt-1 text-sm text-gray-500">Voici l&apos;état de votre entreprise aujourd&apos;hui.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Business Health Score */}
        <Card className="lg:col-span-2">
          <div className="flex items-center gap-6">
            <HealthScoreRing score={84} />
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900">Santé globale</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-500">
                Performance robuste : porté par la croissance des ventes, freiné par un stock de
                produit X en tension.
              </p>
              <div className="mt-4 flex gap-8 border-t border-gray-100 pt-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-400">Statut</p>
                  <p className="text-sm font-semibold text-green-600">Optimal</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-400">Tendance</p>
                  <p className="text-sm font-semibold text-gray-900">Haussière</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* KPI cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-1">
          <Card className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Chiffre d&apos;affaires</p>
            <div className="mt-1.5 flex items-end justify-between">
              <p className="text-xl font-bold text-gray-900">
                12.4M <span className="text-sm font-medium text-gray-400">FCFA</span>
              </p>
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Trésorerie</p>
            <div className="mt-1.5 flex items-end justify-between">
              <p className="text-xl font-bold text-gray-900">
                4.8M <span className="text-sm font-medium text-gray-400">FCFA</span>
              </p>
              <Wallet className="h-5 w-5 text-accent-500" />
            </div>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Alertes actives</p>
            <div className="mt-1.5 flex items-end justify-between">
              <p className="text-xl font-bold text-gray-900">07</p>
              <Bell className="h-5 w-5 text-orange-500" />
            </div>
          </Card>
        </div>
      </div>

      {/* Tour de contrôle */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Tour de contrôle</h2>
          <button
            onClick={() => onNavigate('control-tower')}
            className="flex items-center gap-1 text-sm font-medium text-accent-600 hover:text-accent-500"
          >
            Vue détaillée
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {DOMAINS.map((domain) => {
            const Icon = domain.icon
            return (
              <Card
                key={domain.label}
                className={
                  'p-4 ' + (domain.highlight ? 'border-red-200 bg-red-50/60' : '')
                }
              >
                <div className="flex items-center justify-between">
                  <Icon className="h-5 w-5 text-gray-600" />
                  <StatusBadge label="" tone={domain.tone} variant="dot" />
                </div>
                <p className="mt-3 text-sm font-semibold text-gray-900">{domain.label}</p>
                <p className={'text-xs font-medium ' + (domain.highlight ? 'text-red-600' : 'text-gray-500')}>
                  {domain.status}
                </p>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Centre d'alertes */}
      <Card className="p-0">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Centre d&apos;alertes</h2>
          <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-600">
            3 Priorités
          </span>
        </div>
        <div>
          {ALERTS.map((alert) => (
            <div key={alert.title} className="flex items-start gap-3 border-b border-gray-100 px-6 py-4 last:border-0">
              <StatusBadge label="" tone={alert.tone} variant="dot" />
              <div>
                <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                <p className="mt-0.5 text-xs text-gray-500">{alert.description}</p>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={() => onNavigate('alerts')}
          className="flex w-full items-center justify-center gap-1 border-t border-gray-100 py-3 text-sm font-medium text-accent-600 hover:text-accent-500"
        >
          Afficher l&apos;historique complet des alertes
          <ChevronRight className="h-4 w-4" />
        </button>
      </Card>
    </div>
  )
}
