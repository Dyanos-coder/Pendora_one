import { useState } from 'react'
import { CheckCircle2, Loader2, RefreshCw, RotateCw } from 'lucide-react'
import { Card } from '@renderer/components/Card'
import { Button } from '@renderer/components/Button'
import { useUpdateInfo } from './useUpdateInfo'

/** Paramètres › Mises à jour : version installée, vérification manuelle, installation. */
export function UpdateSettingsCard(): JSX.Element {
  const info = useUpdateInfo()
  const [checking, setChecking] = useState(false)

  async function handleCheck(): Promise<void> {
    setChecking(true)
    await window.api.updater.check()
    setChecking(false)
  }

  const status = info?.status
  const busy = checking || status?.state === 'CHECKING'

  return (
    <Card>
      <h3 className="mb-1 text-[15px] font-bold text-gray-900">Mises à jour</h3>
      <p className="mb-4 text-xs text-gray-500">
        L&apos;application vérifie automatiquement les nouvelles versions dès son lancement puis toutes les 30 minutes, les télécharge en
        arrière-plan et les installe au redémarrage. Les données de ce poste sont conservées.
      </p>

      <p className="text-sm text-gray-700">
        Version installée : <span className="font-semibold text-gray-900">{info?.currentVersion ?? '…'}</span>
      </p>

      <div className="mt-2 min-h-[20px] text-xs">
        {status?.state === 'DISABLED' && <p className="text-gray-400">Mise à jour automatique inactive en mode développement.</p>}
        {status?.state === 'UP_TO_DATE' && (
          <p className="flex items-center gap-1.5 text-teal-600">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Application à jour (vérifié à {new Date(status.checkedAt).toLocaleTimeString('fr-FR')}).
          </p>
        )}
        {status?.state === 'DOWNLOADING' && (
          <p className="text-accent-600">
            Téléchargement de la version {status.version} : {status.percent} %
          </p>
        )}
        {status?.state === 'READY' && <p className="text-accent-600">Version {status.version} prête à être installée.</p>}
        {status?.state === 'ERROR' && <p className="text-red-500">{status.message}</p>}
      </div>

      <div className="mt-4 flex gap-2">
        {status?.state === 'READY' ? (
          <Button size="sm" onClick={() => window.api.updater.install()}>
            <RotateCw className="h-3.5 w-3.5" />
            Redémarrer et installer
          </Button>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            onClick={handleCheck}
            disabled={busy || status?.state === 'DISABLED' || status?.state === 'DOWNLOADING'}
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Rechercher des mises à jour
          </Button>
        )}
      </div>
    </Card>
  )
}
