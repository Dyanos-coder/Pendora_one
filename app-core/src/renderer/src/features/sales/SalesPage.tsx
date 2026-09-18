import { useEffect, useState, type FormEvent } from 'react'
import { TrendingUp, Receipt, Users, Plus } from 'lucide-react'
import { Card } from '@renderer/components/Card'
import { StatusBadge, type StatusTone } from '@renderer/components/StatusBadge'
import { PageHeader } from '@renderer/components/PageHeader'
import { Modal } from '@renderer/components/Modal'
import type { CreateSaleInput, Sale, SaleStatus, SalesSummary } from '@shared/sales-types'
import type { StockItem } from '@shared/stocks-types'

const STATUS_LABEL: Record<SaleStatus, string> = {
  PAYE: 'Payé',
  EN_ATTENTE: 'En attente'
}

const STATUS_TONE: Record<SaleStatus, StatusTone> = {
  PAYE: 'success',
  EN_ATTENTE: 'info'
}

function formatAmount(amount: number): string {
  return `${new Intl.NumberFormat('fr-FR').format(amount)} FCFA`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const EMPTY_FORM: Omit<CreateSaleInput, 'amount'> = {
  clientName: '',
  stockItemId: '',
  quantity: 0,
  status: 'PAYE'
}

export function SalesPage(): JSX.Element {
  const [sales, setSales] = useState<Sale[]>([])
  const [summary, setSummary] = useState<SalesSummary | null>(null)
  const [page, setPage] = useState(1)
  const [pageCount, setPageCount] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [stockItems, setStockItems] = useState<StockItem[]>([])
  const [submitting, setSubmitting] = useState(false)

  const selectedItem = stockItems.find((i) => i.id === form.stockItemId) ?? null
  const computedAmount = selectedItem ? selectedItem.unitPrice * form.quantity : 0

  async function loadData(targetPage: number): Promise<void> {
    setLoading(true)
    setError(null)

    const [listResult, summaryResult] = await Promise.all([window.api.sales.list(targetPage), window.api.sales.summary()])

    if (!listResult.ok || !summaryResult.ok) {
      setError(!listResult.ok ? listResult.error : (summaryResult as { error: string }).error)
      setLoading(false)
      return
    }

    setSales(listResult.data.items)
    setPageCount(Math.max(1, Math.ceil(listResult.data.total / listResult.data.pageSize)))
    setSummary(summaryResult.data)
    setLoading(false)
  }

  useEffect(() => {
    loadData(page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  async function openForm(): Promise<void> {
    setShowForm(true)
    const result = await window.api.stocks.list()
    if (result.ok) setStockItems(result.data.items)
  }

  async function handleCreate(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!selectedItem || form.quantity <= 0) return

    setSubmitting(true)
    const result = await window.api.sales.create({ ...form, amount: computedAmount })
    setSubmitting(false)

    if (!result.ok) {
      setError(result.error)
      return
    }

    setShowForm(false)
    setForm(EMPTY_FORM)
    setPage(1)
    await loadData(1)
  }

  const maxWeekValue = summary ? Math.max(1, ...summary.week.map((w) => w.value)) : 1

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        breadcrumb={['Entreprise', 'Ventes']}
        title="Ventes"
        subtitle="Performance commerciale et transactions récentes."
        actions={
          <button
            onClick={openForm}
            className="flex items-center gap-2 rounded-lg bg-accent-500 px-3.5 py-2 text-sm font-medium text-white hover:bg-accent-600"
          >
            <Plus className="h-4 w-4" />
            Nouvelle vente
          </button>
        }
      />

      {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}

      {showForm && (
        <Modal
          title="Nouvelle vente"
          onClose={() => {
            setShowForm(false)
            setForm(EMPTY_FORM)
          }}
        >
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-gray-500">Client</label>
              <input
                required
                value={form.clientName}
                onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                placeholder="Sodexim SARL"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent-500 focus:outline-none"
              />
            </div>
            <div className="col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-gray-500">Article</label>
              {stockItems.length === 0 ? (
                <p className="rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-400">
                  Aucun article en stock — ajoutez-en un dans Stocks avant de créer une vente.
                </p>
              ) : (
                <select
                  required
                  value={form.stockItemId}
                  onChange={(e) => setForm({ ...form, stockItemId: e.target.value, quantity: 0 })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent-500 focus:outline-none"
                >
                  <option value="" disabled>
                    Choisir un article…
                  </option>
                  {stockItems.map((item) => (
                    <option key={item.id} value={item.id} disabled={item.quantity === 0}>
                      {item.name} ({item.sku}) — {item.quantity} en stock
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-500">Quantité vendue</label>
              <input
                required
                type="number"
                min={1}
                max={selectedItem?.quantity ?? undefined}
                disabled={!selectedItem}
                value={form.quantity || ''}
                onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent-500 focus:outline-none disabled:bg-gray-50"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-500">Montant (FCFA)</label>
              <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                {formatAmount(computedAmount)}
              </p>
            </div>
            <div className="col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-gray-500">Statut</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as SaleStatus })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent-500 focus:outline-none"
              >
                {(Object.keys(STATUS_LABEL) as SaleStatus[]).map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABEL[status]}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <button
                type="submit"
                disabled={submitting || !selectedItem || form.quantity <= 0}
                className="rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-white hover:bg-accent-600 disabled:opacity-60"
              >
                {submitting ? 'Création…' : 'Enregistrer la vente'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50">
            <TrendingUp className="h-5 w-5 text-green-600" />
          </div>
          <p className="mt-3 text-xs font-medium uppercase tracking-wide text-gray-500">Chiffre d&apos;affaires (7j)</p>
          <p className="text-2xl font-bold text-gray-900">{summary ? formatAmount(summary.chiffreAffaires7j) : '—'}</p>
        </Card>

        <Card>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
            <Receipt className="h-5 w-5 text-blue-600" />
          </div>
          <p className="mt-3 text-xs font-medium uppercase tracking-wide text-gray-500">Ventes (7j)</p>
          <p className="text-2xl font-bold text-gray-900">{summary ? summary.ventes7j : '—'}</p>
        </Card>

        <Card>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50">
            <Users className="h-5 w-5 text-violet-600" />
          </div>
          <p className="mt-3 text-xs font-medium uppercase tracking-wide text-gray-500">Panier moyen</p>
          <p className="text-2xl font-bold text-gray-900">{summary ? formatAmount(summary.panierMoyen) : '—'}</p>
        </Card>
      </div>

      <Card className="mt-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Ventes des 7 derniers jours</h2>
        <div className="flex h-32 items-end gap-3">
          {(summary?.week ?? []).map((d, i) => (
            <div key={i} className="flex flex-1 flex-col items-center justify-end gap-2">
              <div
                className="w-full rounded-md bg-accent-500/80"
                style={{ height: `${Math.max(2, (d.value / maxWeekValue) * 88)}px` }}
                title={formatAmount(d.value)}
              />
              <span className="text-[11px] text-gray-400">{d.day}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-6 p-0">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Transactions récentes</h2>
        </div>
        {loading ? (
          <p className="px-6 py-8 text-center text-sm text-gray-400">Chargement…</p>
        ) : sales.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-gray-400">Aucune vente pour le moment.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                <th className="px-6 py-2.5 font-medium">Date</th>
                <th className="px-6 py-2.5 font-medium">Client</th>
                <th className="px-6 py-2.5 font-medium">Articles</th>
                <th className="px-6 py-2.5 text-right font-medium">Montant</th>
                <th className="px-6 py-2.5 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-6 py-3.5 text-gray-500">{formatDate(sale.issuedAt)}</td>
                  <td className="px-6 py-3.5 font-medium text-gray-900">{sale.clientName}</td>
                  <td className="px-6 py-3.5 text-gray-600">{sale.items}</td>
                  <td className="px-6 py-3.5 text-right font-semibold text-gray-900">{formatAmount(sale.amount)}</td>
                  <td className="px-6 py-3.5">
                    <StatusBadge label={STATUS_LABEL[sale.status]} tone={STATUS_TONE[sale.status]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {pageCount > 1 && (
          <div className="flex items-center justify-end gap-1 px-6 py-4">
            {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={
                  'h-7 w-7 rounded-md text-xs font-medium ' +
                  (p === page ? 'bg-brand-900 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50')
                }
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
