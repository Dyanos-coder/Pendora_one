import { useEffect, useMemo, useState } from 'react'
import {
  Droplet,
  HeartHandshake,
  Truck,
  FlaskConical,
  CalendarX,
  FileUp,
  FileDown,
  Plus,
  Search,
  Eye,
  MoreHorizontal,
  Pencil,
  TriangleAlert,
  PackageCheck,
  ClipboardCheck,
  Archive,
  ClipboardList,
  FileBarChart,
  PackageX,
  Loader2,
  Trash2
} from 'lucide-react'
import { Card } from '@renderer/components/Card'
import { PageHeader } from '@renderer/components/PageHeader'
import { Button } from '@renderer/components/Button'
import { StatusBadge } from '@renderer/components/StatusBadge'
import { ConfirmDialog } from '@renderer/components/ConfirmDialog'
import type { ApiBloodPouch, ApiBloodPouchStatus, ApiTransfusionRequest } from '@shared/blood-bank-types'
import { pouchStatusTone, POUCH_TYPE_CHART_COLOR } from './status'
import type { BloodPouch, PouchStatus } from './types'
import { BloodPouchFormModal } from './BloodPouchFormModal'
import { DonationsTab } from './tabs/DonationsTab'
import { RequestsTab } from './tabs/RequestsTab'
import { TransfusionsTab } from './tabs/TransfusionsTab'
import { AnalysesTab } from './tabs/AnalysesTab'
import { SortableGroup } from '@renderer/components/SortableGroup'
import { PulseLoader, EmptyState } from '@renderer/components/ui/Feedback'

interface BloodBankPageProps {
  onOpenPatient: (patientId: string) => void
}

type Tab = 'pouches' | 'donations' | 'requests' | 'transfusions' | 'analyses' | 'expired'

const TABS: { id: Tab; label: string }[] = [
  { id: 'pouches', label: 'Poches de sang' },
  { id: 'donations', label: 'Dons de sang' },
  { id: 'requests', label: 'Demandes transfusionnelles' },
  { id: 'transfusions', label: 'Transfusions' },
  { id: 'analyses', label: 'Analyses' },
  { id: 'expired', label: 'Périmées / Retirées' }
]

const ALL_FILTER = '__all__'

const STATE_LABEL: Record<ApiBloodPouchStatus, PouchStatus> = {
  DISPONIBLE: 'Disponible',
  EN_ATTENTE_ANALYSE: 'En attente analyse',
  RESERVEE: 'Réservée',
  TRANSFUSEE: 'Transfusée',
  PERIMEE: 'Périmée',
  ECARTEE: 'Écartée'
}

function componentCategory(component: string): string {
  if (component.includes('globules rouges')) return 'Globules rouges'
  if (component.includes('Plasma')) return 'Plasma'
  if (component.includes('Plaquettes')) return 'Plaquettes'
  return 'Autres'
}

function toPouch(p: ApiBloodPouch): BloodPouch {
  return {
    id: p.id,
    pouchNumber: p.pouchNumber,
    bloodGroup: p.bloodGroup,
    component: p.component,
    volume: p.volumeMl !== null ? `${p.volumeMl} ml` : null,
    status: STATE_LABEL[p.status],
    collectionDate: new Date(p.collectionDate).toLocaleDateString('fr-FR'),
    expiryDate: new Date(p.expiryDate).toLocaleDateString('fr-FR'),
    donorName: p.donorName,
    patientId: p.patientId
  }
}

