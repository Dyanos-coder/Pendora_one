import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import { getPrismaClient } from '../db/client'

// Amorçage d'un serveur fraîchement déployé pour un nouvel hôpital (voir
// Plan-Installeur-Configurable.md §4.3) — décision explicite : pas de données de démonstration
// pour un vrai hôpital, juste de quoi se connecter une première fois. `seed.ts` reste inchangé
// pour les environnements de démo, peuplé à la main quand besoin — ce bootstrap-ci est ce qui
// tourne réellement en production, automatiquement, sans étape manuelle à oublier.

export const DEFAULT_ADMIN_EMAIL = 'admin@pandorahealth.local'
export const DEFAULT_ADMIN_PASSWORD = 'ChangeMoi1234'

/** Appelée une fois au démarrage du serveur (voir index.ts) — n'agit que si la base est
 * complètement vide (aucune Company), donc sans risque de re-créer un compte par-dessus une
 * instance déjà configurée. */
export async function bootstrapIfEmpty(): Promise<void> {
  const prisma = getPrismaClient()
  const existingCompany = await prisma.company.findFirst()
  if (existingCompany) return

  const company = await prisma.company.create({
    data: { id: randomUUID(), name: 'Nouvel établissement' }
  })

  await prisma.user.create({
    data: {
      id: randomUUID(),
      email: DEFAULT_ADMIN_EMAIL,
      passwordHash: bcrypt.hashSync(DEFAULT_ADMIN_PASSWORD, 10),
      name: 'Administrateur',
      role: 'DIRIGEANT'
    }
  })

  console.log(
    `[bootstrap] Base vide — compte DIRIGEANT par défaut créé (${DEFAULT_ADMIN_EMAIL} / ${DEFAULT_ADMIN_PASSWORD}) ` +
      `pour "${company.name}". À changer dès la première connexion (email + mot de passe, voir Paramètres).`
  )
}
