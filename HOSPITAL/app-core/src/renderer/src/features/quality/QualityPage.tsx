import { useEffect, useMemo, useState } from 'react'
import { ShieldCheck, Gauge, CalendarClock, TriangleAlert, Search, Award, Loader2, Plus, Pencil, Trash2 } from 'lucide-react'
import { Card } from '@renderer/components/Card'
import { PageHeader } from '@renderer/components/PageHeader'
import { Button } from '@renderer/components/Button'
import { StatusBadge } from '@renderer/components/StatusBadge'
import { ConfirmDialog } from '@renderer/components/ConfirmDialog'
import type { ApiQualityAction, ApiQualityCertification, ApiQualityIndicator, ApiQualityIndicatorStatus } from '@shared/quality-types'
import { indicatorStatusTone, CATEGORY_CHART_COLOR } from './status'
import type { IndicatorStatus, QualityIndicator } from './types'
import { QualityIndicatorFormModal } from './QualityIndicatorFormModal'

const STATUS_LABEL: Record<ApiQualityIndicatorStatus, IndicatorStatus> = {
  CONFORME: 'Conforme',
  A_SURVEILLER: 'À surveiller',
  NON_CONFORME: 'Non conforme'
}

const RENEWAL_WINDOW_DAYS = 90

function toIndicator(i: ApiQualityIndicator): QualityIndicator {
  return {
    id: i.id,
    name: i.name,
    category: i.category,
    currentValue: i.currentValue,
    target: i.target,
    status: STATUS_LABEL[i.status],
    lastMeasured: new Date(i.lastMeasuredAt).toLocaleDateString('fr-FR')
  }
}

function toCertification(c: ApiQualityCertification): { name: string; issuer: string; expiry: string; soon: boolean } {
  const daysLeft = Math.round((new Date(c.expiryDate).getTime() - Date.now()) / 86400000)
  return {
    name: c.name,
    issuer: c.issuer,
    expiry: new Date(c.expiryDate).toLocaleDateString('fr-FR'),
    soon: daysLeft <= RENEWAL_WINDOW_DAYS
  }
}

