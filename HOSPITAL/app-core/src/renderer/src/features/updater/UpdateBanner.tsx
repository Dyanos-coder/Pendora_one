import { Download, RotateCw } from 'lucide-react'
import { Button } from '@renderer/components/Button'
import { useUpdateInfo } from './useUpdateInfo'

/** Encart discret en bas à droite, sur tous les écrans : progression du téléchargement d'une
 * nouvelle version, puis « Redémarrer maintenant » une fois prête (sinon installée à la fermeture). */
export function UpdateBanner(): JSX.Element | null {
  const info = useUpdateInfo()
  const status = info?.status
  if (!status || (status.state !== 'DOWNLOADING' && status.state !== 'READY')) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 rounded-xl border border-gray-200 bg-white p-4 shadow-lg shadow-gray-200/60">
      {status.state === 'DOWNLOADING' ? (
        <>
          <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
            <Download className="h-4 w-4 text-accent-600" />
            Mise à jour {status.version} en cours de téléchargement
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-accent-500 transition-all" style={{ width: `${status.percent}%` }} />
          </div>
          <p className="mt-1.5 text-right text-xs text-gray-400">{status.percent} %</p>
        </>
      ) : (
        <>
          <p className="text-sm font-medium text-gray-900">Mise à jour {status.version} prête</p>
          <p className="mt-1 text-xs text-gray-500">
            Elle sera installée à la fermeture de l&apos;application, ou tout de suite en redémarrant.
          </p>
          <Button size="sm" onClick={() => window.api.updater.install()} className="mt-3 w-full">
            <RotateCw className="h-3.5 w-3.5" />
            Redémarrer maintenant
          </Button>
        </>
      )}
    </div>
  )
}
