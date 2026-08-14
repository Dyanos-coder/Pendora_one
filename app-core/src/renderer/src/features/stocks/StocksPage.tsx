import { Boxes, TriangleAlert, Coins, Plus, Search } from 'lucide-react'
import { Card } from '@renderer/components/Card'
import { StatusBadge, type StatusTone } from '@renderer/components/StatusBadge'
import { PageHeader } from '@renderer/components/PageHeader'

interface StockItem {
  name: string
  sku: string
  category: string
  quantity: number
  threshold: number
  status: string
  tone: StatusTone
}

const ITEMS: StockItem[] = [
  { name: 'Produit X', sku: 'SKU-1042', category: 'Électronique', quantity: 8, threshold: 30, status: 'Critique', tone: 'danger' },
  { name: 'Produit Y', sku: 'SKU-1077', category: 'Électronique', quantity: 18, threshold: 20, status: 'Attention', tone: 'warning' },
  { name: 'Sac ciment 50kg', sku: 'SKU-2031', category: 'Matériaux', quantity: 240, threshold: 50, status: 'Bon', tone: 'success' },
  { name: 'Câble électrique 10m', sku: 'SKU-2098', category: 'Matériaux', quantity: 95, threshold: 40, status: 'Bon', tone: 'success' },
  { name: 'Peinture blanche 5L', sku: 'SKU-3012', category: 'Finitions', quantity: 26, threshold: 25, status: 'Attention', tone: 'warning' }
]

function stockLevelColor(item: StockItem): string {
  if (item.tone === 'danger') return 'bg-red-500'
  if (item.tone === 'warning') return 'bg-amber-500'
  return 'bg-green-500'
}

export function StocksPage(): JSX.Element {
  const totalItems = ITEMS.length
  const criticalCount = ITEMS.filter((i) => i.tone === 'danger').length
  const totalValue = '3.6M'

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        breadcrumb={['Entreprise', 'Stocks']}
        title="Gestion des stocks"
        subtitle="Suivez vos niveaux de stock et anticipez les ruptures avant qu'elles n'arrivent."
        actions={
          <button className="flex items-center gap-2 rounded-lg bg-accent-500 px-3.5 py-2 text-sm font-medium text-white hover:bg-accent-600">
            <Plus className="h-4 w-4" />
            Nouvel article
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
            <Boxes className="h-5 w-5 text-blue-600" />
          </div>
          <p className="mt-3 text-xs font-medium uppercase tracking-wide text-gray-500">Articles en stock</p>
          <p className="text-2xl font-bold text-gray-900">{totalItems}</p>
        </Card>

        <Card>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50">
            <Coins className="h-5 w-5 text-green-600" />
          </div>
          <p className="mt-3 text-xs font-medium uppercase tracking-wide text-gray-500">Valeur du stock</p>
          <p className="text-2xl font-bold text-gray-900">
            {totalValue} <span className="text-sm font-medium text-gray-400">FCFA</span>
          </p>
        </Card>

        <Card className="border-red-200 bg-red-50/40">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100">
            <TriangleAlert className="h-5 w-5 text-red-600" />
          </div>
          <p className="mt-3 text-xs font-medium uppercase tracking-wide text-gray-500">Ruptures imminentes</p>
          <p className="text-2xl font-bold text-red-600">{criticalCount}</p>
        </Card>
      </div>

      <Card className="mt-6 p-0">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Inventaire</h2>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              placeholder="Rechercher un article..."
              className="w-56 rounded-lg border border-gray-200 py-1.5 pl-8 pr-3 text-xs text-gray-700 placeholder:text-gray-400 focus:border-accent-500 focus:outline-none"
            />
          </div>
        </div>

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
            {ITEMS.map((item) => (
              <tr key={item.sku} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                <td className="px-6 py-3.5">
                  <p className="font-medium text-gray-900">{item.name}</p>
                  <p className="text-xs text-gray-400">{item.sku}</p>
                </td>
                <td className="px-6 py-3.5 text-gray-600">{item.category}</td>
                <td className="px-6 py-3.5">
                  <div className="h-1.5 w-28 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full ${stockLevelColor(item)}`}
                      style={{ width: `${Math.min(100, (item.quantity / (item.threshold * 2)) * 100)}%` }}
                    />
                  </div>
                </td>
                <td className="px-6 py-3.5 font-medium text-gray-900">
                  {item.quantity} <span className="text-xs font-normal text-gray-400">/ seuil {item.threshold}</span>
                </td>
                <td className="px-6 py-3.5">
                  <StatusBadge label={item.status} tone={item.tone} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
