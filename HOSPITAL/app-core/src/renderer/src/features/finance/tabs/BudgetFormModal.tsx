import { useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Modal } from '@renderer/components/Modal'
import { Button } from '@renderer/components/Button'
import type { ApiBudget } from '@shared/finance-types'

interface BudgetFormModalProps {
  onClose: () => void
  onSaved: (budget: ApiBudget) => void
  editing?: ApiBudget
}

const inputClass =
  'w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-800 focus:border-accent-500 focus:outline-none'
const labelClass = 'mb-1 block text-xs font-medium text-gray-500'

export function BudgetFormModal({ onClose, onSaved, editing }: BudgetFormModalProps): JSX.Element {
  const [service, setService] = useState(editing?.service ?? '')
  const [year, setYear] = useState(editing?.year.toString() ?? new Date().getFullYear().toString())
  const [allocatedAmount, setAllocatedAmount] = useState(editing?.allocatedAmount.toString() ?? '')
  const [note, setNote] = useState(editing?.note ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!service.trim() || !year || !allocatedAmount) {
      setError('Service, année et montant alloué requis.')
      return
    }

    setSubmitting(true)
    setError(null)

    const base = {
      service: service.trim(),
      year: Number(year),
      allocatedAmount: Number(allocatedAmount),
      note: note.trim() || undefined
    }

    const result = editing
      ? await window.api.finance.budgets.update(editing.id, base)
      : await window.api.finance.budgets.create(base)
    setSubmitting(false)
    if (result.ok) {
      onSaved(result.data.budget)
    } else {
      setError(result.error)
    }
  }

  return (
    <Modal title={editing ? 'Modifier le budget' : 'Nouveau budget'} onClose={onClose} widthClassName="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className={labelClass}>Service *</label>
            <input value={service} onChange={(e) => setService(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Année *</label>
            <input type="number" value={year} onChange={(e) => setYear(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Montant alloué (FCFA) *</label>
            <input
              type="number"
              value={allocatedAmount}
              onChange={(e) => setAllocatedAmount(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Note</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} />
          </div>
        </div>
        <p className="text-xs text-gray-400">
          Le montant consommé est calculé automatiquement à partir des dépenses du même service sur la même année.
        </p>

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
