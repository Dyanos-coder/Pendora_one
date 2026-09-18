import { useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Modal } from '@renderer/components/Modal'
import { Button } from '@renderer/components/Button'
import type { ApiProtocolDocument, ApiProtocolDocumentStatus, CreateProtocolDocumentInput } from '@shared/documents-types'

interface ProtocolDocumentFormModalProps {
  onClose: () => void
  onCreated: (document: ApiProtocolDocument) => void
  editing?: ApiProtocolDocument
}

const inputClass =
  'w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-800 focus:border-accent-500 focus:outline-none'
const labelClass = 'mb-1 block text-xs font-medium text-gray-500'

export function ProtocolDocumentFormModal({ onClose, onCreated, editing }: ProtocolDocumentFormModalProps): JSX.Element {
  const [title, setTitle] = useState(editing?.title ?? '')
  const [category, setCategory] = useState(editing?.category ?? '')
  const [version, setVersion] = useState(editing?.version ?? 'v1.0')
  const [owner, setOwner] = useState(editing?.owner ?? '')
  const [status, setStatus] = useState<ApiProtocolDocumentStatus>(editing?.status ?? 'EN_VALIDATION')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!title.trim() || !category.trim() || !version.trim() || !owner.trim()) {
      setError('Tous les champs sont requis.')
      return
    }

    setSubmitting(true)
    setError(null)

    const result = editing
      ? await window.api.documents.update(editing.id, {
          title: title.trim(),
          category: category.trim(),
          version: version.trim(),
          owner: owner.trim(),
          status
        })
      : await window.api.documents.create({
          title: title.trim(),
          category: category.trim(),
          version: version.trim(),
          owner: owner.trim(),
          status
        } as CreateProtocolDocumentInput)
    setSubmitting(false)
    if (result.ok) {
      onCreated(result.data.document)
    } else {
      setError(result.error)
    }
  }

  return (
    <Modal title={editing ? 'Modifier le document' : 'Nouveau document'} onClose={onClose} widthClassName="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className={labelClass}>Titre *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Catégorie *</label>
            <input value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Version *</label>
            <input value={version} onChange={(e) => setVersion(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Statut</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as ApiProtocolDocumentStatus)} className={inputClass}>
              <option value="PUBLIE">Publié</option>
              <option value="EN_VALIDATION">En validation</option>
              <option value="A_REVISER">À réviser</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Propriétaire *</label>
            <input value={owner} onChange={(e) => setOwner(e.target.value)} className={inputClass} />
          </div>
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : editing ? 'Enregistrer les modifications' : 'Créer le document'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
