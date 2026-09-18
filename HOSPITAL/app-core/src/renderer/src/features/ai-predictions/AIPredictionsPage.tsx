import { useEffect, useMemo, useState } from 'react'
import { BrainCircuit, TriangleAlert, Boxes, Wallet, Sparkles, LayoutDashboard, MessageCircle, Loader2 } from 'lucide-react'
import { Card } from '@renderer/components/Card'
import { PageHeader } from '@renderer/components/PageHeader'
import { StatusBadge, type StatusTone } from '@renderer/components/StatusBadge'
import type { ApiAlertCategory, ApiCalculatedAlert } from '@shared/ai-types'
import { AiChatPanel } from './AiChatPanel'

const FILTERS: { id: ApiAlertCategory | 'Toutes'; label: string }[] = [
  { id: 'Toutes', label: 'Toutes' },
  { id: 'Stock', label: 'Stock' },
  { id: 'Financier', label: 'Financier' }
]

const CATEGORY_ICON_BG: Record<ApiAlertCategory, string> = {
  Stock: 'bg-amber-50 text-amber-600',
  Financier: 'bg-emerald-50 text-emerald-600'
}

function severityTone(severity: ApiCalculatedAlert['severity']): StatusTone {
  if (severity === 'Critique') return 'danger'
  if (severity === 'Attention') return 'warning'
  return 'info'
}

type ViewMode = 'dashboard' | 'chat'

export function AIPredictionsPage(): JSX.Element {
  const [view, setView] = useState<ViewMode>('dashboard')
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('Toutes')
  const [alerts, setAlerts] = useState<ApiCalculatedAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    window.api.ai.alerts().then((result) => {
      if (cancelled) return
      if (result.ok) setAlerts(result.data.alerts)
      else setError(result.error)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const rows = filter === 'Toutes' ? alerts : alerts.filter((a) => a.category === filter)
  const critical = useMemo(() => alerts.filter((a) => a.severity === 'Critique').length, [alerts])
  const stockCount = useMemo(() => alerts.filter((a) => a.category === 'Stock').length, [alerts])
  const financeCount = useMemo(() => alerts.filter((a) => a.category === 'Financier').length, [alerts])

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        breadcrumb={['Accueil', 'IA & Prédictions']}
        title="IA & Prédictions"
        subtitle="Alertes calculées en temps réel et assistant conversationnel sur les données de l'établissement."
        actions={
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1">
            <button
              onClick={() => setView('dashboard')}
              className={
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ' +
                (view === 'dashboard' ? 'bg-accent-50 text-accent-700' : 'text-gray-500 hover:text-gray-800')
              }
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              Tableau de bord
            </button>
            <button
              onClick={() => setView('chat')}
              className={
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ' +
                (view === 'chat' ? 'bg-accent-50 text-accent-700' : 'text-gray-500 hover:text-gray-800')
              }
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Chat IA
            </button>
          </div>
        }
      />

      {view === 'chat' ? (
        <AiChatPanel />
      ) : loading ? (
        <div className="flex items-center justify-center gap-2 py-24 text-sm text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement des alertes…
        </div>
      ) : error ? (
        <p className="py-12 text-center text-sm text-red-500">{error}</p>
      ) : (
        <>
          <div className="flex items-start gap-2.5 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-xs text-blue-800">
            <BrainCircuit className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
            Ces alertes sont calculées à partir des données réelles de l&apos;établissement (stocks,
            factures) — il ne s&apos;agit pas de prédictions issues d&apos;un modèle de machine
            learning entraîné. Pour une prévision, utilisez le Chat IA en le précisant : il vous dira
            honnêtement s&apos;il peut répondre avec les données disponibles.
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-t-4 border-t-violet-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50">
                <BrainCircuit className="h-5 w-5 text-violet-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Alertes actives</p>
              <p className="text-xl font-bold text-gray-900">{alerts.length}</p>
            </Card>
            <Card className="border-t-4 border-t-red-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50">
                <TriangleAlert className="h-5 w-5 text-red-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Alertes critiques</p>
              <p className="text-xl font-bold text-red-600">{critical}</p>
            </Card>
            <Card className="border-t-4 border-t-amber-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50">
                <Boxes className="h-5 w-5 text-amber-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Alertes stock</p>
              <p className="text-xl font-bold text-gray-900">{stockCount}</p>
            </Card>
            <Card className="border-t-4 border-t-emerald-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
                <Wallet className="h-5 w-5 text-emerald-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Alertes financières</p>
              <p className="text-xl font-bold text-gray-900">{financeCount}</p>
            </Card>
          </div>

          <Card className="p-0">
            <div className="flex flex-wrap items-center gap-1 border-b border-gray-100 px-4 pt-2">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={
                    'rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ' +
                    (filter === f.id ? 'border-accent-500 text-accent-700' : 'border-transparent text-gray-500 hover:text-gray-800')
                  }
                >
                  {f.label}
                </button>
              ))}
            </div>
            {rows.length === 0 ? (
              <p className="px-6 py-12 text-center text-sm text-gray-400">Aucune alerte pour le moment.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {rows.map((a) => (
                  <div key={a.id} className="p-5">
                    <div className="flex items-start gap-3">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${CATEGORY_ICON_BG[a.category]}`}>
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900">{a.title}</p>
                          <StatusBadge label={a.severity} tone={severityTone(a.severity)} />
                        </div>
                        <p className="mt-1 text-xs text-gray-600">{a.detail}</p>
                        <p className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-700">
                          <span className="font-medium text-gray-900">Recommandation : </span>
                          {a.recommendedAction}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
