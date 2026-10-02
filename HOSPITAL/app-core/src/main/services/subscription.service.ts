import { app, BrowserWindow, shell } from 'electron'
import { createHmac, createPublicKey, verify } from 'crypto'
import { appendFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { getPrismaClient as getLocalPrisma } from '../db/client'
import { getPrismaClient as getRemotePrisma } from '../server/db/client'
import { hasDbConnectionConfig } from '../server/db/connection-config'
import { getStoredDbAccess, getStoredDevice, isDeviceRevoked, saveDevice } from './app-config.service'
import { deviceName } from './pandora-site.client'
import { onConnectivityChange } from './connectivity.service'
import { getDbStatus } from './embedded-backend.service'
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
  type SubscriptionPeriod,
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
/** Nouvel essai rapproché tant que l'abonnement n'a pas pu être lu (poste bloqué en attendant). */
const RETRY_UNVERIFIED_MS = 30 * 1000
const REMOTE_QUERY_TIMEOUT_MS = 10 * 1000
const SITE_TIMEOUT_MS = 20 * 1000
const POLL_FAST_MS = 5 * 1000
const POLL_SLOW_MS = 15 * 1000
const POLL_FAST_FOR_MS = 3 * 60 * 1000
const POLL_MAX_MS = 45 * 60 * 1000

/** Abonnement découpé en périodes successives (même format que pandora-web/src/lib/subscription-periods.ts) :
 * chaque période couvre du lendemain de la précédente jusqu'à `until` inclus — ex. mois d'essai avec
 * tous les modules, puis mois payés avec la sélection choisie. */
interface SubscriptionPayload {
  hospitalId: string
  periods: SubscriptionPeriod[]
  issuedAt: string
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
  periods: [],
  allowedModules: null,
  enforced: isEnforced(),
  blocked: false,
  source: null,
  canPayOnline: false,
  error: null,
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
    const raw = JSON.parse(signed.payload) as {
      hospitalId?: string
      issuedAt?: string
      periods?: SubscriptionPeriod[]
      // Ancien format, une seule période
      endDate?: string
      items?: string[]
      modules?: string[]
    }
    const periods = (raw.periods ?? (raw.endDate ? [{ until: raw.endDate, items: raw.items ?? [], modules: raw.modules ?? [] }] : []))
      .filter((p) => /^\d{4}-\d{2}-\d{2}$/.test(p.until))
      .sort((a, b) => a.until.localeCompare(b.until))
    if (raw.hospitalId !== hospitalId || periods.length === 0) return null
    return { hospitalId, periods, issuedAt: raw.issuedAt ?? '' }
  } catch {
    return null
  }
}

interface RemoteRead {
  signed: SignedSubscription | null
  serverNowMs: number
  linked: boolean
}

/** Dernière erreur de lecture de la base (affichée sur l'écran de blocage et journalisée). */
let lastRemoteError: string | null = null

function log(message: string): void {
  try {
    const dir = join(app.getPath('userData'), 'logs')
    mkdirSync(dir, { recursive: true })
    appendFileSync(join(dir, 'subscription.log'), `[${new Date().toISOString()}] ${message}
`)
  } catch {
    // Journal best-effort.
  }
}

function describeRemoteError(error: unknown): string {
  const e = error as { code?: string; message?: string }
  const text = `${e?.code ?? ''} ${e?.message ?? String(error)}`
  if (/ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ETIMEDOUT|EHOSTUNREACH|ECONNRESET|timeout|pool/i.test(text)) {
    return 'La base de données de l’établissement ne répond pas.'
  }
  return `Lecture de l’abonnement impossible : ${e?.message ?? String(error)}`
}

function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), REMOTE_QUERY_TIMEOUT_MS))
  ])
}

/** Base de l'établissement : abonnement, liaison au site et heure du serveur. null = lecture
 * impossible (la cause est dans `lastRemoteError`). On tente toujours la lecture plutôt que de se
 * fier à l'indicateur « base joignable », qui peut être en retard (démarrage, sonde lente). */
