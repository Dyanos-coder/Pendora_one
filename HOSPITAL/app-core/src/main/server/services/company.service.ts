import { getPrismaClient } from '../db/client'
import type { Company } from '../generated/prisma/client'

export interface UpdateCompanyInput {
  name?: string
  sector?: string | null
  address?: string | null
  phone?: string | null
  contactEmail?: string | null
  timezone?: string | null
  enabledModules?: string[] | null
  latitude?: number | null
  longitude?: number | null
  /** Chaîne vide ou null = supprimer la clé. */
  aiApiKey?: string | null
  registrationNumber?: string | null
  receiptFooter?: string | null
}

function toDisplay(c: Company) {
  let enabledModules: string[] | null = null
  if (c.enabledModules) {
    try {
      enabledModules = JSON.parse(c.enabledModules)
    } catch {
      enabledModules = null
    }
  }
  return {
    id: c.id,
    name: c.name,
    sector: c.sector,
    address: c.address,
    phone: c.phone,
    contactEmail: c.contactEmail,
    timezone: c.timezone,
    enabledModules,
    latitude: c.latitude,
    longitude: c.longitude,
    aiApiKeyConfigured: Boolean(c.aiApiKey),
    registrationNumber: c.registrationNumber,
    receiptFooter: c.receiptFooter,
    hasLogo: Boolean(c.logo && c.logoMimeType)
  }
}

export async function getCompany() {
  const prisma = getPrismaClient()
  const company = await prisma.company.findFirst()
  if (!company) {
    throw new Error("Aucun établissement configuré.")
  }
  return toDisplay(company)
}

export async function updateCompany(input: UpdateCompanyInput) {
  const prisma = getPrismaClient()
  const existing = await prisma.company.findFirst()
  if (!existing) {
    throw new Error("Aucun établissement configuré.")
  }

  const company = await prisma.company.update({
    where: { id: existing.id },
    data: {
      name: input.name,
      sector: input.sector === undefined ? undefined : input.sector,
      address: input.address === undefined ? undefined : input.address,
      phone: input.phone === undefined ? undefined : input.phone,
      contactEmail: input.contactEmail === undefined ? undefined : input.contactEmail,
      timezone: input.timezone === undefined ? undefined : input.timezone,
      enabledModules: input.enabledModules === undefined ? undefined : input.enabledModules ? JSON.stringify(input.enabledModules) : null,
      latitude: input.latitude === undefined ? undefined : input.latitude,
      longitude: input.longitude === undefined ? undefined : input.longitude,
      aiApiKey: input.aiApiKey === undefined ? undefined : input.aiApiKey?.trim() || null,
      registrationNumber: input.registrationNumber === undefined ? undefined : input.registrationNumber?.trim() || null,
      receiptFooter: input.receiptFooter === undefined ? undefined : input.receiptFooter?.trim() || null
    }
  })
  return toDisplay(company)
}

// --- Logo de l'établissement (Paramètres › Établissement, repris sur les reçus de caisse) ---------

export const LOGO_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp']

export async function getCompanyLogo() {
  const prisma = getPrismaClient()
  const company = await prisma.company.findFirst({ select: { logo: true, logoMimeType: true } })
  if (!company?.logo || !company.logoMimeType) return null
  return { mimeType: company.logoMimeType, contentBase64: Buffer.from(company.logo).toString('base64') }
}

export async function setCompanyLogo(file: { mimeType: string; content: Buffer } | null) {
  const prisma = getPrismaClient()
  const existing = await prisma.company.findFirst()
  if (!existing) {
    throw new Error("Aucun établissement configuré.")
  }
  const company = await prisma.company.update({
    where: { id: existing.id },
    data: file ? { logo: new Uint8Array(file.content), logoMimeType: file.mimeType } : { logo: null, logoMimeType: null }
  })
  return toDisplay(company)
}
