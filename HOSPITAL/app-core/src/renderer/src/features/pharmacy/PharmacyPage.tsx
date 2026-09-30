import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Package,
  TriangleAlert,
  PackageX,
  Clock,
  Boxes,
  Pill,
  ClipboardList,
  Bell,
  ShoppingCart,
  ArrowRight,
  MoreHorizontal,
  Pencil,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  ClipboardCheck,
  Undo2,
  SlidersHorizontal,
  Search,
  Tags,
  Info,
  Loader2,
  Plus,
  Trash2
} from 'lucide-react'
import { Card } from '@renderer/components/Card'
import { PageHeader } from '@renderer/components/PageHeader'
import { Button } from '@renderer/components/Button'
import { StatusBadge } from '@renderer/components/StatusBadge'
import { ConfirmDialog } from '@renderer/components/ConfirmDialog'
import type { PageId } from '@renderer/features/shell/nav-types'
import type { ApiMedication, ApiStockState } from '@shared/pharmacy-types'
import { stockStateTone, CATEGORY_CHART_COLOR } from './status'
import type { MedicationStock, StockState } from './types'
import { MedicationFormModal } from './MedicationFormModal'
import { SortableGroup } from '@renderer/components/SortableGroup'

interface PharmacyPageProps {
  onNavigate: (page: PageId) => void
}

const FEATURE_CARDS = [
  { icon: Pill, color: 'violet', title: 'Médicaments', description: 'Consulter le catalogue des médicaments, catégories, formes et lots.', cta: 'Voir les médicaments', page: null },
  { icon: Boxes, color: 'emerald', title: 'Stock', description: 'Voir les quantités disponibles, niveaux, emplacements et mouvements.', cta: 'Voir le stock', page: 'stocks' as PageId },
  { icon: ClipboardList, color: 'blue', title: 'Délivrances', description: 'Voir les délivrances aux patients et aux services de l’hôpital.', cta: 'Voir les délivrances', page: null },
  { icon: Bell, color: 'amber', title: 'À surveiller', description: 'Alertes, ruptures, stocks faibles et produits bientôt périmés.', cta: 'Voir les alertes', page: null },
  { icon: ShoppingCart, color: 'blue', title: 'Besoin de réapprovisionnement', description: 'Créer un besoin qui sera transmis à Achats & Fournisseurs.', cta: 'Créer un besoin', page: 'procurement' as PageId }
]

const COLOR_CLASSES: Record<string, string> = {
  violet: 'bg-violet-50 text-violet-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  blue: 'bg-blue-50 text-blue-600',
  amber: 'bg-amber-50 text-amber-600'
}

const STATE_LABEL: Record<ApiStockState, StockState> = {
  RUPTURE: 'Rupture',
  STOCK_FAIBLE: 'Stock faible',
  DISPONIBLE: 'Disponible'
}

