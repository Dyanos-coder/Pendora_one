import { useEffect, useMemo, useState } from 'react'
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Scale,
  ReceiptText,
  Search,
  FileSpreadsheet,
  Columns3,
  Printer,
  MoreHorizontal,
  Pencil,
  FileDown,
  Plus,
  CreditCard,
  ClipboardList,
  ArrowLeftRight,
  Landmark,
  FileBarChart,
  Settings,
  TriangleAlert,
  Loader2,
  Trash2
} from 'lucide-react'
import { Card } from '@renderer/components/Card'
import { PageHeader } from '@renderer/components/PageHeader'
import { Button } from '@renderer/components/Button'
import { StatusBadge } from '@renderer/components/StatusBadge'
import { ConfirmDialog } from '@renderer/components/ConfirmDialog'
import type { ApiFinanceTransaction, ApiTransactionStatus, ApiTransactionType } from '@shared/finance-types'
import { transactionStatusTone, EXPENSE_CATEGORY_COLOR } from './status'
import type { FinanceTransaction, TransactionStatus, TransactionType } from './types'
import { FinanceTransactionFormModal } from './FinanceTransactionFormModal'
import { SupplierInvoicesTab } from './tabs/SupplierInvoicesTab'
import { PaymentsReceivedTab } from './tabs/PaymentsReceivedTab'
import { ServiceExpensesTab } from './tabs/ServiceExpensesTab'
import { BudgetsTab } from './tabs/BudgetsTab'
import { BankAccountsTab } from './tabs/BankAccountsTab'
import { CashRegistersTab } from './tabs/CashRegistersTab'
import { SortableGroup } from '@renderer/components/SortableGroup'
import { PulseLoader } from '@renderer/components/ui/Feedback'

type Tab = 'recent' | 'cashRegisters' | 'invoices' | 'payments' | 'byService' | 'budgets' | 'accounts'

const TABS: { id: Tab; label: string }[] = [
  { id: 'recent', label: 'Opérations récentes' },
  { id: 'cashRegisters', label: 'Caisses' },
  { id: 'invoices', label: 'Factures fournisseurs' },
  { id: 'payments', label: 'Paiements reçus' },
  { id: 'byService', label: 'Dépenses par service' },
  { id: 'budgets', label: 'Budgets' },
  { id: 'accounts', label: 'Comptes bancaires' }
]

const ALL_FILTER = '__all__'

const TYPE_LABEL: Record<ApiTransactionType, TransactionType> = {
  RECETTE: 'Recette',
  DEPENSE: 'Dépense'
}

const STATUS_LABEL: Record<ApiTransactionStatus, TransactionStatus> = {
  PAYE: 'Payé',
  EN_ATTENTE: 'En attente',
  EN_RETARD: 'En retard',
  ANNULE: 'Annulé'
}

function toTransaction(t: ApiFinanceTransaction): FinanceTransaction {
  const occurred = new Date(t.occurredAt)
  return {
    id: t.id,
    date: occurred.toLocaleDateString('fr-FR'),
    time: occurred.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    }),
    reference: t.reference,
    type: TYPE_LABEL[t.type],
    party: t.party,
    category: t.category,
    amount: t.amount,
    status: STATUS_LABEL[t.status],
    paymentMode: t.paymentMode
  }
}

function formatFcfa(amount: number): string {
  return `${new Intl.NumberFormat('fr-FR').format(amount)} FCFA`
}

