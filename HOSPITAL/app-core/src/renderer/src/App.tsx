import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useAuth } from './features/auth/useAuth'
import { LoginScreen } from './features/auth/LoginScreen'
import { AppShell } from './features/shell/AppShell'
import { SetupWizard } from './features/setup/SetupWizard'
import { DbStatusScreen } from './features/setup/DbStatusScreen'
import { UpdateBanner } from './features/updater/UpdateBanner'
import { ALL_MODULE_SCREEN_IDS, type AppConfig, type DbStartupStatus } from '@shared/setup-types'

function App(): JSX.Element {
  // Encart de mise à jour visible sur tous les écrans (connexion, assistant, application).
  return (
    <>
      <AppContent />
      <UpdateBanner />
    </>
  )
}

function AppContent(): JSX.Element {
  const { session, loading, error, login, logout } = useAuth()
  const [config, setConfig] = useState<AppConfig | null>(null)
  // État de la base distante au lancement (backend embarqué, voir Plan-Backend-Embarque-Travaux.md).
  const [dbStatus, setDbStatus] = useState<DbStartupStatus | null>(null)
  // Modules affichés — réglage d'établissement (Company côté serveur), pas de config locale, donc
  // récupéré une fois qu'une session existe plutôt que lu depuis le fichier de config du poste.
  const [enabledModules, setEnabledModules] = useState<string[] | null>(null)

  useEffect(() => {
    window.api.setup.getConfig().then(setConfig)
    window.api.setup.getDbStatus().then(setDbStatus)
  }, [])

  useEffect(() => {
    if (!session) {
      setEnabledModules(null)
      return
    }
    let cancelled = false
    window.api.company.get().then((result) => {
      if (cancelled) return
      setEnabledModules(result.ok ? (result.data.company.enabledModules ?? ALL_MODULE_SCREEN_IDS) : ALL_MODULE_SCREEN_IDS)
    })
    return () => {
      cancelled = true
    }
  }, [session])

  if (loading || !config || !dbStatus) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    )
  }

  if (!config.setupComplete) {
    return (
      <SetupWizard
        session={session}
        error={error}
        onLogin={login}
        dbReady={dbStatus.state === 'READY'}
        onComplete={(modules) => {
          setConfig({ ...config, setupComplete: true })
          setEnabledModules(modules)
        }}
      />
    )
  }

  // NOT_CONFIGURED ici = poste déjà configuré avant le backend embarqué (assistant passé, mais
  // aucun accès à la base enregistré) : on les demande sans repasser par tout l'assistant.
  if (
    dbStatus.state === 'NOT_CONFIGURED' ||
    dbStatus.state === 'NEEDS_ACTIVATION' ||
    dbStatus.state === 'NEEDS_ACCESS' ||
    dbStatus.state === 'APP_OUTDATED' ||
    dbStatus.state === 'MIGRATION_FAILED'
  ) {
    return (
      <DbStatusScreen
        status={dbStatus}
        onResolved={setDbStatus}
        onAccessSaved={async () => {
          // Nouveaux accès = peut-être une autre base, ou un jeton devenu invalide : on repart
          // toujours de l'écran de connexion plutôt que de réutiliser la session en cache.
          await logout()
          setDbStatus({ state: 'READY' })
        }}
      />
    )
  }

  if (!session) {
    return <LoginScreen onLogin={login} error={error} />
  }

  if (!enabledModules) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    )
  }

  return <AppShell session={session} enabledModules={enabledModules} onLogout={logout} />
}

export default App
