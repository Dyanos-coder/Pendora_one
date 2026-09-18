import { useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Modal } from '@renderer/components/Modal'
import { Button } from '@renderer/components/Button'
import type {
  ApiFinanceTransaction,
  ApiTransactionStatus,
  ApiTransactionType,
  CreateFinanceTransactionInput
} from '@shared/finance-types'

interface FinanceTransactionFormModalProps {
  onClose: () => void
  onCreated: (transaction: ApiFinanceTransaction) => void
  editing?: ApiFinanceTransaction
}

const inputClass =
  'w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-800 focus:border-accent-500 focus:outline-none'
const labelClass = 'mb-1 block text-xs font-medium text-gray-500'

const STATUS_OPTIONS: { value: ApiTransactionStatus; label: string }[] = [
  { value: 'EN_ATTENTE', label: 'En attente' },
  { value: 'PAYE', label: 'Payé' },
  { value: 'EN_RETARD', label: 'En retard' }
]

export function FinanceTransactionFormModal({ onClose, onCreated, editing }: FinanceTransactionFormModalProps): JSX.Element {
  const [type, setType] = useState<ApiTransactionType>(editing?.type ?? 'RECETTE')
  const [party, setParty] = useState(editing?.party ?? '')
  const [category, setCategory] = useState(editing?.category ?? '')
  const [amount, setAmount] = useState(editing?.amount ?? 0)
  const [paymentMode, setPaymentMode] = useState(editing?.paymentMode ?? 'Virement')
  const [status, setStatus] = useState<ApiTransactionStatus>(editing?.status ?? 'EN_ATTENTE')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!party.trim() || !category.trim() || amount <= 0) {
      setError('Tiers, catégorie et montant (positif) sont requis.')
      return
    }

    setSubmitting(true)
    setError(null)

    const result = editing
      ? await window.api.finance.update(editing.id, {
          type,
          party: party.trim(),
          category: category.trim(),
          amount,
          status,
          paymentMode: paymentMode.trim() || 'Virement'
        })
      : await window.api.finance.create({
          type,
          party: party.trim(),
          category: category.trim(),
          amount,
          paymentMode: paymentMode.trim() || 'Virement'
        } as CreateFinanceTransactionInput)
    setSubmitting(false)
    if (result.ok) {
      onCreated(result.data.transaction)
    } else {
      setError(result.error)
    }
  }

  return (
    <Modal title={editing ? "Modifier l'opération" : 'Nouvelle opération'} onClose={onClose} widthClassName="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Type *</label>
            <select value={type} onChange={(e) => setType(e.target.value as ApiTransactionType)} className={inputClass}>
              <option value="RECETTE">Recette</option>
              <option value="DEPENSE">Dépense</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Mode de paiement</label>
            <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className={inputClass}>
              <option>Espèces</option>
              <option>Virement</option>
              <option>Carte bancaire</option>
              <option>Prélèvement</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Tiers *</label>
            <input value={party} onChange={(e) => setParty(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Catégorie *</label>
            <input value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass} />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Montant (FCFA) *</label>
            <input type="number" min={1} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className={inputClass} />
          </div>
          {editing && (
            <div className="col-span-2">
              <label className={labelClass}>Statut</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as ApiTransactionStatus)} className={inputClass}>
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
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : editing ? 'Enregistrer les modifications' : "Créer l'opération"}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
