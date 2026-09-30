// Types partagés pour la configuration de premier lancement (voir Plan-Installeur-Configurable.md
// et Plan-Backend-Embarque-Travaux.md). Les accès à la base distante sont une config LOCALE au
// poste (fichier JSON chiffré, voir app-config.service.ts) — il faut les connaître avant de pouvoir
// lire quoi que ce soit en base. Les modules affichés, eux, sont un réglage
// d'ÉTABLISSEMENT (stockés sur Company côté serveur, voir company.service.ts côté app-server) :
// partagés par tous les postes qui se connectent à ce backend, pas propres à une machine.

/** Miroir des `id` de `NavItem` dans AppShell.tsx (27 écrans, 6 groupes) — tenu à jour à la main :
 * pas d'import croisé renderer → shared → main pour une simple liste de constantes. `dashboard`
 * et `settings` ne figurent pas ici : toujours visibles, non désactivables (voir AppShell.tsx). */
export const MODULE_GROUPS: { label: string; screens: { id: string; label: string }[] }[] = [
  {
    label: 'Soins & Patients',
    screens: [
      { id: 'patients', label: 'Patients' },
      { id: 'appointments', label: 'Rendez-vous' },
      { id: 'consultations', label: 'Consultations' },
      { id: 'hospitalization', label: 'Hospitalisation' },
      { id: 'emergencies', label: 'Urgences' }
    ]
  },
  {
    label: 'Examens & plateau technique',
    screens: [
      { id: 'laboratory', label: 'Laboratoire' },
      { id: 'imaging', label: 'Imagerie médicale' },
      { id: 'cardiology', label: 'Cardiologie' },
      { id: 'pathology', label: 'Anatomopathologie' },
      { id: 'endoscopy', label: 'Endoscopie' },
      { id: 'operating-room', label: 'Bloc opératoire' }
    ]
  },
  {
    label: 'Médicaments & stocks',
    screens: [
      { id: 'pharmacy', label: 'Pharmacie' },
      { id: 'stocks', label: 'Stocks & Dépôts' },
      { id: 'blood-bank', label: 'Banque de sang' }
    ]
  },
  {
    label: 'Finance',
    screens: [
      { id: 'cashier', label: 'Caisse' },
      { id: 'finance', label: 'Comptabilité' }
    ]
  },
  {
    label: 'Administration',
    screens: [
      { id: 'procurement', label: 'Approvisionnement' },
      { id: 'hr', label: 'Ressources Humaines' }
    ]
  },
  {
    label: 'Gouvernance & qualité',
    screens: [
      { id: 'quality', label: 'Qualité & Accréditation' },
      { id: 'risk-management', label: 'Gestion des risques' },
      { id: 'audit-compliance', label: 'Audit & Conformité' },
      { id: 'documents', label: 'Documents & signature électronique' }
    ]
  },
  {
    label: 'Intelligence & pilotage',
    screens: [
      { id: 'ai-predictions', label: 'IA & Prédictions' },
      { id: 'analytics', label: 'Rapports & Analyse' },
      { id: 'automation-studio', label: 'Automation Studio' }
    ]
  }
]

export const ALL_MODULE_SCREEN_IDS: string[] = MODULE_GROUPS.flatMap((g) => g.screens.map((s) => s.id))

export const MODULE_LABEL_BY_ID: Record<string, string> = Object.fromEntries(
  MODULE_GROUPS.flatMap((g) => g.screens.map((s) => [s.id, s.label]))
)

/** Dépendances entre modules — fondées sur les vraies clés étrangères du schéma
 * (`app-server/prisma/schema.prisma`) : tous ces écrans ont un `patientId` (Appointment,
 * Consultation, Hospitalization, EmergencyVisit, Surgery, LabRequest, ImagingRequest, CardioExam,
 * PathologyRequest, EndoscopyProcedure, BloodPouch/TransfusionRequest/Transfusion) — sans le module
 * Patients, ils n'ont plus aucune donnée à afficher. Désactiver "patients" désactive donc ces
 * écrans en cascade (voir ModuleTree.tsx). */
export const MODULE_DEPENDENCIES: Record<string, string[]> = {
  patients: [
    'appointments',
    'consultations',
    'hospitalization',
    'emergencies',
    'operating-room',
    'laboratory',
    'imaging',
    'cardiology',
    'pathology',
    'endoscopy',
    'blood-bank'
  ]
}

/** Inverse de `MODULE_DEPENDENCIES` : pour un écran donné, le module dont il dépend (un seul
 * niveau ici, mais `applyModuleDependencies` gère une chaîne de profondeur quelconque). */
export const MODULE_DEPENDENCY_PARENT: Record<string, string> = Object.fromEntries(
  Object.entries(MODULE_DEPENDENCIES).flatMap(([parent, dependents]) => dependents.map((id) => [id, parent]))
)

/** Retire de la sélection tout écran dont le module requis n'y est plus — à appliquer après chaque
 * changement (et au chargement, au cas où une sélection enregistrée avant cette règle serait
 * devenue incohérente). Boucle jusqu'à stabilisation pour couvrir une chaîne de dépendances. */
export function applyModuleDependencies(enabledModules: string[]): string[] {
  const set = new Set(enabledModules)
  let changed = true
  while (changed) {
    changed = false
    for (const [dependent, parent] of Object.entries(MODULE_DEPENDENCY_PARENT)) {
      if (set.has(dependent) && !set.has(parent)) {
        set.delete(dependent)
        changed = true
      }
    }
  }
  return Array.from(set)
}

export interface AppConfig {
  setupComplete: boolean
  /** Des accès à la base distante sont enregistrés sur ce poste. */
  dbConfigured: boolean
}

// --- Accès à la base MariaDB distante (backend embarqué, voir Plan-Backend-Embarque-Travaux.md) ---

export interface DbAccessInput {
  host: string
  port: number
  database: string
  user: string
  /** Vide = conserver le mot de passe déjà enregistré (écran de reconnexion, Paramètres). */
  password: string
  ssl: boolean
}

/** Accès enregistrés renvoyés à l'interface pour pré-remplir un formulaire — jamais le mot de passe. */
export type DbAccessPrefill = Omit<DbAccessInput, 'password'>

export type DbStartupStatus =
  | { state: 'CHECKING' }
  | { state: 'NOT_CONFIGURED' }
  | { state: 'READY' }
  /** Base injoignable ET pas d'Internet : mode hors connexion habituel, sans rien demander. */
  | { state: 'OFFLINE' }
  /** Base injoignable alors qu'Internet fonctionne : les accès sont redemandés. */
  | { state: 'NEEDS_ACCESS'; message: string; prefill: DbAccessPrefill | null }
  /** La base a été mise à jour par une version plus récente de l'app. */
  | { state: 'APP_OUTDATED'; message: string }
  | { state: 'MIGRATION_FAILED'; message: string }

export type SaveDbAccessResult = { ok: true } | { ok: false; message: string }
