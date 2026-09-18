// Types partagés entre main, preload et renderer pour le module RH (utilisateurs & audit).
import type { Role } from './auth-types'

export interface ManagedUser {
  id: string
  email: string
  name: string
  role: Role
  isActive: boolean
  createdAt: string
}

export interface AuditLogEntry {
  id: string
  userId: string | null
  action: string
  entityType: string
  entityId: string | null
  createdAt: string
}

export interface ActivityListResult {
  items: AuditLogEntry[]
  total: number
  page: number
  pageSize: number
}

export type UsersApiResult<T> = { ok: true; data: T } | { ok: false; error: string }
