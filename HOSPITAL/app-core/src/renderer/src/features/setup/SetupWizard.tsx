import { useEffect, useState } from 'react'
import { AuthLayout } from '@renderer/components/brand/AuthLayout'
import { LoginScreen } from '@renderer/features/auth/LoginScreen'
import { ActivationCodeForm } from './ActivationCodeForm'
import type { Session } from '@shared/auth-types'

interface SetupWizardProps {
  session: Session | null
  error: string | null
  onLogin: (email: string, password: string) => Promise<boolean>
  /** La base distante est déjà configurée et joignable (assistant interrompu puis relancé). */
  dbReady: boolean
  onComplete: () => void
}

type Step = 'db' | 'login'

/** Assistant de premier lancement — s'affiche à la place de l'écran de connexion habituel tant que
 * la configuration locale de ce poste n'est pas terminée (`setupComplete: false`, voir
 * app-config.service.ts). Deux étapes seulement : le code d'activation fourni par Pandora (voir
 * Plan-Code-Activation.md), puis la connexion (`onLogin`/`session` viennent du même `useAuth()` que
 * le reste de l'app, pour que la session soit connue partout une fois l'assistant terminé). Les
 * modules affichés se règlent ensuite dans Paramètres › Établissement (tous par défaut). */
export function SetupWizard({ session, error, onLogin, dbReady, onComplete }: SetupWizardProps): JSX.Element {
  const [step, setStep] = useState<Step>(dbReady ? 'login' : 'db')

  async function finish(): Promise<void> {
    await window.api.setup.markComplete()
    onComplete()
  }

  useEffect(() => {
    // Assistant terminé dès qu'une session existe à l'étape connexion : juste après la connexion,
    // ou session déjà présente (app fermée avant la fin de l'assistant). Jamais depuis l'étape
    // « code » : après activation, on passe TOUJOURS par l'écran de connexion (jeton peut-être invalide).
    if (session && step === 'login') void finish()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  if (step === 'login') {
    return <LoginScreen onLogin={onLogin} error={error} />
  }

  return (
    <AuthLayout>
      <div className="grid gap-5">
        <div>
          <h2 className="text-xl font-bold text-white">Activation du poste</h2>
          <p className="mt-1 text-[13px] text-[#8fa398]">
            Saisissez le code d&apos;activation fourni par Pandora. L&apos;application se relie alors seule à la base de
            données de votre établissement.
          </p>
        </div>
        <ActivationCodeForm variant="brand" submitLabel="Activer et continuer" onActivated={() => setStep('login')} />
      </div>
    </AuthLayout>
  )
}
