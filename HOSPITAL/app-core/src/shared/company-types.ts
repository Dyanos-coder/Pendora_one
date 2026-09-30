export interface ApiCompany {
  id: string
  name: string
  sector: string | null
  address: string | null
  phone: string | null
  contactEmail: string | null
  timezone: string | null
  enabledModules: string[] | null
  /** Position de référence (item 14 PETITES MODIFS) — sert à horodater/localiser la pointeuse
   * automatique du personnel. */
  latitude: number | null
  longitude: number | null
  /** Une clé API Gemini est enregistrée (la clé elle-même n'est jamais renvoyée). */
  aiApiKeyConfigured: boolean
  /** N° d'identification de l'établissement (RCCM, NIF…), repris sur les reçus de caisse. */
  registrationNumber: string | null
  /** Mention imprimée en bas de chaque reçu de caisse. */
  receiptFooter: string | null
  hasLogo: boolean
}

export interface ApiCompanyLogo {
  mimeType: string
  contentBase64: string
}

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
  aiApiKey?: string | null
  registrationNumber?: string | null
  receiptFooter?: string | null
}

export interface ApiNotificationPreference {
  id: string
  label: string
  email: boolean
}

export interface UpdateNotificationPreferenceInput {
  email?: boolean
}
