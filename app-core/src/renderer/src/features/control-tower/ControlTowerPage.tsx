import {
  Landmark,
  ShoppingCart,
  Archive,
  Users,
  UserSearch,
  AlertOctagon,
  ChevronRight,
  Download,
  RefreshCw
} from 'lucide-react'
import { Card } from '@renderer/components/Card'
import { StatusBadge, type StatusTone } from '@renderer/components/StatusBadge'
import { PageHeader } from '@renderer/components/PageHeader'

interface DomainRow {
  label: string
  status: string
  tone: StatusTone
  icon: typeof Landmark
  description: string
  metricLabel: string
  metricValue: string
  metricTone: 'success' | 'info' | 'warning' | 'danger'
}

const DOMAINS: DomainRow[] = [
  {
    label: 'Finance',
    status: 'Stable',
    tone: 'success',
    icon: Landmark,
    description: 'Flux de trésorerie positif et conforme aux prévisions.',
    metricLabel: 'Score de santé',
    metricValue: '94/100',
    metricTone: 'success'
  },
  {
    label: 'Ventes',
    status: 'Croissance',
    tone: 'info',
    icon: ShoppingCart,
    description: 'Performance commerciale supérieure de 15% par rapport au mois dernier.',
    metricLabel: 'Pipeline',
    metricValue: '+1.2M FCFA',
    metricTone: 'info'
  },
  {
    label: 'Stocks',
    status: 'Attention',
    tone: 'warning',
    icon: Archive,
    description: 'Rupture de stock prévue sur le Produit X dans les prochaines 48h.',
    metricLabel: 'Risque de rupture',
    metricValue: 'Imminent',
    metricTone: 'warning'
  },
  {
    label: 'Ressources humaines',
    status: 'Stable',
    tone: 'success',
    icon: Users,
    description: 'Taux de présence et climat social optimaux.',
    metricLabel: 'Engagement',
    metricValue: '8.2/10',
    metricTone: 'success'
  },
  {
    label: 'Clients',
    status: 'Risque',
    tone: 'risk',
    icon: UserSearch,
    description: "Baisse d'engagement détectée sur le segment Grossistes.",
    metricLabel: 'Taux de churn',
    metricValue: '4.2% (↑)',
    metricTone: 'warning'
  },
  {
    label: 'Opérations',
    status: 'Critique',
    tone: 'danger',
    icon: AlertOctagon,
    description: 'Un processus logistique majeur est actuellement bloqué.',
    metricLabel: 'Incident ID',
    metricValue: '#LOG-8821',
    metricTone: 'danger'
  }
]

const METRIC_TEXT_TONE: Record<DomainRow['metricTone'], string> = {
  success: 'text-green-600',
  info: 'text-blue-600',
  warning: 'text-orange-600',
  danger: 'text-red-600'
}

export function ControlTowerPage(): JSX.Element {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        breadcrumb={['Entreprise', 'Tour de contrôle']}
        title="Tour de contrôle"
        subtitle="Vue d'ensemble de la santé opérationnelle de l'organisation en temps réel."
        actions={
          <>
            <button className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <Download className="h-4 w-4" />
              Exporter le rapport
            </button>
            <button className="flex items-center gap-2 rounded-lg bg-accent-500 px-3.5 py-2 text-sm font-medium text-white hover:bg-accent-600">
              <RefreshCw className="h-4 w-4" />
              Actualiser
            </button>
          </>
        }
      />

      <Card className="p-0">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Domaines d&apos;activité</h2>
          <div className="flex items-center gap-4 text-xs font-medium text-gray-500">
            <StatusBadge label="2 Stables" tone="success" variant="dot" />
            <StatusBadge label="2 Alertes" tone="warning" variant="dot" />
            <StatusBadge label="1 Critique" tone="danger" variant="dot" />
          </div>
        </div>

        {DOMAINS.map((domain) => {
          const Icon = domain.icon
          return (
            <div
              key={domain.label}
              className="flex items-center gap-4 border-b border-gray-100 px-6 py-4 last:border-0 hover:bg-gray-50"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                <Icon className="h-5 w-5 text-gray-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900">{domain.label}</p>
                  <StatusBadge label={domain.status.toUpperCase()} tone={domain.tone} />
                </div>
                <p className="mt-0.5 text-sm text-gray-500">{domain.description}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] uppercase tracking-wide text-gray-400">{domain.metricLabel}</p>
                <p className={`text-sm font-semibold ${METRIC_TEXT_TONE[domain.metricTone]}`}>{domain.metricValue}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-300" />
            </div>
          )
        })}

        <button className="flex w-full items-center justify-center gap-1 py-3 text-sm font-medium text-accent-600 hover:text-accent-500">
          Afficher l&apos;historique complet des alertes
          <ChevronRight className="h-4 w-4" />
        </button>
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Efficacité globale</p>
          <p className="mt-2 text-3xl font-bold text-green-600">88.4%</p>
          <p className="mt-1 text-xs text-green-600">↗ +2.4% vs mois dernier</p>
        </Card>

        <Card>
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-500">Alertes par niveau</p>
          <div className="space-y-2.5">
            {[
              { label: 'Critique', value: 1, max: 6, color: 'bg-red-500' },
              { label: 'Attention', value: 2, max: 6, color: 'bg-amber-500' },
              { label: 'Normal', value: 3, max: 6, color: 'bg-green-500' }
            ].map((row) => (
              <div key={row.label} className="flex items-center gap-2 text-xs">
                <span className="w-16 text-gray-600">{row.label}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <div className={`h-full rounded-full ${row.color}`} style={{ width: `${(row.value / row.max) * 100}%` }} />
                </div>
                <span className="w-4 text-right font-medium text-gray-700">{row.value}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="bg-brand-900 text-white">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent-400">Pandora AI Insights</p>
          <p className="mt-2 text-sm leading-relaxed text-gray-200">
            « Basé sur les tendances actuelles, les stocks sur le segment B seront sous-optimaux
            d&apos;ici 5 jours. »
          </p>
          <button className="mt-4 w-full rounded-lg bg-white/10 py-2 text-sm font-medium text-white hover:bg-white/15">
            Générer un plan d&apos;action
          </button>
        </Card>
      </div>
    </div>
  )
}
