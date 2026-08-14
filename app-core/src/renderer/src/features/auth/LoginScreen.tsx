import { useState, type FormEvent } from 'react'
import { Lock, Mail, ArrowRight, Loader2 } from 'lucide-react'

interface LoginScreenProps {
  onLogin: (email: string, password: string) => Promise<boolean>
  error: string | null
}

const LOOP_STEPS = [
  'Observer',
  'Comprendre',
  'Prévoir',
  'Alerter',
  'Recommander',
  'Automatiser',
  'Exécuter',
  'Vérifier',
  'Apprendre'
]

export function LoginScreen({ onLogin, error }: LoginScreenProps): JSX.Element {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    setSubmitting(true)
    await onLogin(email, password)
    setSubmitting(false)
  }

  return (
    <div className="flex h-screen w-full bg-white">
      {/* Panneau de marque */}
      <div className="relative hidden w-[42%] flex-col justify-between overflow-hidden bg-brand-900 p-12 text-white lg:flex">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.18),transparent_45%)]" />

        <div className="relative">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-500 font-bold text-brand-950">
              P
            </div>
            <span className="text-lg font-semibold tracking-tight">Pandora One</span>
          </div>
        </div>

        <div className="relative space-y-6">
          <h1 className="text-3xl font-semibold leading-tight text-white">
            Le système nerveux
            <br />
            numérique de votre entreprise.
          </h1>
          <p className="max-w-sm text-sm leading-relaxed text-gray-300">
            Une seule plateforme pour piloter votre activité, où que vous soyez — même quand la
            connexion internet est instable.
          </p>

          <div className="flex flex-wrap gap-x-2 gap-y-2 pt-2">
            {LOOP_STEPS.map((step) => (
              <span
                key={step}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-gray-200"
              >
                {step}
              </span>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-gray-500">Pandora Afrika — Document confidentiel</p>
      </div>

      {/* Formulaire */}
      <div className="flex flex-1 items-center justify-center bg-gray-50 px-6 py-12">
        <form onSubmit={handleSubmit} className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-500 font-bold text-brand-950">
                P
              </div>
              <span className="text-lg font-semibold tracking-tight text-brand-900">Pandora One</span>
            </div>
          </div>

          <h2 className="text-2xl font-semibold text-gray-900">Connexion</h2>
          <p className="mt-1.5 text-sm text-gray-500">Accédez au tableau de bord de votre entreprise.</p>

          <div className="mt-8 space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                  required
                  placeholder="vous@entreprise.com"
                  className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-700">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20"
                />
              </div>
            </div>
          </div>

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-900 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Se connecter
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

          <div className="mt-8 rounded-lg border border-gray-200 bg-white p-3.5 text-xs text-gray-500">
            <p className="mb-1.5 font-medium text-gray-600">Comptes de démonstration</p>
            <p>
              <span className="font-mono text-gray-700">dirigeant@demo.pandora</span> / demo1234
            </p>
            <p>
              <span className="font-mono text-gray-700">employe@demo.pandora</span> / demo1234
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
