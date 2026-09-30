// La matrice des droits vit dans src/shared/permissions.ts : l'interface s'en sert aussi (menu
// filtré selon le rôle). Réexportée ici pour le backend embarqué.
export { DOMAIN_PERMISSIONS, hasAccess, accessLevel } from '../../../shared/permissions'
export type { AccessLevel, Domain } from '../../../shared/permissions'
