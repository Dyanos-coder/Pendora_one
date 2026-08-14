import { useState } from 'react'
import { AlertOctagon, TriangleAlert, ClipboardCheck, TrendingUp, ShieldCheck } from 'lucide-react'
import { Card } from '@renderer/components/Card'
import { PageHeader } from '@renderer/components/PageHeader'

type Severity = 'CRITIQUE' | 'ÉLEVÉ' | 'PRÉVENTION' | 'OPPORTUNITÉ'
type Domain = 'Finance' | 'Ventes' | 'Stocks' | 'RH' | 'Clients' | 'Opérations'

interface Alert {
  severity: Severity
  domain: Domain
  time: string
  title: string
  description: string
  icon: typeof AlertOctagon
}

const SEVERITY_STYLES: Record<Severity, { border: string; badge: string; icon: string }> = {
  CRITIQUE: { border: 'border-l-red-500', badge: 'bg-red-100 text-red-700', icon: 'bg-red-50 text-red-600' },
  ÉLEVÉ: { border: 'border-l-orange-500', badge: 'bg-orange-100 text-orange-700', icon: 'bg-orange-50 text-orange-600' },
  PRÉVENTION: { border: 'border-l-amber-400', badge: 'bg-amber-100 text-amber-700', icon: 'bg-amber-50 text-amber-600' },
  OPPORTUNITÉ: { border: 'border-l-violet-500', badge: 'bg-violet-100 text-violet-700', icon: 'bg-violet-50 text-violet-600' }
}

const ALERTS: Alert[] = [
  {
    severity: 'CRITIQUE',
    domain: 'Stocks',
    time: "Aujourd'hui, 08:42",
    title: 'Rupture de stock imminente : Produit X',
    description:
      'Le stock actuel ne couvrira que les 24 prochaines heures. Analyse basée sur les prévisions de ventes de demain et le retard de livraison actuel.',
    icon: AlertOctagon
  },
  {
    severity: 'ÉLEVÉ',
    domain: 'Finance',
    time: "Aujourd'hui, 07:15",
    title: 'Retard de paiement fournisseur : Logistix SA',
    description: 'Facture #INV-9902 en retard de 3 jours, risque de pénalités applicables dès demain matin.',
    icon: TriangleAlert
  },
  {
    severity: 'PRÉVENTION',
    domain: 'Stocks',
    time: 'Hier, 18:30',
    title: 'Seuil de sécurité atteint : Produit Y',
    description: 'Le stock est descendu sous le seuil de sécurité défini (20 unités). Un réapprovisionnement automatique peut être déclenché.',
    icon: ClipboardCheck
  },
  {
    severity: 'OPPORTUNITÉ',
    domain: 'Ventes',
    time: 'Hier, 14:12',
    title: 'Pic de demande détecté : Région Nord',
    description: "Analyse IA : +25% d'intentions d'achat détectées sur ce secteur. Opportunité d'augmenter les budgets marketing locaux ou de rediriger les stocks.",
    icon: TrendingUp
  }
]

const DOMAINS: Domain[] = ['Finance', 'Ventes', 'Stocks', 'RH', 'Clients', 'Opérations']

export function AlertsPage(): JSX.Element {
  const [filter, setFilter] = useState<Domain | 'Tout'>('Tout')
  const filtered = filter === 'Tout' ? ALERTS : ALERTS.filter((a) => a.domain === filter)

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        breadcrumb={['Entreprise', "Centre d'alertes"]}
        title="Centre d'alertes"
        subtitle="Surveillez les points critiques de votre activité en temps réel. Notre IA priorise les actions pour maximiser votre efficacité opérationnelle."
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {(['Tout', ...DOMAINS] as const).map((item) => (
          <button
            key={item}
            onClick={() => setFilter(item)}
            className={
              'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ' +
              (filter === item
                ? 'bg-brand-900 text-white'
                : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50')
            }
          >
            {item}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filtered.map((alert) => {
          const styles = SEVERITY_STYLES[alert.severity]
          const Icon = alert.icon
          return (
            <Card key={alert.title} className={`flex gap-4 border-l-4 p-5 ${styles.border}`}>
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${styles.icon}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className={`rounded px-1.5 py-0.5 font-semibold ${styles.badge}`}>{alert.severity}</span>
                  <span className="text-gray-400">{alert.time}</span>
                </div>
                <h3 className="mt-1.5 text-base font-semibold text-gray-900">{alert.title}</h3>
                <p className="mt-1 text-sm text-gray-500">{alert.description}</p>
                <div className="mt-3 flex items-center gap-4">
                  <button className="rounded-lg bg-accent-500 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-accent-600">
                    Voir la recommandation
                  </button>
                  <button className="text-sm font-medium text-gray-500 hover:text-gray-700">Ignorer</button>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <div className="mt-8 flex flex-col items-center gap-2 text-center text-xs text-gray-400">
        <ShieldCheck className="h-6 w-6 text-gray-300" />
        Votre entreprise est protégée par Pandora One Intelligence
      </div>
    </div>
  )
}
