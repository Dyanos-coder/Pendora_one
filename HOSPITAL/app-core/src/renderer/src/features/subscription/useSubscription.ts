import { useEffect, useState } from 'react'
import type { PendingPayment, SubscriptionInfo } from '@shared/subscription-types'

/** État de l'abonnement Pandora, tenu à jour en direct (événement `subscription:status`). */
export function useSubscription(): SubscriptionInfo | null {
  const [info, setInfo] = useState<SubscriptionInfo | null>(null)

  useEffect(() => {
    let cancelled = false
    window.api.subscription.getInfo().then((initial) => {
      if (!cancelled) setInfo((prev) => prev ?? initial)
    })
    const unsubscribe = window.api.subscription.onStatus(setInfo)
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  return info
}

/** Paiement MoneyFusion en cours de suivi (page de paiement ouverte dans le navigateur). */
export function usePendingPayment(): PendingPayment | null {
  const [pending, setPending] = useState<PendingPayment | null>(null)

  useEffect(() => {
    let cancelled = false
    window.api.subscription.getPending().then((initial) => {
      if (!cancelled) setPending(initial)
    })
    const unsubscribe = window.api.subscription.onPayment(setPending)
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  return pending
}

export function formatYmd(ymd: string | null): string {
  if (!ymd) return '—'
  const [y, m, d] = ymd.split('-')
  return `${d}/${m}/${y}`
}

export function formatFcfa(amount: number): string {
  return `${amount.toLocaleString('fr-FR')} FCFA`
}

export const STATE_LABEL: Record<SubscriptionInfo['state'], string> = {
  ACTIVE: 'À jour',
  EXPIRING: 'Expire bientôt',
  EXPIRED: 'Expiré',
  NONE: 'Non activé',
  INVALID: 'Invalide',
  UNVERIFIED: 'Non vérifié',
  UNKNOWN: 'Vérification…'
}
