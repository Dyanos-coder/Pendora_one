// Types partagés entre main, preload et renderer pour la gestion des comptes/rôles
// (Paramètres > Utilisateurs & rôles — réservé au DIRIGEANT côté serveur, voir permissions.ts).

import type { Role } from './auth-types'

export interface ApiUser {
  id: string
  email: string
  name: string
  role: Role
  isActive: boolean
  createdAt: string
}

export interface CreateUserInput {
  email: string
  password: string
  name: string
  role: Role
}

export interface UpdateUserInput {
  name?: string
  role?: Role
  isActive?: boolean
}
