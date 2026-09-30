import { useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Modal } from '@renderer/components/Modal'
import { Button } from '@renderer/components/Button'
import type { ApiUser } from '@shared/user-types'

interface EditUserModalProps {
  user: ApiUser
  onClose: () => void
  onUpdated: (user: ApiUser) => void
}

const inputClass =
  'w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-800 focus:border-accent-500 focus:outline-none'
const labelClass = 'mb-1 block text-xs font-medium text-gray-500'

/** Édition du nom/email d'un compte — le mot de passe se change séparément (ChangePasswordModal,
 * Sécurité) ou se réinitialise par un DIRIGEANT (ResetPasswordModal). Utile en particulier après le
 * premier lancement : le compte DIRIGEANT par défaut créé par le serveur (voir
 * Plan-Installeur-Configurable.md §4.3) a un email générique, à personnaliser tout de suite. */
export function EditUserModal({ user, onClose, onUpdated }: EditUserModalProps): JSX.Element {
  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!name.trim() || !email.trim()) {
      setError('Nom et email requis.')
      return
    }

    setSubmitting(true)
    setError(null)
    const result = await window.api.users.update(user.id, { name: name.trim(), email: email.trim() })
    setSubmitting(false)
    if (result.ok) {
      onUpdated(result.data.user)
    } else {
      setError(result.error)
    }
  }

  return (
    <Modal title="Modifier le compte" onClose={onClose} widthClassName="max-w-sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClass}>Nom complet *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Email *</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Enregistrer'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
