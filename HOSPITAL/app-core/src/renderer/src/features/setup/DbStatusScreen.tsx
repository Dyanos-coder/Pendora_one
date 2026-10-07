import { useEffect, useState } from 'react'
import { AlertTriangle, Download, Loader2, RefreshCw, WifiOff } from 'lucide-react'
import { AuthLayout, authButtonClass } from '@renderer/components/brand/AuthLayout'
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
    <AuthLayout>
      <div>

        {needsCode ? (
          <>
            <h2 className="text-xl font-bold text-white">Activation du poste</h2>
            {status.state === 'NEEDS_ACTIVATION' && (
              <p className="mt-3 rounded-lg border border-gold-400/30 bg-gold-400/10 px-3 py-2 text-sm text-[#f3cd70]">{status.message}</p>
            )}
            <p className="mt-1.5 mb-6 text-[13px] text-[#8fa398]">
              Saisissez le code d&apos;activation fourni par Pandora : l&apos;application se relie seule à la base de
              données de votre établissement.
            </p>
            <ActivationCodeForm variant="brand" onActivated={onAccessSaved} />
          </>
        ) : (
          <div className="mb-6 flex gap-3 rounded-xl border border-gold-400/30 bg-gold-400/10 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#efbc48]" />
            <div>
              <p className="text-sm font-semibold text-white">
                {status.state === 'NEEDS_ACCESS'
                  ? 'Connexion à la base de données impossible'
                  : status.state === 'APP_OUTDATED'
                    ? 'Mise à jour de l’application nécessaire'
                    : 'Mise à jour de la base de données impossible'}
              </p>
              <p className="mt-1 text-sm text-[#f3cd70]">{status.message}</p>
            </div>
          </div>
        )}

        {status.state === 'NEEDS_ACCESS' && (
          <>
            <p className="mb-4 text-[13px] text-[#8fa398]">
              Internet fonctionne, mais la base de données de l&apos;établissement ne répond pas. Réessayez dans un instant,
              continuez hors connexion, ou contactez Pandora si le problème dure.
            </p>
            {newCode ? (
              <ActivationCodeForm variant="brand" submitLabel="Activer avec ce code" onActivated={onAccessSaved} />
            ) : (
              <button type="button" onClick={() => setNewCode(true)} className="text-sm font-medium text-[#5fdc8c] hover:text-[#8fe9ae]">
                Saisir un nouveau code d&apos;activation
              </button>
            )}
          </>
        )}

        {status.state === 'APP_OUTDATED' && <UpdateNowPanel />}

        {status.state !== 'APP_OUTDATED' && !needsCode && (
          <div className="mt-4 flex gap-3">
            {!needsCode && (
              <button type="button" onClick={handleRetry} disabled={retrying} className="flex flex-1 items-center justify-center gap-2 rounded-[10px] border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm font-medium text-[#d3e0d8] hover:border-[#34cc6b]/50 hover:bg-white/[0.07] disabled:opacity-60">
                {retrying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Réessayer
              </button>
            )}
            <button type="button" onClick={handleContinueOffline} className="flex flex-1 items-center justify-center gap-2 rounded-[10px] border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm font-medium text-[#d3e0d8] hover:border-[#34cc6b]/50 hover:bg-white/[0.07] disabled:opacity-60">
              <WifiOff className="h-4 w-4" />
              Continuer hors connexion
            </button>
          </div>
        )}
      </div>
    </AuthLayout>
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
    return <p className="text-sm text-[#8fa398]">Mise à jour automatique indisponible en mode développement.</p>
  }

  const downloading = status?.state === 'DOWNLOADING'
  const busy = requested && (status?.state === 'CHECKING' || downloading || status?.state === 'READY')

  return (
    <div>
      <button type="button" onClick={handleUpdate} disabled={busy} className={authButtonClass}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        {status?.state === 'READY' ? 'Installation…' : downloading ? `Téléchargement… ${status.percent} %` : 'Mettre à jour maintenant'}
      </button>
      {downloading && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-accent-500 transition-all" style={{ width: `${status.percent}%` }} />
        </div>
      )}
      {status?.state === 'UP_TO_DATE' && requested && (
        <p className="mt-2 text-sm text-[#8fa398]">
          Aucune version plus récente n&apos;est encore publiée. Contactez l&apos;administrateur de l&apos;application.
        </p>
      )}
      {status?.state === 'ERROR' && <p className="mt-2 text-sm text-[#fca5a5]">{status.message}</p>}
    </div>
  )
}
