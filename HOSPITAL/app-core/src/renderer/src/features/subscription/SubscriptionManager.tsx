import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, ExternalLink, Loader2, RefreshCw, XCircle } from 'lucide-react'
import { Button } from '@renderer/components/Button'
import { StatusBadge, type StatusTone } from '@renderer/components/StatusBadge'
import type { Session } from '@shared/auth-types'
import type {
  SubscriptionCatalogItem,
  SubscriptionInfo,
  SubscriptionPayment,
  SubscriptionQuote
} from '@shared/subscription-types'
import { STATE_LABEL, formatFcfa, formatYmd, usePendingPayment } from './useSubscription'

const STATE_TONE: Record<SubscriptionInfo['state'], StatusTone> = {
  ACTIVE: 'success',
  EXPIRING: 'warning',
  EXPIRED: 'danger',
  NONE: 'neutral',
  INVALID: 'danger',
  UNVERIFIED: 'warning',
  UNKNOWN: 'neutral'
}

const PAYMENT_LABEL: Record<SubscriptionPayment['status'], { label: string; tone: StatusTone }> = {
  EN_ATTENTE: { label: 'En attente', tone: 'warning' },
  PAYE: { label: 'Payé', tone: 'info' },
  APPLIQUE: { label: 'Appliqué', tone: 'success' },
  ECHEC: { label: 'Échec', tone: 'danger' },
  ANNULE: { label: 'Annulé', tone: 'neutral' }
}

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 focus:border-accent-500 focus:outline-none'

/** Résumé de l'abonnement : statut, échéance, source. */
export function SubscriptionSummary({ info }: { info: SubscriptionInfo }): JSX.Element {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div>
        <p className="text-xs text-gray-500">Statut</p>
        <div className="mt-1">
          <StatusBadge label={STATE_LABEL[info.state]} tone={STATE_TONE[info.state]} />
        </div>
      </div>
      <div>
        <p className="text-xs text-gray-500">Échéance</p>
        <p className="mt-0.5 text-lg font-semibold text-gray-900">{formatYmd(info.endDate)}</p>
        {info.daysLeft !== null && info.daysLeft >= 0 && (
          <p className="text-xs text-gray-500">
            {info.daysLeft === 0 ? "Dernier jour aujourd'hui" : `${info.daysLeft} jour(s) restant(s)`}
          </p>
        )}
      </div>
      <div>
        <p className="text-xs text-gray-500">Contrôle</p>
        <p className="mt-0.5 text-sm text-gray-700">
          {info.source === 'LOCAL' ? 'Copie locale (hors connexion)' : info.source === 'REMOTE' ? 'Base de l’établissement' : '—'}
        </p>
        {!info.enforced && <p className="text-xs text-gray-400">Mode développement : non bloquant</p>}
      </div>
    </div>
  )
}

interface SubscriptionManagerProps {
  info: SubscriptionInfo
  session: Session
}

/** Renouvellement / modification de l'abonnement (1 à 24 mois, modules au choix) et historique
 * des paiements. Seul le dirigeant peut payer ; le montant est calculé par le site Pandora. */
