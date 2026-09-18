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
import type { ApiBloodPouch, ApiBloodPouchStatus } from '@shared/blood-bank-types'
import { pouchStatusTone, POUCH_TYPE_CHART_COLOR } from './status'
import type { BloodPouch, PouchStatus } from './types'
import { BloodPouchFormModal } from './BloodPouchFormModal'

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

const FILTER_FIELDS = [
  { label: 'Groupe sanguin', value: 'Tous les groupes' },
  { label: 'Type / Composant', value: 'Tous les types' },
  { label: 'Statut', value: 'Tous les statuts' }
]

const QUICK_ACTIONS = [
  { icon: HeartHandshake, label: 'Enregistrer un don' },
  { icon: Truck, label: 'Réceptionner poches' },
  { icon: ClipboardCheck, label: 'Valider analyse' },
  { icon: Archive, label: 'Mettre en réserve' },
  { icon: FlaskConical, label: 'Créer demande transfusion' },
  { icon: PackageCheck, label: 'Enregistrer transfusion' },
  { icon: ClipboardList, label: 'Inventaire stock' },
  { icon: PackageX, label: 'Retirer poche périmée' },
  { icon: FileBarChart, label: "Rapport d'activité" }
]

const STATE_LABEL: Record<ApiBloodPouchStatus, PouchStatus> = {
  DISPONIBLE: 'Disponible',
  EN_ATTENTE_ANALYSE: 'En attente analyse',
  RESERVEE: 'Réservée',
  TRANSFUSEE: 'Transfusée',
  PERIMEE: 'Périmée'
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
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingPouch, setEditingPouch] = useState<ApiBloodPouch | null>(null)
  const [deletingPouch, setDeletingPouch] = useState<BloodPouch | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('pouches')
  const [search, setSearch] = useState('')

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
    return () => {
      cancelled = true
    }
  }, [])

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return pouches
    return pouches.filter((p) => `${p.pouchNumber} ${p.bloodGroup} ${p.component} ${p.donorName}`.toLowerCase().includes(term))
  }, [search, pouches])

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
            <Button variant="secondary" size="sm">
              <FileDown className="h-3.5 w-3.5" />
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
        <div className="flex items-center justify-center gap-2 py-24 text-sm text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement de la banque de sang…
        </div>
      ) : error ? (
        <p className="py-12 text-center text-sm text-red-500">{error}</p>
      ) : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Card className="border-t-4 border-t-red-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50">
                <Droplet className="h-5 w-5 text-red-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Poches disponibles</p>
              <p className="text-xl font-bold text-gray-900">{disponibles.length}</p>
            </Card>
            <Card className="border-t-4 border-t-emerald-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
                <HeartHandshake className="h-5 w-5 text-emerald-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Poches enregistrées</p>
              <p className="text-xl font-bold text-gray-900">{pouches.length}</p>
            </Card>
            <Card className="border-t-4 border-t-blue-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                <PackageCheck className="h-5 w-5 text-blue-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Poches transfusées</p>
              <p className="text-xl font-bold text-gray-900">{transfusees.length}</p>
            </Card>
            <Card className="border-t-4 border-t-amber-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50">
                <FlaskConical className="h-5 w-5 text-amber-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">En attente d&apos;analyse</p>
              <p className="text-xl font-bold text-gray-900">{enAttenteAnalyse.length}</p>
            </Card>
            <Card className="border-t-4 border-t-orange-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50">
                <CalendarX className="h-5 w-5 text-orange-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Poches périmées</p>
              <p className="text-xl font-bold text-gray-900">{perimees.length}</p>
            </Card>
          </div>

          {/* Stock par groupe */}
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Stock disponible par groupe</h3>
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

              {activeTab !== 'pouches' ? (
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
                        placeholder="Rechercher une poche, un groupe, un donneur..."
                        className="w-72 rounded-lg border border-gray-200 py-1.5 pl-8 pr-3 text-xs text-gray-700 placeholder:text-gray-400 focus:border-accent-500 focus:outline-none"
                      />
                    </div>
                    <Button variant="secondary" size="sm">
                      <FileDown className="h-3.5 w-3.5" />
                      Export Excel
                    </Button>
                  </div>

                  {rows.length === 0 ? (
                    <p className="px-6 py-8 text-center text-sm text-gray-400">Aucune poche ne correspond à cette recherche.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                            <th className="px-6 py-2.5 font-medium">N° Poche</th>
                            <th className="px-6 py-2.5 font-medium">Groupe</th>
                            <th className="px-6 py-2.5 font-medium">Type / Composant</th>
                            <th className="px-6 py-2.5 font-medium">Volume</th>
                            <th className="px-6 py-2.5 font-medium">Statut</th>
                            <th className="px-6 py-2.5 font-medium">Expiration</th>
                            <th className="px-6 py-2.5 font-medium">Donneur</th>
                            <th className="px-6 py-2.5 font-medium" />
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((p) => (
                            <tr key={p.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
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
                    <span>Affichage de {rows.length === 0 ? 0 : 1} à {rows.length} sur {pouches.length} poches</span>
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

              <Card className="p-0">
                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
                  <h3 className="text-sm font-semibold text-gray-900">Alertes critiques</h3>
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
                  <h3 className="text-sm font-semibold text-gray-900">Poches par type</h3>
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
            </div>
          </div>

          {/* Actions rapides */}
          <Card className="p-0">
            <div className="border-b border-gray-100 px-6 py-4">
              <h3 className="text-sm font-semibold text-gray-900">Actions rapides</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 p-6 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  className="flex flex-col items-center gap-2 rounded-xl border border-gray-100 py-4 text-center transition-all hover:-translate-y-0.5 hover:border-accent-200 hover:shadow-sm"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600">
                    <action.icon className="h-5 w-5" />
                  </div>
                  <span className="text-[11px] font-medium leading-tight text-gray-700">{action.label}</span>
                </button>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
