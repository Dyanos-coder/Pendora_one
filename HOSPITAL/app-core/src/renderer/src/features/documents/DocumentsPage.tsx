import { useEffect, useMemo, useState } from 'react'
import {
  FileText,
  CheckCircle2,
  Hourglass,
  TriangleAlert,
  Search,
  Eye,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Upload,
  FileSignature
} from 'lucide-react'
import { Card } from '@renderer/components/Card'
import { PageHeader } from '@renderer/components/PageHeader'
import { Button } from '@renderer/components/Button'
import { StatusBadge } from '@renderer/components/StatusBadge'
import { ConfirmDialog } from '@renderer/components/ConfirmDialog'
import type { ApiProtocolDocument, ApiProtocolDocumentStatus } from '@shared/documents-types'
import { documentStatusTone, CATEGORY_CHART_COLOR } from './status'
import type { DocumentStatus, ProtocolDocument } from './types'
import { ProtocolDocumentFormModal } from './ProtocolDocumentFormModal'
import { SortableGroup } from '@renderer/components/SortableGroup'
import type { Session } from '@shared/auth-types'
import { accessLevel, hasAccess } from '@shared/permissions'
import { RequestSignatureModal, SignaturePanel } from './SignaturePanel'
import { PulseLoader } from '@renderer/components/ui/Feedback'

const STATUS_LABEL: Record<ApiProtocolDocumentStatus, DocumentStatus> = {
  PUBLIE: 'Publié',
  EN_VALIDATION: 'En validation',
  A_REVISER: 'À réviser'
}

function toDocument(d: ApiProtocolDocument): ProtocolDocument {
  return {
    id: d.id,
    title: d.title,
    category: d.category,
    version: d.version,
    status: STATUS_LABEL[d.status],
    updatedOn: new Date(d.revisedAt).toLocaleDateString('fr-FR'),
    owner: d.owner,
    fileName: d.fileName
  }
}

