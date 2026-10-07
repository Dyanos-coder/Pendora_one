import { useEffect, useMemo, useState } from 'react'
import { ShieldAlert, TriangleAlert, ClipboardCheck, CheckCircle2, Search, Plus, Pencil, Trash2 } from 'lucide-react'
import { Card } from '@renderer/components/Card'
import { PageHeader } from '@renderer/components/PageHeader'
import { Button } from '@renderer/components/Button'
import { StatusBadge } from '@renderer/components/StatusBadge'
import { ConfirmDialog } from '@renderer/components/ConfirmDialog'
import type { ApiRisk, ApiRiskLevel, ApiRiskStatus } from '@shared/risk-types'
import { riskLevelTone, riskStatusTone, LEVEL_CELL_COLOR, levelFromScore } from './status'
import type { Risk, RiskLevel, RiskStatus } from './types'
import { RiskFormModal } from './RiskFormModal'
import { SortableGroup } from '@renderer/components/SortableGroup'
import { PulseLoader } from '@renderer/components/ui/Feedback'

const PROBABILITY_LABELS = ['Rare', 'Possible', 'Probable', 'Fréquent']
const IMPACT_LABELS = ['Mineur', 'Modéré', 'Majeur', 'Critique']

const LEVEL_LABEL: Record<ApiRiskLevel, RiskLevel> = {
  FAIBLE: 'Faible',
  MODERE: 'Modéré',
  ELEVE: 'Élevé',
  CRITIQUE: 'Critique'
}

const STATUS_LABEL: Record<ApiRiskStatus, RiskStatus> = {
  OUVERT: 'Ouvert',
  EN_TRAITEMENT: 'En traitement',
  CLOS: 'Clos'
}

const CATEGORY_PALETTE = ['#ef4444', '#dea127', '#12a04a', '#3b82f6', '#ec4899', '#9ca3af', '#14b8a6', '#06b6d4']

function toRisk(r: ApiRisk): Risk {
  return {
    id: r.id,
    title: r.title,
    category: r.category,
    probability: r.probability as 1 | 2 | 3 | 4,
    impact: r.impact as 1 | 2 | 3 | 4,
    level: LEVEL_LABEL[r.level],
    status: STATUS_LABEL[r.status],
    owner: r.owner,
    identifiedOn: new Date(r.identifiedAt).toLocaleDateString('fr-FR')
  }
}

