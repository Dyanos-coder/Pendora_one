import { app, BrowserWindow, shell } from 'electron'
import { createHmac, createPublicKey, verify } from 'crypto'
import { getPrismaClient as getLocalPrisma } from '../db/client'
import { getPrismaClient as getRemotePrisma } from '../server/db/client'
import { hasDbConnectionConfig } from '../server/db/connection-config'
import { isDbReachable } from '../server/db/db-status'
import { getStoredDbAccess } from './app-config.service'
import { onConnectivityChange } from './connectivity.service'
import { getCurrentSession } from './session.store'
import {
  EXPIRY_WARNING_DAYS,
  FREE_MODULES,
  type CheckoutInput,
  type PendingPayment,
  type SubscriptionCatalogItem,
  type SubscriptionInfo,
  type SubscriptionPayment,
  type SubscriptionPaymentStatus,
  type SubscriptionQuote,
  type SubscriptionState
} from '../../shared/subscription-types'

// Abonnement Pandora (HOSPITAL/Plan-Site-Pandora.md §6) :
// - le site Pandora écrit l'abonnement dans la base de l'établissement (table `subscription`),
//   signé Ed25519 avec sa clé privée ; l'application vérifie la signature avec la clé publique
//   ci-dessous — un abonnement modifié à la main dans la base est donc refusé ;
// - chaque contrôle réussi recopie l'abonnement dans la base locale du poste (`local_subscription`),
//   pour continuer à le contrôler hors connexion ;
// - contre le recul de l'horloge du poste : l'heure de référence est celle du serveur de base de
//   données quand il répond, et hors connexion jamais moins que la date la plus récente déjà vue ;
// - le paiement passe par le site (MoneyFusion) : appels signés HMAC avec le secret de liaison de
//   la table `pandora_link`, la page de paiement s'ouvre dans le navigateur, puis on suit le paiement.

/** Clé publique Ed25519 de Pandora (SPKI DER, base64) — pendant de SUBSCRIPTION_PRIVATE_KEY du site. */
const PANDORA_PUBLIC_KEY = 'MCowBQYDK2VwAyEAEUAXrzLoiJOFTCQwUXgpASxz9tkp3Upom3kpBrx+DWA='

const CHECK_INTERVAL_MS = 15 * 60 * 1000
const SITE_TIMEOUT_MS = 20 * 1000
const POLL_FAST_MS = 5 * 1000
const POLL_SLOW_MS = 15 * 1000
const POLL_FAST_FOR_MS = 3 * 60 * 1000
const POLL_MAX_MS = 45 * 60 * 1000

interface SubscriptionPayload {
  v: number
  hospitalId: string
  modules: string[]
  items: string[]
  endDate: string
  issuedAt: string
  paymentId: string | null
}

interface SignedSubscription {
  payload: string
  signature: string
}

const publicKey = createPublicKey({ key: Buffer.from(PANDORA_PUBLIC_KEY, 'base64'), format: 'der', type: 'spki' })

/** Contrôle appliqué sur l'application installée ; en développement, seulement sur demande. */
function isEnforced(): boolean {
  return app.isPackaged || process.env['PANDORA_ENFORCE_SUBSCRIPTION'] === '1'
}

let info: SubscriptionInfo = {
  state: 'UNKNOWN',
  endDate: null,
  daysLeft: null,
  items: [],
  allowedModules: null,
  enforced: isEnforced(),
  blocked: false,
  source: null,
  canPayOnline: false,
  checkedAt: ''
}
/** Écart entre l'heure du serveur de base et celle du poste (ms), pour signer les appels au site. */
let clockOffsetMs = 0
let refreshing: Promise<SubscriptionInfo> | null = null
let started = false
let pending: PendingPayment | null = null
let pollTimer: ReturnType<typeof setTimeout> | null = null

function broadcast(channel: string, value: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) win.webContents.send(channel, value)
}

