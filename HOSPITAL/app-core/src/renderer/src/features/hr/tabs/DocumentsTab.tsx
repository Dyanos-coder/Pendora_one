import { useEffect, useState } from 'react'
import { Loader2, Plus, Eye, Upload, Trash2 } from 'lucide-react'
import { Button } from '@renderer/components/Button'
import { ConfirmDialog } from '@renderer/components/ConfirmDialog'
import type { ApiEmployeeDocument, ApiHrEmployee } from '@shared/hr-types'
import { EmployeeDocumentFormModal } from './EmployeeDocumentFormModal'
import { PulseLoader, EmptyState } from '@renderer/components/ui/Feedback'

function formatSize(bytes: number | null): string {
  if (bytes === null) return '—'
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

export function DocumentsTab({ employees }: { employees: ApiHrEmployee[] }): JSX.Element {
  const [documents, setDocuments] = useState<ApiEmployeeDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [deleting, setDeleting] = useState<ApiEmployeeDocument | null>(null)
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [viewingId, setViewingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    window.api.hr.documents.list().then((result) => {
      if (cancelled) return
      if (result.ok) setDocuments(result.data.documents)
      else setError(result.error)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleUpload(id: string): Promise<void> {
    setUploadingId(id)
    setActionError(null)
    const result = await window.api.hr.documents.uploadFile(id)
    setUploadingId(null)
    if (result === null) return
    if (result.ok) {
      setDocuments((prev) => prev.map((d) => (d.id === id ? result.data.document : d)))
    } else {
      setActionError(result.error)
    }
  }

  async function handleView(id: string): Promise<void> {
    setViewingId(id)
    setActionError(null)
    try {
      await window.api.hr.documents.viewFile(id)
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Impossible d'ouvrir le fichier.")
    }
    setViewingId(null)
  }

  if (loading) {
    return <PulseLoader label="Chargement…" />
  }
  if (error) return <p className="px-6 py-8 text-center text-sm text-red-500">{error}</p>

  return (
    <>
      <div className="flex items-center justify-end border-b border-gray-100 px-6 py-3">
        <Button size="sm" onClick={() => setShowCreateModal(true)}>
          <Plus className="h-3.5 w-3.5" />
          Nouveau document
        </Button>
      </div>

      {actionError && <p className="px-6 py-2 text-xs text-red-500">{actionError}</p>}

      {showCreateModal && (
        <EmployeeDocumentFormModal
          employees={employees}
          onClose={() => setShowCreateModal(false)}
          onCreated={(d) => {
            setDocuments((prev) => [d, ...prev])
            setShowCreateModal(false)
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Supprimer le document"
          message={`Voulez-vous vraiment supprimer « ${deleting.title} » de ${deleting.employeeName} ?`}
          onCancel={() => setDeleting(null)}
          onConfirm={() => window.api.hr.documents.delete(deleting.id)}
          onConfirmed={() => {
            setDocuments((prev) => prev.filter((x) => x.id !== deleting.id))
            setDeleting(null)
          }}
        />
      )}

      {documents.length === 0 ? (
        <EmptyState title="Aucun document enregistré." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/70 text-[11px] uppercase tracking-[0.08em] text-gray-500">
                <th className="px-6 py-3 font-semibold">Employé</th>
                <th className="px-6 py-3 font-semibold">Titre</th>
                <th className="px-6 py-3 font-semibold">Catégorie</th>
                <th className="px-6 py-3 font-semibold">Fichier</th>
                <th className="px-6 py-3 font-semibold">Taille</th>
                <th className="px-6 py-3 font-semibold" />
              </tr>
            </thead>
            <tbody>
              {documents.map((d) => (
                <tr key={d.id} className="border-b border-gray-100 last:border-0 transition-colors hover:bg-accent-50/40">
                  <td className="px-6 py-3 font-medium text-gray-900">{d.employeeName}</td>
                  <td className="px-6 py-3 text-gray-600">{d.title}</td>
                  <td className="px-6 py-3 text-gray-600">{d.category ?? '—'}</td>
                  <td className="px-6 py-3 text-xs text-gray-400">{d.fileName ?? 'Aucun fichier'}</td>
                  <td className="px-6 py-3 text-gray-600">{formatSize(d.fileSize)}</td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleView(d.id)}
                        disabled={!d.fileName || viewingId === d.id}
                        title={d.fileName ? `Voir ${d.fileName}` : 'Aucun fichier'}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {viewingId === d.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => handleUpload(d.id)}
                        disabled={uploadingId === d.id}
                        title={d.fileName ? 'Remplacer le fichier' : 'Téléverser un fichier'}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                      >
                        {uploadingId === d.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => setDeleting(d)}
                        title="Supprimer"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
