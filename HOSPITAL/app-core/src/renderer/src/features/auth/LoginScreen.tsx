import { useEffect, useState, type FormEvent } from 'react'
import { ArrowRight, Loader2 } from 'lucide-react'
import {
  AuthLayout,
  authButtonClass,
  authErrorClass,
  authInputClass,
  authLabelClass
} from '@renderer/components/brand/AuthLayout'

interface LoginScreenProps {
  onLogin: (email: string, password: string) => Promise<boolean>
  error: string | null
}

export function LoginScreen({ onLogin, error }: LoginScreenProps): JSX.Element {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  // Application non installée (développement) : « Se connecter » avec les champs vides réutilise la
  // dernière connexion réussie sur ce poste (retenue chiffrée par le processus principal).
  const [devQuickLogin, setDevQuickLogin] = useState(false)

  useEffect(() => {
    window.api.setup
      .getConfig()
      .then((config) => setDevQuickLogin(config.devMode))
      .catch(() => undefined)
  }, [])

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    setSubmitting(true)
    try {
      await onLogin(email, password)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit} className="grid gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Bon retour</h2>
          <p className="mt-1 text-[13px] text-[#8fa398]">Connectez-vous avec votre compte de l&apos;établissement.</p>
        </div>
        <div>
          <label htmlFor="email" className={authLabelClass}>
            E-mail
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
            required={!devQuickLogin}
            placeholder={devQuickLogin ? 'Vide = dernière connexion (mode développement)' : 'vous@hopital.com'}
            className={authInputClass}
          />
        </div>
        <div>
          <label htmlFor="password" className={authLabelClass}>
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required={!devQuickLogin}
            placeholder="••••••••"
            className={authInputClass}
          />
        </div>
        {error && <p className={authErrorClass}>{error}</p>}
        <button type="submit" disabled={submitting} className={authButtonClass}>
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Se connecter
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>
    </AuthLayout>
  )
}