function ymd(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

function daysBetween(fromYmd: string, toYmd: string): number {
  return Math.round((Date.parse(`${toYmd}T00:00:00Z`) - Date.parse(`${fromYmd}T00:00:00Z`)) / 86400000)
}

/** Payload signé par Pandora ET destiné à cet établissement (identifiant = utilisateur de sa base). */
function verifySigned(signed: SignedSubscription | null, hospitalId: string): SubscriptionPayload | null {
  if (!signed) return null
  try {
    if (!verify(null, Buffer.from(signed.payload, 'utf8'), publicKey, Buffer.from(signed.signature, 'base64'))) return null
    const payload = JSON.parse(signed.payload) as SubscriptionPayload
    if (payload.hospitalId !== hospitalId || !/^\d{4}-\d{2}-\d{2}$/.test(payload.endDate)) return null
    return payload
  } catch {
    return null
  }
}

interface RemoteRead {
  signed: SignedSubscription | null
  serverNowMs: number
  linked: boolean
}

/** Base de l'établissement : abonnement, liaison au site et heure du serveur. null = injoignable. */
async function readRemote(): Promise<RemoteRead | null> {
  if (!hasDbConnectionConfig() || !isDbReachable()) return null
  try {
    const prisma = getRemotePrisma()
    const [row, link, clock] = await Promise.all([
      prisma.subscription.findUnique({ where: { id: 'current' } }),
      prisma.pandoraLink.findUnique({ where: { id: 'current' } }),
      prisma.$queryRawUnsafe<{ ts: unknown }[]>('SELECT UNIX_TIMESTAMP() AS ts')
    ])
    const serverNowMs = Math.round(Number(clock[0]?.ts) * 1000)
    return {
      signed: row ? { payload: row.payload, signature: row.signature } : null,
      serverNowMs: Number.isFinite(serverNowMs) && serverNowMs > 0 ? serverNowMs : Date.now(),
      linked: Boolean(link?.siteUrl && link.secret)
    }
  } catch (error) {
    // Table absente (base jamais migrée) : équivaut à « aucun abonnement ».
    if (/doesn't exist|does not exist|1146|P2021/.test(String((error as Error)?.message) + String((error as { code?: string })?.code))) {
      return { signed: null, serverNowMs: Date.now(), linked: false }
    }
    return null
  }
}

async function readLocal(): Promise<{ signed: SignedSubscription | null; maxSeenAt: number } | null> {
  try {
    const row = await getLocalPrisma().localSubscription.findUnique({ where: { id: 'current' } })
    if (!row) return null
    return { signed: row.payload ? { payload: row.payload, signature: row.signature } : null, maxSeenAt: row.maxSeenAt.getTime() }
  } catch (error) {
    console.error('[subscription] lecture de la copie locale impossible', error)
    return null
  }
}

async function writeLocal(signed: SignedSubscription | null, maxSeenAt: number): Promise<void> {
  const data = { payload: signed?.payload ?? '', signature: signed?.signature ?? '', maxSeenAt: new Date(maxSeenAt) }
  try {
    await getLocalPrisma().localSubscription.upsert({ where: { id: 'current' }, create: { id: 'current', ...data }, update: data })
  } catch (error) {
    console.error('[subscription] écriture de la copie locale impossible', error)
  }
}

async function computeInfo(): Promise<SubscriptionInfo> {
  const hospitalId = getStoredDbAccess()?.user ?? ''
  const [remote, local] = await Promise.all([readRemote(), readLocal()])

  // Heure de référence : serveur de base si joignable (le poste peut avoir une horloge fausse),
  // sinon jamais moins que la plus récente déjà vue sur ce poste.
  let nowMs: number
  if (remote) {
    nowMs = remote.serverNowMs
    clockOffsetMs = remote.serverNowMs - Date.now()
  } else {
    nowMs = Math.max(Date.now(), local?.maxSeenAt ?? 0)
  }

  const remotePayload = verifySigned(remote?.signed ?? null, hospitalId)
  const localPayload = verifySigned(local?.signed ?? null, hospitalId)
  // Deux copies valides (ex. base restaurée depuis une ancienne sauvegarde) : la plus récente
  // décision de Pandora l'emporte.
  let payload: SubscriptionPayload | null = remotePayload
  let chosenSigned = remote?.signed ?? null
  let source: SubscriptionInfo['source'] = remotePayload ? 'REMOTE' : null
  if (localPayload && (!payload || localPayload.issuedAt > payload.issuedAt)) {
    payload = localPayload
    chosenSigned = local!.signed
    source = 'LOCAL'
  }

  if (remote || payload) await writeLocal(payload ? chosenSigned : null, remote ? nowMs : Math.max(nowMs, Date.now()))

  let state: SubscriptionState
  let daysLeft: number | null = null
  if (payload) {
    daysLeft = daysBetween(ymd(nowMs), payload.endDate)
    state = daysLeft < 0 ? 'EXPIRED' : daysLeft <= EXPIRY_WARNING_DAYS ? 'EXPIRING' : 'ACTIVE'
  } else if (remote?.signed) {
    state = 'INVALID'
  } else if (remote) {
    state = 'NONE'
  } else {
    state = 'UNVERIFIED'
  }

  const enforced = isEnforced()
  const valid = state === 'ACTIVE' || state === 'EXPIRING'
  return {
    state,
    endDate: payload?.endDate ?? null,
    daysLeft,
    items: payload?.items ?? [],
    allowedModules: enforced ? [...new Set([...(valid ? payload!.modules : []), ...FREE_MODULES])] : null,
    enforced,
    blocked: enforced && !valid,
    source,
    canPayOnline: Boolean(remote?.linked),
    checkedAt: new Date().toISOString()
  }
}

/** Nouveau contrôle (au démarrage, périodiquement, au retour de la connexion, après un paiement). */
export function refreshSubscription(): Promise<SubscriptionInfo> {
  if (!refreshing) {
    refreshing = computeInfo()
      .then((next) => {
        info = next
        broadcast('subscription:status', info)
        return info
      })
      .catch((error) => {
        console.error('[subscription] contrôle impossible', error)
        return info
      })
      .finally(() => {
        refreshing = null
      })
  }
  return refreshing
}

export function getSubscriptionInfo(): SubscriptionInfo {
  return info
}

/** À appeler une fois, après le démarrage du backend embarqué. */
export function startSubscriptionMonitor(): void {
  if (started) return
  started = true
  void refreshSubscription()
  setInterval(() => void refreshSubscription(), CHECK_INTERVAL_MS)
  onConnectivityChange((status) => {
    if (status === 'ONLINE') void refreshSubscription()
  })
}

// --- Appels au site Pandora -------------------------------------------------------------------

async function readLink(): Promise<{ siteUrl: string; secret: string; hospitalId: string }> {
  if (!hasDbConnectionConfig() || !isDbReachable()) throw new Error('Connexion à la base requise pour gérer l’abonnement.')
  const link = await getRemotePrisma()
    .pandoraLink.findUnique({ where: { id: 'current' } })
    .catch(() => null)
  if (!link?.siteUrl || !link.secret) {
    throw new Error('Établissement pas encore relié au site Pandora : contactez Pandora pour activer votre abonnement.')
  }
  return { siteUrl: link.siteUrl.replace(/\/+$/, ''), secret: link.secret, hospitalId: link.hospitalId }
}

async function siteCall<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  const link = await readLink()
  const url = new URL(`${link.siteUrl}${path}`)
  const text = body === undefined ? '' : JSON.stringify(body)
  const timestamp = String(Date.now() + clockOffsetMs)
  const signature = createHmac('sha256', link.secret).update(`${timestamp}.${method}.${url.pathname}.${text}`).digest('hex')
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), SITE_TIMEOUT_MS)
  let response: Response
  try {
    response = await fetch(url, {
      method,
      body: text || undefined,
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        'x-pandora-hospital': link.hospitalId,
        'x-pandora-timestamp': timestamp,
        'x-pandora-signature': signature
      }
    })
  } catch {
    throw new Error('Site Pandora injoignable : vérifiez la connexion Internet.')
  } finally {
    clearTimeout(timeout)
  }
  const json = (await response.json().catch(() => null)) as ({ ok: boolean; error?: string } & T) | null
  if (response.status === 401) throw new Error("Le site Pandora a refusé la demande (liaison invalide ou horloge du poste incorrecte).")
  if (!json?.ok) throw new Error(json?.error ?? `Réponse inattendue du site Pandora (${response.status}).`)
  return json
}