export function DocumentsPage({ session }: { session: Session }): JSX.Element {
  const level = accessLevel(session.user.role, 'documents')
  const canWrite = hasAccess(level, 'write')
  const canDelete = hasAccess(level, 'full')
  const isDirector = session.user.role === 'DIRIGEANT'
  // Demande de signature : ouverte à tous. `undefined` = fermé, `null` = sans document présélectionné.
  const [requestingFor, setRequestingFor] = useState<string | null | undefined>(undefined)
  const [signatureRefresh, setSignatureRefresh] = useState(0)
  const [reloadKey, setReloadKey] = useState(0)
  const [documents, setDocuments] = useState<(ProtocolDocument & { revisedAtMs: number })[]>([])
  const [rawDocuments, setRawDocuments] = useState<ApiProtocolDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingDocument, setEditingDocument] = useState<ApiProtocolDocument | null>(null)
  const [deletingDocument, setDeletingDocument] = useState<ProtocolDocument | null>(null)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [viewingId, setViewingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    window.api.documents.list().then((result) => {
      if (cancelled) return
      if (result.ok) {
        setRawDocuments(result.data.documents)
        setDocuments(result.data.documents.map((d) => ({ ...toDocument(d), revisedAtMs: new Date(d.revisedAt).getTime() })))
      } else {
        setError(result.error)
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  function applyUpdatedDocument(document: ApiProtocolDocument): void {
    setRawDocuments((prev) => prev.map((d) => (d.id === document.id ? document : d)))
    setDocuments((prev) =>
      prev.map((d) => (d.id === document.id ? { ...toDocument(document), revisedAtMs: new Date(document.revisedAt).getTime() } : d))
    )
  }

  async function handleUpload(id: string): Promise<void> {
    setUploadingId(id)
    setActionError(null)
    const result = await window.api.documents.uploadFile(id)
    setUploadingId(null)
    if (result === null) return
    if (result.ok) {
      applyUpdatedDocument(result.data.document)
    } else {
      setActionError(result.error)
    }
  }

  async function handleView(id: string): Promise<void> {
    setViewingId(id)
    setActionError(null)
    try {
      await window.api.documents.viewFile(id)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Impossible d’ouvrir le fichier.')
    }
    setViewingId(null)
  }

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return documents
    return documents.filter((d) => `${d.title} ${d.category} ${d.owner}`.toLowerCase().includes(term))
  }, [search, documents])

  const published = useMemo(() => documents.filter((d) => d.status === 'Publié').length, [documents])
  const pending = useMemo(() => documents.filter((d) => d.status === 'En validation').length, [documents])
  const toReview = useMemo(() => documents.filter((d) => d.status === 'À réviser').length, [documents])

  const categoryBreakdown = useMemo(() => {
    const counts = new Map<string, number>()
    for (const d of documents) counts.set(d.category, (counts.get(d.category) ?? 0) + 1)
    return Array.from(counts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
  }, [documents])
  const total = categoryBreakdown.reduce((s, c) => s + c.count, 0)
  const donutBackground = useMemo(() => {
    let cursor = 0
    const stops = categoryBreakdown.map(({ label, count }) => {
      const percent = total === 0 ? 0 : (count / total) * 100
      const start = cursor
      cursor += percent
      return `${CATEGORY_CHART_COLOR[label] ?? '#9ca3af'} ${start}% ${cursor}%`
    })
    return `conic-gradient(${stops.join(', ')})`
  }, [categoryBreakdown, total])

  const recentlyUpdated = useMemo(() => [...documents].sort((a, b) => b.revisedAtMs - a.revisedAtMs).slice(0, 4), [documents])

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        breadcrumb={['Accueil', 'Documents & signature électronique']}
        title="Documents & signature électronique"
        subtitle="Protocoles, procédures et documents institutionnels — signature électronique du dirigeant."
        actions={
          <>
            <Button variant="secondary" onClick={() => setRequestingFor(null)}>
              <FileSignature className="h-4 w-4" />
              Demander une signature
            </Button>
            {canWrite && (
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4" />
                Nouveau document
              </Button>
            )}
          </>
        }
      />

      {showCreateModal && (
        <ProtocolDocumentFormModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(document) => {
            setRawDocuments((prev) => [...prev, document])
            setDocuments((prev) => [...prev, { ...toDocument(document), revisedAtMs: new Date(document.revisedAt).getTime() }])
            setShowCreateModal(false)
          }}
        />
      )}

      {editingDocument && (
        <ProtocolDocumentFormModal
          editing={editingDocument}
          onClose={() => setEditingDocument(null)}
          onCreated={(document) => {
            setRawDocuments((prev) => prev.map((d) => (d.id === document.id ? document : d)))
            setDocuments((prev) =>
              prev.map((d) => (d.id === document.id ? { ...toDocument(document), revisedAtMs: new Date(document.revisedAt).getTime() } : d))
            )
            setEditingDocument(null)
          }}
        />
      )}

      {deletingDocument && (
        <ConfirmDialog
          title="Supprimer le document"
          message={`Voulez-vous vraiment supprimer le document « ${deletingDocument.title} » ?`}
          onCancel={() => setDeletingDocument(null)}
          onConfirm={() => window.api.documents.delete(deletingDocument.id)}
          onConfirmed={() => {
            setRawDocuments((prev) => prev.filter((d) => d.id !== deletingDocument.id))
            setDocuments((prev) => prev.filter((d) => d.id !== deletingDocument.id))
            setDeletingDocument(null)
          }}
        />
      )}

      {requestingFor !== undefined && (
        <RequestSignatureModal
          documents={rawDocuments}
          preselectedId={requestingFor}
          onClose={() => setRequestingFor(undefined)}
          onRequested={() => {
            setRequestingFor(undefined)
            setSignatureRefresh((n) => n + 1)
            setReloadKey((n) => n + 1)
          }}
        />
      )}

      {actionError && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-red-100 bg-red-50 px-4 py-2.5 text-xs text-red-600">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="shrink-0 text-red-400 hover:text-red-600">
            ✕
          </button>
        </div>
      )}

      {loading ? (
        <PulseLoader label="Chargement des documents…" />
      ) : error ? (
        <p className="py-12 text-center text-sm text-red-500">{error}</p>
      ) : (
        <>
          {/* KPI row */}
          <SortableGroup id="documents.grid1" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-black/5 bg-accent-50">
                <FileText className="h-5 w-5 text-accent-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Documents actifs</p>
              <p className="text-xl font-display font-extrabold tabular-nums text-gray-900">{documents.length}</p>
            </Card>
            <Card className="p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-black/5 bg-teal-50">
                <CheckCircle2 className="h-5 w-5 text-teal-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Publiés</p>
              <p className="text-xl font-display font-extrabold tabular-nums text-gray-900">{published}</p>
            </Card>
            <Card className="p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-black/5 bg-blue-50">
                <Hourglass className="h-5 w-5 text-blue-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">En validation</p>
              <p className="text-xl font-display font-extrabold tabular-nums text-gray-900">{pending}</p>
            </Card>
            <Card className="p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-black/5 bg-amber-50">
                <TriangleAlert className="h-5 w-5 text-amber-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">À réviser</p>
              <p className="text-xl font-display font-extrabold tabular-nums text-gray-900">{toReview}</p>
            </Card>
          </SortableGroup>

          <SignaturePanel
            isDirector={isDirector}
            refreshKey={signatureRefresh}
            onDocumentsChanged={() => setReloadKey((n) => n + 1)}
            onView={(id) => void handleView(id)}
          />

          <SortableGroup id="documents.grid2" className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="p-0 lg:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-6 py-4">
                <h3 className="text-[15px] font-bold text-gray-900">Documents</h3>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Rechercher un document..."
                    className="w-64 rounded-[10px] border border-gray-300 py-1.5 pl-8 pr-3 text-xs text-gray-700 placeholder:text-gray-400 focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/70 text-[11px] uppercase tracking-[0.08em] text-gray-500">
                      <th className="px-6 py-3 font-semibold">Document</th>
                      <th className="px-6 py-3 font-semibold">Catégorie</th>
                      <th className="px-6 py-3 font-semibold">Version</th>
                      <th className="px-6 py-3 font-semibold">Statut</th>
                      <th className="px-6 py-3 font-semibold">Mis à jour</th>
                      <th className="px-6 py-3 font-semibold" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((d) => (
                      <tr key={d.id} className="border-b border-gray-100 last:border-0 transition-colors hover:bg-accent-50/40">
                        <td className="px-6 py-3">
                          <p className="font-medium text-gray-900">{d.title}</p>
                          <p className="text-xs text-gray-400">{d.owner}</p>
                        </td>
                        <td className="px-6 py-3 text-gray-600">{d.category}</td>
                        <td className="px-6 py-3 text-gray-600">{d.version}</td>
                        <td className="px-6 py-3">
                          <StatusBadge label={d.status} tone={documentStatusTone(d.status)} />
                        </td>
                        <td className="px-6 py-3 text-gray-600">{d.updatedOn}</td>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleView(d.id)}
                              disabled={!d.fileName || viewingId === d.id}
                              title={d.fileName ? `Voir ${d.fileName}` : 'Aucun fichier — téléversez-en un'}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                            >
                              {viewingId === d.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                            </button>
                            {rawDocuments.find((r) => r.id === d.id)?.mimeType === 'application/pdf' && (
                              <button
                                onClick={() => setRequestingFor(d.id)}
                                title="Demander la signature du dirigeant"
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-accent-600"
                              >
                                <FileSignature className="h-4 w-4" />
                              </button>
                            )}
                            {canWrite && (
                              <button
                                onClick={() => handleUpload(d.id)}
                                disabled={uploadingId === d.id}
                                title={d.fileName ? 'Remplacer le fichier' : 'Téléverser un fichier'}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                              >
                                {uploadingId === d.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                              </button>
                            )}
                            {canWrite && (
                              <button
                                onClick={() => setEditingDocument(rawDocuments.find((r) => r.id === d.id) ?? null)}
                                title="Modifier le document"
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => setDeletingDocument(d)}
                                title="Supprimer le document"
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <SortableGroup id="documents.side1" className="space-y-6">
              <Card>
                <h3 className="mb-4 text-[15px] font-bold text-gray-900">Répartition par catégorie</h3>
                {categoryBreakdown.length === 0 ? (
                  <p className="text-xs text-gray-400">Aucune donnée.</p>
                ) : (
                  <div className="flex items-center gap-4">
                    <div
                      className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full"
                      style={{ background: donutBackground }}
                    >
                      <div className="h-11 w-11 rounded-full bg-white" />
                    </div>
                    <div className="space-y-1 text-[11px]">
                      {categoryBreakdown.map(({ label, count }) => (
                        <div key={label} className="flex items-center gap-1.5">
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: CATEGORY_CHART_COLOR[label] ?? '#9ca3af' }}
                          />
                          <span className="text-gray-600">{label}</span>
                          <span className="font-medium text-gray-900">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>

              <Card className="p-0">
                <div className="border-b border-gray-100 px-5 py-3.5">
                  <h3 className="text-[15px] font-bold text-gray-900">Récemment modifiés</h3>
                </div>
                <div className="space-y-3 p-5">
                  {recentlyUpdated.map((r) => (
                    <div key={r.id} className="flex items-center justify-between gap-2 text-xs">
                      <span className="min-w-0 flex-1 truncate text-gray-700">{r.title}</span>
                      <span className="shrink-0 text-gray-400">{r.updatedOn}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </SortableGroup>
          </SortableGroup>
        </>
      )}
    </div>
  )
}
