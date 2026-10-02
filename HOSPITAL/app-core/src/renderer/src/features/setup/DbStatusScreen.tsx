import { useEffect, useState } from 'react'
import { AlertTriangle, Download, Loader2, RefreshCw, WifiOff } from 'lucide-react'
import { BrandMark } from '@renderer/components/BrandMark'
import { Button } from '@renderer/components/Button'
import { useUpdateInfo } from '@renderer/features/updater/useUpdateInfo'
import { ActivationCodeForm } from './ActivationCodeForm'
import type { DbStartupStatus } from '@shared/setup-types'

type BlockingStatus = Extract<
  DbStartupStatus,
  {
    state: 'NOT_CONFIGURED' | 'NEEDS_ACTIVATION' | 'NEEDS_ACCESS' | 'APP_OUTDATED' | 'MIGRATION_FAILED'
  }
>

interface DbStatusScreenProps {
  status: BlockingStatus
  onResolved: (status: DbStartupStatus) => void
  /** Nouveaux accès enregistrés : la session en cache n'est plus fiable → reconnexion demandée. */
  onAccessSaved: () => void
}

/** Écran affiché au lancement quand la base distante pose problème (voir
 * Plan-Backend-Embarque-Travaux.md §2) :
 * - NOT_CONFIGURED : poste configuré avant le backend embarqué, aucun accès enregistré ;
 * - NEEDS_ACCESS : base injoignable alors qu'Internet fonctionne → accès redemandés, avec
 *   « Réessayer » (accès actuels) et « Continuer hors connexion » (base seulement en panne) ;
 * - APP_OUTDATED : la base a été mise à jour par une version plus récente → mise à jour requise ;
 * - MIGRATION_FAILED : la mise à jour de la base a échoué → message, réessai ou hors connexion. */
export function DbStatusScreen({ status, onResolved, onAccessSaved }: DbStatusScreenProps): JSX.Element {
  const [retrying, setRetrying] = useState(false)
  const [newCode, setNewCode] = useState(false)
  const needsCode = status.state === 'NOT_CONFIGURED' || status.state === 'NEEDS_ACTIVATION'

  async function handleRetry(): Promise<void> {
    setRetrying(true)
    const next = await window.api.setup.retryDb()
    setRetrying(false)
    onResolved(next)
  }

  async function handleContinueOffline(): Promise<void> {
    onResolved(await window.api.setup.continueOffline())
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gray-50 px-6 py-10">
      <div className="w-full max-w-lg rounded-2xl border border-gray-100 bg-white p-8 shadow-xl shadow-gray-200/60">
        <div className="mb-6 flex items-center gap-2.5">
          <BrandMark />
          <span className="text-lg font-semibold tracking-tight text-gray-900">Pandora Health</span>
        </div>

        {needsCode ? (
          <>
            <h2 className="text-xl font-semibold text-gray-900">Activation du poste</h2>
            {status.state === 'NEEDS_ACTIVATION' && (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{status.message}</p>
            )}
            <p className="mt-1.5 mb-6 text-sm text-gray-500">
              Saisissez le code d&apos;activation fourni par Pandora : l&apos;application se relie seule à la base de
              données de votre établissement.
            </p>
            <ActivationCodeForm onActivated={onAccessSaved} />
          </>
        ) : (
          <div className="mb-6 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-amber-900">
                {status.state === 'NEEDS_ACCESS'
                  ? 'Connexion à la base de données impossible'
                  : status.state === 'APP_OUTDATED'
                    ? 'Mise à jour de l’application nécessaire'
                    : 'Mise à jour de la base de données impossible'}
              </p>
              <p className="mt-1 text-sm text-amber-800">{status.message}</p>
            </div>
          </div>
        )}

        {status.state === 'NEEDS_ACCESS' && (
          <>
            <p className="mb-4 text-sm text-gray-500">
              Internet fonctionne, mais la base de données de l&apos;établissement ne répond pas. Réessayez dans un instant,
              continuez hors connexion, ou contactez Pandora si le problème dure.
            </p>
            {newCode ? (
              <ActivationCodeForm submitLabel="Activer avec ce code" onActivated={onAccessSaved} />
            ) : (
              <button type="button" onClick={() => setNewCode(true)} className="text-sm font-medium text-accent-600 hover:text-accent-700">
                Saisir un nouveau code d&apos;activation
              </button>
            )}
          </>
        )}

        {status.state === 'APP_OUTDATED' && <UpdateNowPanel />}

        {status.state !== 'APP_OUTDATED' && !needsCode && (
          <div className="mt-4 flex gap-3">
            {!needsCode && (
              <Button variant="secondary" onClick={handleRetry} disabled={retrying} className="flex-1 py-2.5">
                {retrying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Réessayer
              </Button>
            )}
            <Button variant="secondary" onClick={handleContinueOffline} className="flex-1 py-2.5">
              <WifiOff className="h-4 w-4" />
              Continuer hors connexion
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

/** Poste bloqué par une base plus récente que lui : télécharge la dernière version puis redémarre
 * l'app pour l'installer (voir Plan-Mise-A-Jour-Automatique.md §2.3). */
function UpdateNowPanel(): JSX.Element {
  const info = useUpdateInfo()
  const [requested, setRequested] = useState(false)
  const status = info?.status

  // Demandée explicitement ici : on installe dès que le téléchargement est terminé.
  useEffect(() => {
    if (requested && status?.state === 'READY') void window.api.updater.install()
  }, [requested, status?.state])

  async function handleUpdate(): Promise<void> {
    setRequested(true)
    if (status?.state === 'READY') {
      await window.api.updater.install()
      return
    }
    await window.api.updater.check()
  }

  if (status?.state === 'DISABLED') {
    return <p className="text-sm text-gray-500">Mise à jour automatique indisponible en mode développement.</p>
  }

  const downloading = status?.state === 'DOWNLOADING'
  const busy = requested && (status?.state === 'CHECKING' || downloading || status?.state === 'READY')

  return (
    <div>
      <Button onClick={handleUpdate} disabled={busy} className="w-full py-2.5">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        {status?.state === 'READY' ? 'Installation…' : downloading ? `Téléchargement… ${status.percent} %` : 'Mettre à jour maintenant'}
      </Button>
      {downloading && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
          <div className="h-full rounded-full bg-accent-500 transition-all" style={{ width: `${status.percent}%` }} />
        </div>
      )}
      {status?.state === 'UP_TO_DATE' && requested && (
        <p className="mt-2 text-sm text-gray-500">
          Aucune version plus récente n&apos;est encore publiée. Contactez l&apos;administrateur de l&apos;application.
        </p>
      )}
      {status?.state === 'ERROR' && <p className="mt-2 text-sm text-red-600">{status.message}</p>}
    </div>
  )
}
