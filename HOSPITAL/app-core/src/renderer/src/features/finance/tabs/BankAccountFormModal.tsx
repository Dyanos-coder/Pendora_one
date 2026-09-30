import { useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Modal } from '@renderer/components/Modal'
import { Button } from '@renderer/components/Button'
import type { ApiBankAccount } from '@shared/finance-types'

interface BankAccountFormModalProps {
  onClose: () => void
  onSaved: (account: ApiBankAccount) => void
  editing?: ApiBankAccount
}

const inputClass =
  'w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-800 focus:border-accent-500 focus:outline-none'
const labelClass = 'mb-1 block text-xs font-medium text-gray-500'

export function BankAccountFormModal({ onClose, onSaved, editing }: BankAccountFormModalProps): JSX.Element {
  const [name, setName] = useState(editing?.name ?? '')
  const [bankName, setBankName] = useState(editing?.bankName ?? '')
  const [accountNumber, setAccountNumber] = useState(editing?.accountNumber ?? '')
  const [balance, setBalance] = useState(editing?.balance.toString() ?? '0')
  const [note, setNote] = useState(editing?.note ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!name.trim() || !bankName.trim() || !accountNumber.trim()) {
      setError('Nom, banque et numéro de compte requis.')
      return
    }

    setSubmitting(true)
    setError(null)

    const base = {
      name: name.trim(),
      bankName: bankName.trim(),
      accountNumber: accountNumber.trim(),
      balance: balance ? Number(balance) : 0,
      note: note.trim() || undefined
    }

    const result = editing
      ? await window.api.finance.bankAccounts.update(editing.id, base)
      : await window.api.finance.bankAccounts.create(base)
    setSubmitting(false)
    if (result.ok) {
      onSaved(result.data.account)
    } else {
      setError(result.error)
    }
  }

  return (
    <Modal title={editing ? 'Modifier le compte' : 'Nouveau compte bancaire'} onClose={onClose} widthClassName="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className={labelClass}>Nom du compte *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Banque *</label>
            <input value={bankName} onChange={(e) => setBankName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Numéro de compte *</label>
            <input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Solde (FCFA)</label>
            <input type="number" value={balance} onChange={(e) => setBalance(e.target.value)} className={inputClass} />
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
