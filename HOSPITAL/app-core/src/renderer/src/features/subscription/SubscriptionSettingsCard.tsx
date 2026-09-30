import { useState } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import { Card } from '@renderer/components/Card'
import { Button } from '@renderer/components/Button'
import type { Session } from '@shared/auth-types'
import { SubscriptionManager, SubscriptionSummary } from './SubscriptionManager'
import { useSubscription } from './useSubscription'

/** Paramètres › Abonnement : statut, échéance, renouvellement ou modification, historique. */
export function SubscriptionSettingsCard({ session }: { session: Session }): JSX.Element {
  const info = useSubscription()
  const [checking, setChecking] = useState(false)

  async function recheck(): Promise<void> {
    setChecking(true)
    await window.api.subscription.refresh()
    setChecking(false)
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Abonnement Pandora Health</h3>
            <p className="mt-0.5 text-xs text-gray-500">
              Renouvelable chaque mois (échéance le 28), de 1 à 24 mois à la fois, avec les modules de votre choix. Le paiement se fait
              par MoneyFusion (Mobile Money).
            </p>
          </div>
          <Button size="sm" variant="secondary" onClick={recheck} disabled={checking}>
            <RefreshCw className={'h-3.5 w-3.5 ' + (checking ? 'animate-spin' : '')} />
            Actualiser
          </Button>
        </div>
        {info ? (
          <SubscriptionSummary info={info} />
        ) : (
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        )}
      </Card>

      {info && (
        <Card>
          <h3 className="mb-4 text-sm font-semibold text-gray-900">Renouveler ou modifier</h3>
          <SubscriptionManager info={info} session={session} />
        </Card>
      )}
    </div>
  )
}