export function QualityPage(): JSX.Element {
  const [indicators, setIndicators] = useState<QualityIndicator[]>([])
  const [rawIndicators, setRawIndicators] = useState<ApiQualityIndicator[]>([])
  const [rawCertifications, setRawCertifications] = useState<ApiQualityCertification[]>([])
  const [actions, setActions] = useState<ApiQualityAction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingIndicator, setEditingIndicator] = useState<ApiQualityIndicator | null>(null)
  const [deletingIndicator, setDeletingIndicator] = useState<QualityIndicator | null>(null)
  const [deletingCertification, setDeletingCertification] = useState<ApiQualityCertification | null>(null)
  const [deletingAction, setDeletingAction] = useState<ApiQualityAction | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([window.api.quality.indicators(), window.api.quality.certifications(), window.api.quality.actions()]).then(
      ([indicatorsResult, certificationsResult, actionsResult]) => {
        if (cancelled) return
        if (indicatorsResult.ok) {
          setRawIndicators(indicatorsResult.data.indicators)
          setIndicators(indicatorsResult.data.indicators.map(toIndicator))
        } else setError(indicatorsResult.error)
        if (certificationsResult.ok) setRawCertifications(certificationsResult.data.certifications)
        if (actionsResult.ok) setActions(actionsResult.data.actions)
        setLoading(false)
      }
    )
    return () => {
      cancelled = true
    }
  }, [])

  const certifications = useMemo(() => rawCertifications.map(toCertification), [rawCertifications])

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return indicators
    return indicators.filter((i) => `${i.name} ${i.category}`.toLowerCase().includes(term))
  }, [search, indicators])

  const categoryBreakdown = useMemo(() => {
    const counts = new Map<string, number>()
    for (const i of indicators) counts.set(i.category, (counts.get(i.category) ?? 0) + 1)
    const total = indicators.length
    return Array.from(counts.entries())
      .map(([label, count]) => ({ label, percent: total === 0 ? 0 : Math.round((count / total) * 100) }))
      .sort((a, b) => b.percent - a.percent)
  }, [indicators])

  const donutBackground = useMemo(() => {
    let cursor = 0
    const stops = categoryBreakdown.map(({ label, percent }) => {
      const start = cursor
      cursor += percent
      return `${CATEGORY_CHART_COLOR[label] ?? '#9ca3af'} ${start}% ${cursor}%`
    })
    return `conic-gradient(${stops.join(', ')})`
  }, [categoryBreakdown])

  const conformCount = useMemo(() => indicators.filter((i) => i.status === 'Conforme').length, [indicators])
  const watchList = useMemo(() => indicators.filter((i) => i.status !== 'Conforme'), [indicators])
  const nonConformCount = useMemo(() => indicators.filter((i) => i.status === 'Non conforme').length, [indicators])
  const conformRate = indicators.length === 0 ? null : Math.round((conformCount / indicators.length) * 100)
  const soonRenewals = useMemo(() => certifications.filter((c) => c.soon).length, [certifications])

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        breadcrumb={['Accueil', 'Qualité & Accréditation']}
        title="Qualité & Accréditation"
        subtitle="Suivi des indicateurs qualité, des certifications et des actions d'amélioration."
        actions={
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4" />
            Nouvel indicateur
          </Button>
        }
      />

      {showCreateModal && (
        <QualityIndicatorFormModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(indicator) => {
            setRawIndicators((prev) => [...prev, indicator])
            setIndicators((prev) => [...prev, toIndicator(indicator)])
            setShowCreateModal(false)
          }}
        />
      )}

      {editingIndicator && (
        <QualityIndicatorFormModal
          editing={editingIndicator}
          onClose={() => setEditingIndicator(null)}
          onCreated={(indicator) => {
            setRawIndicators((prev) => prev.map((i) => (i.id === indicator.id ? indicator : i)))
            setIndicators((prev) => prev.map((i) => (i.id === indicator.id ? toIndicator(indicator) : i)))
            setEditingIndicator(null)
          }}
        />
      )}

      {deletingIndicator && (
        <ConfirmDialog
          title="Supprimer l'indicateur"
          message={`Voulez-vous vraiment supprimer l'indicateur « ${deletingIndicator.name} » ?`}
          onCancel={() => setDeletingIndicator(null)}
          onConfirm={() => window.api.quality.deleteIndicator(deletingIndicator.id)}
          onConfirmed={() => {
            setRawIndicators((prev) => prev.filter((i) => i.id !== deletingIndicator.id))
            setIndicators((prev) => prev.filter((i) => i.id !== deletingIndicator.id))
            setDeletingIndicator(null)
          }}
        />
      )}

      {deletingCertification && (
        <ConfirmDialog
          title="Supprimer la certification"
          message={`Voulez-vous vraiment supprimer la certification « ${deletingCertification.name} » ?`}
          onCancel={() => setDeletingCertification(null)}
          onConfirm={() => window.api.quality.deleteCertification(deletingCertification.id)}
          onConfirmed={() => {
            setRawCertifications((prev) => prev.filter((c) => c.id !== deletingCertification.id))
            setDeletingCertification(null)
          }}
        />
      )}

      {deletingAction && (
        <ConfirmDialog
          title="Supprimer l'action qualité"
          message={`Voulez-vous vraiment supprimer l'action « ${deletingAction.label} » ?`}
          onCancel={() => setDeletingAction(null)}
          onConfirm={() => window.api.quality.deleteAction(deletingAction.id)}
          onConfirmed={() => {
            setActions((prev) => prev.filter((a) => a.id !== deletingAction.id))
            setDeletingAction(null)
          }}
        />
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-24 text-sm text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement des données qualité…
        </div>
      ) : error ? (
        <p className="py-12 text-center text-sm text-red-500">{error}</p>
      ) : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Card className="border-t-4 border-t-violet-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50">
                <Gauge className="h-5 w-5 text-violet-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Indicateurs suivis</p>
              <p className="text-xl font-bold text-gray-900">{indicators.length}</p>
            </Card>
            <Card className="border-t-4 border-t-emerald-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Taux de conformité global</p>
              <p className="text-xl font-bold text-gray-900">{conformRate === null ? '—' : `${conformRate}%`}</p>
            </Card>
            <Card className="border-t-4 border-t-blue-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                <Award className="h-5 w-5 text-blue-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Certifications actives</p>
              <p className="text-xl font-bold text-gray-900">{certifications.length}</p>
            </Card>
            <Card className="border-t-4 border-t-amber-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50">
                <CalendarClock className="h-5 w-5 text-amber-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Certifications à renouveler (90j)</p>
              <p className="text-xl font-bold text-gray-900">{soonRenewals}</p>
            </Card>
            <Card className="border-t-4 border-t-red-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50">
                <TriangleAlert className="h-5 w-5 text-red-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Non-conformités ouvertes</p>
              <p className="text-xl font-bold text-red-600">{nonConformCount}</p>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="p-0 lg:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-6 py-4">
                <h3 className="text-sm font-semibold text-gray-900">Indicateurs qualité</h3>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Rechercher un indicateur..."
                    className="w-64 rounded-lg border border-gray-200 py-1.5 pl-8 pr-3 text-xs text-gray-700 placeholder:text-gray-400 focus:border-accent-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                      <th className="px-6 py-2.5 font-medium">Indicateur</th>
                      <th className="px-6 py-2.5 font-medium">Catégorie</th>
                      <th className="px-6 py-2.5 font-medium">Valeur</th>
                      <th className="px-6 py-2.5 font-medium">Cible</th>
                      <th className="px-6 py-2.5 font-medium">Statut</th>
                      <th className="px-6 py-2.5 font-medium">Mesuré le</th>
                      <th className="px-6 py-2.5 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((i) => (
                      <tr key={i.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                        <td className="px-6 py-3 font-medium text-gray-900">{i.name}</td>
                        <td className="px-6 py-3 text-gray-600">{i.category}</td>
                        <td className="px-6 py-3 text-gray-600">{i.currentValue}</td>
                        <td className="px-6 py-3 text-gray-600">{i.target}</td>
                        <td className="px-6 py-3">
                          <StatusBadge label={i.status} tone={indicatorStatusTone(i.status)} />
                        </td>
                        <td className="px-6 py-3 text-gray-600">{i.lastMeasured}</td>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setEditingIndicator(rawIndicators.find((r) => r.id === i.id) ?? null)}
                              title="Modifier l'indicateur"
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeletingIndicator(i)}
                              title="Supprimer l'indicateur"
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <div className="space-y-6">
              <Card className="p-0">
                <div className="border-b border-gray-100 px-5 py-3.5">
                  <h3 className="text-sm font-semibold text-gray-900">Certifications</h3>
                </div>
                <div className="space-y-3 p-5">
                  {rawCertifications.map((raw) => {
                    const c = toCertification(raw)
                    return (
                      <div key={raw.id} className="flex items-center justify-between gap-2 text-xs">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-gray-800">{c.name}</p>
                          <p className="truncate text-gray-400">{c.issuer}</p>
                        </div>
                        <span className={`shrink-0 font-medium ${c.soon ? 'text-amber-600' : 'text-gray-500'}`}>{c.expiry}</span>
                        <button
                          onClick={() => setDeletingCertification(raw)}
                          title="Supprimer la certification"
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </Card>

              <Card className="p-0">
                <div className="border-b border-gray-100 px-5 py-3.5">
                  <h3 className="text-sm font-semibold text-gray-900">Actions qualité en cours</h3>
                </div>
                <div className="space-y-3 p-5">
                  {actions.map((a) => (
                    <div key={a.id} className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-gray-800">{a.label}</p>
                        <p className="text-[11px] text-gray-400">{a.owner}</p>
                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                          <div className="h-full rounded-full bg-accent-500" style={{ width: `${a.progress}%` }} />
                        </div>
                      </div>
                      <button
                        onClick={() => setDeletingAction(a)}
                        title="Supprimer l'action"
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <h3 className="mb-4 text-sm font-semibold text-gray-900">Répartition des indicateurs par catégorie</h3>
              {categoryBreakdown.length === 0 ? (
                <p className="text-xs text-gray-400">Aucune donnée.</p>
              ) : (
                <div className="flex items-center gap-5">
                  <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full" style={{ background: donutBackground }}>
                    <div className="h-14 w-14 rounded-full bg-white" />
                  </div>
                  <div className="space-y-1.5">
                    {categoryBreakdown.map(({ label, percent }) => (
                      <div key={label} className="flex items-center gap-1.5 text-xs">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CATEGORY_CHART_COLOR[label] ?? '#9ca3af' }} />
                        <span className="text-gray-600">{label}</span>
                        <span className="font-medium text-gray-900">{percent}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            <Card className="p-0">
              <div className="border-b border-gray-100 px-5 py-3.5">
                <h3 className="text-sm font-semibold text-gray-900">Indicateurs à surveiller</h3>
              </div>
              <div className="space-y-3 p-5">
                {watchList.length === 0 ? (
                  <p className="text-xs text-gray-400">Tous les indicateurs sont conformes.</p>
                ) : (
                  watchList.map((i) => (
                    <div key={i.id} className="flex items-start gap-2.5 text-xs">
                      <TriangleAlert className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${i.status === 'Non conforme' ? 'text-red-500' : 'text-amber-500'}`} />
                      <span className="text-gray-600">
                        {i.name} — {i.currentValue} <span className="text-gray-400">(cible {i.target})</span>
                      </span>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
