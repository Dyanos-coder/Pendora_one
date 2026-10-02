// Abonnement Pandora (HOSPITAL/Plan-Site-Pandora.md §6) : lu dans la base de l'établissement
// (écrit et signé par le site Pandora), recopié dans la base locale du poste, payé via le site.

/** Modules toujours inclus, payés ou non (même liste que pandora-web/src/lib/offers.ts). */
export const FREE_MODULES = ['dashboard', 'settings', 'quality', 'risk-management', 'audit-compliance']

/** Bandeau de rappel quand il reste au plus ce nombre de jours. */
export const EXPIRY_WARNING_DAYS = 7

export type SubscriptionState =
  /** À jour. */
  | 'ACTIVE'
  /** À jour, mais échéance dans {@link EXPIRY_WARNING_DAYS} jours ou moins. */
  | 'EXPIRING'
  /** Échéance dépassée : fenêtre de renouvellement impossible à fermer. */
  | 'EXPIRED'
  /** Aucun abonnement enregistré pour cet établissement (jamais activé par Pandora). */
  | 'NONE'
  /** Abonnement présent mais signature incorrecte (modifié à la main) : traité comme expiré. */
  | 'INVALID'
  /** Hors connexion et aucune copie locale sur ce poste : impossible de vérifier (bloquant). */
  | 'UNVERIFIED'
  /** Pas encore contrôlé (démarrage) : rien n'est bloqué tant que le premier contrôle n'est pas fait. */
  | 'UNKNOWN'

/** Période d'abonnement : du lendemain de la précédente jusqu'à `until` inclus. */
export interface SubscriptionPeriod {
  until: string
  items: string[]
  modules: string[]
}

export interface SubscriptionInfo {
  state: SubscriptionState
  /** Dernier jour couvert, inclus (AAAA-MM-JJ). */
  endDate: string | null
  /** Jours restants jusqu'à l'échéance incluse (0 = dernier jour), null sans abonnement. */
  daysLeft: number | null
  /** Clés de la grille de la dernière période (proposées par défaut au renouvellement). */
  items: string[]
  /** Périodes en cours et à venir (la première est celle en cours). */
  periods: SubscriptionPeriod[]
  /** Modules autorisés (payés + gratuits) ; null = pas de restriction (contrôle désactivé). */
  allowedModules: string[] | null
  /** Contrôle appliqué (application installée) — en développement, l'état est affiché sans bloquer. */
  enforced: boolean
  /** D'où vient l'information : base de l'établissement ou copie locale du poste (hors connexion). */
  source: 'REMOTE' | 'LOCAL' | null
  /** Application bloquée (fenêtre de renouvellement) : contrôle appliqué et abonnement non valide. */
  blocked: boolean
  /** Paiement en ligne possible (établissement relié au site Pandora). */
  canPayOnline: boolean
  /** Cause de l'échec de lecture de la base (état « Non vérifié »), sinon null. */
  error: string | null
  checkedAt: string
}

export interface SubscriptionCatalogItem {
  key: string
  offer: string
  label: string
  price: number
  modules: string[]
  mandatory: boolean
  comingSoon: boolean
}

export interface SubscriptionQuote {
  items: { key: string; label: string; price: number }[]
  modules: string[]
  months: number
  monthly: number
  prorata: { amount: number; days: number; items: string[] }
  total: number
  previousEndDate: string | null
  newEndDate: string
  /** Découpage de l'abonnement après ce paiement. */
  periods: SubscriptionPeriod[]
}

export type SubscriptionPaymentStatus = 'EN_ATTENTE' | 'PAYE' | 'APPLIQUE' | 'ECHEC' | 'ANNULE'

export interface SubscriptionPayment {
  id: string
  status: SubscriptionPaymentStatus
  method: 'MONEYFUSION' | 'MANUEL'
  amount: number
  months: number
  newEndDate: string | null
  createdAt: string
}

export interface CheckoutInput {
  items: string[]
  months: number
  phone: string
  payerName: string
}

/** Paiement en cours de suivi (fenêtre MoneyFusion ouverte dans le navigateur). */
export interface PendingPayment {
  paymentId: string
  status: SubscriptionPaymentStatus
  total: number
  error: string | null
}

export type SubscriptionResult<T> = { ok: true; data: T } | { ok: false; error: string }
