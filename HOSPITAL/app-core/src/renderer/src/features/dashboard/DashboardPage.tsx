import { useEffect, useState } from 'react'
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
  UserPlus,
  CalendarPlus,
  FileText,
  CreditCard,
  ClipboardList,
  Send,
  Loader2
} from 'lucide-react'
import { Card } from '@renderer/components/Card'
import { StatusBadge, type StatusTone } from '@renderer/components/StatusBadge'
import type { PageId } from '@renderer/features/shell/nav-types'
import type { ApiDashboardSummary } from '@shared/dashboard-types'

interface DashboardPageProps {
  userFirstName: string
  onNavigate: (page: PageId) => void
}

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

function formatFcfa(amount: number): string {
  return `${new Intl.NumberFormat('fr-FR').format(amount)} FCFA`
}

export function DashboardPage({ userFirstName, onNavigate }: DashboardPageProps): JSX.Element {
  const [summary, setSummary] = useState<ApiDashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    window.api.dashboard.summary().then((result) => {
      if (cancelled) return
      if (result.ok) setSummary(result.data.summary)
      else setError(result.error)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const kpis = summary
    ? [
        {
          label: "Patients aujourd'hui",
          value: String(summary.patientsToday),
          icon: Users,
          iconBg: 'bg-violet-50',
          iconColor: 'text-violet-600',
          accentBorder: 'border-t-violet-400'
        },
        {
          label: 'Consultations',
          value: String(summary.consultationsToday),
          icon: Stethoscope,
          iconBg: 'bg-emerald-50',
          iconColor: 'text-emerald-600',
          accentBorder: 'border-t-emerald-400'
        },
        {
          label: "Recettes aujourd'hui",
          value: formatFcfa(summary.revenueTodayFcfa),
          icon: Wallet,
          iconBg: 'bg-blue-50',
          iconColor: 'text-blue-600',
          accentBorder: 'border-t-blue-400'
        },
        {
          label: 'Lits occupés',
          value: `${summary.bedOccupancyPercent}%`,
          icon: BedDouble,
          iconBg: 'bg-amber-50',
          iconColor: 'text-amber-600',
          accentBorder: 'border-t-amber-400'
        }
      ]
    : []

  const commandTiles = summary
    ? [
        { label: 'Urgences', value: `${summary.emergenciesWaiting} en attente`, icon: Siren, tone: (summary.emergenciesWaiting > 0 ? 'danger' : 'success') as StatusTone },
        { label: 'Bloc opératoire', value: `${summary.surgeriesToday} intervention${summary.surgeriesToday > 1 ? 's' : ''}`, icon: Scissors, tone: 'info' as StatusTone },
        { label: 'Hospitalisation', value: `${summary.bedOccupancyPercent}% occupés`, icon: BedSingle, tone: 'warning' as StatusTone },
        { label: 'Laboratoire', value: `${summary.labResultsPending} en attente`, icon: FlaskConical, tone: (summary.labResultsPending > 0 ? 'info' : 'success') as StatusTone },
        { label: 'Pharmacie', value: `${summary.pharmacyRuptures} rupture${summary.pharmacyRuptures > 1 ? 's' : ''}`, icon: Pill, tone: (summary.pharmacyRuptures > 0 ? 'danger' : 'success') as StatusTone }
      ]
    : []

  const priorityActions = summary
    ? [
        { icon: Siren, label: `${summary.criticalEmergencies} urgence${summary.criticalEmergencies > 1 ? 's' : ''} critique${summary.criticalEmergencies > 1 ? 's' : ''}`, description: 'Nécessitent une action immédiate', tone: 'danger' as StatusTone },
        { icon: ClipboardList, label: `${summary.pendingValidations} validations`, description: 'Résultats en attente (labo, imagerie, patho, endoscopie)', tone: 'info' as StatusTone },
        { icon: CreditCard, label: `${summary.unpaidReceipts} paiements`, description: 'Recettes non encore encaissées', tone: 'success' as StatusTone },
        { icon: TriangleAlert, label: `${summary.stockRuptures} ruptures de stock`, description: 'Médicaments / consommables critiques', tone: 'warning' as StatusTone }
      ]
    : []

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Bonjour, Dr. {userFirstName}</h1>
        <p className="mt-1 text-sm text-gray-500">Voici la vue d&apos;ensemble de l&apos;hôpital aujourd&apos;hui.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-24 text-sm text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement du tableau de bord…
        </div>
      ) : error || !summary ? (
        <p className="py-12 text-center text-sm text-red-500">{error ?? 'Impossible de charger le tableau de bord.'}</p>
      ) : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {kpis.map((kpi) => {
              const Icon = kpi.icon
              return (
                <Card key={kpi.label} className={`border-t-4 p-4 ${kpi.accentBorder}`}>
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${kpi.iconBg}`}>
                    <Icon className={`h-5 w-5 ${kpi.iconColor}`} />
                  </div>
                  <p className="mt-3 text-xs font-medium text-gray-500">{kpi.label}</p>
                  <p className="mt-0.5 text-xl font-bold text-gray-900">{kpi.value}</p>
                </Card>
              )
            })}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Centre de commandement */}
            <Card className="p-0 lg:col-span-2">
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Vue d&apos;ensemble 360°</h2>
                  <p className="text-xs text-gray-500">Vue temps réel de l&apos;hôpital</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 p-6 sm:grid-cols-3">
                {commandTiles.map((tile) => {
                  const Icon = tile.icon
                  return (
                    <div key={tile.label} className="rounded-lg border border-gray-100 bg-gray-50 p-3 transition-colors hover:bg-gray-100">
                      <div className="flex items-center justify-between">
                        <Icon className="h-4 w-4 text-gray-400" />
                        <StatusBadge label="" tone={tile.tone} variant="dot" />
                      </div>
                      <p className="mt-2 text-sm font-semibold text-gray-900">{tile.value}</p>
                      <p className="text-xs text-gray-500">{tile.label}</p>
                    </div>
                  )
                })}
              </div>
            </Card>

            {/* Actions prioritaires */}
            <Card className="p-0">
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                <h2 className="text-sm font-semibold text-gray-900">Actions prioritaires</h2>
              </div>
              <div>
                {priorityActions.map((action) => {
                  const Icon = action.icon
                  return (
                    <div key={action.label} className="flex items-center gap-3 border-b border-gray-100 px-6 py-3.5 last:border-0">
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
        </>
      )}

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
