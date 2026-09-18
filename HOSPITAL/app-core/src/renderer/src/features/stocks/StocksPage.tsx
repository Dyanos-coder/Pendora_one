import { useEffect, useMemo, useState } from 'react'
import {
  Package,
  Gauge,
  TriangleAlert,
  PackageX,
  Info,
  Search,
  FileSpreadsheet,
  Columns3,
  Printer,
  MoreHorizontal,
  Pencil,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  ClipboardCheck,
  SlidersHorizontal,
  Undo2,
  Tags,
  Loader2,
  Plus,
  Trash2
} from 'lucide-react'
import { Card } from '@renderer/components/Card'
import { PageHeader } from '@renderer/components/PageHeader'
import { Button } from '@renderer/components/Button'
import { StatusBadge } from '@renderer/components/StatusBadge'
import { ConfirmDialog } from '@renderer/components/ConfirmDialog'
import type { ApiDepot, ApiDepotItem, ApiItemState } from '@shared/stocks-types'
import { itemStateTone, CATEGORY_CHART_COLOR, DEPOT_CHART_COLOR } from './status'
import type { Depot, DepotItem, ItemState } from './types'
import { DepotItemFormModal } from './DepotItemFormModal'

type Tab = 'overview' | 'movements' | 'transfers' | 'inventory' | 'losses' | 'analysis'

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: "Vue d'ensemble" },
  { id: 'movements', label: 'Mouvements de stock' },
  { id: 'transfers', label: 'Transferts' },
  { id: 'inventory', label: 'Inventaires' },
  { id: 'losses', label: 'Pertes / Retour' },
  { id: 'analysis', label: 'Analyse' }
]

const FILTER_FIELDS = [
  { label: 'Catégorie', value: 'Toutes les catégories' },
  { label: 'Dépôt', value: 'Tous les dépôts' },
  { label: 'Statut', value: 'Tous les statuts' }
]

const QUICK_ACTIONS = [
  { icon: ArrowDownToLine, label: 'Entrée de stock' },
  { icon: ArrowUpFromLine, label: 'Sortie de stock' },
  { icon: ArrowLeftRight, label: 'Transfert entre dépôts' },
  { icon: ClipboardCheck, label: 'Inventaire rapide' },
  { icon: SlidersHorizontal, label: 'Ajuster le stock' },
  { icon: Undo2, label: 'Retrait / Perte' },
  { icon: Tags, label: 'Imprimer étiquettes' }
]

const STATE_LABEL: Record<ApiItemState, ItemState> = {
  RUPTURE: 'Rupture',
  STOCK_FAIBLE: 'Stock faible',
  DISPONIBLE: 'Disponible'
}

function toItem(i: ApiDepotItem): DepotItem {
  return {
    id: i.id,
    name: i.name,
    category: i.category,
    depotId: i.depotId,
    depot: i.depot,
    available: i.available,
    minThreshold: i.minThreshold,
    state: STATE_LABEL[i.state],
    lastMovement: i.lastMovementAt ? new Date(i.lastMovementAt).toLocaleDateString('fr-FR') : '—'
  }
}

function initials(name: string): string {
  return name.trim().slice(0, 2).toUpperCase()
}

