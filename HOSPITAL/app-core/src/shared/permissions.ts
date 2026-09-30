import type { Role } from './auth-types'

// Matrice des droits par domaine et par rôle — source de vérité unique, partagée entre le backend
// embarqué (requireAccess, src/main/server/middleware/auth.middleware.ts) et l'interface (menu
// filtré selon le rôle, AppShell.tsx). Reflète le tableau de référence de
// HOSPITAL/Audit-Fonctionnalites-Manquantes.md §2 et Plan-Module-Caisse.md étape 2.

// Niveaux d'accès du plus faible au plus fort : "write" couvre création + modification, "full"
// ajoute la suppression et les actions d'administration (ex. créer une caisse, rembourser).
export type AccessLevel = 'none' | 'read' | 'write' | 'full'

const LEVEL_RANK: Record<AccessLevel, number> = { none: 0, read: 1, write: 2, full: 3 }

export function hasAccess(granted: AccessLevel, required: AccessLevel): boolean {
  return LEVEL_RANK[granted] >= LEVEL_RANK[required]
}

export type Domain =
  | 'dashboard'
  | 'employees'
  | 'patients'
  | 'appointments'
  | 'consultations'
  | 'hospitalizations'
  | 'emergencies'
  | 'operating-room'
  | 'laboratory'
  | 'imaging'
  | 'cardiology'
  | 'pathology'
  | 'endoscopy'
  | 'pharmacy'
  | 'stocks'
  | 'blood-bank'
  | 'cashier'
  | 'finance'
  | 'procurement'
  | 'hr'
  | 'quality'
  | 'risks'
  | 'audit-compliance'
  | 'documents'
  | 'ai'
  | 'reports'
  | 'automation'
  | 'users'
  | 'settings'

