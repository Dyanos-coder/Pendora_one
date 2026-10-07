import { useState } from 'react'
import { ArrowRight, ClipboardPaste, Loader2 } from 'lucide-react'
import { Button } from '@renderer/components/Button'
import { authButtonClass, authErrorClass, authLabelClass } from '@renderer/components/brand/AuthLayout'

interface ActivationCodeFormProps {
  submitLabel?: string
  onActivated: () => void
  /** « brand » : écrans de marque sombres (activation au lancement) ; sinon carte claire (Paramètres). */
  variant?: 'brand' | 'default'
}

const brandInputClass =
  'w-full rounded-[10px] border border-[#1b2b22] bg-[#08120d] px-3 py-2.5 font-mono text-[14px] tracking-wide text-white uppercase placeholder:normal-case placeholder:font-sans placeholder:tracking-normal placeholder:text-[#5d6f65] focus:border-[#34cc6b] focus:outline-none focus:ring-4 focus:ring-[#34cc6b]/15'

const lightInputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 font-mono text-base tracking-wider text-gray-900 uppercase placeholder:normal-case placeholder:font-sans placeholder:tracking-normal placeholder:text-gray-400 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20'

/** Activation du poste avec le code fourni par Pandora (Plan-Code-Activation.md) : l'application
 * récupère seule les accès à la base auprès du site Pandora — personne ne voit le mot de passe. */
export function ActivationCodeForm({ submitLabel = 'Activer ce poste', onActivated, variant = 'default' }: ActivationCodeFormProps): JSX.Element {
  const brand = variant === 'brand'
  const [code, setCode] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="activation-code" className={brand ? authLabelClass : 'mb-1.5 block text-sm font-medium text-gray-700'}>
          Code d&apos;activation
        </label>
        <div className="flex gap-2">
          <input
            id="activation-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="PND-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
            autoFocus
            spellCheck={false}
            className={brand ? brandInputClass : lightInputClass}
          />
          {brand ? (
            <button
              type="button"
              onClick={paste}
              title="Coller"
              className="grid w-11 shrink-0 place-items-center rounded-[10px] border border-[#1b2b22] bg-[#08120d] text-[#d3e0d8] hover:border-[#34cc6b]"
            >
              <ClipboardPaste className="h-4 w-4" />
            </button>
          ) : (
            <Button type="button" variant="secondary" onClick={paste} title="Coller">
              <ClipboardPaste className="h-4 w-4" />
            </Button>
          )}
        </div>
        <p className={'mt-1.5 text-xs ' + (brand ? 'text-[#8fa398]' : 'text-gray-500')}>Fourni par Pandora pour votre établissement. Le même code sert pour tous vos postes.</p>
      </div>
      {error && <p className={brand ? authErrorClass : 'rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700'}>{error}</p>}
      {brand ? (
        <button type="submit" disabled={saving || code.trim().length < 10} className={authButtonClass}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          {saving ? 'Activation…' : submitLabel}
        </button>
      ) : (
        <Button type="submit" disabled={saving || code.trim().length < 10} className="w-full py-2.5">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          {saving ? 'Activation…' : submitLabel}
        </Button>
      )}
    </form>
  )
}