async function readRemote(): Promise<RemoteRead | null> {
  if (!hasDbConnectionConfig()) {
    lastRemoteError = 'Accès à la base de l’établissement non configurés.'
    return null
  }
  try {
    const prisma = getRemotePrisma()
    // Requêtes l'une après l'autre : une seule connexion (les hébergeurs mutualisés limitent le
    // nombre de connexions simultanées par utilisateur).
    const row = await withTimeout(prisma.subscription.findUnique({ where: { id: 'current' } }))
    const link = await withTimeout(prisma.pandoraLink.findUnique({ where: { id: 'current' } }))
    const clock = await withTimeout(prisma.$queryRawUnsafe<{ ts: unknown }[]>('SELECT UNIX_TIMESTAMP() AS ts'))
    lastRemoteError = null
    const serverNowMs = Math.round(Number(clock[0]?.ts) * 1000)
    return {
      signed: row ? { payload: row.payload, signature: row.signature } : null,
      serverNowMs: Number.isFinite(serverNowMs) && serverNowMs > 0 ? serverNowMs : Date.now(),
      linked: Boolean(link?.siteUrl && link.secret)
    }
  } catch (error) {
    // Table absente (base jamais migrée) : équivaut à « aucun abonnement ».
    if (/doesn't exist|does not exist|1146|P2021/.test(String((error as Error)?.message) + String((error as { code?: string })?.code))) {
      lastRemoteError = null
      return { signed: null, serverNowMs: Date.now(), linked: false }
    }
    lastRemoteError = describeRemoteError(error)
    log(`lecture de la base impossible : ${(error as Error)?.stack ?? String(error)}`)
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
  // Identifiant de l'hôpital sur le site (poste activé), à défaut l'utilisateur de la base.
  const hospitalId = getStoredDevice()?.hospitalId ?? getStoredDbAccess()?.user ?? ''
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

  const today = ymd(nowMs)
  const live = payload ? payload.periods.filter((p) => p.until >= today) : []
  const endDate = payload ? payload.periods[payload.periods.length - 1].until : null
  let state: SubscriptionState
  let daysLeft: number | null = null
  if (payload && endDate) {
    daysLeft = daysBetween(today, endDate)
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
    endDate,
    daysLeft,
    // Renouvellement proposé par défaut : la sélection de la dernière période.
    items: payload?.periods[payload.periods.length - 1].items ?? [],
    periods: live,
    // Modules ouverts : ceux de la période en cours.
    allowedModules: enforced ? [...new Set([...(valid ? (live[0]?.modules ?? []) : []), ...FREE_MODULES])] : null,
    enforced,
    blocked: enforced && !valid,
    source,
    canPayOnline: Boolean(remote?.linked),
    error: remote ? null : lastRemoteError,
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
        if (next.canPayOnline) void enrollDeviceIfNeeded()
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
  // Premier contrôle une fois la vérification de la base au démarrage terminée (accès, migrations) :
  // lancé trop tôt, il échouerait et bloquerait à tort un poste qui n'a pas encore de copie locale.
  void getDbStatus()
    .catch(() => undefined)
    .then(() => refreshSubscription())
  setInterval(() => void refreshSubscription(), CHECK_INTERVAL_MS)
  // Tant que l'abonnement n'a pas pu être lu, nouvel essai toutes les 30 s.
  setInterval(() => {
    if (info.state === 'UNVERIFIED' || info.state === 'UNKNOWN') void refreshSubscription()
  }, RETRY_UNVERIFIED_MS)
  onConnectivityChange((status) => {
    if (status === 'ONLINE') void refreshSubscription()
  })
}

// --- Appels au site Pandora -------------------------------------------------------------------

async function readLink(): Promise<{ siteUrl: string; secret: string; hospitalId: string }> {
  if (!hasDbConnectionConfig()) throw new Error('Connexion à la base requise pour gérer l’abonnement.')
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

// --- Postes installés avant les codes d'activation (Plan-Code-Activation.md §5, étape 10) --------

let enrolling = false

/** Un poste configuré à la main (sans jeton) s'inscrit lui-même auprès du site, authentifié par le
 * secret de liaison de sa base : il bénéficie ensuite de la récupération automatique des accès.
 * Jamais pour un poste révoqué (il doit saisir un nouveau code). */
async function enrollDeviceIfNeeded(): Promise<void> {
  if (enrolling || getStoredDevice() || isDeviceRevoked()) return
  enrolling = true
  try {
    const link = await readLink()
    const data = await siteCall<{ deviceToken: string; hospital: { id: string; name: string } }>('POST', '/api/public/device/enroll', {
      deviceName: deviceName(),
      appVersion: app.getVersion()
    })
    saveDevice({ token: data.deviceToken, hospitalId: data.hospital.id, hospitalName: data.hospital.name, siteUrl: link.siteUrl })
    log(`poste inscrit auprès du site Pandora (${data.hospital.name})`)
  } catch (error) {
    log(`inscription du poste impossible : ${(error as Error)?.message ?? String(error)}`)
  } finally {
    enrolling = false
  }
}
