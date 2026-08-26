// Types partagés entre main, preload et renderer pour l'authentification / RBAC.
// Aucune dépendance à Prisma ici : le renderer ne doit jamais voir les types générés
// par Prisma (client.ts n'est accessible que depuis le process main).
//
// Pas de notion de tenant/membership : une instance de l'app (app-server + sa base MySQL) sert
// une seule entreprise, donc un seul rôle par utilisateur et une seule entreprise par session.

export type Role = 'DIRIGEANT' | 'EMPLOYE'

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

export type LoginResult = { ok: true; session: Session } | { ok: false; error: string }
