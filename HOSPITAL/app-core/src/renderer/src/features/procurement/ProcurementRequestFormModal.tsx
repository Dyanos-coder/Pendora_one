import { useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Modal } from '@renderer/components/Modal'
import { Button } from '@renderer/components/Button'
import type {
  ApiProcurementPriority,
  ApiProcurementRequest,
  ApiProcurementStatus,
  CreateProcurementRequestInput
} from '@shared/procurement-types'

interface ProcurementRequestFormModalProps {
  onClose: () => void
  onCreated: (request: ApiProcurementRequest) => void
  editing?: ApiProcurementRequest
}

const inputClass =
  'w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-800 focus:border-accent-500 focus:outline-none'
const labelClass = 'mb-1 block text-xs font-medium text-gray-500'

const STATUS_OPTIONS: { value: ApiProcurementStatus; label: string }[] = [
  { value: 'A_VALIDER', label: 'À valider' },
  { value: 'VALIDE', label: 'Validé' },
  { value: 'COMMANDE', label: 'Commandé' },
  { value: 'RECU', label: 'Reçu' },
  { value: 'RETARD', label: 'Retard' }
]

export function ProcurementRequestFormModal({ onClose, onCreated, editing }: ProcurementRequestFormModalProps): JSX.Element {
  const [article, setArticle] = useState(editing?.article ?? '')
  const [category, setCategory] = useState(editing?.category ?? '')
  const [quantity, setQuantity] = useState(editing?.quantity ?? 1)
  const [priority, setPriority] = useState<ApiProcurementPriority>(editing?.priority ?? 'NORMALE')
  const [requester, setRequester] = useState(editing?.requester ?? '')
  const [status, setStatus] = useState<ApiProcurementStatus>(editing?.status ?? 'A_VALIDER')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!article.trim() || !category.trim() || !requester.trim() || quantity <= 0) {
      setError('Article, catégorie, demandeur et quantité (positive) sont requis.')
      return
    }

    setSubmitting(true)
    setError(null)

    const result = editing
      ? await window.api.procurement.update(editing.id, {
          article: article.trim(),
          category: category.trim(),
          quantity,
          priority,
          status,
          requester: requester.trim()
        })
      : await window.api.procurement.create({
          article: article.trim(),
          category: category.trim(),
          quantity,
          priority,
          requester: requester.trim()
        } as CreateProcurementRequestInput)
    setSubmitting(false)
    if (result.ok) {
      onCreated(result.data.request)
    } else {
      setError(result.error)
    }
  }

  return (
    <Modal title={editing ? "Modifier le besoin d'approvisionnement" : "Nouveau besoin d'approvisionnement"} onClose={onClose} widthClassName="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className={labelClass}>Article *</label>
            <input value={article} onChange={(e) => setArticle(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Catégorie *</label>
            <input value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Quantité *</label>
            <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Priorité</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value as ApiProcurementPriority)} className={inputClass}>
              <option value="NORMALE">Normale</option>
              <option value="URGENTE">Urgente</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Demandeur *</label>
            <input value={requester} onChange={(e) => setRequester(e.target.value)} className={inputClass} />
          </div>
          {editing && (
            <div>
              <label className={labelClass}>Statut</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as ApiProcurementStatus)} className={inputClass}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : editing ? 'Enregistrer les modifications' : 'Créer le besoin'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
