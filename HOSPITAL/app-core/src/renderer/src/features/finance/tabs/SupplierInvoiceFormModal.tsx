import { useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Modal } from '@renderer/components/Modal'
import { Button } from '@renderer/components/Button'
import type { ApiSupplierInvoice, ApiTransactionStatus } from '@shared/finance-types'
import type { ApiSupplier } from '@shared/procurement-types'

interface SupplierInvoiceFormModalProps {
  suppliers: ApiSupplier[]
  onClose: () => void
  onSaved: (invoice: ApiSupplierInvoice) => void
  editing?: ApiSupplierInvoice
}

const inputClass =
  'w-full rounded-[10px] border border-gray-300 px-3 py-1.5 text-sm text-gray-800 focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15'
const labelClass = 'mb-1.5 block text-xs font-semibold text-gray-700'

const STATUS_OPTIONS: { value: ApiTransactionStatus; label: string }[] = [
  { value: 'EN_ATTENTE', label: 'En attente' },
  { value: 'PAYE', label: 'Payée' },
  { value: 'EN_RETARD', label: 'En retard' }
]

export function SupplierInvoiceFormModal({ suppliers, onClose, onSaved, editing }: SupplierInvoiceFormModalProps): JSX.Element {
  const [supplierId, setSupplierId] = useState(editing?.supplierId ?? '')
  const [amount, setAmount] = useState(editing?.amount.toString() ?? '')
  const [issuedAt, setIssuedAt] = useState(editing?.issuedAt.slice(0, 10) ?? new Date().toISOString().slice(0, 10))
  const [dueAt, setDueAt] = useState(editing?.dueAt?.slice(0, 10) ?? '')
  const [status, setStatus] = useState<ApiTransactionStatus>(editing?.status ?? 'EN_ATTENTE')
  const [note, setNote] = useState(editing?.note ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!amount) {
      setError('Montant requis.')
      return
    }

    setSubmitting(true)
    setError(null)

    const base = {
      supplierId: supplierId || undefined,
      amount: Number(amount),
      issuedAt: new Date(issuedAt).toISOString(),
      dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
      status,
      note: note.trim() || undefined
    }

    const result = editing ? await window.api.finance.invoices.update(editing.id, base) : await window.api.finance.invoices.create(base)
    setSubmitting(false)
    if (result.ok) {
      onSaved(result.data.invoice)
    } else {
      setError(result.error)
    }
  }

  return (
    <Modal title={editing ? 'Modifier la facture' : 'Nouvelle facture fournisseur'} onClose={onClose} widthClassName="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClass}>Fournisseur</label>
          <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={inputClass}>
            <option value="">Non assigné</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Montant (FCFA) *</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Statut</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as ApiTransactionStatus)} className={inputClass}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Date de facture *</label>
            <input type="date" value={issuedAt} onChange={(e) => setIssuedAt(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Échéance</label>
            <input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className={inputClass} />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Note</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} />
          </div>
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : editing ? 'Enregistrer' : 'Créer'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
