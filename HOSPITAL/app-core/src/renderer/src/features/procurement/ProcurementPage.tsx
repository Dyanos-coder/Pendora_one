import { useEffect, useMemo, useState } from 'react'
import {
  ClipboardList,
  TriangleAlert,
  Truck,
  Star,
  Search,
  FileSpreadsheet,
  Printer,
  MoreHorizontal,
  Pencil,
  Loader2,
  CircleCheck,
  Clock,
  PackageCheck,
  ShoppingCart,
  BadgeCheck,
  Plus,
  Trash2
} from 'lucide-react'
import { Card } from '@renderer/components/Card'
import { PageHeader } from '@renderer/components/PageHeader'
import { Button } from '@renderer/components/Button'
import { StatusBadge } from '@renderer/components/StatusBadge'
import { ConfirmDialog } from '@renderer/components/ConfirmDialog'
import type { ApiProcurementPriority, ApiProcurementRequest, ApiProcurementStatus, ApiSupplier } from '@shared/procurement-types'
import { procurementPriorityTone, procurementStatusTone, STATUS_CHART_COLOR } from './status'
import type { ProcurementPriority, ProcurementRequest, ProcurementStatus, Supplier } from './types'
import { ProcurementRequestFormModal } from './ProcurementRequestFormModal'
import { OrdersTab } from './tabs/OrdersTab'
import { ReceptionsTab } from './tabs/ReceptionsTab'
import { SortableGroup } from '@renderer/components/SortableGroup'
import { PulseLoader, EmptyState } from '@renderer/components/ui/Feedback'

type Tab = 'needs' | 'purchaseRequests' | 'orders' | 'receptions' | 'suppliers'

const TABS: { id: Tab; label: string }[] = [
  { id: 'needs', label: 'Besoins exprimés' },
  { id: 'purchaseRequests', label: "Demandes d'achat" },
  { id: 'orders', label: 'Commandes' },
  { id: 'receptions', label: 'Réceptions' },
  { id: 'suppliers', label: 'Fournisseurs' }
]

const STATUS_LABEL: Record<ApiProcurementStatus, ProcurementStatus> = {
  A_VALIDER: 'À valider',
  VALIDE: 'Validé',
  COMMANDE: 'Commandé',
  RECU: 'Reçu',
  RETARD: 'Retard'
}

const PRIORITY_LABEL: Record<ApiProcurementPriority, ProcurementPriority> = {
  NORMALE: 'Normale',
  URGENTE: 'Urgente'
}

const PIPELINE_STAGES: { status: ProcurementStatus; label: string; icon: typeof CircleCheck }[] = [
  { status: 'À valider', label: 'À valider', icon: Clock },
  { status: 'Validé', label: 'Validé', icon: CircleCheck },
  { status: 'Commandé', label: 'Commandé', icon: ShoppingCart },
  { status: 'Reçu', label: 'Reçu', icon: PackageCheck },
  { status: 'Retard', label: 'Retard', icon: TriangleAlert }
]

function toRequest(r: ApiProcurementRequest): ProcurementRequest {
  return {
    id: r.id,
    reference: r.reference,
    date: new Date(r.requestedAt).toLocaleDateString('fr-FR'),
    article: r.article,
    category: r.category,
    quantity: r.quantity,
    priority: PRIORITY_LABEL[r.priority],
    status: STATUS_LABEL[r.status],
    requester: r.requester
  }
}

function toSupplier(s: ApiSupplier): Supplier {
  return { name: s.name, orders: s.orders, onTimePercent: s.onTimePercent, quality: s.quality, rating: s.rating }
}

