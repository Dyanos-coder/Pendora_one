import { getPrismaClient } from '../db/client'

const DEFAULTS = [
  { id: 'critical_alerts', label: 'Alertes critiques (résultats, stocks, sécurité)', email: true },
  { id: 'appointment_reminders', label: 'Rappels de rendez-vous', email: true },
  { id: 'contract_deadlines', label: "Échéances de contrats et d'audits", email: true },
  { id: 'daily_reports', label: 'Rapports quotidiens automatiques', email: true }
]

export async function listNotificationPreferences() {
  const prisma = getPrismaClient()
  const existing = await prisma.notificationPreference.findMany({ orderBy: { id: 'asc' } })
  if (existing.length === 0) {
    // Amorçage paresseux à la première lecture — évite de dépendre d'un script de seed séparé.
    await prisma.notificationPreference.createMany({ data: DEFAULTS })
    return DEFAULTS.map(({ id, label, email }) => ({ id, label, email }))
  }
  return existing.map((p) => ({ id: p.id, label: p.label, email: p.email }))
}

export interface UpdateNotificationPreferenceInput {
  email?: boolean
}

export async function updateNotificationPreference(id: string, input: UpdateNotificationPreferenceInput) {
  const prisma = getPrismaClient()
  const pref = await prisma.notificationPreference.update({ where: { id }, data: { email: input.email } })
  return { id: pref.id, label: pref.label, email: pref.email }
}
