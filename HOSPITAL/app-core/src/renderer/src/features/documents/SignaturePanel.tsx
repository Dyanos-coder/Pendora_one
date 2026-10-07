import { useEffect, useState, type FormEvent } from 'react'
import { Eye, FileSignature, ImageIcon, Loader2, PenLine, Trash2, Upload, X } from 'lucide-react'
import { Card } from '@renderer/components/Card'
import { Button } from '@renderer/components/Button'
import { Modal } from '@renderer/components/Modal'
import { StatusBadge, type StatusTone } from '@renderer/components/StatusBadge'
import type { ApiProtocolDocument, ApiSignatureImage, ApiSignatureRequest, ApiSignatureStatus } from '@shared/documents-types'

const STATUS: Record<ApiSignatureStatus, { label: string; tone: StatusTone }> = {
  EN_ATTENTE: { label: 'En attente', tone: 'warning' },
  SIGNE: { label: 'Signé', tone: 'success' },
  REFUSE: { label: 'Refusé', tone: 'danger' }
}

const inputClass =
  'w-full rounded-[10px] border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15'
const labelClass = 'mb-1.5 block text-xs font-semibold text-gray-700'

function toObjectUrl(image: ApiSignatureImage): string {
  const bytes = Uint8Array.from(atob(image.contentBase64), (c) => c.charCodeAt(0))
  return URL.createObjectURL(new Blob([bytes], { type: image.mimeType }))
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.toLocaleDateString('fr-FR')} ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
}

interface SignaturePanelProps {
  isDirector: boolean
  /** Incrémenté par la page pour recharger les demandes (ex. après une nouvelle demande). */
  refreshKey: number
  onDocumentsChanged: () => void
  onView: (documentId: string) => void
}

/** Documents & signature électronique : signature du dirigeant, suivi des demandes, et pour le
 * dirigeant les actions Signer (signature apposée sur le PDF) / Refuser. */
