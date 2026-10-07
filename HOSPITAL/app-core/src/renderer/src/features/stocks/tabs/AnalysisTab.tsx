import { useEffect, useState } from 'react'
import { ArrowDownToLine, ArrowUpFromLine, PackageX, Undo2, TriangleAlert } from 'lucide-react'
import { Card } from '@renderer/components/Card'
import type { ApiStockAnalysis } from '@shared/stocks-types'
import { PulseLoader } from '@renderer/components/ui/Feedback'

export function AnalysisTab(): JSX.Element {
  const [analysis, setAnalysis] = useState<ApiStockAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    window.api.stocks.analysis().then((result) => {
      if (cancelled) return
      if (result.ok) setAnalysis(result.data.analysis)
      else setError(result.error)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return <PulseLoader label="Chargement…" />
  }
  if (error || !analysis) return <p className="px-6 py-8 text-center text-sm text-red-500">{error ?? 'Erreur'}</p>

  return (
    <div className="p-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-black/5 bg-teal-50">
            <ArrowDownToLine className="h-5 w-5 text-teal-600" />
          </div>
          <p className="mt-3 text-xs font-medium text-gray-500">Total entrées</p>
          <p className="text-xl font-display font-extrabold tabular-nums text-gray-900">{analysis.totalEntries}</p>
        </Card>
        <Card className="p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-black/5 bg-amber-50">
            <ArrowUpFromLine className="h-5 w-5 text-amber-600" />
          </div>
          <p className="mt-3 text-xs font-medium text-gray-500">Total sorties</p>
          <p className="text-xl font-display font-extrabold tabular-nums text-gray-900">{analysis.totalExits}</p>
        </Card>
        <Card className="p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-black/5 bg-red-50">
            <PackageX className="h-5 w-5 text-red-600" />
          </div>
          <p className="mt-3 text-xs font-medium text-gray-500">Total pertes</p>
          <p className="text-xl font-display font-extrabold tabular-nums text-gray-900">{analysis.totalLosses}</p>
        </Card>
        <Card className="p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-black/5 bg-blue-50">
            <Undo2 className="h-5 w-5 text-blue-600" />
          </div>
          <p className="mt-3 text-xs font-medium text-gray-500">Total retours</p>
          <p className="text-xl font-display font-extrabold tabular-nums text-gray-900">{analysis.totalReturns}</p>
        </Card>
      </div>

      {analysis.itemsBelowThreshold > 0 && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3 text-xs text-amber-800">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          {analysis.itemsBelowThreshold} article{analysis.itemsBelowThreshold > 1 ? 's' : ''} sous le seuil minimum.
        </div>
      )}

      <Card className="mt-6">
        <h3 className="mb-4 text-[15px] font-bold text-gray-900">Articles les plus mouvementés</h3>
        {analysis.topMovedItems.length === 0 ? (
          <p className="text-xs text-gray-400">Aucun mouvement enregistré.</p>
        ) : (
          <div className="space-y-2.5 text-xs">
            {analysis.topMovedItems.map((item) => (
              <div key={item.itemId} className="flex items-center justify-between">
                <span className="text-gray-600">{item.itemName}</span>
                <span className="font-semibold text-gray-900">{item.totalQuantity} unités</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
