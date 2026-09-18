import { useEffect, useMemo, useState } from 'react'
import { ClipboardCheck, CalendarClock, ShieldCheck, TriangleAlert, Loader2, PlayCircle, Plus, Pencil, Trash2 } from 'lucide-react'
import { Card } from '@renderer/components/Card'
import { PageHeader } from '@renderer/components/PageHeader'
import { Button } from '@renderer/components/Button'
import { StatusBadge } from '@renderer/components/StatusBadge'
import { ConfirmDialog } from '@renderer/components/ConfirmDialog'
import type { ApiAudit, ApiAuditFinding, ApiComplianceFramework, ApiGovernanceAuditStatus } from '@shared/audit-compliance-types'
import { auditStatusTone } from './status'
import type { Audit, AuditStatus, Framework } from './types'
import { AuditFormModal } from './AuditFormModal'

const STATUS_LABEL: Record<ApiGovernanceAuditStatus, AuditStatus> = {
  PLANIFIE: 'Planifié',
  EN_COURS: 'En cours',
  TERMINE: 'Terminé'
}

const FINDING_CATEGORY_COLOR: Record<string, string> = {
  Documentation: '#3b82f6',
  'Hygiène & sécurité': '#10b981',
  Traçabilité: '#f59e0b',
  "Systèmes d'information": '#8b5cf6'
}

const STATUS_DONUT_COLOR: Record<AuditStatus, string> = {
  Terminé: '#10b981',
  'En cours': '#3b82f6',
  Planifié: '#9ca3af'
}

function toAudit(a: ApiAudit): Audit {
  return {
    id: a.id,
    title: a.title,
    type: a.type === 'INTERNE' ? 'Interne' : 'Externe',
    service: a.service,
    date: new Date(a.scheduledAt).toLocaleDateString('fr-FR'),
    status: STATUS_LABEL[a.status],
    score: a.score
  }
}

const COMPLIANCE_ALERT_THRESHOLD = 85

