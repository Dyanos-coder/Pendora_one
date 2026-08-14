import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { TrendingUp, Wallet, TriangleAlert, Plus, Filter, Download, Eye } from 'lucide-react'
import { Card } from '@renderer/components/Card'
import { StatusBadge, type StatusTone } from '@renderer/components/StatusBadge'
import { PageHeader } from '@renderer/components/PageHeader'
import { Modal } from '@renderer/components/Modal'
import type { CreateInvoiceInput, FinanceSummary, Invoice, InvoiceStatus } from '@shared/finance-types'

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  PAYE: 'Payé',
  EN_ATTENTE: 'En attente',
  EN_RETARD: 'En retard'
}

const STATUS_TONE: Record<InvoiceStatus, StatusTone> = {
  PAYE: 'success',
  EN_ATTENTE: 'info',
  EN_RETARD: 'danger'
}

function formatAmount(amount: number): string {
  return `${new Intl.NumberFormat('fr-FR').format(amount)} FCFA`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

const EMPTY_FORM: CreateInvoiceInput = {
  reference: '',
  description: '',
  partyName: '',
  amount: 0,
  status: 'EN_ATTENTE'
}

export function FinancePage(): JSX.Element {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [summary, setSummary] = useState<FinanceSummary | null>(null)
  const [page, setPage] = useState(1)
  const [pageCount, setPageCount] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<CreateInvoiceInput>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null)

  const [viewerInvoiceId, setViewerInvoiceId] = useState<string | null>(null)
  const [viewerLoading, setViewerLoading] = useState(false)
  const [viewerError, setViewerError] = useState<string | null>(null)
  const [viewerMedia, setViewerMedia] = useState<{ mimeType: string; url: string } | null>(null)
  const viewerObjectUrl = useRef<string | null>(null)

  async function loadData(targetPage: number): Promise<void> {
    setLoading(true)
    setError(null)

    const [listResult, summaryResult] = await Promise.all([
      window.api.finance.list(targetPage),
      window.api.finance.summary()
    ])

    if (!listResult.ok || !summaryResult.ok) {
      setError(!listResult.ok ? listResult.error : (summaryResult as { error: string }).error)
      setLoading(false)
      return
    }

    setInvoices(listResult.data.items)
    setPageCount(Math.max(1, Math.ceil(listResult.data.total / listResult.data.pageSize)))
    setSummary(summaryResult.data)
    setLoading(false)
  }

  useEffect(() => {
    loadData(page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  function resetPhoto(): void {
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl)
    setPhotoFile(null)
    setPhotoPreviewUrl(null)
  }

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0] ?? null
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl)
    setPhotoFile(file)
    setPhotoPreviewUrl(file ? URL.createObjectURL(file) : null)
  }

  async function handleCreate(event: FormEvent): Promise<void> {
    event.preventDefault()
    setSubmitting(true)

    let input = form
    if (photoFile) {
      const data = await photoFile.arrayBuffer()
      input = { ...form, photo: { data, mimeType: photoFile.type } }
    }

    const result = await window.api.finance.create(input)
    setSubmitting(false)

    if (!result.ok) {
      setError(result.error)
      return
    }

    setShowForm(false)
    setForm(EMPTY_FORM)
    resetPhoto()
    setPage(1)
    await loadData(1)
  }

  function closeViewer(): void {
    if (viewerObjectUrl.current) {
      URL.revokeObjectURL(viewerObjectUrl.current)
      viewerObjectUrl.current = null
    }
    setViewerInvoiceId(null)
    setViewerMedia(null)
    setViewerError(null)
    setViewerLoading(false)
  }

  async function openViewer(id: string): Promise<void> {
    setViewerInvoiceId(id)
    setViewerLoading(true)
    setViewerError(null)
    setViewerMedia(null)

    const result = await window.api.finance.getMedia(id)

    if (!result.ok) {
      setViewerLoading(false)
      setViewerError(result.error)
      return
    }

    const blob = new Blob([result.data.data], { type: result.data.mimeType })
    const url = URL.createObjectURL(blob)
    viewerObjectUrl.current = url
    setViewerMedia({ mimeType: result.data.mimeType, url })
    setViewerLoading(false)
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        breadcrumb={['Entreprise', 'Finance']}
        title="Comptabilité & Finance"
        actions={
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-lg bg-accent-500 px-3.5 py-2 text-sm font-medium text-white hover:bg-accent-600"
          >
            <Plus className="h-4 w-4" />
            Nouvelle facture
          </button>
        }
      />

      {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}

      {showForm && (
        <Modal
          title="Nouvelle facture"
          onClose={() => {
            setShowForm(false)
            resetPhoto()
          }}
        >
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-500">Référence</label>
              <input
                required
                value={form.reference}
                onChange={(e) => setForm({ ...form, reference: e.target.value })}
                placeholder="INV-2023-090"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-500">Client/Fournisseur</label>
              <input
                required
                value={form.partyName}
                onChange={(e) => setForm({ ...form, partyName: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent-500 focus:outline-none"
              />
            </div>
            <div className="col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-gray-500">Description</label>
              <input
                required
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-500">Montant (FCFA)</label>
              <input
                required
                type="number"
                min={0}
                value={form.amount || ''}
                onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-500">Statut</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as InvoiceStatus })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent-500 focus:outline-none"
              >
                {(Object.keys(STATUS_LABEL) as InvoiceStatus[]).map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABEL[status]}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="mb-1.5 block text-xs font-medium text-gray-500">
                Photo de la version papier (optionnel)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-gray-700"
              />
              <p className="mt-1 text-xs text-gray-400">
                Sans photo, un PDF sera généré automatiquement avec le logo de l&apos;entreprise.
              </p>
              {photoPreviewUrl && (
                <img
                  src={photoPreviewUrl}
                  alt="Aperçu de la photo"
                  className="mt-2 h-24 w-24 rounded-lg border border-gray-200 object-cover"
                />
              )}
            </div>
            <div className="col-span-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-white hover:bg-accent-600 disabled:opacity-60"
              >
                {submitting ? 'Création…' : 'Créer la facture'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {viewerInvoiceId && (
        <Modal title="Aperçu de la facture" onClose={closeViewer} widthClassName="max-w-3xl">
          {viewerLoading && <p className="py-12 text-center text-sm text-gray-400">Chargement…</p>}
          {viewerError && <p className="py-12 text-center text-sm text-red-600">{viewerError}</p>}
          {viewerMedia && viewerMedia.mimeType.startsWith('image/') && (
            <img
              src={viewerMedia.url}
              alt="Photo de la facture"
              className="mx-auto max-h-[70vh] w-full rounded-lg object-contain"
            />
          )}
          {viewerMedia && viewerMedia.mimeType === 'application/pdf' && (
            <embed
              src={viewerMedia.url}
              type="application/pdf"
              className="h-[70vh] w-full rounded-lg border border-gray-200"
            />
          )}
        </Modal>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50">
            <TrendingUp className="h-5 w-5 text-green-600" />
          </div>
          <p className="mt-3 text-xs font-medium uppercase tracking-wide text-gray-500">Chiffre d&apos;affaires</p>
          <p className="text-2xl font-bold text-gray-900">{summary ? formatAmount(summary.chiffreAffaires) : '—'}</p>
        </Card>

        <Card>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
            <Wallet className="h-5 w-5 text-blue-600" />
          </div>
          <p className="mt-3 text-xs font-medium uppercase tracking-wide text-gray-500">Trésorerie actuelle</p>
          <p className="text-2xl font-bold text-gray-900">{summary ? formatAmount(summary.tresorerie) : '—'}</p>
        </Card>

        <Card className="border-red-200 bg-red-50/40">
          <div className="flex items-center justify-between">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100">
              <TriangleAlert className="h-5 w-5 text-red-600" />
            </div>
            {summary && <span className="text-xs font-semibold text-red-600">Urgent</span>}
          </div>
          <p className="mt-3 text-xs font-medium uppercase tracking-wide text-gray-500">Factures impayées</p>
          <p className="text-2xl font-bold text-red-600">{summary ? formatAmount(summary.facturesImpayees.total) : '—'}</p>
          <p className="mt-1 text-xs text-gray-500">
            {summary ? `${summary.facturesImpayees.count} document(s) en attente de paiement` : ''}
          </p>
        </Card>
      </div>

      <Card className="mt-6 p-0">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Transactions récentes</h2>
            <p className="text-xs text-gray-500">Vue d&apos;ensemble de vos flux financiers récents</p>
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
              <Filter className="h-3.5 w-3.5" />
              Filtrer
            </button>
            <button className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
              <Download className="h-3.5 w-3.5" />
              Exporter CSV
            </button>
          </div>
        </div>

        {loading ? (
          <p className="px-6 py-8 text-center text-sm text-gray-400">Chargement…</p>
        ) : invoices.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-gray-400">Aucune facture pour le moment.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                <th className="px-6 py-2.5 font-medium">Date</th>
                <th className="px-6 py-2.5 font-medium">Description</th>
                <th className="px-6 py-2.5 font-medium">Client/Fournisseur</th>
                <th className="px-6 py-2.5 text-right font-medium">Montant</th>
                <th className="px-6 py-2.5 font-medium">Statut</th>
                <th className="w-10 px-6 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-6 py-3.5 text-gray-500">{formatDate(invoice.issuedAt)}</td>
                  <td className="px-6 py-3.5 font-medium text-gray-900">{invoice.description}</td>
                  <td className="px-6 py-3.5 text-gray-600">{invoice.partyName}</td>
                  <td className="px-6 py-3.5 text-right font-semibold text-gray-900">{formatAmount(invoice.amount)}</td>
                  <td className="px-6 py-3.5">
                    <StatusBadge label={STATUS_LABEL[invoice.status]} tone={STATUS_TONE[invoice.status]} />
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <button
                      onClick={() => openViewer(invoice.id)}
                      title="Voir la facture"
                      className="ml-auto flex h-6 w-6 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
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