export const DOMAIN_PERMISSIONS: Record<Domain, Record<Role, AccessLevel>> = {
  dashboard: { DIRIGEANT: 'full', MEDECIN: 'read', INFIRMIER: 'read', TECHNICIEN: 'read', PHARMACIEN: 'read', ADMINISTRATIF: 'read', CAISSIER: 'none' },
  employees: { DIRIGEANT: 'full', MEDECIN: 'read', INFIRMIER: 'read', TECHNICIEN: 'read', PHARMACIEN: 'read', ADMINISTRATIF: 'read', CAISSIER: 'none' },
  // CAISSIER : lecture seule ; la création rapide d'un patient passe par la route dédiée de la
  // caisse (POST /cashier/patients, gardée par `cashier: write`), pas par ce domaine.
  patients: { DIRIGEANT: 'full', MEDECIN: 'write', INFIRMIER: 'write', TECHNICIEN: 'read', PHARMACIEN: 'read', ADMINISTRATIF: 'write', CAISSIER: 'read' },
  appointments: { DIRIGEANT: 'full', MEDECIN: 'write', INFIRMIER: 'read', TECHNICIEN: 'none', PHARMACIEN: 'none', ADMINISTRATIF: 'write', CAISSIER: 'none' },
  consultations: { DIRIGEANT: 'full', MEDECIN: 'write', INFIRMIER: 'read', TECHNICIEN: 'none', PHARMACIEN: 'read', ADMINISTRATIF: 'read', CAISSIER: 'none' },
  hospitalizations: { DIRIGEANT: 'full', MEDECIN: 'write', INFIRMIER: 'write', TECHNICIEN: 'none', PHARMACIEN: 'none', ADMINISTRATIF: 'read', CAISSIER: 'none' },
  emergencies: { DIRIGEANT: 'full', MEDECIN: 'write', INFIRMIER: 'write', TECHNICIEN: 'none', PHARMACIEN: 'none', ADMINISTRATIF: 'none', CAISSIER: 'none' },
  'operating-room': { DIRIGEANT: 'full', MEDECIN: 'write', INFIRMIER: 'read', TECHNICIEN: 'none', PHARMACIEN: 'none', ADMINISTRATIF: 'none', CAISSIER: 'none' },
  laboratory: { DIRIGEANT: 'full', MEDECIN: 'write', INFIRMIER: 'write', TECHNICIEN: 'write', PHARMACIEN: 'none', ADMINISTRATIF: 'none', CAISSIER: 'none' },
  imaging: { DIRIGEANT: 'full', MEDECIN: 'write', INFIRMIER: 'read', TECHNICIEN: 'write', PHARMACIEN: 'none', ADMINISTRATIF: 'none', CAISSIER: 'none' },
  cardiology: { DIRIGEANT: 'full', MEDECIN: 'write', INFIRMIER: 'read', TECHNICIEN: 'write', PHARMACIEN: 'none', ADMINISTRATIF: 'none', CAISSIER: 'none' },
  pathology: { DIRIGEANT: 'full', MEDECIN: 'write', INFIRMIER: 'read', TECHNICIEN: 'write', PHARMACIEN: 'none', ADMINISTRATIF: 'none', CAISSIER: 'none' },
  endoscopy: { DIRIGEANT: 'full', MEDECIN: 'write', INFIRMIER: 'read', TECHNICIEN: 'write', PHARMACIEN: 'none', ADMINISTRATIF: 'none', CAISSIER: 'none' },
  pharmacy: { DIRIGEANT: 'full', MEDECIN: 'read', INFIRMIER: 'read', TECHNICIEN: 'none', PHARMACIEN: 'full', ADMINISTRATIF: 'none', CAISSIER: 'none' },
  stocks: { DIRIGEANT: 'full', MEDECIN: 'none', INFIRMIER: 'none', TECHNICIEN: 'read', PHARMACIEN: 'write', ADMINISTRATIF: 'read', CAISSIER: 'none' },
  'blood-bank': { DIRIGEANT: 'full', MEDECIN: 'read', INFIRMIER: 'read', TECHNICIEN: 'write', PHARMACIEN: 'none', ADMINISTRATIF: 'none', CAISSIER: 'none' },
  // Caisse : le caissier encaisse (write) ; DIRIGEANT gère les caisses, le catalogue et les
  // remboursements (full) ; ADMINISTRATIF consulte les journaux (read).
  cashier: { DIRIGEANT: 'full', MEDECIN: 'none', INFIRMIER: 'none', TECHNICIEN: 'none', PHARMACIEN: 'none', ADMINISTRATIF: 'read', CAISSIER: 'write' },
  finance: { DIRIGEANT: 'full', MEDECIN: 'none', INFIRMIER: 'none', TECHNICIEN: 'none', PHARMACIEN: 'none', ADMINISTRATIF: 'write', CAISSIER: 'none' },
  procurement: { DIRIGEANT: 'full', MEDECIN: 'none', INFIRMIER: 'none', TECHNICIEN: 'none', PHARMACIEN: 'write', ADMINISTRATIF: 'write', CAISSIER: 'none' },
  hr: { DIRIGEANT: 'full', MEDECIN: 'none', INFIRMIER: 'none', TECHNICIEN: 'none', PHARMACIEN: 'none', ADMINISTRATIF: 'write', CAISSIER: 'none' },
  quality: { DIRIGEANT: 'full', MEDECIN: 'read', INFIRMIER: 'read', TECHNICIEN: 'read', PHARMACIEN: 'read', ADMINISTRATIF: 'write', CAISSIER: 'none' },
  risks: { DIRIGEANT: 'full', MEDECIN: 'write', INFIRMIER: 'write', TECHNICIEN: 'write', PHARMACIEN: 'write', ADMINISTRATIF: 'write', CAISSIER: 'none' },
  'audit-compliance': { DIRIGEANT: 'full', MEDECIN: 'read', INFIRMIER: 'none', TECHNICIEN: 'none', PHARMACIEN: 'none', ADMINISTRATIF: 'write', CAISSIER: 'none' },
  documents: { DIRIGEANT: 'full', MEDECIN: 'read', INFIRMIER: 'read', TECHNICIEN: 'read', PHARMACIEN: 'read', ADMINISTRATIF: 'write', CAISSIER: 'none' },
  ai: { DIRIGEANT: 'full', MEDECIN: 'read', INFIRMIER: 'none', TECHNICIEN: 'none', PHARMACIEN: 'none', ADMINISTRATIF: 'read', CAISSIER: 'none' },
  reports: { DIRIGEANT: 'full', MEDECIN: 'read', INFIRMIER: 'none', TECHNICIEN: 'none', PHARMACIEN: 'none', ADMINISTRATIF: 'write', CAISSIER: 'none' },
  automation: { DIRIGEANT: 'full', MEDECIN: 'none', INFIRMIER: 'none', TECHNICIEN: 'none', PHARMACIEN: 'none', ADMINISTRATIF: 'read', CAISSIER: 'none' },
  // Gestion des comptes/rôles — écriture réservée au DIRIGEANT, ADMINISTRATIF consulte seulement.
  // Le changement de son propre mot de passe est une route à part, ouverte à tous (users.routes.ts).
  users: { DIRIGEANT: 'full', MEDECIN: 'none', INFIRMIER: 'none', TECHNICIEN: 'none', PHARMACIEN: 'none', ADMINISTRATIF: 'read', CAISSIER: 'none' },
  // Établissement + Notifications (Paramètres) : lecture ouverte à tous (écran que tous les rôles
  // ouvrent, ne serait-ce que pour changer leur mot de passe), écriture DIRIGEANT/ADMINISTRATIF.
  settings: { DIRIGEANT: 'full', MEDECIN: 'read', INFIRMIER: 'read', TECHNICIEN: 'read', PHARMACIEN: 'read', ADMINISTRATIF: 'write', CAISSIER: 'read' }
}

export function accessLevel(role: Role, domain: Domain): AccessLevel {
  return DOMAIN_PERMISSIONS[domain][role] ?? 'none'
}