export function RiskManagementPage(): JSX.Element {
  const [risks, setRisks] = useState<Risk[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingRisk, setEditingRisk] = useState<Risk | null>(null)
  const [deletingRisk, setDeletingRisk] = useState<Risk | null>(null)

  useEffect(() => {
    let cancelled = false
    window.api.risk.list().then((result) => {
      if (cancelled) return
      if (result.ok) setRisks(result.data.risks.map(toRisk))
      else setError(result.error)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return risks
    return risks.filter((r) => `${r.title} ${r.category} ${r.owner}`.toLowerCase().includes(term))
  }, [search, risks])

  const criticalCount = useMemo(() => risks.filter((r) => r.level === 'Critique').length, [risks])
  const highOpenCount = useMemo(() => risks.filter((r) => r.level === 'Élevé' && r.status !== 'Clos').length, [risks])
  const openCount = useMemo(() => risks.filter((r) => r.status !== 'Clos').length, [risks])
  const closedCount = useMemo(() => risks.filter((r) => r.status === 'Clos').length, [risks])

  const categoryBreakdown = useMemo(() => {
    const counts = new Map<string, number>()
    for (const r of risks) counts.set(r.category, (counts.get(r.category) ?? 0) + 1)
    return Array.from(counts.entries())
      .map(([label, count], index) => ({ label, count, color: CATEGORY_PALETTE[index % CATEGORY_PALETTE.length] }))
      .sort((a, b) => b.count - a.count)
  }, [risks])

  const donutTotal = categoryBreakdown.reduce((s, c) => s + c.count, 0)
  const donutBackground = useMemo(() => {
    let cursor = 0
    const stops = categoryBreakdown.map(({ count, color }) => {
      const percent = donutTotal === 0 ? 0 : (count / donutTotal) * 100
      const start = cursor
      cursor += percent
      return `${color} ${start}% ${cursor}%`
    })
    return `conic-gradient(${stops.join(', ')})`
  }, [categoryBreakdown, donutTotal])

  const matrixCounts = useMemo(() => {
    const grid = [0, 1, 2, 3].map(() => [0, 0, 0, 0])
    for (const r of risks) grid[r.probability - 1][r.impact - 1] += 1
    return grid
  }, [risks])

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        breadcrumb={['Accueil', 'Gestion des risques']}
        title="Gestion des risques"
        subtitle="Registre des risques, cartographie et suivi des actions de traitement."
        actions={
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4" />
            Déclarer un risque
          </Button>
        }
      />

      {showCreateModal && (
        <RiskFormModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(risk) => {
            setRisks((prev) => [...prev, toRisk(risk)])
            setShowCreateModal(false)
          }}
        />
      )}

      {editingRisk && (
        <RiskFormModal
          editing={editingRisk}
          onClose={() => setEditingRisk(null)}
          onCreated={(risk) => {
            const updated = toRisk(risk)
            setRisks((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
            setEditingRisk(null)
          }}
        />
      )}

      {deletingRisk && (
        <ConfirmDialog
          title="Supprimer le risque"
          message={`Voulez-vous vraiment supprimer le risque « ${deletingRisk.title} » ?`}
          onCancel={() => setDeletingRisk(null)}
          onConfirm={() => window.api.risk.delete(deletingRisk.id)}
          onConfirmed={() => {
            setRisks((prev) => prev.filter((r) => r.id !== deletingRisk.id))
            setDeletingRisk(null)
          }}
        />
      )}

      {loading ? (
        <PulseLoader label="Chargement du registre des risques…" />
      ) : error ? (
        <p className="py-12 text-center text-sm text-red-500">{error}</p>
      ) : (
        <>
          {/* KPI row */}
          <SortableGroup id="riskManagement.grid1" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-black/5 bg-accent-50">
                <ShieldAlert className="h-5 w-5 text-accent-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Risques identifiés</p>
              <p className="text-xl font-display font-extrabold tabular-nums text-gray-900">{risks.length}</p>
            </Card>
            <Card className="p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-black/5 bg-red-50">
                <TriangleAlert className="h-5 w-5 text-red-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Risques critiques</p>
              <p className="text-xl font-bold text-red-600">{criticalCount}</p>
            </Card>
            <Card className="p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-black/5 bg-amber-50">
                <ClipboardCheck className="h-5 w-5 text-amber-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Actions en cours</p>
              <p className="text-xl font-display font-extrabold tabular-nums text-gray-900">{openCount}</p>
            </Card>
            <Card className="p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-black/5 bg-teal-50">
                <CheckCircle2 className="h-5 w-5 text-teal-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Risques clos</p>
              <p className="text-xl font-display font-extrabold tabular-nums text-gray-900">{closedCount}</p>
            </Card>
          </SortableGroup>

          <SortableGroup id="riskManagement.grid2" className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="p-0 lg:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-6 py-4">
                <h3 className="text-[15px] font-bold text-gray-900">Registre des risques</h3>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Rechercher un risque..."
                    className="w-64 rounded-[10px] border border-gray-300 py-1.5 pl-8 pr-3 text-xs text-gray-700 placeholder:text-gray-400 focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/70 text-[11px] uppercase tracking-[0.08em] text-gray-500">
                      <th className="px-6 py-3 font-semibold">Risque</th>
                      <th className="px-6 py-3 font-semibold">Catégorie</th>
                      <th className="px-6 py-3 font-semibold">Niveau</th>
                      <th className="px-6 py-3 font-semibold">Statut</th>
                      <th className="px-6 py-3 font-semibold">Responsable</th>
                      <th className="px-6 py-3 font-semibold" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} className="border-b border-gray-100 last:border-0 transition-colors hover:bg-accent-50/40">
                        <td className="px-6 py-3 font-medium text-gray-900">{r.title}</td>
                        <td className="px-6 py-3 text-gray-600">{r.category}</td>
                        <td className="px-6 py-3">
                          <StatusBadge label={r.level} tone={riskLevelTone(r.level)} />
                        </td>
                        <td className="px-6 py-3">
                          <StatusBadge label={r.status} tone={riskStatusTone(r.status)} />
                        </td>
                        <td className="px-6 py-3 text-gray-600">{r.owner}</td>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setEditingRisk(r)}
                              title="Modifier le risque"
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeletingRisk(r)}
                              title="Supprimer le risque"
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

            <SortableGroup id="riskManagement.side1" className="space-y-6">
              <Card>
                <h3 className="mb-4 text-[15px] font-bold text-gray-900">Répartition par catégorie</h3>
                {categoryBreakdown.length === 0 ? (
                  <p className="text-xs text-gray-400">Aucune donnée.</p>
                ) : (
                  <div className="flex items-center gap-4">
                    <div
                      className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full"
                      style={{ background: donutBackground }}
                    >
                      <div className="h-11 w-11 rounded-full bg-white" />
                    </div>
                    <div className="space-y-1 text-[11px]">
                      {categoryBreakdown.map(({ label, count, color }) => (
                        <div key={label} className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
                          <span className="text-gray-600">{label}</span>
                          <span className="font-medium text-gray-900">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>

              <Card className="p-0">
                <div className="border-b border-gray-100 px-5 py-3.5">
                  <h3 className="text-[15px] font-bold text-gray-900">Alertes</h3>
                </div>
                <div className="space-y-3 p-5">
                  {criticalCount === 0 && highOpenCount === 0 ? (
                    <p className="text-xs text-gray-400">Aucune alerte pour le moment.</p>
                  ) : (
                    <>
                      {criticalCount > 0 && (
                        <div className="flex items-start gap-2.5 text-xs">
                          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                          <span className="text-gray-600">
                            {criticalCount} risque{criticalCount > 1 ? 's' : ''} critique{criticalCount > 1 ? 's' : ''} nécessitant une
                            action immédiate
                          </span>
                        </div>
                      )}
                      {highOpenCount > 0 && (
                        <div className="flex items-start gap-2.5 text-xs">
                          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-500" />
                          <span className="text-gray-600">
                            {highOpenCount} risque{highOpenCount > 1 ? 's' : ''} élevé{highOpenCount > 1 ? 's' : ''} en attente de
                            traitement
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </Card>
            </SortableGroup>
          </SortableGroup>

          <Card>
            <h3 className="mb-4 text-[15px] font-bold text-gray-900">Matrice des risques (probabilité × impact)</h3>
            <div className="flex gap-4">
              <div className="flex flex-col justify-between py-2 text-right text-[11px] text-gray-500">
                {[...PROBABILITY_LABELS].reverse().map((l) => (
                  <span key={l} className="h-14 leading-[3.5rem]">
                    {l}
                  </span>
                ))}
              </div>
              <div className="flex-1">
                <div className="grid grid-cols-4 gap-1.5">
                  {[...matrixCounts].reverse().map((row, rowIndex) =>
                    row.map((count, colIndex) => {
                      const probability = 4 - rowIndex
                      const impact = colIndex + 1
                      const level = levelFromScore(probability * impact)
                      return (
                        <div
                          key={`${rowIndex}-${colIndex}`}
                          className={`flex h-14 items-center justify-center rounded-lg text-sm font-bold ${LEVEL_CELL_COLOR[level]}`}
                        >
                          {count > 0 ? count : ''}
                        </div>
                      )
                    })
                  )}
                </div>
                <div className="mt-2 grid grid-cols-4 gap-1.5 text-center text-[11px] text-gray-500">
                  {IMPACT_LABELS.map((l) => (
                    <span key={l}>{l}</span>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
