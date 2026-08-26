import { useState, type FormEvent } from 'react'
import { Lock, Mail, ArrowRight, Loader2 } from 'lucide-react'
import { BrandMark } from '@renderer/components/BrandMark'
import { Button } from '@renderer/components/Button'

interface LoginScreenProps {
  onLogin: (email: string, password: string) => Promise<boolean>
  error: string | null
}

const CAPABILITIES = [
  'Patients',
  'Rendez-vous',
  'Urgences',
  'Bloc opératoire',
  'Laboratoire',
  'Imagerie',
  'Pharmacie',
  'Banque de sang',
  'Finances'
]

export function LoginScreen({ onLogin, error }: LoginScreenProps): JSX.Element {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

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
    <div className="flex h-screen w-full bg-white">
      {/* Panneau de marque */}
      <div className="relative hidden w-[42%] flex-col justify-between overflow-hidden bg-brand-900 p-12 text-white lg:flex">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.12) 1px, transparent 1px)',
            backgroundSize: '22px 22px'
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(217,70,239,0.28),transparent_45%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_80%,rgba(129,140,248,0.22),transparent_45%)]" />

        <div className="relative">
          <div className="flex items-center gap-2.5">
            <BrandMark />
            <span className="text-lg font-semibold tracking-tight">
              Pandora <span className="text-accent-400">Health</span>
            </span>
          </div>
        </div>

        <div className="relative space-y-6">
          <h1 className="text-3xl font-semibold leading-tight text-white">
            Le système nerveux
            <br />
            numérique de votre hôpital.
          </h1>
          <p className="max-w-sm text-sm leading-relaxed text-gray-300">
            Patients, soins, plateau technique, pharmacie et gouvernance dans une seule
            plateforme — pensée pour fonctionner même quand la connexion internet est instable.
          </p>

          <div className="flex flex-wrap gap-x-2 gap-y-2 pt-2">
            {CAPABILITIES.map((step) => (
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
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-8 shadow-xl shadow-gray-200/60"
        >
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-2.5">
              <BrandMark />
              <span className="text-lg font-semibold tracking-tight text-gray-900">Pandora Health</span>
            </div>
          </div>

          <h2 className="text-2xl font-semibold text-gray-900">Connexion</h2>
          <p className="mt-1.5 text-sm text-gray-500">Accédez au tableau de bord de l&apos;établissement.</p>

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
                  placeholder="vous@hopital.com"
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

          <Button type="submit" disabled={submitting} className="mt-6 w-full py-2.5">
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Se connecter
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>

          <div className="mt-8 rounded-lg bg-gray-50 p-3.5 text-xs text-gray-500">
            <p className="mb-1.5 font-medium text-gray-600">Comptes de démonstration</p>
            <p>
              <span className="font-mono text-gray-700">directeur@demo.pandorahealth</span> / demo1234
            </p>
            <p>
              <span className="font-mono text-gray-700">praticien@demo.pandorahealth</span> / demo1234
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
