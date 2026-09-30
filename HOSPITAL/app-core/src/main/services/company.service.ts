import { dialog } from 'electron'
import { readFileSync } from 'fs'
import { basename, extname } from 'path'
import { getCurrentToken } from './session.store'
import {
  deleteCompanyLogo,
  getCompany,
  getCompanyLogo,
  updateCompany,
  uploadCompanyLogo,
  listNotificationPreferences,
  updateNotificationPreference
} from './remote-api.client'
import type { UpdateCompanyInput, UpdateNotificationPreferenceInput } from '../../shared/company-types'

function requireToken(): string {
  const token = getCurrentToken()
  if (!token) {
    throw new Error('Non authentifié.')
  }
  return token
}

export function get() {
  return getCompany(requireToken())
}

export function update(input: UpdateCompanyInput) {
  return updateCompany(requireToken(), input)
}

export function listPreferences() {
  return listNotificationPreferences(requireToken())
}

export function updatePreference(id: string, input: UpdateNotificationPreferenceInput) {
  return updateNotificationPreference(requireToken(), id, input)
}

// --- Logo de l'établissement ----------------------------------------------------------------------

const LOGO_MIME_BY_EXTENSION: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp'
}

export function getLogo() {
  return getCompanyLogo(requireToken())
}

/** Choix du fichier par la boîte de dialogue native, puis envoi. `null` si l'utilisateur annule. */
export async function uploadLogo() {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: "Choisir le logo de l'établissement",
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }]
  })
  if (canceled || filePaths.length === 0) return null
  const filePath = filePaths[0]
  const mimeType = LOGO_MIME_BY_EXTENSION[extname(filePath).toLowerCase()]
  if (!mimeType) return { ok: false as const, error: 'Format non pris en charge (PNG, JPEG ou WebP).' }
  return uploadCompanyLogo(requireToken(), basename(filePath), mimeType, readFileSync(filePath))
}

export function removeLogo() {
  return deleteCompanyLogo(requireToken())
}