export function ProcurementPage(): JSX.Element {
  const [requests, setRequests] = useState<ProcurementRequest[]>([])
  const [rawRequests, setRawRequests] = useState<ApiProcurementRequest[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [rawSuppliers, setRawSuppliers] = useState<ApiSupplier[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingRequest, setEditingRequest] = useState<ApiProcurementRequest | null>(null)
  const [deletingRequest, setDeletingRequest] = useState<ProcurementRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('needs')
  const [search, setSearch] = useState('')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([window.api.procurement.list(), window.api.procurement.suppliers()]).then(([reqResult, supResult]) => {
      if (cancelled) return
      if (reqResult.ok) {
        setRawRequests(reqResult.data.requests)
        setRequests(reqResult.data.requests.map(toRequest))
      } else setError(reqResult.error)
      if (supResult.ok) {
        setRawSuppliers(supResult.data.suppliers)
        setSuppliers(supResult.data.suppliers.map(toSupplier))
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return requests
    return requests.filter((r) => `${r.article} ${r.reference} ${r.requester} ${r.category}`.toLowerCase().includes(term))
  }, [search, requests])

  const enAttente = useMemo(() => requests.filter((r) => r.status === 'À valider'), [requests])
  const urgentes = useMemo(() => requests.filter((r) => r.priority === 'Urgente'), [requests])
  const retards = useMemo(() => requests.filter((r) => r.status === 'Retard'), [requests])
  const avgOnTime = useMemo(
    () => (suppliers.length === 0 ? null : Math.round(suppliers.reduce((sum, s) => sum + s.onTimePercent, 0) / suppliers.length)),
    [suppliers]
  )

  const pipeline = useMemo(
    () => PIPELINE_STAGES.map((stage) => ({ ...stage, count: requests.filter((r) => r.status === stage.status).length })),
    [requests]
  )

  const statusBreakdown = useMemo(() => {
    const counts = new Map<ProcurementStatus, number>()
    for (const r of requests) counts.set(r.status, (counts.get(r.status) ?? 0) + 1)
    const total = requests.length
    return Array.from(counts.entries())
      .map(([label, count]) => ({ label, percent: total === 0 ? 0 : Math.round((count / total) * 100) }))
      .sort((a, b) => b.percent - a.percent)
  }, [requests])

  const statusDonutBackground = useMemo(() => {
    let cursor = 0
    const stops = statusBreakdown.map(({ label, percent }) => {
      const start = cursor
      cursor += percent
      return `${STATUS_CHART_COLOR[label]} ${start}% ${cursor}%`
    })
    return `conic-gradient(${stops.join(', ')})`
  }, [statusBreakdown])

  const topRequested = useMemo(() => {
    const totals = new Map<string, number>()
    for (const r of requests) totals.set(r.article, (totals.get(r.article) ?? 0) + r.quantity)
    return Array.from(totals.entries())
      .map(([article, quantity]) => ({ article, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)
  }, [requests])
  const maxRequested = topRequested.length === 0 ? 1 : topRequested[0].quantity

  async function handleExportExcel(): Promise<void> {
    setExporting(true)
    await window.api.procurement.exportExcel()
    setExporting(false)
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        breadcrumb={['Accueil', 'Approvisionnement']}
        title="Approvisionnement"
        subtitle="Cycle complet : besoins exprimés, demandes d'achat, commandes, réceptions et suivi fournisseurs."
        actions={
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4" />
            Nouveau besoin
          </Button>
        }
      />

      {showCreateModal && (
        <ProcurementRequestFormModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(request) => {
            setRawRequests((prev) => [...prev, request])
            setRequests((prev) => [...prev, toRequest(request)])
            setShowCreateModal(false)
          }}
        />
      )}

      {editingRequest && (
        <ProcurementRequestFormModal
          editing={editingRequest}
          onClose={() => setEditingRequest(null)}
          onCreated={(request) => {
            setRawRequests((prev) => prev.map((r) => (r.id === request.id ? request : r)))
            setRequests((prev) => prev.map((r) => (r.id === request.id ? toRequest(request) : r)))
            setEditingRequest(null)
          }}
        />
      )}

      {deletingRequest && (
        <ConfirmDialog
          title="Supprimer le besoin"
          message={`Voulez-vous vraiment supprimer le besoin ${deletingRequest.article} (${deletingRequest.reference}) ?`}
          onCancel={() => setDeletingRequest(null)}
          onConfirm={() => window.api.procurement.delete(deletingRequest.id)}
          onConfirmed={() => {
            setRawRequests((prev) => prev.filter((r) => r.id !== deletingRequest.id))
            setRequests((prev) => prev.filter((r) => r.id !== deletingRequest.id))
            setDeletingRequest(null)
          }}
        />
      )}

      {loading ? (
        <PulseLoader label="Chargement de l'approvisionnement…" />
      ) : error ? (
        <p className="py-12 text-center text-sm text-red-500">{error}</p>
      ) : (
        <>
          {/* KPI row */}
          <SortableGroup id="procurement.grid1" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-black/5 bg-blue-50">
                <ClipboardList className="h-5 w-5 text-blue-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Besoins en attente</p>
              <p className="text-xl font-display font-extrabold tabular-nums text-gray-900">{enAttente.length}</p>
            </Card>
            <Card className="p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-black/5 bg-red-50">
                <TriangleAlert className="h-5 w-5 text-red-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Demandes urgentes</p>
              <p className="text-xl font-display font-extrabold tabular-nums text-gray-900">{urgentes.length}</p>
            </Card>
            <Card className="p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-black/5 bg-amber-50">
                <Truck className="h-5 w-5 text-amber-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Commandes en retard</p>
              <p className="text-xl font-display font-extrabold tabular-nums text-gray-900">{retards.length}</p>
            </Card>
            <Card className="p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-black/5 bg-teal-50">
                <BadgeCheck className="h-5 w-5 text-teal-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Fiabilité fournisseurs (moy.)</p>
              <p className="text-xl font-display font-extrabold tabular-nums text-gray-900">{avgOnTime === null ? '—' : `${avgOnTime}%`}</p>
            </Card>
          </SortableGroup>

          {/* Pipeline */}
          <Card>
            <h3 className="mb-4 text-[15px] font-bold text-gray-900">Cycle d&apos;approvisionnement</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {pipeline.map((stage) => (
                <div key={stage.status} className="flex flex-col items-center gap-2 rounded-xl border border-gray-100 py-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-50 text-gray-500">
                    <stage.icon className="h-4.5 w-4.5" />
                  </div>
                  <p className="text-lg font-bold text-gray-900">{stage.count}</p>
                  <p className="text-xs text-gray-500">{stage.label}</p>
                </div>
              ))}
            </div>
          </Card>

          <SortableGroup id="procurement.grid2" className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="p-0 lg:col-span-2">
              <div className="flex flex-wrap items-center gap-1 border-b border-gray-100 px-4 pt-2">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={
                      'rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ' +
                      (activeTab === tab.id ? 'border-accent-500 text-accent-700' : 'border-transparent text-gray-500 hover:text-gray-800')
                    }
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeTab === 'needs' && (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-6 py-3">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Rechercher un article, une référence, un demandeur..."
                        className="w-72 rounded-[10px] border border-gray-300 py-1.5 pl-8 pr-3 text-xs text-gray-700 placeholder:text-gray-400 focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="secondary" size="sm" onClick={handleExportExcel} disabled={exporting}>
                        {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
                        Export Excel
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => window.print()}>
                        <Printer className="h-3.5 w-3.5" />
                        Imprimer
                      </Button>
                    </div>
                  </div>

                  {rows.length === 0 ? (
                    <EmptyState title="Aucune demande ne correspond à cette recherche." />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50/70 text-[11px] uppercase tracking-[0.08em] text-gray-500">
                            <th className="px-6 py-3 font-semibold">Référence</th>
                            <th className="px-6 py-3 font-semibold">Article</th>
                            <th className="px-6 py-3 font-semibold">Quantité</th>
                            <th className="px-6 py-3 font-semibold">Priorité</th>
                            <th className="px-6 py-3 font-semibold">Statut</th>
                            <th className="px-6 py-3 font-semibold">Demandeur</th>
                            <th className="px-6 py-3 font-semibold" />
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((r) => (
                            <tr key={r.id} className="border-b border-gray-100 last:border-0 transition-colors hover:bg-accent-50/40">
                              <td className="px-6 py-3 font-medium text-gray-900">{r.reference}</td>
                              <td className="px-6 py-3 text-gray-600">
                                {r.article}
                                <p className="text-xs text-gray-400">
                                  {r.category} · {r.date}
                                </p>
                              </td>
                              <td className="px-6 py-3 text-gray-600">{r.quantity}</td>
                              <td className="px-6 py-3">
                                <StatusBadge label={r.priority} tone={procurementPriorityTone(r.priority)} />
                              </td>
                              <td className="px-6 py-3">
                                <StatusBadge label={r.status} tone={procurementStatusTone(r.status)} />
                              </td>
                              <td className="px-6 py-3 text-gray-600">{r.requester}</td>
                              <td className="px-6 py-3">
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => setEditingRequest(rawRequests.find((raw) => raw.id === r.id) ?? null)}
                                    title="Modifier le besoin"
                                    className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => setDeletingRequest(r)}
                                    title="Supprimer le besoin"
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
                    <span>
                      Affichage de {rows.length === 0 ? 0 : 1} à {rows.length} sur {requests.length} besoins
                    </span>
                  </div>
                </>
              )}

              {activeTab === 'purchaseRequests' && (
                <>
                  {requests.filter((r) => r.status !== 'À valider').length === 0 ? (
                    <EmptyState title="Aucune demande d'achat validée." />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50/70 text-[11px] uppercase tracking-[0.08em] text-gray-500">
                            <th className="px-6 py-3 font-semibold">Référence</th>
                            <th className="px-6 py-3 font-semibold">Article</th>
                            <th className="px-6 py-3 font-semibold">Quantité</th>
                            <th className="px-6 py-3 font-semibold">Priorité</th>
                            <th className="px-6 py-3 font-semibold">Statut</th>
                            <th className="px-6 py-3 font-semibold">Demandeur</th>
                            <th className="px-6 py-3 font-semibold" />
                          </tr>
                        </thead>
                        <tbody>
                          {requests
                            .filter((r) => r.status !== 'À valider')
                            .map((r) => (
                              <tr key={r.id} className="border-b border-gray-100 last:border-0 transition-colors hover:bg-accent-50/40">
                                <td className="px-6 py-3 font-medium text-gray-900">{r.reference}</td>
                                <td className="px-6 py-3 text-gray-600">
                                  {r.article}
                                  <p className="text-xs text-gray-400">
                                    {r.category} · {r.date}
                                  </p>
                                </td>
                                <td className="px-6 py-3 text-gray-600">{r.quantity}</td>
                                <td className="px-6 py-3">
                                  <StatusBadge label={r.priority} tone={procurementPriorityTone(r.priority)} />
                                </td>
                                <td className="px-6 py-3">
                                  <StatusBadge label={r.status} tone={procurementStatusTone(r.status)} />
                                </td>
                                <td className="px-6 py-3 text-gray-600">{r.requester}</td>
                                <td className="px-6 py-3">
                                  <button
                                    onClick={() => setEditingRequest(rawRequests.find((raw) => raw.id === r.id) ?? null)}
                                    title="Modifier"
                                    className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <p className="border-t border-gray-100 px-6 py-3 text-xs text-gray-400">
                    Une demande d&apos;achat est un besoin exprimé une fois validé (statut différent de « À valider »).
                  </p>
                </>
              )}

              {activeTab === 'orders' && <OrdersTab requests={rawRequests} suppliers={rawSuppliers} />}

              {activeTab === 'receptions' && <ReceptionsTab />}

              {activeTab === 'suppliers' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50/70 text-[11px] uppercase tracking-[0.08em] text-gray-500">
                        <th className="px-6 py-3 font-semibold">Fournisseur</th>
                        <th className="px-6 py-3 font-semibold">Commandes</th>
                        <th className="px-6 py-3 font-semibold">Ponctualité</th>
                        <th className="px-6 py-3 font-semibold">Qualité</th>
                        <th className="px-6 py-3 font-semibold">Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {suppliers.map((s) => (
                        <tr key={s.name} className="border-b border-gray-100 last:border-0 transition-colors hover:bg-accent-50/40">
                          <td className="px-6 py-3 font-medium text-gray-900">{s.name}</td>
                          <td className="px-6 py-3 text-gray-600">{s.orders}</td>
                          <td className="px-6 py-3 text-gray-600">{s.onTimePercent}%</td>
                          <td className="px-6 py-3 text-gray-600">{s.quality}%</td>
                          <td className="px-6 py-3">
                            <span className="flex items-center gap-1 text-amber-500">
                              <Star className="h-3.5 w-3.5 fill-current" />
                              <span className="text-gray-700">{s.rating.toFixed(1)}</span>
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {/* Colonne latérale */}
            <SortableGroup id="procurement.side1" className="space-y-6">
              <Card>
                <h3 className="mb-4 text-[15px] font-bold text-gray-900">Répartition par statut</h3>
                {statusBreakdown.length === 0 ? (
                  <p className="text-xs text-gray-400">Aucune donnée.</p>
                ) : (
                  <div className="flex items-center gap-5">
                    <div
                      className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full"
                      style={{ background: statusDonutBackground }}
                    >
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-xs font-bold text-gray-900">
                        {requests.length}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {statusBreakdown.map(({ label, percent }) => (
                        <div key={label} className="flex items-center gap-1.5 text-xs">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_CHART_COLOR[label] }} />
                          <span className="text-gray-600">{label}</span>
                          <span className="font-medium text-gray-900">{percent}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>

              <Card>
                <h3 className="mb-4 text-[15px] font-bold text-gray-900">Top articles demandés</h3>
                {topRequested.length === 0 ? (
                  <p className="text-xs text-gray-400">Aucune donnée.</p>
                ) : (
                  <div className="space-y-3">
                    {topRequested.map(({ article, quantity }) => (
                      <div key={article}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="text-gray-600">{article}</span>
                          <span className="font-medium text-gray-900">{quantity}</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full bg-accent-500"
                            style={{ width: `${Math.round((quantity / maxRequested) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </SortableGroup>
          </SortableGroup>

          {/* Alertes */}
          <Card className="p-0">
            <div className="border-b border-gray-100 px-5 py-3.5">
              <h3 className="text-[15px] font-bold text-gray-900">Alertes</h3>
            </div>
            <div className="space-y-3 p-5">
              {retards.length === 0 && urgentes.length === 0 ? (
                <p className="text-xs text-gray-400">Aucune alerte pour le moment.</p>
              ) : (
                <>
                  {retards.length > 0 && (
                    <div className="flex items-start gap-2.5 text-xs">
                      <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                      <span className="text-gray-600">
                        {retards.length} commande{retards.length > 1 ? 's' : ''} en retard
                      </span>
                    </div>
                  )}
                  {urgentes.length > 0 && (
                    <div className="flex items-start gap-2.5 text-xs">
                      <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                      <span className="text-gray-600">
                        {urgentes.length} demande{urgentes.length > 1 ? 's' : ''} urgente{urgentes.length > 1 ? 's' : ''} à traiter
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