export function AuditCompliancePage(): JSX.Element {
  const [audits, setAudits] = useState<Audit[]>([])
  const [rawAudits, setRawAudits] = useState<ApiAudit[]>([])
  const [findings, setFindings] = useState<ApiAuditFinding[]>([])
  const [frameworks, setFrameworks] = useState<Framework[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingAudit, setEditingAudit] = useState<ApiAudit | null>(null)
  const [deletingAudit, setDeletingAudit] = useState<Audit | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([window.api.auditCompliance.audits(), window.api.auditCompliance.findings(), window.api.auditCompliance.frameworks()]).then(
      ([auditsResult, findingsResult, frameworksResult]) => {
        if (cancelled) return
        if (auditsResult.ok) {
          setRawAudits(auditsResult.data.audits)
          setAudits(auditsResult.data.audits.map(toAudit))
        } else setError(auditsResult.error)
        if (findingsResult.ok) setFindings(findingsResult.data.findings)
        if (frameworksResult.ok)
          setFrameworks(frameworksResult.data.frameworks.map((f: ApiComplianceFramework) => ({ name: f.name, compliance: f.compliancePercent })))
        setLoading(false)
      }
    )
    return () => {
      cancelled = true
    }
  }, [])

  const completed = useMemo(() => audits.filter((a) => a.status === 'Terminé'), [audits])
  const planned = useMemo(() => audits.filter((a) => a.status === 'Planifié'), [audits])
  const inProgress = useMemo(() => audits.filter((a) => a.status === 'En cours'), [audits])
  const avgScore = completed.length === 0 ? null : Math.round(completed.reduce((s, a) => s + (a.score ?? 0), 0) / completed.length)

  const findingsByCategory = useMemo(() => {
    const counts = new Map<string, number>()
    for (const f of findings) counts.set(f.category, (counts.get(f.category) ?? 0) + 1)
    return Array.from(counts.entries())
      .map(([label, count]) => ({ label, count, color: FINDING_CATEGORY_COLOR[label] ?? '#9ca3af' }))
      .sort((a, b) => b.count - a.count)
  }, [findings])
  const findingsTotal = findingsByCategory.reduce((s, f) => s + f.count, 0)
  const findingsDonutBackground = useMemo(() => {
    let cursor = 0
    const stops = findingsByCategory.map(({ count, color }) => {
      const percent = findingsTotal === 0 ? 0 : (count / findingsTotal) * 100
      const start = cursor
      cursor += percent
      return `${color} ${start}% ${cursor}%`
    })
    return `conic-gradient(${stops.join(', ')})`
  }, [findingsByCategory, findingsTotal])

  const statusBreakdown = useMemo(
    () => [
      { label: 'Terminé' as const, count: completed.length },
      { label: 'En cours' as const, count: inProgress.length },
      { label: 'Planifié' as const, count: planned.length }
    ],
    [completed, inProgress, planned]
  )
  const statusTotal = audits.length
  const statusDonutBackground = useMemo(() => {
    let cursor = 0
    const stops = statusBreakdown.map(({ label, count }) => {
      const percent = statusTotal === 0 ? 0 : (count / statusTotal) * 100
      const start = cursor
      cursor += percent
      return `${STATUS_DONUT_COLOR[label]} ${start}% ${cursor}%`
    })
    return `conic-gradient(${stops.join(', ')})`
  }, [statusBreakdown, statusTotal])

  const lowComplianceFrameworks = useMemo(() => frameworks.filter((f) => f.compliance < COMPLIANCE_ALERT_THRESHOLD), [frameworks])

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        breadcrumb={['Accueil', 'Audit & Conformité']}
        title="Audit & Conformité"
        subtitle="Suivi des audits internes et externes, et de la conformité aux référentiels."
        actions={
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4" />
            Planifier un audit
          </Button>
        }
      />

      {showCreateModal && (
        <AuditFormModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(audit) => {
            setRawAudits((prev) => [...prev, audit])
            setAudits((prev) => [...prev, toAudit(audit)])
            setShowCreateModal(false)
          }}
        />
      )}

      {editingAudit && (
        <AuditFormModal
          editing={editingAudit}
          onClose={() => setEditingAudit(null)}
          onCreated={(audit) => {
            setRawAudits((prev) => prev.map((a) => (a.id === audit.id ? audit : a)))
            setAudits((prev) => prev.map((a) => (a.id === audit.id ? toAudit(audit) : a)))
            setEditingAudit(null)
          }}
        />
      )}

      {deletingAudit && (
        <ConfirmDialog
          title="Supprimer l'audit"
          message={`Voulez-vous vraiment supprimer l'audit « ${deletingAudit.title} » ?`}
          onCancel={() => setDeletingAudit(null)}
          onConfirm={() => window.api.auditCompliance.deleteAudit(deletingAudit.id)}
          onConfirmed={() => {
            setRawAudits((prev) => prev.filter((a) => a.id !== deletingAudit.id))
            setAudits((prev) => prev.filter((a) => a.id !== deletingAudit.id))
            setDeletingAudit(null)
          }}
        />
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-24 text-sm text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement des audits…
        </div>
      ) : error ? (
        <p className="py-12 text-center text-sm text-red-500">{error}</p>
      ) : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-t-4 border-t-emerald-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
                <ClipboardCheck className="h-5 w-5 text-emerald-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Audits réalisés</p>
              <p className="text-xl font-bold text-gray-900">{completed.length}</p>
            </Card>
            <Card className="border-t-4 border-t-blue-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                <CalendarClock className="h-5 w-5 text-blue-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Audits programmés</p>
              <p className="text-xl font-bold text-gray-900">{planned.length}</p>
            </Card>
            <Card className="border-t-4 border-t-violet-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50">
                <ShieldCheck className="h-5 w-5 text-violet-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Score moyen d&apos;audit</p>
              <p className="text-xl font-bold text-gray-900">{avgScore === null ? '—' : `${avgScore}%`}</p>
            </Card>
            <Card className="border-t-4 border-t-amber-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50">
                <PlayCircle className="h-5 w-5 text-amber-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Audits en cours</p>
              <p className="text-xl font-bold text-gray-900">{inProgress.length}</p>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="p-0 lg:col-span-2">
              <div className="border-b border-gray-100 px-6 py-4">
                <h3 className="text-sm font-semibold text-gray-900">Audits</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                      <th className="px-6 py-2.5 font-medium">Audit</th>
                      <th className="px-6 py-2.5 font-medium">Type</th>
                      <th className="px-6 py-2.5 font-medium">Service</th>
                      <th className="px-6 py-2.5 font-medium">Date</th>
                      <th className="px-6 py-2.5 font-medium">Statut</th>
                      <th className="px-6 py-2.5 font-medium">Score</th>
                      <th className="px-6 py-2.5 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {audits.map((a) => (
                      <tr key={a.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                        <td className="px-6 py-3 font-medium text-gray-900">{a.title}</td>
                        <td className="px-6 py-3 text-gray-600">{a.type}</td>
                        <td className="px-6 py-3 text-gray-600">{a.service}</td>
                        <td className="px-6 py-3 text-gray-600">{a.date}</td>
                        <td className="px-6 py-3">
                          <StatusBadge label={a.status} tone={auditStatusTone(a.status)} />
                        </td>
                        <td className="px-6 py-3 font-medium text-gray-900">{a.score !== null ? `${a.score}%` : '—'}</td>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setEditingAudit(rawAudits.find((r) => r.id === a.id) ?? null)}
                              title="Modifier l'audit"
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeletingAudit(a)}
                              title="Supprimer l'audit"
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
              <Card>
                <h3 className="mb-3 text-sm font-semibold text-gray-900">Référentiels suivis</h3>
                <div className="space-y-3">
                  {frameworks.map((f) => (
                    <div key={f.name}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-gray-600">{f.name}</span>
                        <span className="font-medium text-gray-900">{f.compliance}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                          className={`h-full rounded-full ${f.compliance < COMPLIANCE_ALERT_THRESHOLD ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${f.compliance}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-0">
                <div className="border-b border-gray-100 px-5 py-3.5">
                  <h3 className="text-sm font-semibold text-gray-900">Points de vigilance</h3>
                </div>
                <div className="space-y-3 p-5">
                  {planned.length === 0 && lowComplianceFrameworks.length === 0 ? (
                    <p className="text-xs text-gray-400">Aucun point de vigilance pour le moment.</p>
                  ) : (
                    <>
                      {planned.length > 0 && (
                        <div className="flex items-start gap-2.5 text-xs">
                          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" />
                          <span className="text-gray-600">{planned.length} audit{planned.length > 1 ? 's' : ''} programmé{planned.length > 1 ? 's' : ''} à venir</span>
                        </div>
                      )}
                      {lowComplianceFrameworks.map((f) => (
                        <div key={f.name} className="flex items-start gap-2.5 text-xs">
                          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                          <span className="text-gray-600">
                            Conformité {f.name} sous le seuil ({f.compliance}%)
                          </span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </Card>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <h3 className="mb-4 text-sm font-semibold text-gray-900">Répartition des audits par statut</h3>
              {statusTotal === 0 ? (
                <p className="text-xs text-gray-400">Aucune donnée.</p>
              ) : (
                <div className="flex items-center gap-5">
                  <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full" style={{ background: statusDonutBackground }}>
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-xs font-bold text-gray-900">{statusTotal}</div>
                  </div>
                  <div className="space-y-1.5">
                    {statusBreakdown.map(({ label, count }) => (
                      <div key={label} className="flex items-center gap-1.5 text-xs">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_DONUT_COLOR[label] }} />
                        <span className="text-gray-600">{label}</span>
                        <span className="font-medium text-gray-900">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            <Card>
              <h3 className="mb-4 text-sm font-semibold text-gray-900">Constats par catégorie</h3>
              {findingsByCategory.length === 0 ? (
                <p className="text-xs text-gray-400">Aucun constat enregistré.</p>
              ) : (
                <div className="flex items-center gap-5">
                  <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full" style={{ background: findingsDonutBackground }}>
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-xs font-bold text-gray-900">{findingsTotal}</div>
                  </div>
                  <div className="space-y-1.5">
                    {findingsByCategory.map(({ label, count, color }) => (
                      <div key={label} className="flex items-center gap-1.5 text-xs">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                        <span className="text-gray-600">{label}</span>
                        <span className="font-medium text-gray-900">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
