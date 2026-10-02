import { useEffect, useState } from 'react'
import { CheckCircle2, KeyRound } from 'lucide-react'
import { Card } from '@renderer/components/Card'
import { Button } from '@renderer/components/Button'
import { ActivationCodeForm } from '@renderer/features/setup/ActivationCodeForm'
import type { ActivationInfo } from '@shared/setup-types'

/** Paramètres › Établissement : poste activé auprès de Pandora, et changement de code (dirigeant). */
export function ActivationSettingsCard({ canEdit, onReactivated }: { canEdit: boolean; onReactivated: () => void }): JSX.Element {
  const [info, setInfo] = useState<ActivationInfo | null>(null)
  const [changing, setChanging] = useState(false)

  useEffect(() => {
    window.api.setup.getActivation().then(setInfo)
  }, [])

  return (
    <Card>
      <h3 className="mb-1 text-sm font-semibold text-gray-900">Activation du poste</h3>
      {info?.activated ? (
        <p className="flex items-center gap-1.5 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          Poste activé pour <span className="font-semibold">{info.hospitalName}</span>
        </p>
      ) : (
        <p className="text-sm text-gray-500">
          Poste configuré avec des accès saisis à la main : il sera relié automatiquement au site Pandora dès que possible.
        </p>
      )}
      {canEdit &&
        (changing ? (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <p className="mb-3 text-xs text-gray-500">
              Le nouveau code relie ce poste à la base de l&apos;établissement correspondant ; vous serez ensuite invité à vous
              reconnecter.
            </p>
            <ActivationCodeForm submitLabel="Activer avec ce code" allowManual={false} onActivated={onReactivated} />
            <button type="button" onClick={() => setChanging(false)} className="mt-3 text-xs text-gray-500 hover:text-gray-800">
              Annuler
            </button>
          </div>
        ) : (
          <Button size="sm" variant="secondary" className="mt-4" onClick={() => setChanging(true)}>
            <KeyRound className="h-3.5 w-3.5" />
            Changer de code d&apos;activation
          </Button>
        ))}
    </Card>
  )
}
