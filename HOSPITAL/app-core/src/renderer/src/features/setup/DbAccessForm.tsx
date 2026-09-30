import { useState } from 'react'
import { ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@renderer/components/Button'
import type { DbAccessPrefill } from '@shared/setup-types'

interface DbAccessFormProps {
  prefill: DbAccessPrefill | null
  submitLabel: string
  onSaved: () => void
}

const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20'

/** Formulaire des accès à la base distante (voir Plan-Backend-Embarque-Travaux.md) — partagé par
 * l'assistant de premier lancement, l'écran de reconnexion et Paramètres. Les accès ne sont
 * enregistrés que si la connexion réussit réellement. Le mot de passe n'est jamais pré-rempli :
 * vide = conserver celui déjà enregistré (s'il y en a un). */
export function DbAccessForm({ prefill, submitLabel, onSaved }: DbAccessFormProps): JSX.Element {
  const [host, setHost] = useState(prefill?.host ?? '')
  const [port, setPort] = useState(String(prefill?.port ?? 3306))
  const [database, setDatabase] = useState(prefill?.database ?? '')
  const [user, setUser] = useState(prefill?.user ?? '')
  const [password, setPassword] = useState('')
  const [ssl, setSsl] = useState(prefill?.ssl ?? false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!prefill && !password) {
      setError('Indiquez le mot de passe.')
      return
    }
    setSaving(true)
    setError(null)
    const result = await window.api.setup.saveDbAccess({ host, port: Number(port), database, user, password, ssl })
    setSaving(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    onSaved()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label htmlFor="db-host" className="mb-1.5 block text-sm font-medium text-gray-700">
            Hôte
          </label>
          <input id="db-host" value={host} onChange={(e) => setHost(e.target.value)} autoFocus placeholder="srv123.hstgr.io" className={inputClass} />
        </div>
        <div>
          <label htmlFor="db-port" className="mb-1.5 block text-sm font-medium text-gray-700">
            Port
          </label>
          <input id="db-port" value={port} onChange={(e) => setPort(e.target.value.replace(/\D/g, ''))} className={inputClass} />
        </div>
      </div>
      <div>
        <label htmlFor="db-name" className="mb-1.5 block text-sm font-medium text-gray-700">
          Nom de la base
        </label>
        <input id="db-name" value={database} onChange={(e) => setDatabase(e.target.value)} className={inputClass} />
      </div>
      <div>
        <label htmlFor="db-user" className="mb-1.5 block text-sm font-medium text-gray-700">
          Utilisateur
        </label>
        <input id="db-user" value={user} onChange={(e) => setUser(e.target.value)} autoComplete="off" className={inputClass} />
      </div>
      <div>
        <label htmlFor="db-password" className="mb-1.5 block text-sm font-medium text-gray-700">
          Mot de passe
        </label>
        <input
          id="db-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          placeholder={prefill ? 'Laisser vide pour conserver le mot de passe actuel' : ''}
          className={inputClass}
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={ssl} onChange={(e) => setSsl(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
        Connexion chiffrée (SSL)
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={saving} className="w-full py-2.5">
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Connexion en cours…
          </>
        ) : (
          <>
            {submitLabel}
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </Button>
    </form>
  )
}
