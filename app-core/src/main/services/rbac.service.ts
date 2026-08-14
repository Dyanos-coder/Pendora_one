import type { Role } from '../../shared/auth-types'

// RBAC volontairement simple pour cette itération (2 rôles fixes, pas de matrice de
// permissions configurable — cf. plan Core it.1). À faire évoluer vers une table
// Permission dédiée quand les modules sectoriels arriveront.
export type Action = 'dashboard:view-full' | 'dashboard:view-limited' | 'settings:manage-users'

const PERMISSIONS_BY_ROLE: Record<Role, ReadonlySet<Action>> = {
  DIRIGEANT: new Set<Action>(['dashboard:view-full', 'dashboard:view-limited', 'settings:manage-users']),
  EMPLOYE: new Set<Action>(['dashboard:view-limited'])
}

export function can(role: Role, action: Action): boolean {
  return PERMISSIONS_BY_ROLE[role].has(action)
}