function toRecord(m: ApiMedication): MedicationStock {
  return {
    id: m.id,
    name: m.name,
    category: m.category,
    available: m.available,
    minThreshold: m.minThreshold,
    state: STATE_LABEL[m.state],
    nearestExpiry: m.nearestExpiry ? new Date(m.nearestExpiry).toLocaleDateString('fr-FR') : null,
    location: m.location
  }
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

export function PharmacyPage({ onNavigate }: PharmacyPageProps): JSX.Element {
  const [medications, setMedications] = useState<MedicationStock[]>([])
  const [pharmacyNeeds, setPharmacyNeeds] = useState(0)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingMedication, setEditingMedication] = useState<ApiMedication | null>(null)
  const [deletingMedication, setDeletingMedication] = useState<MedicationStock | null>(null)
  const [rawMedications, setRawMedications] = useState<ApiMedication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([window.api.pharmacy.list(), window.api.procurement.list()]).then(([medResult, procResult]) => {
      if (cancelled) return
      if (medResult.ok) {
        setRawMedications(medResult.data.medications)
        setMedications(medResult.data.medications.map(toRecord))
      } else {
        setError(medResult.error)
      }
      if (procResult.ok) {
        setPharmacyNeeds(
          procResult.data.requests.filter((r) => r.category === 'Pharmacie' && r.status === 'A_VALIDER').length
        )
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const stockFaible = useMemo(() => medications.filter((m) => m.state === 'Stock faible'), [medications])
  const ruptures = useMemo(() => medications.filter((m) => m.state === 'Rupture'), [medications])
  const expiringSoon = useMemo(
    () => medications.filter((m) => m.nearestExpiry && new Date(m.nearestExpiry).getTime() - Date.now() < THIRTY_DAYS_MS),
    [medications]
  )
  const totalUnits = useMemo(() => medications.reduce((sum, m) => sum + m.available, 0), [medications])

  const WATCH_STRIP = [
    { count: ruptures.length, label: 'Médicaments en rupture', tone: 'text-red-600', bg: 'bg-red-50' },
    { count: stockFaible.length, label: 'Stocks faibles', tone: 'text-amber-600', bg: 'bg-amber-50' },
    { count: expiringSoon.length, label: 'Bientôt périmés (< 30 jours)', tone: 'text-orange-600', bg: 'bg-orange-50' },
    { count: pharmacyNeeds, label: 'Besoins à transmettre', tone: 'text-blue-600', bg: 'bg-blue-50' }
  ]

  const categoryBreakdown = useMemo(() => {
    const counts = new Map<string, number>()
    for (const m of medications) counts.set(m.category, (counts.get(m.category) ?? 0) + 1)
    const total = medications.length
    return Array.from(counts.entries())
      .map(([label, count]) => ({ label, percent: total === 0 ? 0 : Math.round((count / total) * 100) }))
      .sort((a, b) => b.percent - a.percent)
  }, [medications])

  const categoryDonutBackground = useMemo(() => {
    let cursor = 0
    const stops = categoryBreakdown.map(({ label, percent }) => {
      const start = cursor
      cursor += percent
      return `${CATEGORY_CHART_COLOR[label] ?? CATEGORY_CHART_COLOR.Autres} ${start}% ${cursor}%`
    })
    return `conic-gradient(${stops.join(', ')})`
  }, [categoryBreakdown])

  const stockByLocation = useMemo(() => {
    const counts = new Map<string, number>()
    for (const m of medications) counts.set(m.location, (counts.get(m.location) ?? 0) + m.available)
    return Array.from(counts.entries())
      .map(([label, units]) => ({ label, units }))
      .sort((a, b) => b.units - a.units)
  }, [medications])
  const maxLocationUnits = Math.max(1, ...stockByLocation.map((l) => l.units))

  const reorderNeeds = useMemo(() => [...ruptures, ...stockFaible], [ruptures, stockFaible])

  const filteredMedications = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return medications
    return medications.filter((m) => `${m.name} ${m.category} ${m.location}`.toLowerCase().includes(term))
  }, [medications, search])

  function handleFocusStockTable(): void {
    searchInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    searchInputRef.current?.focus()
  }

  const QUICK_ACTIONS: { icon: typeof ArrowDownToLine; label: string; onClick?: () => void }[] = [
    { icon: ArrowDownToLine, label: 'Entrée de stock', onClick: () => setShowCreateModal(true) },
    { icon: ArrowUpFromLine, label: 'Sortie de stock' },
    { icon: ArrowLeftRight, label: 'Transfert' },
    { icon: ClipboardCheck, label: 'Inventaire rapide', onClick: handleFocusStockTable },
    { icon: Undo2, label: 'Retour produit' },
    { icon: SlidersHorizontal, label: 'Ajustement stock', onClick: handleFocusStockTable },
    { icon: Search, label: 'Recherche produit', onClick: handleFocusStockTable },
    { icon: Tags, label: 'Imprimer étiquettes' }
  ]

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        breadcrumb={['Accueil', 'Pharmacie']}
        title="Pharmacie"
        subtitle="Gestion des médicaments et des délivrances."
        actions={
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4" />
            Nouveau médicament
          </Button>
        }
      />

      {showCreateModal && (
        <MedicationFormModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(medication) => {
            setRawMedications((prev) => [...prev, medication])
            setMedications((prev) => [...prev, toRecord(medication)])
            setShowCreateModal(false)
          }}
        />
      )}

      {editingMedication && (
        <MedicationFormModal
          editing={editingMedication}
          onClose={() => setEditingMedication(null)}
          onCreated={(medication) => {
            setRawMedications((prev) => prev.map((m) => (m.id === medication.id ? medication : m)))
            setMedications((prev) => prev.map((m) => (m.id === medication.id ? toRecord(medication) : m)))
            setEditingMedication(null)
          }}
        />
      )}

      {deletingMedication && (
        <ConfirmDialog
          title="Supprimer le médicament"
          message={`Voulez-vous vraiment supprimer ${deletingMedication.name} ?`}
          onCancel={() => setDeletingMedication(null)}
          onConfirm={() => window.api.pharmacy.delete(deletingMedication.id)}
          onConfirmed={() => {
            setRawMedications((prev) => prev.filter((m) => m.id !== deletingMedication.id))
            setMedications((prev) => prev.filter((m) => m.id !== deletingMedication.id))
            setDeletingMedication(null)
          }}
        />
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-24 text-sm text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement de la pharmacie…
        </div>
      ) : error ? (
        <p className="py-12 text-center text-sm text-red-500">{error}</p>
      ) : (
        <SortableGroup id="pharmacy.grid1" className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Colonne principale */}
          <div className="space-y-6 lg:col-span-2">
            {/* KPI row */}
            <SortableGroup id="pharmacy.grid2" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              <Card className="border-t-4 border-t-violet-400 p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50">
                  <Boxes className="h-5 w-5 text-violet-600" />
                </div>
                <p className="mt-3 text-xs font-medium text-gray-500">Unités en stock</p>
                <p className="text-xl font-bold text-gray-900">{totalUnits.toLocaleString('fr-FR')}</p>
              </Card>
              <Card className="border-t-4 border-t-emerald-400 p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
                  <Package className="h-5 w-5 text-emerald-600" />
                </div>
                <p className="mt-3 text-xs font-medium text-gray-500">Médicaments disponibles</p>
                <p className="text-xl font-bold text-gray-900">{medications.length}</p>
                <p className="text-xs text-gray-400">Références</p>
              </Card>
              <Card className="border-t-4 border-t-amber-400 p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50">
                  <TriangleAlert className="h-5 w-5 text-amber-600" />
                </div>
                <p className="mt-3 text-xs font-medium text-gray-500">Stocks faibles</p>
                <p className="text-xl font-bold text-gray-900">{stockFaible.length}</p>
                <p className="text-xs text-gray-400">Références</p>
              </Card>
              <Card className="border-t-4 border-t-red-400 p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50">
                  <PackageX className="h-5 w-5 text-red-600" />
                </div>
                <p className="mt-3 text-xs font-medium text-gray-500">Ruptures de stock</p>
                <p className="text-xl font-bold text-gray-900">{ruptures.length}</p>
                <p className="text-xs text-gray-400">Références</p>
              </Card>
              <Card className="border-t-4 border-t-orange-400 p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50">
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
                <p className="mt-3 text-xs font-medium text-gray-500">Péremptions &lt; 30 jours</p>
                <p className="text-xl font-bold text-gray-900">{expiringSoon.length}</p>
                <p className="text-xs text-gray-400">Références</p>
              </Card>
            </SortableGroup>

            {/* Cartes de modules */}
            <SortableGroup id="pharmacy.grid3" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {FEATURE_CARDS.map((card) => (
                <Card key={card.title} className="flex flex-col">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${COLOR_CLASSES[card.color]}`}>
                    <card.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-gray-900">{card.title}</h3>
                  <p className="mt-1 flex-1 text-xs text-gray-500">{card.description}</p>
                  <button
                    onClick={() => card.page && onNavigate(card.page)}
                    className="mt-3 flex items-center gap-1 text-xs font-medium text-accent-600 hover:text-accent-500"
                  >
                    {card.cta}
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </Card>
              ))}
            </SortableGroup>

            {/* À surveiller aujourd'hui */}
            <div>
              <h3 className="mb-3 text-sm font-semibold text-gray-900">À surveiller aujourd&apos;hui</h3>
              <SortableGroup id="pharmacy.grid4" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {WATCH_STRIP.map((w) => (
                  <Card key={w.label} className={`${w.bg} p-4`}>
                    <p className={`text-2xl font-bold ${w.tone}`}>{w.count}</p>
                    <p className="mt-1 text-xs font-medium text-gray-700">{w.label}</p>
                  </Card>
                ))}
              </SortableGroup>
            </div>

            {/* Stocks critiques + répartition */}
            <SortableGroup id="pharmacy.grid5" className="grid grid-cols-1 gap-6 xl:grid-cols-5">
              <Card className="p-0 xl:col-span-3">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-6 py-4">
                  <h3 className="text-sm font-semibold text-gray-900">Stocks critiques</h3>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                    <input
                      ref={searchInputRef}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Rechercher un médicament, une catégorie..."
                      className="w-64 rounded-lg border border-gray-200 py-1.5 pl-8 pr-3 text-xs text-gray-700 placeholder:text-gray-400 focus:border-accent-500 focus:outline-none"
                    />
                  </div>
                </div>
                {medications.length === 0 ? (
                  <p className="px-6 py-8 text-center text-sm text-gray-400">Aucun médicament enregistré.</p>
                ) : filteredMedications.length === 0 ? (
                  <p className="px-6 py-8 text-center text-sm text-gray-400">Aucun médicament ne correspond à cette recherche.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                          <th className="px-6 py-2.5 font-medium">Médicament</th>
                          <th className="px-6 py-2.5 font-medium">Catégorie</th>
                          <th className="px-6 py-2.5 font-medium">Disponible</th>
                          <th className="px-6 py-2.5 font-medium">État</th>
                          <th className="px-6 py-2.5 font-medium">Emplacement</th>
                          <th className="px-6 py-2.5 font-medium" />
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMedications.map((m) => (
                          <tr key={m.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                            <td className="px-6 py-3 font-medium text-gray-900">{m.name}</td>
                            <td className="px-6 py-3 text-gray-600">{m.category}</td>
                            <td className="px-6 py-3 text-gray-600">
                              {m.available} <span className="text-xs text-gray-400">/ seuil {m.minThreshold}</span>
                            </td>
                            <td className="px-6 py-3">
                              <StatusBadge label={m.state} tone={stockStateTone(m.state)} />
                            </td>
                            <td className="px-6 py-3 text-gray-600">{m.location}</td>
                            <td className="px-6 py-3">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => setEditingMedication(rawMedications.find((r) => r.id === m.id) ?? null)}
                                  title="Modifier le médicament"
                                  className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => setDeletingMedication(m)}
                                  title="Supprimer le médicament"
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
              </Card>

              <div className="space-y-6 xl:col-span-2">
                <Card>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900">Répartition par catégorie</h3>
                  </div>
                  {categoryBreakdown.length === 0 ? (
                    <p className="text-xs text-gray-400">Aucune donnée.</p>
                  ) : (
                    <div className="flex items-center gap-4">
                      <div
                        className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full"
                        style={{ background: categoryDonutBackground }}
                      >
                        <div className="h-11 w-11 rounded-full bg-white" />
                      </div>
                      <div className="space-y-1 text-[11px]">
                        {categoryBreakdown.map(({ label, percent }) => (
                          <div key={label} className="flex items-center gap-1.5">
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: CATEGORY_CHART_COLOR[label] ?? CATEGORY_CHART_COLOR.Autres }}
                            />
                            <span className="text-gray-600">{label}</span>
                            <span className="font-medium text-gray-900">{percent}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-2 text-xs text-gray-500">
                    <span>Total {medications.length} références</span>
                    <span>{totalUnits.toLocaleString('fr-FR')} unités</span>
                  </div>
                </Card>
              </div>
            </SortableGroup>

            {/* Actions rapides */}
            <Card className="p-0">
              <div className="border-b border-gray-100 px-6 py-4">
                <h3 className="text-sm font-semibold text-gray-900">Actions rapides</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 p-6 sm:grid-cols-4">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    onClick={action.onClick}
                    disabled={!action.onClick}
                    title={action.onClick ? undefined : 'Fonctionnalité non disponible pour le moment'}
                    className="flex flex-col items-center gap-2 rounded-xl border border-gray-100 py-4 text-center transition-all hover:-translate-y-0.5 hover:border-accent-200 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-50 text-accent-600">
                      <action.icon className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-medium text-gray-700">{action.label}</span>
                  </button>
                ))}
              </div>
            </Card>
          </div>

          {/* Colonne latérale */}
          <SortableGroup id="pharmacy.side1" className="space-y-6">
            <Card>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Stock par emplacement</h3>
              </div>
              {stockByLocation.length === 0 ? (
                <p className="text-xs text-gray-400">Aucune donnée.</p>
              ) : (
                <div className="space-y-3">
                  {stockByLocation.map((loc) => (
                    <div key={loc.label}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-gray-600">{loc.label}</span>
                        <span className="font-medium text-gray-900">{loc.units.toLocaleString('fr-FR')} unités</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-full rounded-full bg-accent-500"
                          style={{ width: `${(loc.units / maxLocationUnits) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Besoin de réapprovisionnement</h3>
              </div>
              {reorderNeeds.length === 0 ? (
                <p className="text-xs text-gray-400">Aucun besoin identifié.</p>
              ) : (
                <div className="space-y-3">
                  {reorderNeeds.map((n) => (
                    <div key={n.id} className="flex items-center justify-between text-xs">
                      <span className="text-gray-700">{n.name}</span>
                      <span className="text-gray-400">
                        Disponible : {n.available} / seuil {n.minThreshold}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <Button className="mt-4 w-full" onClick={() => onNavigate('procurement')}>
                Voir les besoins dans Achats
              </Button>
            </Card>

            <Card className="bg-gradient-to-br from-white to-accent-50/40">
              <div className="flex items-start gap-2.5">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent-500" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">Bon à savoir</p>
                  <p className="mt-1 text-xs text-gray-600">
                    La gestion des fournisseurs, commandes et réceptions se fait dans le module Achats &amp;
                    Fournisseurs.
                  </p>
                </div>
              </div>
              <Button variant="secondary" size="sm" className="mt-3 w-full" onClick={() => onNavigate('procurement')}>
                Accéder au module
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Card>
          </SortableGroup>
        </SortableGroup>
      )}
    </div>
  )
}
