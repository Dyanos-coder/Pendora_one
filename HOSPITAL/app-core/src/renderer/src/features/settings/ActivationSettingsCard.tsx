import { useEffect, useState } from 'react'
import { Check, CheckCircle2, Copy, KeyRound } from 'lucide-react'
import { Card } from '@renderer/components/Card'
import { Button } from '@renderer/components/Button'
import { ActivationCodeForm } from '@renderer/features/setup/ActivationCodeForm'
import type { ActivationInfo } from '@shared/setup-types'

/** Paramètres › Établissement : code d'activation de ce poste (Plan-Code-Activation.md) et
 * changement de code. Les accès à la base ne sont jamais affichés. */
export function ActivationSettingsCard({ onReactivated }: { onReactivated: () => void }): JSX.Element {
  const [info, setInfo] = useState<ActivationInfo | null>(null)
  const [changing, setChanging] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    window.api.setup.getActivation().then(setInfo)
  }, [])

  return (
    <Card>
      <h3 className="mb-1 text-[15px] font-bold text-gray-900">Code d&apos;activation</h3>
      <p className="mb-4 text-xs text-gray-500">
        Code fourni par Pandora pour relier ce poste à la base de l&apos;établissement. Il est vérifié à chaque lancement : s&apos;il
        n&apos;est plus valide, l&apos;application le redemande.
      </p>
      {info?.code ? (
        <>
          <p className="mb-2 flex items-center gap-1.5 text-sm text-teal-700">
            <CheckCircle2 className="h-4 w-4" />
            Poste activé pour <span className="font-semibold">{info.hospitalName}</span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-sm tracking-wider text-gray-900 select-all">
              {info.code}
            </code>
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => {
                await navigator.clipboard.writeText(info.code ?? '')
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              }}
            >
              {copied ? <Check className="h-3.5 w-3.5 text-teal-600" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copié' : 'Copier'}
            </Button>
          </div>
        </>
      ) : (
        <p className="text-sm text-gray-500">Aucun code enregistré sur ce poste : il sera demandé au prochain lancement.</p>
      )}

      {changing ? (
        <div className="mt-4 max-w-lg border-t border-gray-100 pt-4">
          <p className="mb-3 text-xs text-gray-500">Après activation avec le nouveau code, vous serez invité à vous reconnecter.</p>
          <ActivationCodeForm submitLabel="Activer avec ce code" onActivated={onReactivated} />
          <button type="button" onClick={() => setChanging(false)} className="mt-3 text-xs text-gray-500 hover:text-gray-800">
            Annuler
          </button>
        </div>
      ) : (
        <Button size="sm" variant="secondary" className="mt-4" onClick={() => setChanging(true)}>
          <KeyRound className="h-3.5 w-3.5" />
          Changer de code d&apos;activation
        </Button>
      )}
    </Card>
  )
}