export function SubscriptionManager({ info, session }: SubscriptionManagerProps): JSX.Element {
  const isDirigeant = session.user.role === 'DIRIGEANT'
  const active = info.state === 'ACTIVE' || info.state === 'EXPIRING'
  const pending = usePendingPayment()

  const [catalog, setCatalog] = useState<SubscriptionCatalogItem[] | null>(null)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [months, setMonths] = useState(1)
  const [quote, setQuote] = useState<SubscriptionQuote | null>(null)
  const [quoteError, setQuoteError] = useState<string | null>(null)
  const [quoting, setQuoting] = useState(false)
  const [phone, setPhone] = useState('')
  const [payerName, setPayerName] = useState(session.user.name)
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)
  const [payments, setPayments] = useState<SubscriptionPayment[]>([])

  useEffect(() => {
    if (!info.canPayOnline) return
    let cancelled = false
    window.api.subscription.catalog().then((result) => {
      if (cancelled) return
      if (!result.ok) {
        setCatalogError(result.error)
        return
      }
      setCatalog(result.data)
      const available = new Set(result.data.filter((i) => !i.comingSoon).map((i) => i.key))
      const mandatory = result.data.filter((i) => i.mandatory).map((i) => i.key)
      setSelected([...new Set([...mandatory, ...info.items.filter((k) => available.has(k))])])
    })
    window.api.subscription.payments().then((result) => {
      if (!cancelled && result.ok) setPayments(result.data)
    })
    return () => {
      cancelled = true
    }
    // Rechargé seulement si la liaison au site change ou après un nouveau paiement (échéance).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [info.canPayOnline, info.endDate])

  // Devis recalculé par le site à chaque changement (léger délai pour grouper les clics).
  useEffect(() => {
    if (!catalog || selected.length === 0) return
    let cancelled = false
    setQuoting(true)
    const timer = setTimeout(async () => {
      const result = await window.api.subscription.quote(selected, months)
      if (cancelled) return
      setQuoting(false)
      if (result.ok) {
        setQuote(result.data)
        setQuoteError(null)
      } else {
        setQuote(null)
        setQuoteError(result.error)
      }
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [catalog, selected, months])

  const offers = useMemo(() => [...new Set((catalog ?? []).map((i) => i.offer))], [catalog])

  async function handlePay(): Promise<void> {
    setPaying(true)
    setPayError(null)
    const result = await window.api.subscription.checkout({ items: selected, months, phone, payerName })
    setPaying(false)
    if (!result.ok) setPayError(result.error)
  }

  function toggle(key: string, checked: boolean): void {
    setSelected((prev) => (checked ? [...prev, key] : prev.filter((k) => k !== key)))
  }

  if (!info.canPayOnline) {
    return (
      <p className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
        {info.state === 'UNVERIFIED' || info.source === 'LOCAL'
          ? 'Connectez-vous à Internet pour gérer l’abonnement.'
          : 'Cet établissement n’est pas encore relié au site Pandora. Contactez Pandora pour activer votre abonnement.'}
      </p>
    )
  }

  return (
    <div className="space-y-6">
      {pending && (
        <div className="rounded-xl border border-accent-200 bg-accent-50 p-4 text-sm">
          {pending.status === 'APPLIQUE' ? (
            <p className="flex items-center gap-2 font-medium text-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> Paiement reçu : abonnement renouvelé. Merci !
            </p>
          ) : pending.status === 'ECHEC' || pending.status === 'ANNULE' ? (
            <p className="flex items-center gap-2 font-medium text-red-600">
              <XCircle className="h-4 w-4" /> Paiement {pending.status === 'ECHEC' ? 'échoué' : 'annulé'}. Vous pouvez réessayer.
            </p>
          ) : (
            <>
              <p className="flex items-center gap-2 font-medium text-accent-700">
                <Loader2 className="h-4 w-4 animate-spin" /> Paiement de {formatFcfa(pending.total)} en cours…
              </p>
              <p className="mt-1 text-xs text-gray-600">
                La page de paiement MoneyFusion s&apos;est ouverte dans votre navigateur. Une fois le paiement validé,
                l&apos;abonnement est mis à jour automatiquement ici.
              </p>
            </>
          )}
          {pending.error && pending.status !== 'APPLIQUE' && <p className="mt-1 text-xs text-red-600">{pending.error}</p>}
          <div className="mt-3 flex gap-2">
            {(pending.status === 'EN_ATTENTE' || pending.status === 'PAYE') && (
              <Button size="sm" variant="secondary" onClick={() => window.api.subscription.checkPending()}>
                <RefreshCw className="h-3.5 w-3.5" /> J&apos;ai payé, vérifier
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={() => window.api.subscription.dismissPending()}>
              Fermer
            </Button>
          </div>
        </div>
      )}

      {!isDirigeant ? (
        <p className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
          Seul le dirigeant de l&apos;établissement peut renouveler ou modifier l&apos;abonnement.
        </p>
      ) : catalogError ? (
        <p className="text-sm text-red-600">{catalogError}</p>
      ) : !catalog ? (
        <p className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement des offres…
        </p>
      ) : (
        <div className="space-y-5">
          <div>
            <h4 className="mb-2 text-sm font-semibold text-gray-900">Modules</h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {offers.map((offer) => (
                <div key={offer}>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">{offer}</p>
                  {catalog
                    .filter((i) => i.offer === offer)
                    .map((i) => (
                      <label key={i.key} className={'flex items-center gap-2 py-0.5 text-sm ' + (i.comingSoon ? 'text-gray-400' : 'text-gray-700')}>
                        <input
                          type="checkbox"
                          checked={selected.includes(i.key)}
                          disabled={i.mandatory || i.comingSoon}
                          onChange={(e) => toggle(i.key, e.target.checked)}
                        />
                        <span className="flex-1">{i.label}</span>
                        <span className="text-xs text-gray-400">
                          {i.comingSoon ? 'Bientôt' : `${i.price.toLocaleString('fr-FR')} F/mois`}
                        </span>
                      </label>
                    ))}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Durée</label>
              <select value={months} onChange={(e) => setMonths(Number(e.target.value))} className={inputClass}>
                {active && <option value={0}>Ajouter des modules seulement</option>}
                {Array.from({ length: 24 }, (_, n) => n + 1).map((n) => (
                  <option key={n} value={n}>
                    {n} mois
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Numéro Mobile Money</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07 00 00 00 00" className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Nom du payeur</label>
              <input value={payerName} onChange={(e) => setPayerName(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            {quoteError ? (
              <p className="text-sm text-red-600">{quoteError}</p>
            ) : !quote ? (
              <p className="text-sm text-gray-500">Calcul du montant…</p>
            ) : (
              <div className="space-y-1 text-sm text-gray-700">
                {quote.months > 0 && (
                  <p>
                    {formatFcfa(quote.monthly)} / mois × {quote.months} mois = {formatFcfa(quote.monthly * quote.months)}
                  </p>
                )}
                {quote.prorata.amount > 0 && (
                  <p>
                    Modules ajoutés ({quote.prorata.items.join(', ')}) jusqu&apos;à l&apos;échéance actuelle, {quote.prorata.days} j :{' '}
                    {formatFcfa(quote.prorata.amount)}
                  </p>
                )}
                <p className="pt-1 text-base font-semibold text-gray-900">
                  Total : {formatFcfa(quote.total)} {quoting && <Loader2 className="ml-1 inline h-3.5 w-3.5 animate-spin text-gray-400" />}
                </p>
                <p className="text-xs text-gray-500">Nouvelle échéance : {formatYmd(quote.newEndDate)}</p>
              </div>
            )}
          </div>

          {payError && <p className="text-sm text-red-600">{payError}</p>}
          <Button onClick={handlePay} disabled={paying || !quote || quoting || quote.total <= 0 || phone.trim().length < 8 || !payerName.trim()}>
            {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
            Payer
          </Button>
        </div>
      )}

      {payments.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold text-gray-900">Historique des paiements</h4>
          <table className="w-full text-left text-sm">
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-gray-100 last:border-0">
                  <td className="py-2 text-gray-500">{new Date(p.createdAt).toLocaleDateString('fr-FR')}</td>
                  <td className="py-2 text-gray-700">{p.months === 0 ? 'Ajout de modules' : `${p.months} mois`}</td>
                  <td className="py-2 font-medium text-gray-900">{formatFcfa(p.amount)}</td>
                  <td className="py-2 text-gray-500">{p.newEndDate ? `→ ${formatYmd(p.newEndDate)}` : ''}</td>
                  <td className="py-2 text-right">
                    <StatusBadge label={PAYMENT_LABEL[p.status].label} tone={PAYMENT_LABEL[p.status].tone} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