export function BloodBankPage({ onOpenPatient }: BloodBankPageProps): JSX.Element {
  const [pouches, setPouches] = useState<BloodPouch[]>([])
  const [rawPouches, setRawPouches] = useState<ApiBloodPouch[]>([])
  const [rawRequests, setRawRequests] = useState<ApiTransfusionRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingPouch, setEditingPouch] = useState<ApiBloodPouch | null>(null)
  const [deletingPouch, setDeletingPouch] = useState<BloodPouch | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('pouches')
  const [search, setSearch] = useState('')
  const [exporting, setExporting] = useState(false)
  const [filterGroup, setFilterGroup] = useState(ALL_FILTER)
  const [filterComponent, setFilterComponent] = useState(ALL_FILTER)
  const [filterStatus, setFilterStatus] = useState(ALL_FILTER)

  useEffect(() => {
    let cancelled = false
    window.api.bloodBank.list().then((result) => {
      if (cancelled) return
      if (result.ok) {
        setRawPouches(result.data.pouches)
        setPouches(result.data.pouches.map(toPouch))
      } else setError(result.error)
      setLoading(false)
    })
    window.api.bloodBank.requests.list().then((result) => {
      if (!cancelled && result.ok) setRawRequests(result.data.requests)
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleExportExcel(): Promise<void> {
    setExporting(true)
    await window.api.bloodBank.exportExcel()
    setExporting(false)
  }

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return pouches
    return pouches.filter((p) => `${p.pouchNumber} ${p.bloodGroup} ${p.component} ${p.donorName}`.toLowerCase().includes(term))
  }, [search, pouches])

  const bloodGroupOptions = useMemo(() => Array.from(new Set(pouches.map((p) => p.bloodGroup))).sort(), [pouches])
  const componentOptions = useMemo(() => Array.from(new Set(pouches.map((p) => p.component))).sort(), [pouches])

  const filteredRows = useMemo(
    () =>
      rows.filter((p) => {
        if (filterGroup !== ALL_FILTER && p.bloodGroup !== filterGroup) return false
        if (filterComponent !== ALL_FILTER && p.component !== filterComponent) return false
        if (filterStatus !== ALL_FILTER && p.status !== filterStatus) return false
        return true
      }),
    [rows, filterGroup, filterComponent, filterStatus]
  )

  function handleResetFilters(): void {
    setFilterGroup(ALL_FILTER)
    setFilterComponent(ALL_FILTER)
    setFilterStatus(ALL_FILTER)
  }

  const QUICK_ACTIONS: { icon: typeof HeartHandshake; label: string; onClick?: () => void }[] = [
    { icon: HeartHandshake, label: 'Enregistrer un don', onClick: () => setActiveTab('donations') },
    { icon: Truck, label: 'Réceptionner poches', onClick: () => setShowCreateModal(true) },
    { icon: ClipboardCheck, label: 'Valider analyse', onClick: () => setActiveTab('analyses') },
    { icon: Archive, label: 'Mettre en réserve', onClick: () => setActiveTab('pouches') },
    { icon: FlaskConical, label: 'Créer demande transfusion', onClick: () => setActiveTab('requests') },
    { icon: PackageCheck, label: 'Enregistrer transfusion', onClick: () => setActiveTab('transfusions') },
    { icon: ClipboardList, label: 'Inventaire stock', onClick: () => setActiveTab('pouches') },
    { icon: PackageX, label: 'Retirer poche périmée', onClick: () => setActiveTab('expired') },
    { icon: FileBarChart, label: "Rapport d'activité" }
  ]

  const disponibles = useMemo(() => pouches.filter((p) => p.status === 'Disponible'), [pouches])
  const transfusees = useMemo(() => pouches.filter((p) => p.status === 'Transfusée'), [pouches])
  const enAttenteAnalyse = useMemo(() => pouches.filter((p) => p.status === 'En attente analyse'), [pouches])
  const perimees = useMemo(() => pouches.filter((p) => p.status === 'Périmée'), [pouches])

  const stockByGroup = useMemo(() => {
    const counts = new Map<string, number>()
    for (const p of disponibles) counts.set(p.bloodGroup, (counts.get(p.bloodGroup) ?? 0) + 1)
    return Array.from(counts.entries())
      .map(([group, units]) => ({ group, units }))
      .sort((a, b) => b.units - a.units)
  }, [disponibles])
  const maxGroupUnits = stockByGroup.length === 0 ? 1 : Math.max(...stockByGroup.map((g) => g.units))

  const typeBreakdown = useMemo(() => {
    const counts = new Map<string, number>()
    for (const p of pouches) {
      const category = componentCategory(p.component)
      counts.set(category, (counts.get(category) ?? 0) + 1)
    }
    const total = pouches.length
    return Array.from(counts.entries())
      .map(([label, count]) => ({ label, percent: total === 0 ? 0 : Math.round((count / total) * 100) }))
      .sort((a, b) => b.percent - a.percent)
  }, [pouches])

  const typeDonutBackground = useMemo(() => {
    let cursor = 0
    const stops = typeBreakdown.map(({ label, percent }) => {
      const start = cursor
      cursor += percent
      return `${POUCH_TYPE_CHART_COLOR[label] ?? POUCH_TYPE_CHART_COLOR.Autres} ${start}% ${cursor}%`
    })
    return `conic-gradient(${stops.join(', ')})`
  }, [typeBreakdown])

  const groupsWithNoStock = useMemo(() => {
    const withStock = new Set(stockByGroup.map((g) => g.group))
    const knownGroups = new Set(pouches.map((p) => p.bloodGroup))
    return Array.from(knownGroups).filter((g) => !withStock.has(g))
  }, [stockByGroup, pouches])

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        breadcrumb={['Accueil', 'Banque de sang']}
        title="Banque de sang"
        subtitle="Gestion des dons, des poches de sang et des composants sanguins."
        actions={
          <>
            <Button variant="secondary" size="sm">
              <FileUp className="h-3.5 w-3.5" />
              Importer des données
            </Button>
            <Button variant="secondary" size="sm" onClick={handleExportExcel} disabled={exporting}>
              {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
              Exporter
            </Button>
            <Button size="sm" onClick={() => setShowCreateModal(true)}>
              <Plus className="h-3.5 w-3.5" />
              Nouvelle poche
            </Button>
          </>
        }
      />

      {showCreateModal && (
        <BloodPouchFormModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(pouch) => {
            setRawPouches((prev) => [...prev, pouch])
            setPouches((prev) => [...prev, toPouch(pouch)])
            setShowCreateModal(false)
          }}
        />
      )}

      {editingPouch && (
        <BloodPouchFormModal
          editing={editingPouch}
          onClose={() => setEditingPouch(null)}
          onCreated={(pouch) => {
            setRawPouches((prev) => prev.map((p) => (p.id === pouch.id ? pouch : p)))
            setPouches((prev) => prev.map((p) => (p.id === pouch.id ? toPouch(pouch) : p)))
            setEditingPouch(null)
          }}
        />
      )}

      {deletingPouch && (
        <ConfirmDialog
          title="Supprimer la poche"
          message={`Voulez-vous vraiment supprimer la poche ${deletingPouch.pouchNumber} (${deletingPouch.bloodGroup}) ?`}
          onCancel={() => setDeletingPouch(null)}
          onConfirm={() => window.api.bloodBank.delete(deletingPouch.id)}
          onConfirmed={() => {
            setRawPouches((prev) => prev.filter((p) => p.id !== deletingPouch.id))
            setPouches((prev) => prev.filter((p) => p.id !== deletingPouch.id))
            setDeletingPouch(null)
          }}
        />
      )}

      {loading ? (
        <PulseLoader label="Chargement de la banque de sang…" />
      ) : error ? (
        <p className="py-12 text-center text-sm text-red-500">{error}</p>
      ) : (
        <>
          {/* KPI row */}
          <SortableGroup id="bloodBank.grid1" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Card className="p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-black/5 bg-red-50">
                <Droplet className="h-5 w-5 text-red-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Poches disponibles</p>
              <p className="text-xl font-display font-extrabold tabular-nums text-gray-900">{disponibles.length}</p>
            </Card>
            <Card className="p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-black/5 bg-teal-50">
                <HeartHandshake className="h-5 w-5 text-teal-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Poches enregistrées</p>
              <p className="text-xl font-display font-extrabold tabular-nums text-gray-900">{pouches.length}</p>
            </Card>
            <Card className="p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-black/5 bg-blue-50">
                <PackageCheck className="h-5 w-5 text-blue-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Poches transfusées</p>
              <p className="text-xl font-display font-extrabold tabular-nums text-gray-900">{transfusees.length}</p>
            </Card>
            <Card className="p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-black/5 bg-amber-50">
                <FlaskConical className="h-5 w-5 text-amber-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">En attente d&apos;analyse</p>
              <p className="text-xl font-display font-extrabold tabular-nums text-gray-900">{enAttenteAnalyse.length}</p>
            </Card>
            <Card className="p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-black/5 bg-orange-50">
                <CalendarX className="h-5 w-5 text-orange-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Poches périmées</p>
              <p className="text-xl font-display font-extrabold tabular-nums text-gray-900">{perimees.length}</p>
            </Card>
          </SortableGroup>

          {/* Stock par groupe */}
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[15px] font-bold text-gray-900">Stock disponible par groupe</h3>
            </div>
            {stockByGroup.length === 0 ? (
              <p className="text-xs text-gray-400">Aucune poche disponible actuellement.</p>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
                {stockByGroup.map((b) => (
                  <div key={b.group} className="rounded-lg border border-gray-100 p-3">
                    <div className="flex items-center gap-1.5">
                      <Droplet className="h-3.5 w-3.5 text-red-500" />
                      <span className="text-sm font-semibold text-gray-900">{b.group}</span>
                    </div>
                    <p className="mt-1 text-lg font-bold text-gray-900">{b.units}</p>
                    <p className="text-[11px] text-gray-400">poche{b.units > 1 ? 's' : ''}</p>
                    <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-red-500" style={{ width: `${(b.units / maxGroupUnits) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <SortableGroup id="bloodBank.grid2" className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Liste principale */}
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

              {activeTab === 'donations' ? (
                <DonationsTab pouches={rawPouches} />
              ) : activeTab === 'requests' ? (
                <RequestsTab />
              ) : activeTab === 'transfusions' ? (
                <TransfusionsTab pouches={rawPouches} requests={rawRequests} />
              ) : activeTab === 'analyses' ? (
                <AnalysesTab pouches={rawPouches} />
              ) : activeTab === 'expired' ? (
                <>
                  {(() => {
                    const expired = pouches.filter((p) => p.status === 'Périmée' || p.status === 'Écartée')
                    return expired.length === 0 ? (
                      <EmptyState title="Aucune poche périmée ou écartée." />
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
                          <thead>
                            <tr className="border-b border-gray-200 bg-gray-50/70 text-[11px] uppercase tracking-[0.08em] text-gray-500">
                              <th className="px-6 py-3 font-semibold">N° Poche</th>
                              <th className="px-6 py-3 font-semibold">Groupe</th>
                              <th className="px-6 py-3 font-semibold">Type / Composant</th>
                              <th className="px-6 py-3 font-semibold">Statut</th>
                              <th className="px-6 py-3 font-semibold">Expiration</th>
                              <th className="px-6 py-3 font-semibold">Donneur</th>
                              <th className="px-6 py-3 font-semibold" />
                            </tr>
                          </thead>
                          <tbody>
                            {expired.map((p) => (
                              <tr key={p.id} className="border-b border-gray-100 last:border-0 transition-colors hover:bg-accent-50/40">
                                <td className="px-6 py-3 text-xs text-gray-500">{p.pouchNumber}</td>
                                <td className="px-6 py-3 font-semibold text-gray-900">{p.bloodGroup}</td>
                                <td className="px-6 py-3 text-gray-600">{p.component}</td>
                                <td className="px-6 py-3">
                                  <StatusBadge label={p.status} tone={pouchStatusTone(p.status)} />
                                </td>
                                <td className="px-6 py-3 text-gray-600">{p.expiryDate}</td>
                                <td className="px-6 py-3 text-gray-600">{p.donorName}</td>
                                <td className="px-6 py-3">
                                  <button
                                    onClick={() => setEditingPouch(rawPouches.find((r) => r.id === p.id) ?? null)}
                                    title="Modifier la poche"
                                    className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  })()}
                </>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-6 py-3">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Rechercher une poche, un groupe, un donneur..."
                        className="w-72 rounded-[10px] border border-gray-300 py-1.5 pl-8 pr-3 text-xs text-gray-700 placeholder:text-gray-400 focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15"
                      />
                    </div>
                    <Button variant="secondary" size="sm" onClick={handleExportExcel} disabled={exporting}>
                      {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
                      Export Excel
                    </Button>
                  </div>

                  {filteredRows.length === 0 ? (
                    <p className="px-6 py-8 text-center text-sm text-gray-400">
                      {rows.length === 0 ? 'Aucune poche ne correspond à cette recherche.' : 'Aucune poche ne correspond aux filtres.'}
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50/70 text-[11px] uppercase tracking-[0.08em] text-gray-500">
                            <th className="px-6 py-3 font-semibold">N° Poche</th>
                            <th className="px-6 py-3 font-semibold">Groupe</th>
                            <th className="px-6 py-3 font-semibold">Type / Composant</th>
                            <th className="px-6 py-3 font-semibold">Volume</th>
                            <th className="px-6 py-3 font-semibold">Statut</th>
                            <th className="px-6 py-3 font-semibold">Expiration</th>
                            <th className="px-6 py-3 font-semibold">Donneur</th>
                            <th className="px-6 py-3 font-semibold" />
                          </tr>
                        </thead>
                        <tbody>
                          {filteredRows.map((p) => (
                            <tr key={p.id} className="border-b border-gray-100 last:border-0 transition-colors hover:bg-accent-50/40">
                              <td className="px-6 py-3 text-xs text-gray-500">{p.pouchNumber}</td>
                              <td className="px-6 py-3 font-semibold text-gray-900">{p.bloodGroup}</td>
                              <td className="px-6 py-3 text-gray-600">{p.component}</td>
                              <td className="px-6 py-3 text-gray-600">{p.volume ?? '—'}</td>
                              <td className="px-6 py-3">
                                <StatusBadge label={p.status} tone={pouchStatusTone(p.status)} />
                              </td>
                              <td className="px-6 py-3 text-gray-600">{p.expiryDate}</td>
                              <td className="px-6 py-3 text-gray-600">{p.donorName}</td>
                              <td className="px-6 py-3">
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => p.patientId && onOpenPatient(p.patientId)}
                                    disabled={!p.patientId}
                                    title={p.patientId ? 'Voir le dossier patient' : 'Aucun dossier lié'}
                                    className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => setEditingPouch(rawPouches.find((r) => r.id === p.id) ?? null)}
                                    title="Modifier la poche"
                                    className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => setDeletingPouch(p)}
                                    title="Supprimer la poche"
                                    className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                  <button className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700">
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
                      Affichage de {filteredRows.length === 0 ? 0 : 1} à {filteredRows.length} sur {pouches.length} poches
                    </span>
                  </div>
                </>
              )}
            </Card>

            {/* Colonne latérale */}
            <SortableGroup id="bloodBank.side1" className="space-y-6">
              <Card>
                <h3 className="mb-4 flex items-center justify-between text-sm font-semibold text-gray-900">
                  Filtres
                  <button onClick={handleResetFilters} className="text-xs font-normal text-accent-600 hover:text-accent-500">
                    Réinitialiser
                  </button>
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">Groupe sanguin</label>
                    <select
                      value={filterGroup}
                      onChange={(e) => setFilterGroup(e.target.value)}
                      className="w-full rounded-[10px] border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15"
                    >
                      <option value={ALL_FILTER}>Tous les groupes</option>
                      {bloodGroupOptions.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">Type / Composant</label>
                    <select
                      value={filterComponent}
                      onChange={(e) => setFilterComponent(e.target.value)}
                      className="w-full rounded-[10px] border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15"
                    >
                      <option value={ALL_FILTER}>Tous les types</option>
                      {componentOptions.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">Statut</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full rounded-[10px] border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15"
                    >
                      <option value={ALL_FILTER}>Tous les statuts</option>
                      {Object.values(STATE_LABEL).map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </Card>

              <Card className="p-0">
                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
                  <h3 className="text-[15px] font-bold text-gray-900">Alertes critiques</h3>
                </div>
                <div className="space-y-3 p-5">
                  {perimees.length === 0 && enAttenteAnalyse.length === 0 && groupsWithNoStock.length === 0 ? (
                    <p className="text-xs text-gray-400">Aucune alerte pour le moment.</p>
                  ) : (
                    <>
                      {perimees.length > 0 && (
                        <div className="flex items-start gap-2.5 text-xs">
                          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                          <span className="text-gray-600">
                            {perimees.length} poche{perimees.length > 1 ? 's' : ''} périmée{perimees.length > 1 ? 's' : ''} à retirer
                          </span>
                        </div>
                      )}
                      {enAttenteAnalyse.length > 0 && (
                        <div className="flex items-start gap-2.5 text-xs">
                          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" />
                          <span className="text-gray-600">
                            {enAttenteAnalyse.length} poche{enAttenteAnalyse.length > 1 ? 's' : ''} en attente d&apos;analyse
                          </span>
                        </div>
                      )}
                      {groupsWithNoStock.map((group) => (
                        <div key={group} className="flex items-start gap-2.5 text-xs">
                          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                          <span className="text-gray-600">Aucune poche disponible pour le groupe {group}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </Card>

              <Card>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-[15px] font-bold text-gray-900">Poches par type</h3>
                </div>
                {typeBreakdown.length === 0 ? (
                  <p className="text-xs text-gray-400">Aucune donnée.</p>
                ) : (
                  <div className="flex items-center gap-4">
                    <div
                      className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full"
                      style={{ background: typeDonutBackground }}
                    >
                      <div className="h-11 w-11 rounded-full bg-white" />
                    </div>
                    <div className="space-y-1 text-[11px]">
                      {typeBreakdown.map(({ label, percent }) => (
                        <div key={label} className="flex items-center gap-1.5">
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: POUCH_TYPE_CHART_COLOR[label] ?? POUCH_TYPE_CHART_COLOR.Autres }}
                          />
                          <span className="text-gray-600">{label}</span>
                          <span className="font-medium text-gray-900">{percent}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <p className="mt-3 text-center text-xs text-gray-400">Total {pouches.length}</p>
              </Card>
            </SortableGroup>
          </SortableGroup>

          {/* Actions rapides */}
          <Card className="p-0">
            <div className="border-b border-gray-100 px-6 py-4">
              <h3 className="text-[15px] font-bold text-gray-900">Actions rapides</h3>
            </div>
            <SortableGroup id="bloodBank.grid3" className="grid grid-cols-2 gap-3 p-6 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  onClick={action.onClick}
                  disabled={!action.onClick}
                  title={action.onClick ? undefined : 'Fonctionnalité non disponible pour le moment'}
                  className="flex flex-col items-center gap-2 rounded-xl border border-gray-100 py-4 text-center transition-all hover:-translate-y-0.5 hover:border-accent-200 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600">
                    <action.icon className="h-5 w-5" />
                  </div>
                  <span className="text-[11px] font-medium leading-tight text-gray-700">{action.label}</span>
                </button>
              ))}
            </SortableGroup>
          </Card>
        </>
      )}
    </div>
  )
}
