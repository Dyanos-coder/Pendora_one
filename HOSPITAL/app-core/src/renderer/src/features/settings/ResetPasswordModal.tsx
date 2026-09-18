import { useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Modal } from '@renderer/components/Modal'
import { Button } from '@renderer/components/Button'

interface ResetPasswordModalProps {
  userName: string
  onClose: () => void
  onReset: (newPassword: string) => Promise<{ ok: true } | { ok: false; error: string }>
  onDone: () => void
}

const inputClass =
  'w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-800 focus:border-accent-500 focus:outline-none'

export function ResetPasswordModal({ userName, onClose, onReset, onDone }: ResetPasswordModalProps): JSX.Element {
  const [newPassword, setNewPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (newPassword.length < 8) {
      setError('Le nouveau mot de passe doit contenir au moins 8 caractères.')
      return
    }

    setSubmitting(true)
    setError(null)
    const result = await onReset(newPassword)
    setSubmitting(false)
    if (result.ok) {
      onDone()
    } else {
      setError(result.error)
    }
  }

  return (
    <Modal title="Réinitialiser le mot de passe" onClose={onClose} widthClassName="max-w-sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-gray-600">
          Nouveau mot de passe pour <span className="font-medium text-gray-900">{userName}</span>. Ses sessions actives seront
          déconnectées.
        </p>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Nouveau mot de passe (8 caractères min.)"
          className={inputClass}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Réinitialiser'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
