import { useEffect, useState } from 'react'
import { FileText, Download, Activity, Wallet, Users, ShieldCheck, Boxes, Loader2 } from 'lucide-react'
import { Card } from '@renderer/components/Card'
import { PageHeader } from '@renderer/components/PageHeader'
import { Button } from '@renderer/components/Button'
import { BarChart } from '@renderer/components/BarChart'
import type { ApiDepartmentComparison, ApiGeneratedReport, ApiReportCategory, ApiReportCategoryCount } from '@shared/reports-types'
import { SortableGroup } from '@renderer/components/SortableGroup'
import { PulseLoader } from '@renderer/components/ui/Feedback'

const CATEGORY_ICON: Record<ApiReportCategory, typeof Activity> = {
  ACTIVITE_MEDICALE: Activity,
  FINANCES: Wallet,
  RESSOURCES_HUMAINES: Users,
  QUALITE_CONFORMITE: ShieldCheck,
  STOCKS_ACHATS: Boxes
}

const CATEGORY_COLOR: Record<ApiReportCategory, string> = {
  ACTIVITE_MEDICALE: 'bg-accent-50 text-accent-600',
  FINANCES: 'bg-teal-50 text-teal-600',
  RESSOURCES_HUMAINES: 'bg-blue-50 text-blue-600',
  QUALITE_CONFORMITE: 'bg-amber-50 text-amber-600',
  STOCKS_ACHATS: 'bg-orange-50 text-orange-600'
}

export function AnalyticsPage(): JSX.Element {
  const [categories, setCategories] = useState<ApiReportCategoryCount[]>([])
  const [reports, setReports] = useState<ApiGeneratedReport[]>([])
  const [departments, setDepartments] = useState<ApiDepartmentComparison[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generatingCategory, setGeneratingCategory] = useState<ApiReportCategory | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  async function reload(): Promise<void> {
    const [reportsResult, departmentsResult] = await Promise.all([window.api.reports.list(), window.api.reports.departmentComparison()])
    if (reportsResult.ok) {
      setCategories(reportsResult.data.categories)
      setReports(reportsResult.data.reports)
    } else {
      setError(reportsResult.error)
    }
    if (departmentsResult.ok) setDepartments(departmentsResult.data.departments)
  }

  useEffect(() => {
    reload().then(() => setLoading(false))
  }, [])

  async function handleGenerate(category: ApiReportCategory): Promise<void> {
    setGeneratingCategory(category)
    const result = await window.api.reports.generate(category)
    if (result.ok) await reload()
    setGeneratingCategory(null)
  }

  async function handleDownload(id: string): Promise<void> {
    setDownloadingId(id)
    await window.api.reports.download(id)
    setDownloadingId(null)
  }

  const maxDepartmentCount = departments.length === 0 ? 1 : Math.max(...departments.map((d) => d.count))

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        breadcrumb={['Accueil', 'Rapports & Analyse']}
        title="Rapports & Analyse"
        subtitle="Générez et consultez les exports d'activité, financiers et qualité de l'établissement."
      />

      {loading ? (
        <PulseLoader label="Chargement des rapports…" />
      ) : error ? (
        <p className="py-12 text-center text-sm text-red-500">{error}</p>
      ) : (
        <>
          {/* Catégories de rapports */}
          <SortableGroup id="analytics.grid1" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {categories.map((c) => {
              const Icon = CATEGORY_ICON[c.category]
              return (
                <Card key={c.category} className="p-4">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${CATEGORY_COLOR[c.category]}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="mt-3 text-xs font-medium text-gray-500">{c.label}</p>
                  <p className="text-xl font-display font-extrabold tabular-nums text-gray-900">{c.count}</p>
                  <p className="mb-3 text-xs text-gray-400">
                    rapport{c.count > 1 ? 's' : ''} généré{c.count > 1 ? 's' : ''}
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={() => handleGenerate(c.category)}
                    disabled={generatingCategory === c.category}
                  >
                    {generatingCategory === c.category ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Générer'}
                  </Button>
                </Card>
              )
            })}
          </SortableGroup>

          <SortableGroup id="analytics.grid2" className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="p-0 lg:col-span-2">
              <div className="border-b border-gray-100 px-6 py-4">
                <h3 className="text-[15px] font-bold text-gray-900">Rapports récents</h3>
              </div>
              {reports.length === 0 ? (
                <p className="px-6 py-8 text-center text-sm text-gray-400">
                  Aucun rapport généré pour le moment — utilisez les boutons « Générer » ci-dessus.
                </p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {reports.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 px-6 py-3.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-500">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">{r.title}</p>
                        <p className="text-xs text-gray-400">
                          {r.format} · {new Date(r.generatedAt).toLocaleString('fr-FR')}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDownload(r.id)}
                        disabled={downloadingId === r.id}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                      >
                        {downloadingId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <h3 className="mb-4 text-[15px] font-bold text-gray-900">Consultations par service</h3>
              {departments.length === 0 ? (
                <p className="text-xs text-gray-400">Aucune donnée.</p>
              ) : (
                <BarChart
                  categories={departments.slice(0, 6).map((d) => d.label.split(' ')[0])}
                  values={departments.slice(0, 6).map((d) => d.count)}
                  color="#12a04a"
                />
              )}
              {departments.length > 0 && (
                <p className="mt-3 text-center text-xs text-gray-400">
                  Service le plus actif : {departments[0].label} ({maxDepartmentCount})
                </p>
              )}
            </Card>
          </SortableGroup>
        </>
      )}
    </div>
  )
}
