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
  ChevronRight
} from 'lucide-react'
import { Card } from '@renderer/components/Card'
import { EcgLine } from '@renderer/components/ui/EcgLine'
import { KpiCard } from '@renderer/components/ui/KpiCard'
import { PulseLoader } from '@renderer/components/ui/Feedback'
import { StatusBadge, type StatusTone } from '@renderer/components/StatusBadge'
import type { PageId } from '@renderer/features/shell/nav-types'
import type { ApiDashboardSummary } from '@shared/dashboard-types'
import { SortableGroup } from '@renderer/components/SortableGroup'

interface DashboardPageProps {
  userFirstName: string
  onNavigate: (page: PageId) => void
}

const TONE_ICON_BG: Record<StatusTone, string> = {
  success: 'bg-teal-50 text-teal-700',
  info: 'bg-blue-50 text-blue-600',
  warning: 'bg-amber-50 text-amber-600',
  risk: 'bg-orange-50 text-orange-600',
  danger: 'bg-red-50 text-red-600',
  opportunity: 'bg-accent-50 text-accent-600',
  neutral: 'bg-gray-50 text-gray-600',
  gold: 'bg-gold-100 text-gold-700'
}

const QUICK_ACCESS = [
  { icon: UserPlus, label: 'Nouveau patient', page: 'patients' as PageId },
  { icon: CalendarPlus, label: 'Rendez-vous', page: 'appointments' as PageId },
  { icon: FileText, label: 'Ordonnance', page: 'pharmacy' as PageId },
  { icon: CreditCard, label: 'Paiement', page: 'cashier' as PageId },
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

  const commandTiles = summary
    ? [
        {
          label: 'Urgences',
          page: 'emergencies' as PageId,
          value: `${summary.emergenciesWaiting} en attente`,
          icon: Siren,
          tone: (summary.emergenciesWaiting > 0 ? 'danger' : 'success') as StatusTone
        },
        {
          label: 'Bloc opératoire',
          page: 'operating-room' as PageId,
          value: `${summary.surgeriesToday} intervention${summary.surgeriesToday > 1 ? 's' : ''}`,
          icon: Scissors,
          tone: 'info' as StatusTone
        },
        {
          label: 'Hospitalisation',
          page: 'hospitalization' as PageId,
          value: `${summary.bedOccupancyPercent}% occupés`,
          icon: BedSingle,
          tone: 'warning' as StatusTone
        },
        {
          label: 'Laboratoire',
          page: 'laboratory' as PageId,
          value: `${summary.labResultsPending} en attente`,
          icon: FlaskConical,
          tone: (summary.labResultsPending > 0 ? 'info' : 'success') as StatusTone
        },
        {
          label: 'Pharmacie',
          page: 'pharmacy' as PageId,
          value: `${summary.pharmacyRuptures} rupture${summary.pharmacyRuptures > 1 ? 's' : ''}`,
          icon: Pill,
          tone: (summary.pharmacyRuptures > 0 ? 'danger' : 'success') as StatusTone
        }
      ]
    : []

  const priorityActions = summary
    ? [
        {
          icon: Siren,
          page: 'emergencies' as PageId,
          label: `${summary.criticalEmergencies} urgence${summary.criticalEmergencies > 1 ? 's' : ''} critique${summary.criticalEmergencies > 1 ? 's' : ''}`,
          description: 'Nécessitent une action immédiate',
          tone: 'danger' as StatusTone
        },
        {
          icon: ClipboardList,
          page: 'laboratory' as PageId,
          label: `${summary.pendingValidations} validations`,
          description: 'Résultats en attente (labo, imagerie, patho, endoscopie)',
          tone: 'info' as StatusTone
        },
        {
          icon: CreditCard,
          page: 'cashier' as PageId,
          label: `${summary.unpaidReceipts} paiements`,
          description: 'Recettes non encore encaissées',
          tone: 'gold' as StatusTone
        },
        {
          icon: TriangleAlert,
          page: 'stocks' as PageId,
          label: `${summary.stockRuptures} ruptures de stock`,
          description: 'Médicaments / consommables critiques',
          tone: 'warning' as StatusTone
        }
      ]
    : []

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <p className="text-xs font-medium text-gray-500 first-letter:uppercase">{today}</p>
        <h1 className="mt-1 text-[28px] leading-tight font-extrabold text-gray-900">Bonjour, Dr. {userFirstName}</h1>
        <p className="mt-1 text-sm text-gray-500">Voici la vue d&apos;ensemble de l&apos;hôpital aujourd&apos;hui.</p>
        <EcgLine className="mt-2.5 h-3.5 w-28 text-accent-500" />
      </div>

      {loading ? (
        <PulseLoader label="Chargement du tableau de bord…" className="py-24" />
      ) : error || !summary ? (
        <p className="py-12 text-center text-sm text-red-500">{error ?? 'Impossible de charger le tableau de bord.'}</p>
      ) : (
        <>
          <SortableGroup id="dashboard.grid1" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Patients aujourd'hui" value={summary.patientsToday} icon={Users} />
            <KpiCard label="Consultations" value={summary.consultationsToday} icon={Stethoscope} tone="info" />
            <KpiCard
              label="Lits occupés"
              value={`${summary.bedOccupancyPercent} %`}
              icon={BedDouble}
              tone={summary.bedOccupancyPercent >= 90 ? 'danger' : 'default'}
            />
            <KpiCard label="Recettes aujourd'hui" value={formatFcfa(summary.revenueTodayFcfa)} icon={Wallet} tone="gold" />
          </SortableGroup>

          <SortableGroup id="dashboard.grid2" className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Centre de commandement */}
            <Card className="p-0 lg:col-span-2">
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                <div>
                  <h2 className="text-[15px] font-bold text-gray-900">Vue d&apos;ensemble 360°</h2>
                  <p className="text-xs text-gray-500">Vue temps réel de l&apos;hôpital</p>
                </div>
                <span className="flex items-center gap-1.5 text-xs font-medium text-teal-700">
                  <span className="animate-pulse-dot h-1.5 w-1.5 rounded-full bg-teal-500" />
                  En direct
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3">
                {commandTiles.map((tile) => {
                  const Icon = tile.icon
                  return (
                    <button
                      key={tile.label}
                      onClick={() => onNavigate(tile.page)}
                      className="group rounded-xl border border-gray-200/80 bg-gray-50 p-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-accent-500/40 hover:bg-white hover:shadow-[0_6px_18px_rgba(10,30,18,0.08)]"
                    >
                      <div className="flex items-center justify-between">
                        <span className={`grid h-8 w-8 place-items-center rounded-lg ${TONE_ICON_BG[tile.tone]}`}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <StatusBadge label="" tone={tile.tone} variant="dot" />
                      </div>
                      <p className="mt-3 text-sm font-bold text-gray-900">{tile.value}</p>
                      <p className="flex items-center gap-1 text-xs text-gray-500">
                        {tile.label}
                        <ChevronRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                      </p>
                    </button>
                  )
                })}
              </div>
            </Card>

            {/* Actions prioritaires */}
            <Card className="p-0">
              <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                <h2 className="text-[15px] font-bold text-gray-900">Actions prioritaires</h2>
              </div>
              <div className="p-2">
                {priorityActions.map((action) => {
                  const Icon = action.icon
                  return (
                    <button
                      key={action.label}
                      onClick={() => onNavigate(action.page)}
                      className="group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors hover:bg-gray-50"
                    >
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${TONE_ICON_BG[action.tone]}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900">{action.label}</p>
                        <p className="truncate text-xs text-gray-500">{action.description}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 transition-colors group-hover:text-accent-600" />
                    </button>
                  )
                })}
              </div>
            </Card>
          </SortableGroup>
        </>
      )}

      {/* Accès rapides */}
      <Card className="p-0">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-[15px] font-bold text-gray-900">Accès rapides</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-5">
          {QUICK_ACCESS.map((action) => {
            const Icon = action.icon
            return (
              <button
                key={action.label}
                onClick={() => onNavigate(action.page)}
                className="group flex flex-col items-center gap-2.5 rounded-xl border border-gray-200/80 py-4 text-center transition-all hover:-translate-y-0.5 hover:border-accent-500/40 hover:shadow-[0_6px_18px_rgba(10,30,18,0.08)]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-50 text-accent-700 ring-1 ring-accent-500/15 transition-all group-hover:bg-gradient-to-b group-hover:from-accent-500 group-hover:to-accent-600 group-hover:text-white group-hover:shadow-[0_0_16px_rgba(52,204,107,0.4)]">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-semibold text-gray-700">{action.label}</span>
              </button>
            )
          })}
        </div>
      </Card>

      {/* Modules actifs */}
      <Card className="p-0">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-[15px] font-bold text-gray-900">Modules</h2>
        </div>
        <SortableGroup id="dashboard.grid3" className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3 lg:grid-cols-6">
          {MODULES.map((module) => (
            <button
              key={module.label}
              onClick={() => onNavigate(module.page)}
              className="flex items-center justify-between rounded-[10px] border border-gray-200/80 px-3.5 py-2.5 text-left text-sm font-medium text-gray-700 transition-all hover:-translate-y-0.5 hover:border-accent-500/40 hover:bg-accent-50/50"
            >
              {module.label}
              <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
            </button>
          ))}
        </SortableGroup>
      </Card>
    </div>
  )
}