export async function getCatalog(): Promise<SubscriptionCatalogItem[]> {
  const data = await siteCall<{ catalog: SubscriptionCatalogItem[] }>('GET', '/api/public/subscription')
  return data.catalog
}

export async function getQuote(items: string[], months: number): Promise<SubscriptionQuote> {
  const data = await siteCall<{ quote: SubscriptionQuote }>('POST', '/api/public/subscription/quote', { items, months })
  return data.quote
}

export async function listPayments(): Promise<SubscriptionPayment[]> {
  const data = await siteCall<{ payments: SubscriptionPayment[] }>('GET', '/api/public/subscription/payments')
  return data.payments
}

function requireDirigeant(): void {
  if (getCurrentSession()?.user.role !== 'DIRIGEANT') throw new Error("Seul le dirigeant de l'établissement peut payer l'abonnement.")
}

/** Lance le paiement MoneyFusion : le site recalcule le montant, la page de paiement s'ouvre dans
 * le navigateur, puis le paiement est suivi jusqu'à son application. */
export async function startCheckout(input: CheckoutInput): Promise<PendingPayment> {
  requireDirigeant()
  const data = await siteCall<{ paymentId: string; url: string; total: number }>('POST', '/api/public/subscription/checkout', input)
  pending = { paymentId: data.paymentId, status: 'EN_ATTENTE', total: data.total, error: null }
  broadcast('subscription:payment', pending)
  await shell.openExternal(data.url)
  schedulePoll(Date.now())
  return pending
}

