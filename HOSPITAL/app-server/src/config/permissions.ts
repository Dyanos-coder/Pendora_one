import type { Role } from '../types'

// Niveaux d'accès par domaine, du plus faible au plus fort. "write" couvre create+update ;
// "full" est réservé aux actions de suppression une fois qu'elles existeront (voir
// HOSPITAL/Audit-Fonctionnalites-Manquantes.md item 6) — DIRIGEANT est déjà "full" partout pour
// ne pas avoir à retoucher cette matrice quand le CRUD Delete arrivera.
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

// Matrice de permissions par domaine et par rôle — reflète le tableau de référence et ses notes
// de conception dans HOSPITAL/Audit-Fonctionnalites-Manquantes.md §2 (proposition validée par
// l'utilisateur, à ajuster ici si les besoins métier évoluent).
export const DOMAIN_PERMISSIONS: Record<Domain, Record<Role, AccessLevel>> = {
  dashboard: { DIRIGEANT: 'full', MEDECIN: 'read', INFIRMIER: 'read', TECHNICIEN: 'read', PHARMACIEN: 'read', ADMINISTRATIF: 'read' },
  employees: { DIRIGEANT: 'full', MEDECIN: 'read', INFIRMIER: 'read', TECHNICIEN: 'read', PHARMACIEN: 'read', ADMINISTRATIF: 'read' },
  patients: { DIRIGEANT: 'full', MEDECIN: 'write', INFIRMIER: 'write', TECHNICIEN: 'read', PHARMACIEN: 'read', ADMINISTRATIF: 'write' },
  appointments: { DIRIGEANT: 'full', MEDECIN: 'write', INFIRMIER: 'read', TECHNICIEN: 'none', PHARMACIEN: 'none', ADMINISTRATIF: 'write' },
  consultations: { DIRIGEANT: 'full', MEDECIN: 'write', INFIRMIER: 'read', TECHNICIEN: 'none', PHARMACIEN: 'read', ADMINISTRATIF: 'read' },
  hospitalizations: { DIRIGEANT: 'full', MEDECIN: 'write', INFIRMIER: 'write', TECHNICIEN: 'none', PHARMACIEN: 'none', ADMINISTRATIF: 'read' },
  emergencies: { DIRIGEANT: 'full', MEDECIN: 'write', INFIRMIER: 'write', TECHNICIEN: 'none', PHARMACIEN: 'none', ADMINISTRATIF: 'none' },
  'operating-room': { DIRIGEANT: 'full', MEDECIN: 'write', INFIRMIER: 'read', TECHNICIEN: 'none', PHARMACIEN: 'none', ADMINISTRATIF: 'none' },
  laboratory: { DIRIGEANT: 'full', MEDECIN: 'write', INFIRMIER: 'write', TECHNICIEN: 'write', PHARMACIEN: 'none', ADMINISTRATIF: 'none' },
  imaging: { DIRIGEANT: 'full', MEDECIN: 'write', INFIRMIER: 'read', TECHNICIEN: 'write', PHARMACIEN: 'none', ADMINISTRATIF: 'none' },
  cardiology: { DIRIGEANT: 'full', MEDECIN: 'write', INFIRMIER: 'read', TECHNICIEN: 'write', PHARMACIEN: 'none', ADMINISTRATIF: 'none' },
  pathology: { DIRIGEANT: 'full', MEDECIN: 'write', INFIRMIER: 'read', TECHNICIEN: 'write', PHARMACIEN: 'none', ADMINISTRATIF: 'none' },
  endoscopy: { DIRIGEANT: 'full', MEDECIN: 'write', INFIRMIER: 'read', TECHNICIEN: 'write', PHARMACIEN: 'none', ADMINISTRATIF: 'none' },
  pharmacy: { DIRIGEANT: 'full', MEDECIN: 'read', INFIRMIER: 'read', TECHNICIEN: 'none', PHARMACIEN: 'full', ADMINISTRATIF: 'none' },
  stocks: { DIRIGEANT: 'full', MEDECIN: 'none', INFIRMIER: 'none', TECHNICIEN: 'read', PHARMACIEN: 'write', ADMINISTRATIF: 'read' },
  'blood-bank': { DIRIGEANT: 'full', MEDECIN: 'read', INFIRMIER: 'read', TECHNICIEN: 'write', PHARMACIEN: 'none', ADMINISTRATIF: 'none' },
  finance: { DIRIGEANT: 'full', MEDECIN: 'none', INFIRMIER: 'none', TECHNICIEN: 'none', PHARMACIEN: 'none', ADMINISTRATIF: 'write' },
  procurement: { DIRIGEANT: 'full', MEDECIN: 'none', INFIRMIER: 'none', TECHNICIEN: 'none', PHARMACIEN: 'write', ADMINISTRATIF: 'write' },
  hr: { DIRIGEANT: 'full', MEDECIN: 'none', INFIRMIER: 'none', TECHNICIEN: 'none', PHARMACIEN: 'none', ADMINISTRATIF: 'write' },
  quality: { DIRIGEANT: 'full', MEDECIN: 'read', INFIRMIER: 'read', TECHNICIEN: 'read', PHARMACIEN: 'read', ADMINISTRATIF: 'write' },
  risks: { DIRIGEANT: 'full', MEDECIN: 'write', INFIRMIER: 'write', TECHNICIEN: 'write', PHARMACIEN: 'write', ADMINISTRATIF: 'write' },
  'audit-compliance': { DIRIGEANT: 'full', MEDECIN: 'read', INFIRMIER: 'none', TECHNICIEN: 'none', PHARMACIEN: 'none', ADMINISTRATIF: 'write' },
  documents: { DIRIGEANT: 'full', MEDECIN: 'read', INFIRMIER: 'read', TECHNICIEN: 'read', PHARMACIEN: 'read', ADMINISTRATIF: 'write' },
  ai: { DIRIGEANT: 'full', MEDECIN: 'read', INFIRMIER: 'none', TECHNICIEN: 'none', PHARMACIEN: 'none', ADMINISTRATIF: 'read' },
  reports: { DIRIGEANT: 'full', MEDECIN: 'read', INFIRMIER: 'none', TECHNICIEN: 'none', PHARMACIEN: 'none', ADMINISTRATIF: 'write' },
  automation: { DIRIGEANT: 'full', MEDECIN: 'none', INFIRMIER: 'none', TECHNICIEN: 'none', PHARMACIEN: 'none', ADMINISTRATIF: 'read' },
  // Gestion des comptes/rôles — écriture (créer/modifier un rôle/suspendre) réservée au DIRIGEANT ;
  // ADMINISTRATIF peut seulement consulter la liste (§2 : "ne peut que consulter"), les autres
  // rôles n'y ont aucun accès. Le changement de son propre mot de passe est une route à part,
  // ouverte à tous les rôles authentifiés, qui ne passe pas par cette matrice (voir users.routes.ts).
  users: { DIRIGEANT: 'full', MEDECIN: 'none', INFIRMIER: 'none', TECHNICIEN: 'none', PHARMACIEN: 'none', ADMINISTRATIF: 'read' },
  // Établissement + Notifications (Paramètres) : lecture ouverte à tous (affiché dans un écran
  // que tous les rôles peuvent ouvrir), écriture réservée à DIRIGEANT/ADMINISTRATIF — même schéma
  // que `documents`/`quality`.
  settings: { DIRIGEANT: 'full', MEDECIN: 'read', INFIRMIER: 'read', TECHNICIEN: 'read', PHARMACIEN: 'read', ADMINISTRATIF: 'write' }
}
