import { useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Modal } from '@renderer/components/Modal'
import { Button } from '@renderer/components/Button'
import type { ApiServiceExpense } from '@shared/finance-types'

interface ServiceExpenseFormModalProps {
  onClose: () => void
  onSaved: (expense: ApiServiceExpense) => void
  editing?: ApiServiceExpense
}

const inputClass =
  'w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-800 focus:border-accent-500 focus:outline-none'
const labelClass = 'mb-1 block text-xs font-medium text-gray-500'

export function ServiceExpenseFormModal({ onClose, onSaved, editing }: ServiceExpenseFormModalProps): JSX.Element {
  const [service, setService] = useState(editing?.service ?? '')
  const [category, setCategory] = useState(editing?.category ?? '')
  const [amount, setAmount] = useState(editing?.amount.toString() ?? '')
  const [spentAt, setSpentAt] = useState(editing?.spentAt.slice(0, 10) ?? new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState(editing?.note ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!service.trim() || !category.trim() || !amount) {
      setError('Service, catégorie et montant requis.')
      return
    }

    setSubmitting(true)
    setError(null)

    const base = {
      service: service.trim(),
      category: category.trim(),
      amount: Number(amount),
      spentAt: new Date(spentAt).toISOString(),
      note: note.trim() || undefined
    }

    const result = editing
      ? await window.api.finance.expenses.update(editing.id, base)
      : await window.api.finance.expenses.create(base)
    setSubmitting(false)
    if (result.ok) {
      onSaved(result.data.expense)
    } else {
      setError(result.error)
    }
  }

  return (
    <Modal title={editing ? 'Modifier la dépense' : 'Nouvelle dépense par service'} onClose={onClose} widthClassName="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Service *</label>
            <input value={service} onChange={(e) => setService(e.target.value)} className={inputClass} />
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
            <label className={labelClass}>Date de dépense *</label>
            <input type="date" value={spentAt} onChange={(e) => setSpentAt(e.target.value)} className={inputClass} />
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
