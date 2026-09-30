import { useState } from 'react'
import { AlertTriangle, CalendarClock, LogOut, RefreshCw } from 'lucide-react'
import { Button } from '@renderer/components/Button'
import { Card } from '@renderer/components/Card'
import type { Session } from '@shared/auth-types'
import type { SubscriptionInfo } from '@shared/subscription-types'
import { SubscriptionManager, SubscriptionSummary } from './SubscriptionManager'
import { formatYmd } from './useSubscription'

const LOCK_MESSAGE: Partial<Record<SubscriptionInfo['state'], string>> = {
  EXPIRED: 'L’abonnement Pandora Health de votre établissement est arrivé à échéance. Renouvelez-le pour continuer à utiliser l’application.',
  NONE: 'Aucun abonnement Pandora Health n’est actif pour votre établissement.',
  INVALID: 'L’abonnement enregistré pour votre établissement n’est pas valide. Contactez Pandora.',
  UNVERIFIED: 'Impossible de vérifier l’abonnement : ce poste est hors connexion et n’a encore jamais pu le contrôler. Connectez-vous à Internet.'
}

/** Fenêtre de renouvellement plein écran, impossible à fermer tant que l'abonnement n'est pas
 * valide (Plan-Site-Pandora.md §6.5) : le dirigeant peut payer, les autres voient qui contacter. */
export function SubscriptionLock({ info, session, onLogout }: { info: SubscriptionInfo; session: Session; onLogout: () => void }): JSX.Element {
  const [checking, setChecking] = useState(false)

  async function recheck(): Promise<void> {
    setChecking(true)
    await window.api.subscription.refresh()
    setChecking(false)
  }

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-900/70 backdrop-blur-sm">
      <div className="mx-auto my-10 max-w-3xl px-4">
        <Card className="space-y-6 hover:shadow-sm">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
              {info.state === 'EXPIRED' ? <CalendarClock className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
            </span>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {info.state === 'EXPIRED' ? `Abonnement expiré depuis le ${formatYmd(info.endDate)}` : 'Abonnement requis'}
              </h2>
              <p className="mt-1 text-sm text-gray-600">{LOCK_MESSAGE[info.state] ?? LOCK_MESSAGE.NONE}</p>
              {session.user.role !== 'DIRIGEANT' && (
                <p className="mt-2 text-sm font-medium text-gray-800">
                  Contactez le dirigeant de votre établissement pour renouveler l&apos;abonnement.
                </p>
              )}
            </div>
          </div>

          <SubscriptionSummary info={info} />

          {session.user.role === 'DIRIGEANT' && <SubscriptionManager info={info} session={session} />}

          <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-4">
            <Button variant="secondary" onClick={recheck} disabled={checking}>
              <RefreshCw className={'h-4 w-4 ' + (checking ? 'animate-spin' : '')} />
              Vérifier à nouveau
            </Button>
            <Button variant="secondary" onClick={onLogout}>
              <LogOut className="h-4 w-4" />
              Se déconnecter
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}

/** Rappel avant l'échéance (7 jours ou moins). */
export function SubscriptionBanner({ info, onOpen }: { info: SubscriptionInfo; onOpen: () => void }): JSX.Element | null {
  if (info.state !== 'EXPIRING') return null
  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
      <span className="flex items-center gap-2">
        <CalendarClock className="h-3.5 w-3.5 shrink-0" />
        Votre abonnement Pandora Health arrive à échéance le {formatYmd(info.endDate)}
        {info.daysLeft === 0 ? " (aujourd'hui)" : ` (dans ${info.daysLeft} jour${info.daysLeft === 1 ? '' : 's'})`}. Pensez à le renouveler.
      </span>
      <button
        onClick={onOpen}
        className="shrink-0 rounded-lg border border-amber-300 bg-white px-2.5 py-1 font-medium text-amber-700 hover:bg-amber-100"
      >
        Voir l&apos;abonnement
      </button>
    </div>
  )
}
