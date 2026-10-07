import { useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Modal } from '@renderer/components/Modal'
import { Button } from '@renderer/components/Button'
import type { ApiPaymentReceived } from '@shared/finance-types'

interface PaymentFormModalProps {
  onClose: () => void
  onSaved: (payment: ApiPaymentReceived) => void
  editing?: ApiPaymentReceived
}

const inputClass =
  'w-full rounded-[10px] border border-gray-300 px-3 py-1.5 text-sm text-gray-800 focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15'
const labelClass = 'mb-1.5 block text-xs font-semibold text-gray-700'

export function PaymentFormModal({ onClose, onSaved, editing }: PaymentFormModalProps): JSX.Element {
  const [payer, setPayer] = useState(editing?.payer ?? '')
  const [category, setCategory] = useState(editing?.category ?? '')
  const [amount, setAmount] = useState(editing?.amount.toString() ?? '')
  const [receivedAt, setReceivedAt] = useState(editing?.receivedAt.slice(0, 10) ?? new Date().toISOString().slice(0, 10))
  const [paymentMode, setPaymentMode] = useState(editing?.paymentMode ?? '')
  const [note, setNote] = useState(editing?.note ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!payer.trim() || !category.trim() || !amount || !paymentMode.trim()) {
      setError('Payeur, catégorie, montant et mode de paiement requis.')
      return
    }

    setSubmitting(true)
    setError(null)

    const base = {
      payer: payer.trim(),
      category: category.trim(),
      amount: Number(amount),
      receivedAt: new Date(receivedAt).toISOString(),
      paymentMode: paymentMode.trim(),
      note: note.trim() || undefined
    }

    const result = editing ? await window.api.finance.payments.update(editing.id, base) : await window.api.finance.payments.create(base)
    setSubmitting(false)
    if (result.ok) {
      onSaved(result.data.payment)
    } else {
      setError(result.error)
    }
  }

  return (
    <Modal title={editing ? 'Modifier le paiement' : 'Nouveau paiement reçu'} onClose={onClose} widthClassName="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className={labelClass}>Payeur *</label>
            <input value={payer} onChange={(e) => setPayer(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Catégorie *</label>
            <input value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Montant (FCFA) *</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Date de réception *</label>
            <input type="date" value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Mode de paiement *</label>
            <input value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className={inputClass} />
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
