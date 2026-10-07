import { useState, type FormEvent } from 'react'
import { Loader2, Printer } from 'lucide-react'
import { Modal } from '@renderer/components/Modal'
import { Button } from '@renderer/components/Button'
import { PAYMENT_MODE_LABEL, PAYMENT_MODES, type ApiCashSession, type PaymentAmounts } from '@shared/cashier-types'
import { fcfa } from './format'

export const inputClass =
  'w-full rounded-[10px] border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15'
export const labelClass = 'mb-1.5 block text-xs font-semibold text-gray-700'

/** Saisie d'un motif obligatoire (annulation, remboursement). */
export function ReasonModal({
  title,
  description,
  confirmLabel,
  onClose,
  onConfirm
}: {
  title: string
  description: string
  confirmLabel: string
  onClose: () => void
  onConfirm: (reason: string) => Promise<string | null>
}): JSX.Element {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    if (!reason.trim()) {
      setError('Le motif est obligatoire.')
      return
    }
    setBusy(true)
    const failure = await onConfirm(reason.trim())
    setBusy(false)
    if (failure) setError(failure)
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-gray-600">{description}</p>
        <div>
          <label className={labelClass}>Motif</label>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} autoFocus className={inputClass} />
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Retour
          </Button>
          <Button type="submit" variant="danger" disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export interface QuickPatient {
  id: string
  code: string
  firstName: string
  lastName: string
}

/** Création rapide d'un patient depuis la caisse (le dossier se complète ensuite dans Patients). */
export function QuickPatientModal({ onClose, onCreated }: { onClose: () => void; onCreated: (p: QuickPatient) => void }): JSX.Element {
  const [lastName, setLastName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [gender, setGender] = useState<'M' | 'F'>('M')
  const [birthDate, setBirthDate] = useState('')
  const [age, setAge] = useState('')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    // Date de naissance inconnue : un âge suffit (1er janvier de l'année correspondante).
    const effectiveBirthDate = birthDate || (age ? `${new Date().getFullYear() - Number(age)}-01-01` : '')
    if (!lastName.trim() || !firstName.trim() || !effectiveBirthDate) {
      setError('Nom, prénom et date de naissance (ou âge) sont obligatoires.')
      return
    }
    setBusy(true)
    const result = await window.api.cashier.quickCreatePatient({
      lastName: lastName.trim(),
      firstName: firstName.trim(),
      gender,
      birthDate: effectiveBirthDate,
      phone: phone.trim() || null
    })
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    onCreated(result.data.patient)
  }

  return (
    <Modal title="Nouveau patient" onClose={onClose}>
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Nom</label>
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} autoFocus className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Prénom</label>
          <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Sexe</label>
          <div className="flex gap-2">
            {(['M', 'F'] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGender(g)}
                className={`flex-1 rounded-lg border py-2 text-sm font-medium ${gender === g ? 'border-accent-500 bg-accent-50 text-accent-700' : 'border-gray-200 text-gray-600'}`}
              >
                {g === 'M' ? 'Homme' : 'Femme'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={labelClass}>Téléphone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Date de naissance</label>
          <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>… ou âge</label>
          <input
            value={age}
            onChange={(e) => setAge(e.target.value.replace(/\D/g, ''))}
            disabled={Boolean(birthDate)}
            className={inputClass}
          />
        </div>
        {error && <p className="col-span-2 text-xs text-red-500">{error}</p>}
        <div className="col-span-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Créer et sélectionner
          </Button>
        </div>
      </form>
    </Modal>
  )
}

/** Ouverture d'une caisse : saisie du fond de caisse. */
export function OpenSessionModal({
  registerName,
  onClose,
  onOpened
}: {
  registerName: string
  onClose: () => void
  onOpened: (openingFloat: number) => Promise<string | null>
}): JSX.Element {
  const [amount, setAmount] = useState('0')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setBusy(true)
    const failure = await onOpened(Number(amount || 0))
    setBusy(false)
    if (failure) setError(failure)
  }

  return (
    <Modal title={`Ouvrir ${registerName}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClass}>Fond de caisse (espèces en caisse à l&apos;ouverture, FCFA)</label>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
            autoFocus
            className={`${inputClass} text-lg font-semibold`}
          />
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Ouvrir la caisse
          </Button>
        </div>
      </form>
    </Modal>
  )
}

/** Clôture : montant compté par mode, écart calculé en direct, rapport imprimé ensuite. */
export function CloseSessionModal({
  session,
  onClose,
  onClosed
}: {
  session: ApiCashSession
  onClose: () => void
  onClosed: (counted: PaymentAmounts, note: string) => Promise<string | null>
}): JSX.Element {
  const [counted, setCounted] = useState<Record<string, string>>(
    Object.fromEntries(PAYMENT_MODES.map((m) => [m, String(session.expectedAmounts[m] ?? 0)]))
  )
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const countedAmounts = Object.fromEntries(PAYMENT_MODES.map((m) => [m, Number(counted[m] || 0)])) as PaymentAmounts
  const expectedTotal = PAYMENT_MODES.reduce((t, m) => t + (session.expectedAmounts[m] ?? 0), 0)
  const countedTotal = PAYMENT_MODES.reduce((t, m) => t + countedAmounts[m], 0)
  const difference = countedTotal - expectedTotal

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setBusy(true)
    const failure = await onClosed(countedAmounts, note)
    setBusy(false)
    if (failure) setError(failure)
  }

  return (
    <Modal title={`Clôturer ${session.registerName}`} onClose={onClose} widthClassName="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500">
              <th className="pb-2 font-medium">Mode</th>
              <th className="pb-2 text-right font-medium">Attendu</th>
              <th className="pb-2 text-right font-medium">Compté</th>
            </tr>
          </thead>
          <tbody>
            {PAYMENT_MODES.map((mode) => (
              <tr key={mode} className="border-t border-gray-100">
                <td className="py-2 text-gray-700">
                  {PAYMENT_MODE_LABEL[mode]}
                  {mode === 'ESPECES' && <span className="block text-[11px] text-gray-400">fond de caisse inclus</span>}
                </td>
                <td className="py-2 text-right text-gray-600">{fcfa(session.expectedAmounts[mode] ?? 0)}</td>
                <td className="py-2 pl-3">
                  <input
                    value={counted[mode]}
                    onChange={(e) =>
                      setCounted({
                        ...counted,
                        [mode]: e.target.value.replace(/\D/g, '')
                      })
                    }
                    className={`${inputClass} text-right`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div
          className={`flex items-center justify-between rounded-lg px-4 py-3 text-sm font-semibold ${difference === 0 ? 'bg-teal-50 text-teal-700' : 'bg-amber-50 text-amber-800'}`}
        >
          <span>Écart</span>
          <span>
            {difference > 0 ? '+' : ''}
            {fcfa(difference)}
          </span>
        </div>
        <div>
          <label className={labelClass}>Note (facultatif)</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} />
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
            Clôturer et imprimer le rapport
          </Button>
        </div>
      </form>
    </Modal>
  )
}
