import { app } from 'electron'
import { hostname } from 'os'
import { getStoredDevice } from './app-config.service'

// Appels au site Pandora pour l'activation des postes (Plan-Code-Activation.md). Une erreur réseau
// (site injoignable) n'est JAMAIS confondue avec un refus explicite du site : seul un refus
// (« code invalide », « poste révoqué ») peut faire redemander un code.

/** Adresse du site avant toute activation (ensuite : celle enregistrée avec le poste). Modifiable
 * pour les tests avec PANDORA_SITE_URL. */
const DEFAULT_SITE_URL = 'https://pendorageneralweb-1qkl.vercel.app'
const TIMEOUT_MS = 20 * 1000

export function siteUrl(): string {
  return (process.env['PANDORA_SITE_URL'] || getStoredDevice()?.siteUrl || DEFAULT_SITE_URL).replace(/\/+$/, '')
}

export function deviceName(): string {
  return hostname() || 'Poste'
}

export interface SiteDbAccess {
  host: string
  port: number
  database: string
  user: string
  password: string
  ssl: boolean
}

export type SiteResult<T> =
  | { kind: 'ok'; data: T }
  /** Refus explicite du site (code invalide, poste révoqué, base injoignable côté site…). */
  | { kind: 'refused'; status: number; reason: string; message: string }
  /** Site injoignable : on garde ce qu'on a. */
  | { kind: 'network'; message: string }

export async function postToSite<T>(path: string, body: unknown, token?: string): Promise<SiteResult<T>> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  let response: Response
  try {
    response = await fetch(`${siteUrl()}${path}`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body)
    })
  } catch {
    return { kind: 'network', message: 'Site Pandora injoignable : vérifiez la connexion Internet.' }
  } finally {
    clearTimeout(timeout)
  }
  const json = (await response.json().catch(() => null)) as ({ ok?: boolean; reason?: string; error?: string } & T) | null
  if (response.ok && json?.ok) return { kind: 'ok', data: json }
  if (!json || (response.status >= 500 && !json.reason)) {
    return { kind: 'network', message: `Site Pandora indisponible (${response.status}). Réessayez dans un instant.` }
  }
  return { kind: 'refused', status: response.status, reason: json.reason ?? 'ERROR', message: json.error ?? 'Demande refusée par le site Pandora.' }
}

export interface ActivationResponse {
  hospital: { id: string; name: string }
  deviceToken: string
  db: SiteDbAccess
}

export function requestActivation(code: string): Promise<SiteResult<ActivationResponse>> {
  return postToSite('/api/public/activate', { code, deviceName: deviceName(), appVersion: app.getVersion() })
}

export interface CredentialsResponse {
  hospital: { id: string; name: string }
  db: SiteDbAccess
}

export function requestCredentials(token: string): Promise<SiteResult<CredentialsResponse>> {
  return postToSite('/api/public/device/credentials', { appVersion: app.getVersion() }, token)
}