export function SignaturePanel({ isDirector, refreshKey, onDocumentsChanged, onView }: SignaturePanelProps): JSX.Element {
  const [requests, setRequests] = useState<ApiSignatureRequest[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [refusing, setRefusing] = useState<ApiSignatureRequest | null>(null)
  const [filter, setFilter] = useState<'pending' | 'done'>('pending')

  async function load(): Promise<void> {
    const result = await window.api.documents.signature.requests()
    if (result.ok) setRequests(result.data.requests)
    else setError(result.error)
  }

  useEffect(() => {
    void load()
  }, [refreshKey])

  async function handleSign(request: ApiSignatureRequest): Promise<void> {
    setBusyId(request.id)
    setError(null)
    const result = await window.api.documents.signature.sign(request.id)
    setBusyId(null)
    if (!result.ok) {
      setError(result.error)
      return
    }
    await load()
    onDocumentsChanged()
  }

  const pending = (requests ?? []).filter((r) => r.status === 'EN_ATTENTE')
  const done = (requests ?? []).filter((r) => r.status !== 'EN_ATTENTE')
  const shown = filter === 'pending' ? pending : done

  return (
    <div className={`grid grid-cols-1 gap-6 ${isDirector ? 'lg:grid-cols-3' : ''}`}>
      <Card className={`p-0 ${isDirector ? 'lg:col-span-2' : ''}`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-6 py-4">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <FileSignature className="h-4 w-4 text-accent-600" />
              {isDirector ? 'Demandes de signature' : 'Mes demandes de signature'}
            </h3>
            {isDirector && pending.length > 0 && (
              <p className="text-xs text-amber-700">
                {pending.length} document{pending.length > 1 ? 's' : ''} en attente de votre signature
              </p>
            )}
          </div>
          <div className="flex gap-1">
            {(['pending', 'done'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${filter === f ? 'bg-accent-600 text-white shadow-sm shadow-accent-600/25' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {f === 'pending' ? `En attente (${pending.length})` : `Traitées (${done.length})`}
              </button>
            ))}
          </div>
        </div>
        {error && <p className="px-6 pt-3 text-xs text-red-500">{error}</p>}
        {!requests ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
          </div>
        ) : shown.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-gray-400">
            {filter === 'pending' ? 'Aucune demande en attente.' : 'Aucune demande traitée.'}
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {shown.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{r.documentTitle}</p>
                  <p className="text-xs text-gray-500">
                    Demandé par {r.requestedByName} le {formatDate(r.createdAt)}
                    {r.decidedByName && r.decidedAt && ` · ${r.status === 'SIGNE' ? 'signé' : 'refusé'} le ${formatDate(r.decidedAt)}`}
                  </p>
                  {r.message && <p className="mt-0.5 text-xs italic text-gray-500">« {r.message} »</p>}
                  {r.refusalReason && <p className="mt-0.5 text-xs text-red-600">Motif du refus : {r.refusalReason}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge label={STATUS[r.status].label} tone={STATUS[r.status].tone} />
                  <button
                    onClick={() => onView(r.documentId)}
                    title="Voir le document"
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  {isDirector && r.status === 'EN_ATTENTE' && (
                    <>
                      <Button size="sm" onClick={() => handleSign(r)} disabled={busyId === r.id}>
                        {busyId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PenLine className="h-3.5 w-3.5" />}
                        Signer
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => setRefusing(r)} disabled={busyId === r.id}>
                        <X className="h-3.5 w-3.5" />
                        Refuser
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {isDirector && <MySignatureCard />}

      {refusing && (
        <RefuseModal
          request={refusing}
          onClose={() => setRefusing(null)}
          onRefused={async () => {
            setRefusing(null)
            await load()
            onDocumentsChanged()
          }}
        />
      )}
    </div>
  )
}

/** Image de la signature du dirigeant, apposée sur les PDF qu'il signe. */
function MySignatureCard(): JSX.Element {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function show(image: ApiSignatureImage | null): void {
    setUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous)
      return image ? toObjectUrl(image) : null
    })
  }

  useEffect(() => {
    window.api.documents.signature
      .get()
      .then((r) => (r.ok ? show(r.data.signature) : setError(r.error)))
      .finally(() => setLoading(false))
    return () => show(null)
  }, [])

  async function handleUpload(): Promise<void> {
    setBusy(true)
    setError(null)
    const result = await window.api.documents.signature.upload()
    setBusy(false)
    if (!result) return
    if (result.ok) show(result.data.signature)
    else setError(result.error)
  }

  async function handleRemove(): Promise<void> {
    setBusy(true)
    const result = await window.api.documents.signature.remove()
    setBusy(false)
    if (result.ok) show(null)
    else setError(result.error)
  }

  return (
    <Card>
      <h3 className="mb-1 text-[15px] font-bold text-gray-900">Ma signature</h3>
      <p className="mb-4 text-xs text-gray-500">
        Apposée automatiquement sur les documents que vous signez. Image PNG sur fond transparent de préférence.
      </p>
      <div className="flex h-28 items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50">
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-gray-300" />
        ) : url ? (
          <img src={url} alt="Signature" className="max-h-24 max-w-full object-contain" />
        ) : (
          <span className="flex flex-col items-center gap-1 text-xs text-gray-400">
            <ImageIcon className="h-6 w-6" />
            Aucune signature enregistrée
          </span>
        )}
      </div>
      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={handleUpload} disabled={busy}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {url ? 'Remplacer' : 'Téléverser ma signature'}
        </Button>
        {url && (
          <Button size="sm" variant="secondary" onClick={handleRemove} disabled={busy}>
            <Trash2 className="h-3.5 w-3.5" />
            Retirer
          </Button>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </Card>
  )
}

function RefuseModal({
  request,
  onClose,
  onRefused
}: {
  request: ApiSignatureRequest
  onClose: () => void
  onRefused: () => void
}): JSX.Element {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setBusy(true)
    const result = await window.api.documents.signature.refuse(request.id, reason)
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    onRefused()
  }

  return (
    <Modal title={`Refuser la signature — ${request.documentTitle}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClass}>Motif du refus</label>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} autoFocus className={inputClass} />
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Retour
          </Button>
          <Button type="submit" variant="danger" disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Refuser
          </Button>
        </div>
      </form>
    </Modal>
  )
}

/** Demande de signature : d'un document existant (PDF déjà téléversé) ou d'un nouveau PDF choisi
 * sur le poste. Ouvert à tous les utilisateurs. */
export function RequestSignatureModal({
  documents,
  preselectedId,
  onClose,
  onRequested
}: {
  documents: ApiProtocolDocument[]
  preselectedId: string | null
  onClose: () => void
  onRequested: () => void
}): JSX.Element {
  const signable = documents.filter((d) => d.mimeType === 'application/pdf' && d.fileName)
  const [mode, setMode] = useState<'existing' | 'new'>(preselectedId || signable.length > 0 ? 'existing' : 'new')
  const [documentId, setDocumentId] = useState(preselectedId ?? signable[0]?.id ?? '')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)
    if (mode === 'existing' && !documentId) {
      setError('Choisissez un document.')
      return
    }
    if (mode === 'new' && !title.trim()) {
      setError('Indiquez le titre du document.')
      return
    }
    setBusy(true)
    const result =
      mode === 'existing'
        ? await window.api.documents.signature.request(documentId, message.trim() || null)
        : await window.api.documents.signature.requestWithFile(title.trim(), message.trim() || null)
    setBusy(false)
    if (result === null) return
    if (!result.ok) {
      setError(result.error)
      return
    }
    onRequested()
  }

  return (
    <Modal title="Demander une signature" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {!preselectedId && (
          <div className="flex gap-2">
            {(['existing', 'new'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 rounded-lg border py-2 text-sm font-medium ${mode === m ? 'border-accent-500 bg-accent-50 text-accent-700' : 'border-gray-200 text-gray-600'}`}
              >
                {m === 'existing' ? 'Document existant' : 'Nouveau document PDF'}
              </button>
            ))}
          </div>
        )}
        {mode === 'existing' ? (
          <div>
            <label className={labelClass}>Document (PDF)</label>
            {signable.length === 0 ? (
              <p className="text-xs text-gray-500">Aucun document PDF disponible : choisissez « Nouveau document PDF ».</p>
            ) : (
              <select
                value={documentId}
                onChange={(e) => setDocumentId(e.target.value)}
                disabled={Boolean(preselectedId)}
                className={inputClass}
              >
                {signable.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </select>
            )}
          </div>
        ) : (
          <div>
            <label className={labelClass}>Titre du document</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex. Attestation de stage" className={inputClass} />
            <p className="mt-1 text-[11px] text-gray-400">Le fichier PDF vous sera demandé à l&apos;envoi.</p>
          </div>
        )}
        <div>
          <label className={labelClass}>Message pour le dirigeant (facultatif)</label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} className={inputClass} />
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSignature className="h-4 w-4" />}
            {mode === 'new' ? 'Choisir le PDF et envoyer' : 'Envoyer la demande'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
