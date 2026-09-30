import { useEffect, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { BrandMark } from '@renderer/components/BrandMark'
import { Button } from '@renderer/components/Button'
import { ModuleTree } from '@renderer/components/ModuleTree'
import { LoginScreen } from '@renderer/features/auth/LoginScreen'
import { DbAccessForm } from './DbAccessForm'
import { ALL_MODULE_SCREEN_IDS, applyModuleDependencies } from '@shared/setup-types'
import type { Session } from '@shared/auth-types'

interface SetupWizardProps {
  session: Session | null
  error: string | null
  onLogin: (email: string, password: string) => Promise<boolean>
  /** La base distante est déjà configurée et joignable (assistant interrompu puis relancé). */
  dbReady: boolean
  onComplete: (enabledModules: string[]) => void
}

type Step = 'db' | 'login' | 'modules'

/** Assistant de premier lancement (voir Plan-Installeur-Configurable.md) — s'affiche à la place de
 * l'écran de connexion habituel tant que la configuration locale de ce poste n'est pas terminée
 * (`setupComplete: false`, voir app-config.service.ts). Trois étapes : accès à la base de données
 * de cet hôpital, connexion (`onLogin`/`session` viennent du même `useAuth()` que le reste de l'app —
 * pas d'appel IPC direct ici, pour que la session soit correctement connue du reste de l'app une
 * fois l'assistant terminé), puis choix des modules affichés dans la navigation. */
export function SetupWizard({ session, error, onLogin, dbReady, onComplete }: SetupWizardProps): JSX.Element {
  const [step, setStep] = useState<Step>(dbReady ? 'login' : 'db')
  const [enabledModules, setEnabledModules] = useState<string[]>(ALL_MODULE_SCREEN_IDS)

  useEffect(() => {
    // Session déjà présente alors que la base était déjà configurée (app fermée avant la fin de
    // l'assistant) : pas la peine de redemander une connexion. Jamais depuis l'étape « base » :
    // après saisie des accès, on passe TOUJOURS par l'écran de connexion (jeton peut-être invalide).
    if (session && step === 'login') setStep('modules')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  async function handleLogin(email: string, password: string): Promise<boolean> {
    const ok = await onLogin(email, password)
    if (ok) setStep('modules')
    return ok
  }

  async function handleFinish(): Promise<void> {
    // Les modules sont un réglage d'établissement (Company côté serveur), partagé par tous les
    // postes connectés à ce backend — seule `setupComplete` (avoir passé l'assistant) est locale.
    const modules = applyModuleDependencies(enabledModules)
    await window.api.company.update({ enabledModules: modules })
    await window.api.setup.markComplete()
    onComplete(modules)
  }

  if (step === 'login') {
    return <LoginScreen onLogin={handleLogin} error={error} />
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-50 px-6">
      <div className="w-full max-w-lg rounded-2xl border border-gray-100 bg-white p-8 shadow-xl shadow-gray-200/60">
        <div className="mb-6 flex items-center gap-2.5">
          <BrandMark />
          <span className="text-lg font-semibold tracking-tight text-gray-900">Pandora Health</span>
        </div>

        {step === 'db' && (
          <>
            <h2 className="text-xl font-semibold text-gray-900">Configuration initiale</h2>
            <p className="mt-1.5 mb-6 text-sm text-gray-500">
              Indiquez les accès à la base de données de votre établissement (fournis par l&apos;hébergeur
              MySQL). Ils sont enregistrés chiffrés sur ce poste.
            </p>
            <DbAccessForm prefill={null} submitLabel="Tester la connexion et continuer" onSaved={() => setStep('login')} />
          </>
        )}

        {step === 'modules' && (
          <>
            <h2 className="text-xl font-semibold text-gray-900">Modules à afficher</h2>
            <p className="mt-1.5 text-sm text-gray-500">
              Tout est coché par défaut — décochez ce qui ne concerne pas votre établissement. Modifiable
              plus tard depuis Paramètres.
            </p>
            <div className="mt-6 max-h-[50vh] overflow-y-auto pr-1">
              <ModuleTree enabledModules={enabledModules} onChange={setEnabledModules} />
            </div>
            <Button onClick={handleFinish} className="mt-6 w-full py-2.5">
              <CheckCircle2 className="h-4 w-4" />
              Terminer
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
