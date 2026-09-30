// Types partagés entre main, preload et renderer pour la gestion des comptes/rôles
// (Paramètres > Utilisateurs & rôles — réservé au DIRIGEANT côté serveur, voir permissions.ts).

import type { Role } from './auth-types'

export interface ApiUser {
  id: string
  email: string
  name: string
  role: Role
  isActive: boolean
  /** Fiche employé rattachée à ce compte, s'il y en a une — voir CreateUserInput.employeeId. */
  employeeId: string | null
  createdAt: string
}

export interface CreateUserInput {
  email: string
  password: string
  name: string
  role: Role
  /** Fiche employé (`Employee.id`) à rattacher à ce compte, optionnel — nécessaire pour qu'un
   * médecin soit restreint à ses propres rendez-vous (voir AppointmentFormModal.tsx). Doit être
   * une fiche pas encore liée à un autre compte. */
  employeeId?: string
}

export interface UpdateUserInput {
  name?: string
  email?: string
  role?: Role
  isActive?: boolean
}