export function StocksPage(): JSX.Element {
  const [depots, setDepots] = useState<ApiDepot[]>([])
  const [items, setItems] = useState<DepotItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingItem, setEditingItem] = useState<DepotItem | null>(null)
  const [deletingItem, setDeletingItem] = useState<DepotItem | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([window.api.stocks.depots(), window.api.stocks.items()]).then(([depotsResult, itemsResult]) => {
      if (cancelled) return
      if (depotsResult.ok) setDepots(depotsResult.data.depots)
      if (itemsResult.ok) {
        setItems(itemsResult.data.items.map(toItem))
      } else {
        setError(itemsResult.error)
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return items
    return items.filter((i) => `${i.name} ${i.category} ${i.depot}`.toLowerCase().includes(term))
  }, [search, items])

  const ruptures = useMemo(() => items.filter((i) => i.state === 'Rupture'), [items])
  const stockFaible = useMemo(() => items.filter((i) => i.state === 'Stock faible'), [items])
  const availabilityRate = items.length === 0 ? null : Math.round(((items.length - ruptures.length) / items.length) * 100)

  const depotsWithAvailability: (Depot & { availabilityLabel: number })[] = useMemo(
    () =>
      depots.map((d) => {
        const depotItems = items.filter((i) => i.depotId === d.id)
        const available = depotItems.filter((i) => i.state !== 'Rupture').length
        const availability = depotItems.length === 0 ? 100 : Math.round((available / depotItems.length) * 100)
        return { id: d.id, name: d.name, refs: d.refs, totalUnits: d.totalUnits, availability, availabilityLabel: availability }
      }),
    [depots, items]
  )

  const categoryBreakdown = useMemo(() => {
    const counts = new Map<string, number>()
    for (const i of items) counts.set(i.category, (counts.get(i.category) ?? 0) + 1)
    const total = items.length
    return Array.from(counts.entries())
      .map(([label, count]) => ({ label, percent: total === 0 ? 0 : Math.round((count / total) * 100) }))
      .sort((a, b) => b.percent - a.percent)
  }, [items])

  const categoryDonutBackground = useMemo(() => {
    let cursor = 0
    const stops = categoryBreakdown.map(({ label, percent }) => {
      const start = cursor
      cursor += percent
      return `${CATEGORY_CHART_COLOR[label] ?? CATEGORY_CHART_COLOR.Autres} ${start}% ${cursor}%`
    })
    return `conic-gradient(${stops.join(', ')})`
  }, [categoryBreakdown])

  const depotBreakdown = useMemo(() => {
    const total = depots.reduce((sum, d) => sum + d.refs, 0)
    return depots
      .map((d) => ({ label: d.name, percent: total === 0 ? 0 : Math.round((d.refs / total) * 100) }))
      .sort((a, b) => b.percent - a.percent)
  }, [depots])

  const depotDonutBackground = useMemo(() => {
    let cursor = 0
    const stops = depotBreakdown.map(({ label, percent }) => {
      const start = cursor
      cursor += percent
      return `${DEPOT_CHART_COLOR[label] ?? '#9ca3af'} ${start}% ${cursor}%`
    })
    return `conic-gradient(${stops.join(', ')})`
  }, [depotBreakdown])

  const totalUnits = useMemo(() => items.reduce((sum, i) => sum + i.available, 0), [items])

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        breadcrumb={['Accueil', 'Stocks & Dépôts']}
        title="Stocks & Dépôts"
        subtitle="Gestion des stocks généraux, non pharmaceutiques et non sanguins, de l'établissement."
        actions={
          <Button onClick={() => setShowCreateModal(true)} disabled={depots.length === 0}>
            <Plus className="h-4 w-4" />
            Nouvel article
          </Button>
        }
      />

      {showCreateModal && (
        <DepotItemFormModal
          depots={depots}
          onClose={() => setShowCreateModal(false)}
          onCreated={(item) => {
            setItems((prev) => [...prev, toItem(item)])
            setShowCreateModal(false)
          }}
        />
      )}

      {editingItem && (
        <DepotItemFormModal
          depots={depots}
          editing={editingItem}
          onClose={() => setEditingItem(null)}
          onCreated={(item) => {
            const updated = toItem(item)
            setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
            setEditingItem(null)
          }}
        />
      )}

      {deletingItem && (
        <ConfirmDialog
          title="Supprimer l'article"
          message={`Voulez-vous vraiment supprimer l'article ${deletingItem.name} ?`}
          onCancel={() => setDeletingItem(null)}
          onConfirm={() => window.api.stocks.delete(deletingItem.id)}
          onConfirmed={() => {
            setItems((prev) => prev.filter((i) => i.id !== deletingItem.id))
            setDeletingItem(null)
          }}
        />
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-24 text-sm text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement des stocks…
        </div>
      ) : error ? (
        <p className="py-12 text-center text-sm text-red-500">{error}</p>
      ) : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-t-4 border-t-blue-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Références actives</p>
              <p className="text-xl font-bold text-gray-900">{items.length}</p>
            </Card>
            <Card className="border-t-4 border-t-emerald-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
                <Gauge className="h-5 w-5 text-emerald-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Taux de disponibilité</p>
              <p className="text-xl font-bold text-gray-900">{availabilityRate === null ? '—' : `${availabilityRate}%`}</p>
            </Card>
            <Card className="border-t-4 border-t-amber-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50">
                <TriangleAlert className="h-5 w-5 text-amber-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Stocks faibles</p>
              <p className="text-xl font-bold text-gray-900">{stockFaible.length}</p>
            </Card>
            <Card className="border-t-4 border-t-red-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50">
                <PackageX className="h-5 w-5 text-red-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Ruptures</p>
              <p className="text-xl font-bold text-gray-900">{ruptures.length}</p>
            </Card>
          </div>

          <div className="flex items-start gap-2.5 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-xs text-blue-800">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
            Ce module gère uniquement les stocks généraux (hôtellerie, hygiène, entretien,
            maintenance...). Les médicaments sont gérés dans la Pharmacie et les produits sanguins
            dans la Banque de sang.
          </div>

          {/* Aperçu des dépôts */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Aperçu des dépôts</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {depotsWithAvailability.map((depot) => (
                <Card key={depot.id} className="p-4">
                  <p className="text-sm font-semibold text-gray-900">{depot.name}</p>
                  <p className="mt-1 text-lg font-bold text-gray-900">{depot.totalUnits.toLocaleString('fr-FR')} unités</p>
                  <p className="text-xs text-gray-400">{depot.refs} références</p>
                  <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                    <span>Disponibilité</span>
                    <span className="font-medium text-gray-900">{depot.availabilityLabel}%</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${depot.availabilityLabel}%` }} />
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Liste principale */}
            <Card className="p-0 lg:col-span-2">
              <div className="flex flex-wrap items-center gap-1 border-b border-gray-100 px-4 pt-2">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={
                      'rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ' +
                      (activeTab === tab.id
                        ? 'border-accent-500 text-accent-700'
                        : 'border-transparent text-gray-500 hover:text-gray-800')
                    }
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeTab !== 'overview' ? (
                <p className="px-6 py-12 text-center text-sm text-gray-400">
                  Module « {TABS.find((t) => t.id === activeTab)?.label} » à spécifier.
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-6 py-3">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Rechercher un article, une référence, un dépôt..."
                        className="w-72 rounded-lg border border-gray-200 py-1.5 pl-8 pr-3 text-xs text-gray-700 placeholder:text-gray-400 focus:border-accent-500 focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="secondary" size="sm">
                        <FileSpreadsheet className="h-3.5 w-3.5" />
                        Export Excel
                      </Button>
                      <Button variant="secondary" size="sm">
                        <Columns3 className="h-3.5 w-3.5" />
                        Colonnes
                      </Button>
                      <Button variant="secondary" size="sm">
                        <Printer className="h-3.5 w-3.5" />
                        Imprimer
                      </Button>
                    </div>
                  </div>

                  {rows.length === 0 ? (
                    <p className="px-6 py-8 text-center text-sm text-gray-400">Aucun article ne correspond à cette recherche.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                            <th className="px-6 py-2.5 font-medium">Article</th>
                            <th className="px-6 py-2.5 font-medium">Catégorie</th>
                            <th className="px-6 py-2.5 font-medium">Dépôt</th>
                            <th className="px-6 py-2.5 font-medium">Disponible</th>
                            <th className="px-6 py-2.5 font-medium">État</th>
                            <th className="px-6 py-2.5 font-medium">Dernier mouvement</th>
                            <th className="px-6 py-2.5 font-medium" />
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((item) => (
                            <tr key={item.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                              <td className="px-6 py-3">
                                <div className="flex items-center gap-2.5">
                                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-50 text-[11px] font-semibold text-accent-700">
                                    {initials(item.name)}
                                  </span>
                                  <span className="font-medium text-gray-900">{item.name}</span>
                                </div>
                              </td>
                              <td className="px-6 py-3 text-gray-600">{item.category}</td>
                              <td className="px-6 py-3 text-gray-600">{item.depot}</td>
                              <td className="px-6 py-3 text-gray-600">
                                {item.available} <span className="text-xs text-gray-400">/ seuil {item.minThreshold}</span>
                              </td>
                              <td className="px-6 py-3">
                                <StatusBadge label={item.state} tone={itemStateTone(item.state)} />
                              </td>
                              <td className="px-6 py-3 text-gray-600">{item.lastMovement}</td>
                              <td className="px-6 py-3">
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => setEditingItem(item)}
                                    title="Modifier l'article"
                                    className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => setDeletingItem(item)}
                                    title="Supprimer l'article"
                                    className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                  <button className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 px-6 py-3 text-xs text-gray-400">
                    <span>Affichage de {rows.length === 0 ? 0 : 1} à {rows.length} sur {items.length} articles</span>
                  </div>
                </>
              )}
            </Card>

            {/* Colonne latérale */}
            <div className="space-y-6">
              <Card>
                <h3 className="mb-4 flex items-center justify-between text-sm font-semibold text-gray-900">
                  Filtres
                  <button className="text-xs font-normal text-accent-600 hover:text-accent-500">Réinitialiser</button>
                </h3>
                <div className="space-y-3">
                  {FILTER_FIELDS.map((field) => (
                    <div key={field.label}>
                      <label className="mb-1 block text-xs font-medium text-gray-500">{field.label}</label>
                      <select className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 focus:border-accent-500 focus:outline-none">
                        <option>{field.value}</option>
                      </select>
                    </div>
                  ))}
                  <Button size="sm" className="w-full">
                    Filtrer
                  </Button>
                </div>
              </Card>

              <Card>
                <h3 className="mb-4 text-sm font-semibold text-gray-900">Répartition par catégorie</h3>
                {categoryBreakdown.length === 0 ? (
                  <p className="text-xs text-gray-400">Aucune donnée.</p>
                ) : (
                  <div className="flex items-center gap-5">
                    <div
                      className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full"
                      style={{ background: categoryDonutBackground }}
                    >
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-xs font-bold text-gray-900">
                        {items.length}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {categoryBreakdown.map(({ label, percent }) => (
                        <div key={label} className="flex items-center gap-1.5 text-xs">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: CATEGORY_CHART_COLOR[label] ?? CATEGORY_CHART_COLOR.Autres }}
                          />
                          <span className="text-gray-600">{label}</span>
                          <span className="font-medium text-gray-900">{percent}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>

          {/* Panneaux du bas */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="p-0">
              <div className="border-b border-gray-100 px-5 py-3.5">
                <h3 className="text-sm font-semibold text-gray-900">Alertes</h3>
              </div>
              <div className="space-y-3 p-5">
                {ruptures.length === 0 && stockFaible.length === 0 ? (
                  <p className="text-xs text-gray-400">Aucune alerte pour le moment.</p>
                ) : (
                  <>
                    {ruptures.length > 0 && (
                      <div className="flex items-start gap-2.5 text-xs">
                        <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                        <span className="text-gray-600">{ruptures.length} article{ruptures.length > 1 ? 's' : ''} en rupture</span>
                      </div>
                    )}
                    {stockFaible.length > 0 && (
                      <div className="flex items-start gap-2.5 text-xs">
                        <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                        <span className="text-gray-600">{stockFaible.length} article{stockFaible.length > 1 ? 's' : ''} en stock faible</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </Card>

            <Card>
              <h3 className="mb-4 text-sm font-semibold text-gray-900">Répartition par dépôt</h3>
              {depotBreakdown.length === 0 ? (
                <p className="text-xs text-gray-400">Aucune donnée.</p>
              ) : (
                <div className="flex items-center gap-4">
                  <div
                    className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full"
                    style={{ background: depotDonutBackground }}
                  >
                    <div className="h-11 w-11 rounded-full bg-white" />
                  </div>
                  <div className="space-y-1 text-[11px]">
                    {depotBreakdown.map(({ label, percent }) => (
                      <div key={label} className="flex items-center gap-1.5">
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: DEPOT_CHART_COLOR[label] ?? '#9ca3af' }}
                        />
                        <span className="text-gray-600">{label}</span>
                        <span className="font-medium text-gray-900">{percent}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <p className="mt-3 text-center text-xs text-gray-400">Total {totalUnits.toLocaleString('fr-FR')} unités</p>
            </Card>
          </div>

          {/* Actions rapides */}
          <Card className="p-0">
            <div className="border-b border-gray-100 px-6 py-4">
              <h3 className="text-sm font-semibold text-gray-900">Actions rapides</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 p-6 sm:grid-cols-4 lg:grid-cols-7">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  className="flex flex-col items-center gap-2 rounded-xl border border-gray-100 py-4 text-center transition-all hover:-translate-y-0.5 hover:border-accent-200 hover:shadow-sm"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-50 text-accent-600">
                    <action.icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-medium text-gray-700">{action.label}</span>
                </button>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
