import { useEffect, useMemo, useState } from 'react'
import { Workflow, Zap, CheckCircle2, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { Card } from '@renderer/components/Card'
import { PageHeader } from '@renderer/components/PageHeader'
import { BarChart } from '@renderer/components/BarChart'
import type { ApiAutomationCategory, ApiAutomationLog, ApiAutomationRule } from '@shared/automation-types'
import { SortableGroup } from '@renderer/components/SortableGroup'

const CATEGORY_LABEL: Record<ApiAutomationCategory, string> = {
  RENDEZ_VOUS: 'Rendez-vous',
  STOCKS: 'Stocks',
  LABORATOIRE: 'Laboratoire',
  FINANCES: 'Finances',
  RH: 'RH',
  SOINS_PATIENTS: 'Soins & Patients'
}

const CATEGORY_COLOR: Record<ApiAutomationCategory, string> = {
  RENDEZ_VOUS: '#3b82f6',
  STOCKS: '#f59e0b',
  LABORATOIRE: '#10b981',
  FINANCES: '#8b5cf6',
  RH: '#ec4899',
  SOINS_PATIENTS: '#9ca3af'
}

function isToday(iso: string): boolean {
  const d = new Date(iso)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

export function AutomationStudioPage(): JSX.Element {
  const [rules, setRules] = useState<ApiAutomationRule[]>([])
  const [logs, setLogs] = useState<ApiAutomationLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([window.api.automation.rules(), window.api.automation.logs()]).then(([rulesResult, logsResult]) => {
      if (cancelled) return
      if (rulesResult.ok) setRules(rulesResult.data.rules)
      else setError(rulesResult.error)
      if (logsResult.ok) setLogs(logsResult.data.logs)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleToggle(rule: ApiAutomationRule): Promise<void> {
    setTogglingId(rule.id)
    const result = await window.api.automation.toggle(rule.id, !rule.active)
    if (result.ok) {
      setRules((prev) => prev.map((r) => (r.id === rule.id ? result.data.rule : r)))
    }
    setTogglingId(null)
  }

  const activeRules = useMemo(() => rules.filter((r) => r.active).length, [rules])
  const logsToday = useMemo(() => logs.filter((l) => isToday(l.runAt)), [logs])
  const successRate = logs.length === 0 ? null : Math.round((logs.filter((l) => l.success).length / logs.length) * 100)

  const categoryBreakdown = useMemo(() => {
    const counts = new Map<ApiAutomationCategory, number>()
    for (const r of rules) counts.set(r.category, (counts.get(r.category) ?? 0) + 1)
    return Array.from(counts.entries())
      .map(([category, count]) => ({ category, label: CATEGORY_LABEL[category], count, color: CATEGORY_COLOR[category] }))
      .sort((a, b) => b.count - a.count)
  }, [rules])
  const categoryTotal = categoryBreakdown.reduce((s, c) => s + c.count, 0)
  const donutBackground = useMemo(() => {
    let cursor = 0
    const stops = categoryBreakdown.map(({ count, color }) => {
      const percent = categoryTotal === 0 ? 0 : (count / categoryTotal) * 100
      const start = cursor
      cursor += percent
      return `${color} ${start}% ${cursor}%`
    })
    return `conic-gradient(${stops.join(', ')})`
  }, [categoryBreakdown, categoryTotal])

  const executionsByRule = useMemo(() => {
    const counts = new Map<string, number>()
    for (const l of logsToday) counts.set(l.ruleName, (counts.get(l.ruleName) ?? 0) + 1)
    return Array.from(counts.entries()).map(([label, count]) => ({ label, count }))
  }, [logsToday])

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        breadcrumb={['Accueil', 'Automation Studio']}
        title="Automation Studio"
        subtitle="Règles d'automatisation évaluées automatiquement toutes les 15 minutes par le serveur."
      />

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-24 text-sm text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement d&apos;Automation Studio…
        </div>
      ) : error ? (
        <p className="py-12 text-center text-sm text-red-500">{error}</p>
      ) : (
        <>
          {/* KPI row */}
          <SortableGroup id="automationStudio.grid1" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-t-4 border-t-violet-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50">
                <Workflow className="h-5 w-5 text-violet-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Règles actives</p>
              <p className="text-xl font-bold text-gray-900">
                {activeRules} <span className="text-sm font-normal text-gray-400">/ {rules.length}</span>
              </p>
            </Card>
            <Card className="border-t-4 border-t-blue-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                <Zap className="h-5 w-5 text-blue-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Exécutions aujourd&apos;hui</p>
              <p className="text-xl font-bold text-gray-900">{logsToday.length}</p>
            </Card>
            <Card className="border-t-4 border-t-emerald-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Taux de réussite</p>
              <p className="text-xl font-bold text-gray-900">{successRate === null ? '—' : `${successRate}%`}</p>
            </Card>
            <Card>
              <h3 className="mb-2 text-xs font-medium text-gray-500">Exécutions par règle (aujourd&apos;hui)</h3>
              {executionsByRule.length === 0 ? (
                <p className="text-xs text-gray-400">Aucune exécution aujourd&apos;hui.</p>
              ) : (
                <BarChart
                  categories={executionsByRule.map((e) => e.label.split(' ').slice(0, 2).join(' '))}
                  values={executionsByRule.map((e) => e.count)}
                  color="#3b82f6"
                  height={50}
                />
              )}
            </Card>
          </SortableGroup>

          <SortableGroup id="automationStudio.grid2" className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="p-0 lg:col-span-2">
              <div className="border-b border-gray-100 px-6 py-4">
                <h3 className="text-sm font-semibold text-gray-900">Règles d&apos;automatisation</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {rules.map((r) => (
                  <div key={r.id} className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900">{r.name}</p>
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                            {CATEGORY_LABEL[r.category]}
                          </span>
                        </div>
                        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-500">
                          <span className="rounded bg-gray-50 px-1.5 py-0.5 font-mono text-[11px]">{r.trigger}</span>
                          <span>→</span>
                          <span className="rounded bg-gray-50 px-1.5 py-0.5 font-mono text-[11px]">{r.action}</span>
                        </p>
                      </div>
                      <button
                        onClick={() => handleToggle(r)}
                        disabled={togglingId === r.id}
                        className={`inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${r.active ? 'bg-accent-500' : 'bg-gray-200'}`}
                      >
                        <span className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${r.active ? 'translate-x-4' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                    <div className="mt-3 flex gap-6 text-xs text-gray-500">
                      <span>
                        Exécutions aujourd&apos;hui :{' '}
                        <span className="font-medium text-gray-800">{logsToday.filter((l) => l.ruleId === r.id).length}</span>
                      </span>
                      <span>
                        Total exécutions journalisées :{' '}
                        <span className="font-medium text-gray-800">{logs.filter((l) => l.ruleId === r.id).length}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <SortableGroup id="automationStudio.side1" className="space-y-6">
              <Card>
                <h3 className="mb-4 text-sm font-semibold text-gray-900">Règles par catégorie</h3>
                {categoryBreakdown.length === 0 ? (
                  <p className="text-xs text-gray-400">Aucune donnée.</p>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full" style={{ background: donutBackground }}>
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
                  <h3 className="text-sm font-semibold text-gray-900">Journal d&apos;exécution</h3>
                </div>
                <div className="space-y-3 p-5">
                  {logs.length === 0 ? (
                    <p className="text-xs text-gray-400">Aucune exécution journalisée pour le moment.</p>
                  ) : (
                    logs.slice(0, 10).map((log) => (
                      <div key={log.id} className="flex items-start gap-2.5 text-xs">
                        {log.success ? (
                          <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        ) : (
                          <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-gray-800">{log.ruleName}</p>
                          <p className="truncate text-gray-400">{log.detail}</p>
                        </div>
                        <span className="shrink-0 text-gray-400">
                          {new Date(log.runAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </SortableGroup>
          </SortableGroup>
        </>
      )}
    </div>
  )
}