export function FinancePage(): JSX.Element {
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([])
  const [rawTransactions, setRawTransactions] = useState<ApiFinanceTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<ApiFinanceTransaction | null>(null)
  const [deletingTransaction, setDeletingTransaction] = useState<FinanceTransaction | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('recent')
  const [search, setSearch] = useState('')
  const [exporting, setExporting] = useState(false)
  const [createType, setCreateType] = useState<ApiTransactionType | undefined>(undefined)
  const [filterType, setFilterType] = useState(ALL_FILTER)
  const [filterCategory, setFilterCategory] = useState(ALL_FILTER)
  const [filterStatus, setFilterStatus] = useState(ALL_FILTER)

  useEffect(() => {
    let cancelled = false
    window.api.finance.list().then((result) => {
      if (cancelled) return
      if (result.ok) {
        setRawTransactions(result.data.transactions)
        setTransactions(result.data.transactions.map(toTransaction))
      } else setError(result.error)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleExportExcel(): Promise<void> {
    setExporting(true)
    await window.api.finance.exportExcel()
    setExporting(false)
  }

  const categoryOptions = useMemo(() => Array.from(new Set(transactions.map((t) => t.category).filter(Boolean))).sort(), [transactions])

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase()
    return transactions.filter((t) => {
      if (term && !`${t.reference} ${t.party} ${t.category}`.toLowerCase().includes(term)) return false
      if (filterType !== ALL_FILTER && t.type !== filterType) return false
      if (filterCategory !== ALL_FILTER && t.category !== filterCategory) return false
      if (filterStatus !== ALL_FILTER && t.status !== filterStatus) return false
      return true
    })
  }, [search, transactions, filterType, filterCategory, filterStatus])

  function handleResetFilters(): void {
    setFilterType(ALL_FILTER)
    setFilterCategory(ALL_FILTER)
    setFilterStatus(ALL_FILTER)
  }

  // Les opérations annulées (reçus de caisse annulés) restent listées mais sortent des totaux.
  const recettes = useMemo(() => transactions.filter((t) => t.type === 'Recette' && t.status !== 'Annulé'), [transactions])
  const depenses = useMemo(() => transactions.filter((t) => t.type === 'Dépense' && t.status !== 'Annulé'), [transactions])
  const totalRecettes = useMemo(() => recettes.reduce((sum, t) => sum + t.amount, 0), [recettes])
  const totalDepenses = useMemo(() => depenses.reduce((sum, t) => sum + t.amount, 0), [depenses])
  const resultatNet = totalRecettes - totalDepenses
  const enAttente = useMemo(() => transactions.filter((t) => t.status === 'En attente'), [transactions])
  const enRetard = useMemo(() => transactions.filter((t) => t.status === 'En retard'), [transactions])

  const expenseBreakdown = useMemo(() => {
    const counts = new Map<string, number>()
    for (const t of depenses) counts.set(t.category, (counts.get(t.category) ?? 0) + t.amount)
    return Array.from(counts.entries())
      .map(([label, amount]) => ({
        label,
        amount,
        percent: totalDepenses === 0 ? 0 : Math.round((amount / totalDepenses) * 100)
      }))
      .sort((a, b) => b.amount - a.amount)
  }, [depenses, totalDepenses])

  const expenseDonutBackground = useMemo(() => {
    let cursor = 0
    const stops = expenseBreakdown.map(({ label, percent }) => {
      const start = cursor
      cursor += percent
      return `${EXPENSE_CATEGORY_COLOR[label] ?? EXPENSE_CATEGORY_COLOR.Autres} ${start}% ${cursor}%`
    })
    return `conic-gradient(${stops.join(', ')})`
  }, [expenseBreakdown])

  const topSuppliers = useMemo(() => {
    const totals = new Map<string, number>()
    for (const t of depenses) totals.set(t.party, (totals.get(t.party) ?? 0) + t.amount)
    return Array.from(totals.entries())
      .map(([party, amount]) => ({ party, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
  }, [depenses])

  const pendingDues = useMemo(() => [...enRetard, ...enAttente].sort((a, b) => b.amount - a.amount).slice(0, 5), [enRetard, enAttente])

  const QUICK_ACTIONS: {
    icon: typeof Plus
    label: string
    onClick?: () => void
  }[] = [
    {
      icon: Plus,
      label: 'Créer une recette',
      onClick: () => {
        setCreateType('RECETTE')
        setShowCreateModal(true)
      }
    },
    {
      icon: ReceiptText,
      label: 'Enregistrer une dépense',
      onClick: () => {
        setCreateType('DEPENSE')
        setShowCreateModal(true)
      }
    },
    {
      icon: CreditCard,
      label: 'Nouveau paiement',
      onClick: () => setActiveTab('payments')
    },
    {
      icon: ClipboardList,
      label: 'Créer un budget',
      onClick: () => setActiveTab('budgets')
    },
    {
      icon: ArrowLeftRight,
      label: 'Transfert entre comptes',
      onClick: () => setActiveTab('accounts')
    },
    {
      icon: Landmark,
      label: 'Rapprochement bancaire',
      onClick: () => setActiveTab('accounts')
    },
    {
      icon: FileBarChart,
      label: 'Rapport financier',
      onClick: handleExportExcel
    },
    { icon: Settings, label: 'Paramètres finances' }
  ]

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        breadcrumb={['Accueil', 'Finance', 'Comptabilité']}
        title="Comptabilité"
        subtitle="Gestion financière de l'établissement."
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={handleExportExcel} disabled={exporting}>
              {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
              Exporter
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setCreateType(undefined)
                setShowCreateModal(true)
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Nouvelle opération
            </Button>
          </>
        }
      />

      {showCreateModal && (
        <FinanceTransactionFormModal
          initialType={createType}
          onClose={() => setShowCreateModal(false)}
          onCreated={(transaction) => {
            setRawTransactions((prev) => [...prev, transaction])
            setTransactions((prev) => [...prev, toTransaction(transaction)])
            setShowCreateModal(false)
          }}
        />
      )}

      {editingTransaction && (
        <FinanceTransactionFormModal
          editing={editingTransaction}
          onClose={() => setEditingTransaction(null)}
          onCreated={(transaction) => {
            setRawTransactions((prev) => prev.map((t) => (t.id === transaction.id ? transaction : t)))
            setTransactions((prev) => prev.map((t) => (t.id === transaction.id ? toTransaction(transaction) : t)))
            setEditingTransaction(null)
          }}
        />
      )}

      {deletingTransaction && (
        <ConfirmDialog
          title="Supprimer l'opération"
          message={`Voulez-vous vraiment supprimer l'opération ${deletingTransaction.reference} (${deletingTransaction.party}) ?`}
          onCancel={() => setDeletingTransaction(null)}
          onConfirm={() => window.api.finance.delete(deletingTransaction.id)}
          onConfirmed={() => {
            setRawTransactions((prev) => prev.filter((t) => t.id !== deletingTransaction.id))
            setTransactions((prev) => prev.filter((t) => t.id !== deletingTransaction.id))
            setDeletingTransaction(null)
          }}
        />
      )}

      {loading ? (
        <PulseLoader label="Chargement des finances…" />
      ) : error ? (
        <p className="py-12 text-center text-sm text-red-500">{error}</p>
      ) : (
        <>
          {/* KPI row */}
          <SortableGroup id="finance.grid1" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Card className="p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-black/5 bg-teal-50">
                <TrendingUp className="h-5 w-5 text-teal-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Recettes enregistrées</p>
              <p className="text-lg font-bold text-gray-900">{formatFcfa(totalRecettes)}</p>
            </Card>
            <Card className="p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-black/5 bg-red-50">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Dépenses enregistrées</p>
              <p className="text-lg font-bold text-gray-900">{formatFcfa(totalDepenses)}</p>
            </Card>
            <Card className="p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-black/5 bg-blue-50">
                <Scale className="h-5 w-5 text-blue-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Résultat net</p>
              <p className={`text-lg font-bold ${resultatNet >= 0 ? 'text-gray-900' : 'text-red-600'}`}>{formatFcfa(resultatNet)}</p>
            </Card>
            <Card className="p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-black/5 bg-amber-50">
                <ReceiptText className="h-5 w-5 text-amber-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Opérations en attente</p>
              <p className="text-xl font-display font-extrabold tabular-nums text-gray-900">{enAttente.length}</p>
            </Card>
            <Card className="p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-black/5 bg-accent-50">
                <Wallet className="h-5 w-5 text-accent-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Paiements en retard</p>
              <p className="text-xl font-display font-extrabold tabular-nums text-gray-900">{enRetard.length}</p>
            </Card>
          </SortableGroup>

          <SortableGroup id="finance.grid2" className="grid grid-cols-1 gap-6 lg:grid-cols-3">
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

              {activeTab === 'cashRegisters' ? (
                <CashRegistersTab />
              ) : activeTab === 'invoices' ? (
                <SupplierInvoicesTab />
              ) : activeTab === 'payments' ? (
                <PaymentsReceivedTab />
              ) : activeTab === 'byService' ? (
                <ServiceExpensesTab />
              ) : activeTab === 'budgets' ? (
                <BudgetsTab />
              ) : activeTab === 'accounts' ? (
                <BankAccountsTab />
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-6 py-3">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Rechercher une opération, un tiers, une référence..."
                        className="w-72 rounded-[10px] border border-gray-300 py-1.5 pl-8 pr-3 text-xs text-gray-700 placeholder:text-gray-400 focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="secondary" size="sm" onClick={handleExportExcel} disabled={exporting}>
                        {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
                        Export Excel
                      </Button>
                      <Button variant="secondary" size="sm">
                        <Columns3 className="h-3.5 w-3.5" />
                        Colonnes
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => window.print()}>
                        <Printer className="h-3.5 w-3.5" />
                        Imprimer
                      </Button>
                    </div>
                  </div>

                  {filteredRows.length === 0 ? (
                    <p className="px-6 py-8 text-center text-sm text-gray-400">
                      {transactions.length === 0
                        ? 'Aucune opération enregistrée.'
                        : 'Aucune opération ne correspond à la recherche ou aux filtres.'}
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50/70 text-[11px] uppercase tracking-[0.08em] text-gray-500">
                            <th className="px-6 py-3 font-semibold">Date</th>
                            <th className="px-6 py-3 font-semibold">Référence</th>
                            <th className="px-6 py-3 font-semibold">Tiers</th>
                            <th className="px-6 py-3 font-semibold">Catégorie</th>
                            <th className="px-6 py-3 font-semibold">Montant</th>
                            <th className="px-6 py-3 font-semibold">Statut</th>
                            <th className="px-6 py-3 font-semibold">Mode</th>
                            <th className="px-6 py-3 font-semibold" />
                          </tr>
                        </thead>
                        <tbody>
                          {filteredRows.map((t) => (
                            <tr key={t.id} className="border-b border-gray-100 last:border-0 transition-colors hover:bg-accent-50/40">
                              <td className="px-6 py-3 text-gray-600">
                                <p>{t.date}</p>
                                <p className="text-xs text-gray-400">{t.time}</p>
                              </td>
                              <td className="px-6 py-3 text-xs text-gray-500">{t.reference}</td>
                              <td className="px-6 py-3 font-medium text-gray-900">{t.party}</td>
                              <td className="px-6 py-3 text-gray-600">{t.category}</td>
                              <td className={`px-6 py-3 font-medium ${t.type === 'Recette' ? 'text-teal-600' : 'text-red-600'}`}>
                                {t.type === 'Recette' ? '+' : '-'} {formatFcfa(t.amount)}
                              </td>
                              <td className="px-6 py-3">
                                <StatusBadge label={t.status} tone={transactionStatusTone(t.status)} />
                              </td>
                              <td className="px-6 py-3 text-gray-600">{t.paymentMode}</td>
                              <td className="px-6 py-3">
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => setEditingTransaction(rawTransactions.find((r) => r.id === t.id) ?? null)}
                                    title="Modifier l'opération"
                                    className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => setDeletingTransaction(t)}
                                    title="Supprimer l'opération"
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
                      Affichage de {filteredRows.length === 0 ? 0 : 1} à {filteredRows.length} sur {transactions.length} opérations
                    </span>
                  </div>
                </>
              )}
            </Card>

            {/* Colonne latérale */}
            <SortableGroup id="finance.side1" className="space-y-6">
              <Card>
                <h3 className="mb-4 flex items-center justify-between text-sm font-semibold text-gray-900">
                  Filtres
                  <button onClick={handleResetFilters} className="text-xs font-normal text-accent-600 hover:text-accent-500">
                    Réinitialiser
                  </button>
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">Type d&apos;opération</label>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="w-full rounded-[10px] border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15"
                    >
                      <option value={ALL_FILTER}>Toutes les opérations</option>
                      {Object.values(TYPE_LABEL).map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">Catégorie</label>
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="w-full rounded-[10px] border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15"
                    >
                      <option value={ALL_FILTER}>Toutes les catégories</option>
                      {categoryOptions.map((c) => (
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
                      {Object.values(STATUS_LABEL).map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button size="sm" className="w-full" onClick={() => setActiveTab('recent')}>
                    Filtrer
                  </Button>
                </div>
              </Card>

              <Card>
                <h3 className="mb-4 text-[15px] font-bold text-gray-900">Répartition des dépenses</h3>
                {expenseBreakdown.length === 0 ? (
                  <p className="text-xs text-gray-400">Aucune donnée.</p>
                ) : (
                  <div className="flex items-center gap-4">
                    <div
                      className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full"
                      style={{ background: expenseDonutBackground }}
                    >
                      <div className="h-11 w-11 rounded-full bg-white" />
                    </div>
                    <div className="space-y-1 text-[11px]">
                      {expenseBreakdown.map(({ label, percent }) => (
                        <div key={label} className="flex items-center gap-1.5">
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{
                              backgroundColor: EXPENSE_CATEGORY_COLOR[label] ?? EXPENSE_CATEGORY_COLOR.Autres
                            }}
                          />
                          <span className="text-gray-600">{label}</span>
                          <span className="font-medium text-gray-900">{percent}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <p className="mt-3 text-center text-xs text-gray-400">Total {formatFcfa(totalDepenses)}</p>
              </Card>

              <Card className="p-0">
                <div className="border-b border-gray-100 px-5 py-3.5">
                  <h3 className="text-[15px] font-bold text-gray-900">Top fournisseurs (dépenses)</h3>
                </div>
                <div className="space-y-2.5 p-5 text-xs">
                  {topSuppliers.length === 0 ? (
                    <p className="text-gray-400">Aucune donnée.</p>
                  ) : (
                    topSuppliers.map((s) => (
                      <div key={s.party} className="flex items-center justify-between">
                        <span className="text-gray-600">{s.party}</span>
                        <span className="font-semibold text-gray-900">{formatFcfa(s.amount)}</span>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              <Card className="p-0">
                <div className="border-b border-gray-100 px-5 py-3.5">
                  <h3 className="text-[15px] font-bold text-gray-900">Échéances à surveiller</h3>
                </div>
                <div className="space-y-3 p-5">
                  {pendingDues.length === 0 ? (
                    <p className="text-xs text-gray-400">Aucune échéance en attente.</p>
                  ) : (
                    pendingDues.map((t) => (
                      <div key={t.id} className="flex items-start gap-2.5 text-xs">
                        <TriangleAlert
                          className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${t.status === 'En retard' ? 'text-red-500' : 'text-amber-500'}`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-gray-700">
                            {t.party} · {t.category}
                          </p>
                          <p className="font-semibold text-gray-900">{formatFcfa(t.amount)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </SortableGroup>
          </SortableGroup>

          {/* Alertes + Actions rapides */}
          <SortableGroup id="finance.grid3" className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="p-0">
              <div className="border-b border-gray-100 px-5 py-3.5">
                <h3 className="text-[15px] font-bold text-gray-900">Alertes financières</h3>
              </div>
              <div className="space-y-3 p-5">
                {enRetard.length === 0 && enAttente.length === 0 ? (
                  <p className="text-xs text-gray-400">Aucune alerte pour le moment.</p>
                ) : (
                  <>
                    {enRetard.length > 0 && (
                      <div className="flex items-start gap-2.5 text-xs">
                        <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                        <span className="text-gray-600">
                          {enRetard.length} paiement
                          {enRetard.length > 1 ? 's' : ''} en retard
                        </span>
                      </div>
                    )}
                    {enAttente.length > 0 && (
                      <div className="flex items-start gap-2.5 text-xs">
                        <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                        <span className="text-gray-600">
                          {enAttente.length} opération
                          {enAttente.length > 1 ? 's' : ''} en attente de règlement
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </Card>

            <Card className="p-0 lg:col-span-2">
              <div className="border-b border-gray-100 px-6 py-4">
                <h3 className="text-[15px] font-bold text-gray-900">Actions rapides</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 p-6 sm:grid-cols-4">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    onClick={action.onClick}
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
          </SortableGroup>
        </>
      )}
    </div>
  )
}
