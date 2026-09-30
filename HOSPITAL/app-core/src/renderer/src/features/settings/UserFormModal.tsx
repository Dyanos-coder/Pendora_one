import { useEffect, useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Modal } from '@renderer/components/Modal'
import { Button } from '@renderer/components/Button'
import type { ApiUser } from '@shared/user-types'
import type { Role } from '@shared/auth-types'
import type { ApiEmployee } from '@shared/appointment-types'

interface UserFormModalProps {
  onClose: () => void
  onCreated: (user: ApiUser) => void
}

const inputClass =
  'w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-800 focus:border-accent-500 focus:outline-none'
const labelClass = 'mb-1 block text-xs font-medium text-gray-500'

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'DIRIGEANT', label: 'Directeur Général' },
  { value: 'MEDECIN', label: 'Médecin' },
  { value: 'INFIRMIER', label: 'Infirmier(ère)' },
  { value: 'TECHNICIEN', label: 'Technicien' },
  { value: 'PHARMACIEN', label: 'Pharmacien' },
  { value: 'ADMINISTRATIF', label: 'Administratif' },
  { value: 'CAISSIER', label: 'Caissier(ère)' }
]

export function UserFormModal({ onClose, onCreated }: UserFormModalProps): JSX.Element {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('ADMINISTRATIF')
  const [unlinkedEmployees, setUnlinkedEmployees] = useState<ApiEmployee[]>([])
  const [employeeId, setEmployeeId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    window.api.users.listUnlinkedEmployees().then((result) => {
      if (result.ok) setUnlinkedEmployees(result.data.employees)
    })
  }, [])

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!name.trim() || !email.trim() || password.length < 8) {
      setError('Nom et email requis, mot de passe de 8 caractères minimum.')
      return
    }

    setSubmitting(true)
    setError(null)

    const result = await window.api.users.create({
      name: name.trim(),
      email: email.trim(),
      password,
      role,
      employeeId: employeeId || undefined
    })
    setSubmitting(false)
    if (result.ok) {
      onCreated(result.data.user)
    } else {
      setError(result.error)
    }
  }

  return (
    <Modal title="Créer un utilisateur" onClose={onClose} widthClassName="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClass}>Nom complet *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Email *</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Mot de passe temporaire * (8 caractères min.)</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Rôle *</label>
          <select value={role} onChange={(e) => setRole(e.target.value as Role)} className={inputClass}>
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Fiche employé liée</label>
          <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className={inputClass}>
            <option value="">— Aucune (pas de fiche employé) —</option>
            {unlinkedEmployees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.lastName} {e.firstName} — {e.role}
                {e.specialty ? ` (${e.specialty})` : ''}
              </option>
            ))}
          </select>
          {role === 'MEDECIN' && (
            <p className="mt-1 text-[11px] text-gray-400">
              Pour un médecin, rattacher sa fiche employé restreint son compte à ne programmer que ses propres
              rendez-vous.
            </p>
          )}
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Créer le compte'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