export function getPendingPayment(): PendingPayment | null {
  return pending
}

/** Vérifie tout de suite le paiement en cours (bouton « J'ai payé »). */
export async function checkPendingPayment(): Promise<PendingPayment | null> {
  if (!pending) return null
  await pollOnce()
  return pending
}

async function pollOnce(): Promise<boolean> {
  if (!pending) return true
  try {
    const data = await siteCall<{ payment: { status: SubscriptionPaymentStatus; error: string | null } }>(
      'GET',
      `/api/public/subscription/payments/${encodeURIComponent(pending.paymentId)}`
    )
    pending = { ...pending, status: data.payment.status, error: data.payment.error }
  } catch (error) {
    pending = { ...pending, error: (error as Error).message }
  }
  broadcast('subscription:payment', pending)
  if (pending.status === 'APPLIQUE') {
    await refreshSubscription()
    return true
  }
  return pending.status === 'ECHEC' || pending.status === 'ANNULE'
}

function schedulePoll(startedAt: number): void {
  if (pollTimer) clearTimeout(pollTimer)
  const elapsed = Date.now() - startedAt
  if (elapsed > POLL_MAX_MS) return
  pollTimer = setTimeout(
    async () => {
      pollTimer = null
      if (!(await pollOnce())) schedulePoll(startedAt)
    },
    elapsed < POLL_FAST_FOR_MS ? POLL_FAST_MS : POLL_SLOW_MS
  )
}

export function dismissPendingPayment(): void {
  if (pollTimer) clearTimeout(pollTimer)
  pollTimer = null
  pending = null
  broadcast('subscription:payment', null)
}
