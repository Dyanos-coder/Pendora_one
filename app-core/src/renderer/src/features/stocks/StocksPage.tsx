import { useEffect, useState, type FormEvent } from 'react'
import { Boxes, TriangleAlert, Coins, Plus, Search } from 'lucide-react'
import { Card } from '@renderer/components/Card'
import { StatusBadge, type StatusTone } from '@renderer/components/StatusBadge'
import { PageHeader } from '@renderer/components/PageHeader'
import { Modal } from '@renderer/components/Modal'
import type { CreateStockItemInput, StockItem, StocksSummary } from '@shared/stocks-types'

function formatAmount(amount: number): string {
  return `${new Intl.NumberFormat('fr-FR').format(amount)} FCFA`
}

function stockStatus(item: StockItem): { label: string; tone: StatusTone } {
  if (item.quantity < item.threshold * 0.5) return { label: 'Critique', tone: 'danger' }
  if (item.quantity < item.threshold * 1.1) return { label: 'Attention', tone: 'warning' }
  return { label: 'Bon', tone: 'success' }
}

function stockLevelColor(tone: StatusTone): string {
  if (tone === 'danger') return 'bg-red-500'
  if (tone === 'warning') return 'bg-amber-500'
  return 'bg-green-500'
}

const EMPTY_FORM: CreateStockItemInput = {
  name: '',
  sku: '',
  category: '',
  quantity: 0,
  threshold: 0,
  unitPrice: 0
}

export function StocksPage(): JSX.Element {
  const [items, setItems] = useState<StockItem[]>([])
  const [summary, setSummary] = useState<StocksSummary | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<CreateStockItemInput>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)

  async function loadData(searchTerm: string): Promise<void> {
    setLoading(true)
    setError(null)

    const [listResult, summaryResult] = await Promise.all([
      window.api.stocks.list(searchTerm || undefined),
      window.api.stocks.summary()
    ])

    if (!listResult.ok || !summaryResult.ok) {
      setError(!listResult.ok ? listResult.error : (summaryResult as { error: string }).error)
      setLoading(false)
      return
    }

    setItems(listResult.data.items)
    setSummary(summaryResult.data)
    setLoading(false)
  }

  useEffect(() => {
    const timeout = setTimeout(() => loadData(search), 300)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  async function handleCreate(event: FormEvent): Promise<void> {
    event.preventDefault()
    setSubmitting(true)
    const result = await window.api.stocks.create(form)
    setSubmitting(false)

    if (!result.ok) {
      setError(result.error)
      return
    }

    setShowForm(false)
    setForm(EMPTY_FORM)
    await loadData(search)
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        breadcrumb={['Entreprise', 'Stocks']}
        title="Gestion des stocks"
        subtitle="Suivez vos niveaux de stock et anticipez les ruptures avant qu'elles n'arrivent."
        actions={
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-lg bg-accent-500 px-3.5 py-2 text-sm font-medium text-white hover:bg-accent-600"
          >
            <Plus className="h-4 w-4" />
            Nouvel article
          </button>
        }
      />

      {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}

      {showForm && (
        <Modal title="Nouvel article" onClose={() => setShowForm(false)}>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-gray-500">Nom de l&apos;article</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Sac ciment 50kg"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-500">SKU</label>
              <input
                required
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                placeholder="SKU-2031"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-500">Catégorie</label>
              <input
                required
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="Matériaux"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-500">Quantité</label>
              <input
                required
                type="number"
                min={0}
                value={form.quantity || ''}
                onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-500">Seuil de réappro</label>
              <input
                required
                type="number"
                min={0}
                value={form.threshold || ''}
                onChange={(e) => setForm({ ...form, threshold: Number(e.target.value) })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent-500 focus:outline-none"
              />
            </div>
            <div className="col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-gray-500">Prix unitaire (FCFA)</label>
              <input
                required
                type="number"
                min={0}
                value={form.unitPrice || ''}
                onChange={(e) => setForm({ ...form, unitPrice: Number(e.target.value) })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent-500 focus:outline-none"
              />
            </div>
            <div className="col-span-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-white hover:bg-accent-600 disabled:opacity-60"
              >
                {submitting ? 'Création…' : "Ajouter l'article"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
            <Boxes className="h-5 w-5 text-blue-600" />
          </div>
          <p className="mt-3 text-xs font-medium uppercase tracking-wide text-gray-500">Articles en stock</p>
          <p className="text-2xl font-bold text-gray-900">{summary ? summary.totalItems : '—'}</p>
        </Card>

        <Card>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50">
            <Coins className="h-5 w-5 text-green-600" />
          </div>
          <p className="mt-3 text-xs font-medium uppercase tracking-wide text-gray-500">Valeur du stock</p>
          <p className="text-2xl font-bold text-gray-900">{summary ? formatAmount(summary.totalValue) : '—'}</p>
        </Card>

        <Card className="border-red-200 bg-red-50/40">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100">
            <TriangleAlert className="h-5 w-5 text-red-600" />
          </div>
          <p className="mt-3 text-xs font-medium uppercase tracking-wide text-gray-500">Ruptures imminentes</p>
          <p className="text-2xl font-bold text-red-600">{summary ? summary.criticalCount : '—'}</p>
        </Card>
      </div>

      <Card className="mt-6 p-0">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Inventaire</h2>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un article..."
              className="w-56 rounded-lg border border-gray-200 py-1.5 pl-8 pr-3 text-xs text-gray-700 placeholder:text-gray-400 focus:border-accent-500 focus:outline-none"
            />
          </div>
        </div>

        {loading ? (
          <p className="px-6 py-8 text-center text-sm text-gray-400">Chargement…</p>
        ) : items.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-gray-400">Aucun article pour le moment.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                <th className="px-6 py-2.5 font-medium">Article</th>
                <th className="px-6 py-2.5 font-medium">Catégorie</th>
                <th className="px-6 py-2.5 font-medium">Niveau</th>
                <th className="px-6 py-2.5 font-medium">Quantité</th>
                <th className="px-6 py-2.5 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const status = stockStatus(item)
                return (
                  <tr key={item.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-6 py-3.5">
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-400">{item.sku}</p>
                    </td>
                    <td className="px-6 py-3.5 text-gray-600">{item.category}</td>
                    <td className="px-6 py-3.5">
                      <div className="h-1.5 w-28 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className={`h-full rounded-full ${stockLevelColor(status.tone)}`}
                          style={{ width: `${Math.min(100, (item.quantity / (item.threshold * 2 || 1)) * 100)}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-3.5 font-medium text-gray-900">
                      {item.quantity} <span className="text-xs font-normal text-gray-400">/ seuil {item.threshold}</span>
                    </td>
                    <td className="px-6 py-3.5">
                      <StatusBadge label={status.label} tone={status.tone} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
