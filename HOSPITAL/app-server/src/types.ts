// Miroir de app-core/src/shared/auth-types.ts — dupliqué volontairement (pas de package
// partagé entre les deux projets pour l'instant, cohérent avec la simplicité adoptée
// jusqu'ici). Garder ces deux fichiers synchronisés manuellement si la forme évolue.
//
// Pas de notion de tenant/membership ici : une instance app-server = une entreprise, donc un
// seul rôle par utilisateur et une seule "Company" par base.

export type Role = 'DIRIGEANT' | 'MEDECIN' | 'INFIRMIER' | 'TECHNICIEN' | 'PHARMACIEN' | 'ADMINISTRATIF'

export interface CompanyInfo {
  name: string
  sector: string | null
}

export interface SessionUser {
  id: string
  email: string
  name: string
  role: Role
}

export interface Session {
  user: SessionUser
  company: CompanyInfo
}

export type LoginResult = { ok: true; session: Session; token: string } | { ok: false; error: string }

/** Contenu du JWT signé au login — voir middleware/auth.middleware.ts pour la vérification.
 * sessionVersion permet de révoquer un jeton à la demande (déconnexion serveur, suspicion de
 * vol...) sans attendre son expiration naturelle (30 jours, volontairement longue pour la
 * reconnexion hors-ligne — voir auth/jwt.ts) : comparé à User.sessionVersion à chaque requête. */
export interface AuthTokenPayload {
  userId: string
  role: Role
  sessionVersion: number
}
