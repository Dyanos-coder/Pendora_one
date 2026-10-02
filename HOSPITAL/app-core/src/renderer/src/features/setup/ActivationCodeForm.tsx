import { useState } from 'react'
import { ArrowRight, ClipboardPaste, KeyRound, Loader2 } from 'lucide-react'
import { Button } from '@renderer/components/Button'
import { ULTRA_ADMIN_PASSWORD } from '@renderer/features/settings/ultra-admin'
import { DbAccessForm } from './DbAccessForm'

interface ActivationCodeFormProps {
  submitLabel?: string
  onActivated: () => void
  /** Propose la saisie manuelle des accès (technicien, protégée par le mot de passe Ultra Admin). */
  allowManual?: boolean
}

const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 font-mono text-base tracking-wider text-gray-900 uppercase placeholder:normal-case placeholder:font-sans placeholder:tracking-normal placeholder:text-gray-400 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20'

/** Activation du poste avec le code fourni par Pandora (Plan-Code-Activation.md) : l'application
 * récupère seule les accès à la base auprès du site Pandora — personne ne voit le mot de passe. */
export function ActivationCodeForm({ submitLabel = 'Activer ce poste', onActivated, allowManual = true }: ActivationCodeFormProps): JSX.Element {
  const [code, setCode] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [manual, setManual] = useState<'off' | 'password' | 'form'>('off')
  const [ultraPassword, setUltraPassword] = useState('')

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const result = await window.api.setup.activate(code)
    setSaving(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    onActivated()
  }

  async function paste(): Promise<void> {
    try {
      setCode((await navigator.clipboard.readText()).trim())
    } catch {
      // Presse-papiers indisponible : saisie manuelle.
    }
  }

  if (manual === 'form') {
    return (
      <div className="space-y-4">
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Saisie manuelle des accès (technicien). À n&apos;utiliser que si le site Pandora est indisponible.
        </p>
        <DbAccessForm prefill={null} submitLabel="Tester la connexion et continuer" onSaved={onActivated} />
        <button type="button" onClick={() => setManual('off')} className="text-xs text-gray-500 hover:text-gray-800">
          ← Revenir au code d&apos;activation
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Code d&apos;activation</label>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="PND-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
              autoFocus
              spellCheck={false}
              className={inputClass}
            />
            <Button type="button" variant="secondary" onClick={paste} title="Coller">
              <ClipboardPaste className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-1.5 text-xs text-gray-500">Fourni par Pandora pour votre établissement. Le même code sert pour tous vos postes.</p>
        </div>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <Button type="submit" disabled={saving || code.trim().length < 10} className="w-full py-2.5">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          {saving ? 'Activation…' : submitLabel}
        </Button>
      </form>

      {allowManual &&
        (manual === 'off' ? (
          <button type="button" onClick={() => setManual('password')} className="text-xs text-gray-400 hover:text-gray-700">
            Saisie manuelle des accès (technicien)
          </button>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (ultraPassword === ULTRA_ADMIN_PASSWORD) setManual('form')
              else setError('Mot de passe technicien incorrect.')
            }}
            className="flex gap-2"
          >
            <input
              type="password"
              value={ultraPassword}
              onChange={(e) => setUltraPassword(e.target.value)}
              placeholder="Mot de passe technicien"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-accent-500 focus:outline-none"
            />
            <Button type="submit" variant="secondary">
              <KeyRound className="h-4 w-4" />
            </Button>
          </form>
        ))}
    </div>
  )
}
