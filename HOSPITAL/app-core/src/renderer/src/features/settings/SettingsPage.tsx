import { useEffect, useState } from 'react'
import { Plus, Shield, Moon, Sun, Download, Upload, KeyRound, Loader2, KeySquare, Pencil, Lock, MapPin, Crosshair } from 'lucide-react'
import { Card } from '@renderer/components/Card'
import { PageHeader } from '@renderer/components/PageHeader'
import { Button } from '@renderer/components/Button'
import { StatusBadge } from '@renderer/components/StatusBadge'
import { ConfirmDialog } from '@renderer/components/ConfirmDialog'
import { SETTINGS_SECTIONS, type SettingsSection } from './mock-data'
import { ModuleTree } from '@renderer/components/ModuleTree'
import { ALL_MODULE_SCREEN_IDS, applyModuleDependencies, type DbAccessPrefill } from '@shared/setup-types'
import { DbAccessForm } from '@renderer/features/setup/DbAccessForm'
import { CompanyLogoCard } from './CompanyLogoCard'
import { UpdateSettingsCard } from '@renderer/features/updater/UpdateSettingsCard'
import { SubscriptionSettingsCard } from '@renderer/features/subscription/SubscriptionSettingsCard'
import { UserFormModal } from './UserFormModal'
import { EditUserModal } from './EditUserModal'
import { ResetPasswordModal } from './ResetPasswordModal'
import { ChangePasswordModal } from './ChangePasswordModal'
import type { Session } from '@shared/auth-types'
import type { ApiUser } from '@shared/user-types'
import type { ApiCompany } from '@shared/company-types'
import type { LocalBackupInfo } from '@shared/backup-types'

// Mot de passe partagé « Ultra Admin » — gate client uniquement, en dur pour le moment (voir
// demande du 2026-09-21). À faire évoluer côté serveur si un vrai contrôle d'accès est nécessaire.
const ULTRA_ADMIN_PASSWORD = 'ultraadmin2026sinsin'

const ROLE_LABEL: Record<string, string> = {
  DIRIGEANT: 'Directeur Général',
  MEDECIN: 'Médecin',
  INFIRMIER: 'Infirmier(ère)',
  TECHNICIEN: 'Technicien',
  PHARMACIEN: 'Pharmacien',
  ADMINISTRATIF: 'Administratif',
  CAISSIER: 'Caissier(ère)'
}

function initials(name: string): string {
  const parts = name.replace('Dr. ', '').trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
}

interface SettingsPageProps {
  session: Session
  onLogout: () => void
  /** Section ouverte à l'arrivée (ex. « Abonnement » depuis le bandeau d'échéance). */
  initialSection?: SettingsSection
}

export function SettingsPage({ session, onLogout, initialSection }: SettingsPageProps): JSX.Element {
  const [section, setSection] = useState<SettingsSection>(initialSection ?? 'Établissement')
  // §2 de l'audit : ADMINISTRATIF peut consulter la liste des comptes (lecture seule), seul
  // DIRIGEANT peut créer un compte, changer un rôle, suspendre ou réinitialiser un mot de passe.
  const canViewUsers = session.user.role === 'DIRIGEANT' || session.user.role === 'ADMINISTRATIF'
  const canManageUsers = session.user.role === 'DIRIGEANT'

  const [users, setUsers] = useState<ApiUser[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [usersError, setUsersError] = useState<string | null>(null)
  const [showCreateUserModal, setShowCreateUserModal] = useState(false)
  const [resettingPasswordFor, setResettingPasswordFor] = useState<ApiUser | null>(null)
  const [editingUser, setEditingUser] = useState<ApiUser | null>(null)
  const [suspendingUser, setSuspendingUser] = useState<ApiUser | null>(null)
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false)
  const [passwordChanged, setPasswordChanged] = useState(false)

  const [company, setCompany] = useState<ApiCompany | null>(null)
  const [companyLoading, setCompanyLoading] = useState(true)
  const [companyError, setCompanyError] = useState<string | null>(null)
  const [companySaving, setCompanySaving] = useState(false)
  const [companySaved, setCompanySaved] = useState(false)


  // Sauvegarde/restauration complète de la base (item 21) — réservée au DIRIGEANT côté serveur
  // (RBAC `settings: 'full'`), donc masquée pour les autres rôles ici aussi.
  const canManageBackups = session.user.role === 'DIRIGEANT'
  const [backups, setBackups] = useState<LocalBackupInfo[]>([])
  const [backupsLoading, setBackupsLoading] = useState(true)
  const [backupRunning, setBackupRunning] = useState(false)
  const [backupError, setBackupError] = useState<string | null>(null)
  const [restoringBackup, setRestoringBackup] = useState<LocalBackupInfo | null>(null)
  const [restoreDone, setRestoreDone] = useState(false)

  // Modules affichés dans la navigation (config locale au poste, pas une donnée serveur — voir
  // Plan-Installeur-Configurable.md). Même réglage que l'assistant de premier lancement. Regroupés
  // avec l'URL du serveur dans la section « Ultra Admin », protégée par mot de passe dédié.
  const canManageModules = session.user.role === 'DIRIGEANT' || session.user.role === 'ADMINISTRATIF'
  const [moduleSelection, setModuleSelection] = useState<string[]>(ALL_MODULE_SCREEN_IDS)
  const [modulesLoading, setModulesLoading] = useState(true)
  const [modulesSaving, setModulesSaving] = useState(false)
  const [modulesSaved, setModulesSaved] = useState(false)
  const [modulesError, setModulesError] = useState<string | null>(null)

  // Section Ultra Admin — toujours reverrouillée en quittant la section (pas de mémorisation du
  // déverrouillage), voir la demande explicite du 2026-09-21.
  const [ultraAdminUnlocked, setUltraAdminUnlocked] = useState(false)
  const [ultraAdminPasswordInput, setUltraAdminPasswordInput] = useState('')
  const [ultraAdminError, setUltraAdminError] = useState<string | null>(null)
  // Accès à la base distante (backend embarqué) — `undefined` tant que non chargés.
  const [dbPrefill, setDbPrefill] = useState<DbAccessPrefill | null | undefined>(undefined)
  const [dbAccessSaved, setDbAccessSaved] = useState(false)
  // Clé API Gemini (assistant IA), stockée en base — jamais relue, seulement « configurée ou non ».
  const [aiKeyConfigured, setAiKeyConfigured] = useState(false)
  const [aiKeyInput, setAiKeyInput] = useState('')
  const [aiKeySaving, setAiKeySaving] = useState(false)
  const [aiKeyMessage, setAiKeyMessage] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    if (section !== 'Établissement') return
    let cancelled = false
    setCompanyLoading(true)
    window.api.company.get().then((result) => {
      if (cancelled) return
      if (result.ok) {
        setCompany(result.data.company)
      } else {
        setCompanyError(result.error)
      }
      setCompanyLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [section])


  function loadBackups(): void {
    setBackupsLoading(true)
    window.api.backup
      .list()
      .then((list) => setBackups(list))
      .catch((error) => setBackupError(error instanceof Error ? error.message : String(error)))
      .finally(() => setBackupsLoading(false))
  }

  useEffect(() => {
    if (section !== 'Sauvegardes' || !canManageBackups) return
    loadBackups()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section])

  async function handleRunBackup(): Promise<void> {
    setBackupRunning(true)
    setBackupError(null)
    try {
      await window.api.backup.run()
      loadBackups()
    } catch (error) {
      setBackupError(error instanceof Error ? error.message : String(error))
    }
    setBackupRunning(false)
  }

  async function handleRestoreBackup(filePath: string): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      await window.api.backup.restore(filePath)
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) }
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} o`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
  }

  function formatBackupDate(fileName: string): string {
    // sauvegarde-YYYY-MM-DD_HHmmss.json
    const match = /sauvegarde-(\d{4})-(\d{2})-(\d{2})_(\d{2})(\d{2})(\d{2})/.exec(fileName)
    if (!match) return fileName
    const [, year, month, day, hour, minute] = match
    return `${day}/${month}/${year} à ${hour}:${minute}`
  }

  useEffect(() => {
    if (section !== 'Ultra Admin') {
      setUltraAdminUnlocked(false)
      setUltraAdminPasswordInput('')
      setUltraAdminError(null)
    }
  }, [section])

  useEffect(() => {
    if (section !== 'Ultra Admin' || !ultraAdminUnlocked) return
    let cancelled = false
    setModulesLoading(true)
    Promise.all([window.api.setup.getDbPrefill(), window.api.company.get()]).then(([prefill, companyResult]) => {
      if (cancelled) return
      setDbPrefill(prefill)
      if (companyResult.ok) {
        setAiKeyConfigured(companyResult.data.company.aiApiKeyConfigured)
        setModuleSelection(companyResult.data.company.enabledModules ?? ALL_MODULE_SCREEN_IDS)
      } else {
        setModulesError(companyResult.error)
      }
      setModulesLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [section, ultraAdminUnlocked])

  function handleUnlockUltraAdmin(): void {
    if (ultraAdminPasswordInput === ULTRA_ADMIN_PASSWORD) {
      setUltraAdminUnlocked(true)
      setUltraAdminError(null)
    } else {
      setUltraAdminError('Mot de passe incorrect.')
    }
    setUltraAdminPasswordInput('')
  }

  async function handleSaveModules(): Promise<void> {
    setModulesSaving(true)
    setModulesError(null)
    const result = await window.api.company.update({ enabledModules: applyModuleDependencies(moduleSelection) })
    setModulesSaving(false)
    if (result.ok) {
      setModulesSaved(true)
      setTimeout(() => setModulesSaved(false), 2000)
    } else {
      setModulesError(result.error)
    }
  }

  async function handleSaveAiKey(remove: boolean): Promise<void> {
    if (!remove && !aiKeyInput.trim()) {
      setAiKeyMessage({ ok: false, text: 'Indiquez une clé.' })
      return
    }
    setAiKeySaving(true)
    setAiKeyMessage(null)
    const result = await window.api.company.update({ aiApiKey: remove ? null : aiKeyInput.trim() })
    setAiKeySaving(false)
    if (!result.ok) {
      setAiKeyMessage({ ok: false, text: result.error })
      return
    }
    setAiKeyConfigured(result.data.company.aiApiKeyConfigured)
    setAiKeyInput('')
    setAiKeyMessage({ ok: true, text: remove ? 'Clé supprimée.' : 'Clé enregistrée.' })
  }

  const [locating, setLocating] = useState(false)
  const [locateMessage, setLocateMessage] = useState<{ ok: boolean; text: string } | null>(null)

  /** Position de l'établissement pour la pointeuse : prise par le service de localisation de
   * Windows (ou approximativement par Internet) puis enregistrée aussitôt — pas de saisie manuelle. */
  async function handleLocate(): Promise<void> {
    setLocating(true)
    setLocateMessage(null)
    const location = await window.api.company.locate()
    if (!location.ok) {
      setLocating(false)
      setLocateMessage({ ok: false, text: location.error })
      return
    }
    const result = await window.api.company.update({ latitude: location.latitude, longitude: location.longitude })
    setLocating(false)
    if (!result.ok) {
      setLocateMessage({ ok: false, text: result.error })
      return
    }
    setCompany(result.data.company)
    setLocateMessage({
      ok: true,
      text:
        location.source === 'windows'
          ? `Localisation enregistrée${location.accuracyMeters ? ` (précision ≈ ${location.accuracyMeters} m)` : ''}.`
          : 'Localisation approximative enregistrée (via Internet — activez la localisation Windows pour plus de précision).'
    })
  }

  async function handleSaveCompany(): Promise<void> {
    if (!company) return
    setCompanySaving(true)
    setCompanyError(null)
    const result = await window.api.company.update({
      name: company.name,
      sector: company.sector,
      address: company.address,
      phone: company.phone,
      contactEmail: company.contactEmail,
      timezone: company.timezone,
      registrationNumber: company.registrationNumber,
      receiptFooter: company.receiptFooter
    })
    setCompanySaving(false)
    if (result.ok) {
      setCompany(result.data.company)
      setCompanySaved(true)
      setTimeout(() => setCompanySaved(false), 2000)
    } else {
      setCompanyError(result.error)
    }
  }

  useEffect(() => {
    if (section !== 'Utilisateurs & rôles' || !canViewUsers) return
    let cancelled = false
    setUsersLoading(true)
    window.api.users.list().then((result) => {
      if (cancelled) return
      if (result.ok) {
        setUsers(result.data.users)
      } else {
        setUsersError(result.error)
      }
      setUsersLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [section, canViewUsers])

  async function handleRoleChange(user: ApiUser, role: string): Promise<void> {
    const result = await window.api.users.update(user.id, { role: role as ApiUser['role'] })
    if (result.ok) {
      setUsers((prev) => prev.map((u) => (u.id === user.id ? result.data.user : u)))
    } else {
      setUsersError(result.error)
    }
  }

  async function handleToggleActive(user: ApiUser): Promise<void> {
    if (user.isActive) {
      setSuspendingUser(user)
      return
    }
    const result = await window.api.users.update(user.id, { isActive: true })
    if (result.ok) {
      setUsers((prev) => prev.map((u) => (u.id === user.id ? result.data.user : u)))
    } else {
      setUsersError(result.error)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        breadcrumb={['Accueil', 'Paramètres']}
        title="Paramètres"
        subtitle="Configuration de l'établissement, des utilisateurs et de l'application."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <Card className="h-fit p-2 lg:col-span-1">
          <nav className="space-y-0.5">
            {SETTINGS_SECTIONS.filter((s) => s !== 'Utilisateurs & rôles' || canViewUsers).map((s) => (
              <button
                key={s}
                onClick={() => setSection(s)}
                className={
                  'flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ' +
                  (section === s
                    ? 'bg-accent-50 text-accent-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900')
                }
              >
                {s}
              </button>
            ))}
          </nav>
        </Card>

        <div className="lg:col-span-3">
          {section === 'Établissement' && (
            <div className="space-y-6">
              <CompanyLogoCard canEdit={canManageModules} />
              <Card>
                <h3 className="mb-4 text-sm font-semibold text-gray-900">Informations de l&apos;établissement</h3>
                {companyLoading ? (
                  <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Chargement des informations…
                  </div>
                ) : company ? (
                  <>
                    {companyError && <p className="mb-3 text-xs text-red-500">{companyError}</p>}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field
                        label="Nom de l'établissement"
                        value={company.name}
                        onChange={(v) => setCompany({ ...company, name: v })}
                      />
                      <Field
                        label="Secteur"
                        value={company.sector ?? ''}
                        onChange={(v) => setCompany({ ...company, sector: v })}
                      />
                      <Field
                        label="Adresse"
                        value={company.address ?? ''}
                        onChange={(v) => setCompany({ ...company, address: v })}
                      />
                      <Field
                        label="Téléphone"
                        value={company.phone ?? ''}
                        onChange={(v) => setCompany({ ...company, phone: v })}
                      />
                      <Field
                        label="Email de contact"
                        value={company.contactEmail ?? ''}
                        onChange={(v) => setCompany({ ...company, contactEmail: v })}
                      />
                      <Field
                        label="Fuseau horaire"
                        value={company.timezone ?? ''}
                        onChange={(v) => setCompany({ ...company, timezone: v })}
                      />
                      <Field
                        label="N° d'identification (RCCM, NIF…)"
                        value={company.registrationNumber ?? ''}
                        onChange={(v) => setCompany({ ...company, registrationNumber: v })}
                      />
                      <Field
                        label="Mention de bas de reçu"
                        value={company.receiptFooter ?? ''}
                        onChange={(v) => setCompany({ ...company, receiptFooter: v })}
                      />
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                      <MapPin className="h-4 w-4 shrink-0 text-gray-400" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-800">Localisation de l&apos;établissement</p>
                        <p className="text-xs text-gray-500">
                          Sert à la gestion des présences des utilisateurs (pointage à la connexion).{' '}
                          {company.latitude !== null && company.longitude !== null
                            ? 'Localisation enregistrée.'
                            : 'Pas encore définie.'}
                        </p>
                      </div>
                      {canManageModules && (
                        <Button size="sm" variant="secondary" onClick={handleLocate} disabled={locating}>
                          {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Crosshair className="h-3.5 w-3.5" />}
                          Récupérer la localisation
                        </Button>
                      )}
                    </div>
                    {locateMessage && (
                      <p className={`mt-2 text-xs ${locateMessage.ok ? 'text-emerald-600' : 'text-red-500'}`}>{locateMessage.text}</p>
                    )}
                    <div className="mt-4 flex items-center gap-3">
                      <Button size="sm" onClick={handleSaveCompany} disabled={companySaving}>
                        {companySaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        Enregistrer les modifications
                      </Button>
                      {companySaved && <span className="text-xs text-emerald-600">Modifications enregistrées.</span>}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-red-500">
                    {companyError ?? "Impossible de charger les informations de l'établissement."}
                  </p>
                )}
              </Card>
            </div>
          )}

          {section === 'Utilisateurs & rôles' && canViewUsers && (
            <>
              <Card className="p-0">
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                  <h3 className="text-sm font-semibold text-gray-900">Comptes utilisateurs</h3>
                  {canManageUsers ? (
                    <Button size="sm" onClick={() => setShowCreateUserModal(true)}>
                      <Plus className="h-3.5 w-3.5" />
                      Créer un utilisateur
                    </Button>
                  ) : (
                    <span className="text-xs text-gray-400">Lecture seule</span>
                  )}
                </div>

                {usersError && <p className="px-6 py-3 text-xs text-red-500">{usersError}</p>}

                {usersLoading ? (
                  <div className="flex items-center justify-center gap-2 px-6 py-10 text-sm text-gray-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Chargement des comptes…
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {users.map((u) => (
                      <div key={u.id} className="flex items-center gap-3 px-6 py-3.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-50 text-xs font-semibold text-accent-700">
                          {initials(u.name)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-900">{u.name}</p>
                          <p className="truncate text-xs text-gray-400">{u.email}</p>
                        </div>
                        {canManageUsers ? (
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u, e.target.value)}
                            disabled={u.id === session.user.id}
                            title={
                              u.id === session.user.id ? 'Vous ne pouvez pas changer votre propre rôle ici' : undefined
                            }
                            className="shrink-0 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 focus:border-accent-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {Object.entries(ROLE_LABEL).map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="shrink-0 text-xs text-gray-500">{ROLE_LABEL[u.role] ?? u.role}</span>
                        )}
                        {canManageUsers ? (
                          <button
                            onClick={() => handleToggleActive(u)}
                            disabled={u.id === session.user.id}
                            title={
                              u.id === session.user.id ? 'Vous ne pouvez pas suspendre votre propre compte' : undefined
                            }
                          >
                            <StatusBadge
                              label={u.isActive ? 'Actif' : 'Inactif'}
                              tone={u.isActive ? 'success' : 'neutral'}
                            />
                          </button>
                        ) : (
                          <StatusBadge
                            label={u.isActive ? 'Actif' : 'Inactif'}
                            tone={u.isActive ? 'success' : 'neutral'}
                          />
                        )}
                        {(canManageUsers || u.id === session.user.id) && (
                          <button
                            onClick={() => setEditingUser(u)}
                            title="Modifier le nom/email de ce compte"
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        {canManageUsers && (
                          <button
                            onClick={() => setResettingPasswordFor(u)}
                            title="Réinitialiser le mot de passe"
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                          >
                            <KeySquare className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {showCreateUserModal && canManageUsers && (
                <UserFormModal
                  onClose={() => setShowCreateUserModal(false)}
                  onCreated={(user) => {
                    setUsers((prev) => [...prev, user])
                    setShowCreateUserModal(false)
                  }}
                />
              )}

              {editingUser && (
                <EditUserModal
                  user={editingUser}
                  onClose={() => setEditingUser(null)}
                  onUpdated={(updated) => {
                    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))
                    setEditingUser(null)
                  }}
                />
              )}

              {resettingPasswordFor && (
                <ResetPasswordModal
                  userName={resettingPasswordFor.name}
                  onClose={() => setResettingPasswordFor(null)}
                  onReset={(newPassword) => window.api.users.resetPassword(resettingPasswordFor.id, newPassword)}
                  onDone={() => setResettingPasswordFor(null)}
                />
              )}

              {suspendingUser && (
                <ConfirmDialog
                  title="Suspendre le compte"
                  message={`Voulez-vous vraiment suspendre le compte de ${suspendingUser.name} ? Il ne pourra plus se connecter tant que le compte n'est pas réactivé.`}
                  confirmLabel="Suspendre"
                  onCancel={() => setSuspendingUser(null)}
                  onConfirm={() => window.api.users.update(suspendingUser.id, { isActive: false })}
                  onConfirmed={() => {
                    setUsers((prev) => prev.map((u) => (u.id === suspendingUser.id ? { ...u, isActive: false } : u)))
                    setSuspendingUser(null)
                  }}
                />
              )}
            </>
          )}

          {section === 'Sécurité' && (
            <Card>
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Shield className="h-4 w-4 text-accent-600" />
                Sécurité du compte
              </h3>
              <div className="space-y-4">
                <ToggleRow
                  label="Authentification à deux facteurs (2FA)"
                  description="Exiger un code de vérification à la connexion."
                  checked
                />
                <ToggleRow
                  label="Déconnexion automatique après inactivité"
                  description="Verrouille la session après 30 minutes d'inactivité."
                  checked
                />
                <ToggleRow
                  label="Historique des connexions"
                  description="Journaliser chaque connexion avec IP et appareil."
                  checked
                />
                <div className="border-t border-gray-100 pt-4">
                  <Button variant="secondary" size="sm" onClick={() => setShowChangePasswordModal(true)}>
                    <KeyRound className="h-3.5 w-3.5" />
                    Changer le mot de passe
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {showChangePasswordModal && (
            <ChangePasswordModal
              onClose={() => setShowChangePasswordModal(false)}
              onChanged={() => {
                setShowChangePasswordModal(false)
                setPasswordChanged(true)
                onLogout()
              }}
            />
          )}

          {passwordChanged && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <div className="flex items-center gap-2 rounded-xl bg-white px-5 py-4 text-sm text-gray-700 shadow-xl">
                <Loader2 className="h-4 w-4 animate-spin text-accent-600" />
                Mot de passe changé — déconnexion en cours…
              </div>
            </div>
          )}

          {section === 'Ultra Admin' && (
            <>
              {!canManageModules ? (
                <Card>
                  <p className="text-center text-sm text-gray-400">
                    La section Ultra Admin est réservée au Directeur Général et au personnel administratif.
                  </p>
                </Card>
              ) : !ultraAdminUnlocked ? (
                <Card>
                  <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <Lock className="h-4 w-4 text-accent-600" />
                    Accès Ultra Admin
                  </h3>
                  <p className="mb-4 text-xs text-gray-500">
                    Modules installés et URL du serveur — section protégée par un mot de passe dédié, redemandé à chaque
                    ouverture.
                  </p>
                  <div className="flex max-w-sm items-center gap-2">
                    <input
                      type="password"
                      value={ultraAdminPasswordInput}
                      onChange={(e) => setUltraAdminPasswordInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleUnlockUltraAdmin()}
                      autoFocus
                      placeholder="Mot de passe Ultra Admin"
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-accent-500 focus:outline-none"
                    />
                    <Button size="sm" onClick={handleUnlockUltraAdmin}>
                      Déverrouiller
                    </Button>
                  </div>
                  {ultraAdminError && <p className="mt-2 text-xs text-red-500">{ultraAdminError}</p>}
                </Card>
              ) : (
                <div className="space-y-6">
                  <Card>
                    <h3 className="mb-1 text-sm font-semibold text-gray-900">Connexion à la base de données</h3>
                    <p className="mb-4 text-xs text-gray-500">
                      Accès à la base MySQL/MariaDB de cet établissement, enregistrés chiffrés sur ce poste. Ils ne sont
                      remplacés que si la connexion réussit.
                    </p>
                    <div className="max-w-lg">
                      {dbPrefill === undefined ? (
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                      ) : (
                        <DbAccessForm
                          prefill={dbPrefill}
                          submitLabel="Tester et enregistrer"
                          onSaved={() => {
                            // Accès changés : la session actuelle n'est plus fiable → reconnexion.
                            setDbAccessSaved(true)
                            setTimeout(onLogout, 1200)
                          }}
                        />
                      )}
                    </div>
                    {dbAccessSaved && (
                      <p className="mt-2 text-xs text-emerald-600">Accès enregistrés — reconnexion nécessaire…</p>
                    )}
                  </Card>

                  <Card>
                    <h3 className="mb-1 text-sm font-semibold text-gray-900">
                      Clé API de l&apos;assistant IA (Gemini)
                    </h3>
                    <p className="mb-4 text-xs text-gray-500">
                      Enregistrée dans la base de l&apos;établissement : valable pour tous les postes.{' '}
                      {aiKeyConfigured
                        ? 'Une clé est actuellement configurée.'
                        : 'Aucune clé configurée — assistant désactivé.'}
                    </p>
                    <div className="flex max-w-lg items-center gap-2">
                      <input
                        type="password"
                        value={aiKeyInput}
                        onChange={(e) => setAiKeyInput(e.target.value)}
                        autoComplete="off"
                        placeholder={aiKeyConfigured ? 'Nouvelle clé (remplace l’actuelle)' : 'Clé API Gemini'}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-accent-500 focus:outline-none"
                      />
                      <Button size="sm" onClick={() => handleSaveAiKey(false)} disabled={aiKeySaving}>
                        {aiKeySaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Enregistrer'}
                      </Button>
                      {aiKeyConfigured && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleSaveAiKey(true)}
                          disabled={aiKeySaving}
                        >
                          Supprimer
                        </Button>
                      )}
                    </div>
                    {aiKeyMessage && (
                      <p className={`mt-2 text-xs ${aiKeyMessage.ok ? 'text-emerald-600' : 'text-red-500'}`}>
                        {aiKeyMessage.text}
                      </p>
                    )}
                  </Card>

                  <Card>
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">Modules installés</h3>
                        <p className="mt-0.5 text-xs text-gray-500">
                          Cocher un groupe entier ou seulement certains écrans — propre à ce poste, pas à
                          l&apos;établissement.
                        </p>
                      </div>
                      <Button size="sm" onClick={handleSaveModules} disabled={modulesSaving || modulesLoading}>
                        {modulesSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Enregistrer'}
                      </Button>
                    </div>
                    {modulesError && <p className="mb-3 text-xs text-red-500">{modulesError}</p>}
                    {modulesSaved && <p className="mb-3 text-xs text-emerald-600">Enregistré.</p>}
                    {modulesLoading ? (
                      <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-400">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Chargement…
                      </div>
                    ) : (
                      <ModuleTree enabledModules={moduleSelection} onChange={setModuleSelection} />
                    )}
                  </Card>
                </div>
              )}
            </>
          )}

          {section === 'Sauvegardes' && (
            <>
              {!canManageBackups ? (
                <Card>
                  <p className="text-center text-sm text-gray-400">
                    Les sauvegardes et restaurations sont réservées au Directeur Général.
                  </p>
                </Card>
              ) : (
                <Card className="p-0">
                  <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">Sauvegardes & restauration</h3>
                      <p className="mt-0.5 text-xs text-gray-500">
                        Chaque sauvegarde est téléchargée dans le dossier Documents de cet ordinateur — une sauvegarde
                        automatique est tentée à chaque ouverture de l&apos;application (au plus une par jour).
                      </p>
                    </div>
                    <Button size="sm" onClick={handleRunBackup} disabled={backupRunning}>
                      {backupRunning ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Download className="h-3.5 w-3.5" />
                      )}
                      Sauvegarder maintenant
                    </Button>
                  </div>

                  {backupError && <p className="px-6 py-3 text-xs text-red-500">{backupError}</p>}
                  {restoreDone && (
                    <p className="px-6 py-3 text-xs text-emerald-600">
                      Restauration effectuée — reconnectez-vous pour voir les données restaurées.
                    </p>
                  )}

                  {backupsLoading ? (
                    <div className="flex items-center justify-center gap-2 px-6 py-10 text-sm text-gray-400">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Chargement des sauvegardes…
                    </div>
                  ) : backups.length === 0 ? (
                    <p className="px-6 py-8 text-center text-sm text-gray-400">
                      Aucune sauvegarde locale pour l&apos;instant.
                    </p>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {backups.map((b) => (
                        <div key={b.fileName} className="flex items-center justify-between px-6 py-3.5">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{formatBackupDate(b.fileName)}</p>
                            <p className="text-xs text-gray-400">{formatFileSize(b.sizeBytes)}</p>
                          </div>
                          <Button variant="secondary" size="sm" onClick={() => setRestoringBackup(b)}>
                            <Upload className="h-3.5 w-3.5" />
                            Restaurer
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              )}

              {restoringBackup && (
                <ConfirmDialog
                  title="Restaurer cette sauvegarde ?"
                  message={`Toutes les données actuelles de la base seront remplacées par celles du ${formatBackupDate(restoringBackup.fileName)}. Cette action est irréversible — assurez-vous d'avoir une sauvegarde récente si besoin avant de continuer.`}
                  confirmLabel="Restaurer"
                  onCancel={() => setRestoringBackup(null)}
                  onConfirm={() => handleRestoreBackup(restoringBackup.filePath)}
                  onConfirmed={() => {
                    setRestoringBackup(null)
                    setRestoreDone(true)
                    setTimeout(() => setRestoreDone(false), 4000)
                  }}
                />
              )}
            </>
          )}

          {section === 'Abonnement' && <SubscriptionSettingsCard session={session} />}

          {section === 'Mises à jour' && <UpdateSettingsCard />}

          {section === 'Apparence' && (
            <Card>
              <h3 className="mb-4 text-sm font-semibold text-gray-900">Apparence</h3>
              <div className="flex gap-3">
                <button className="flex flex-1 flex-col items-center gap-2 rounded-xl border-2 border-accent-500 bg-accent-50/50 py-6">
                  <Sun className="h-5 w-5 text-accent-600" />
                  <span className="text-xs font-medium text-gray-700">Clair</span>
                </button>
                <button className="flex flex-1 flex-col items-center gap-2 rounded-xl border border-gray-200 py-6 opacity-60">
                  <Moon className="h-5 w-5 text-gray-500" />
                  <span className="text-xs font-medium text-gray-700">Sombre (bientôt)</span>
                </button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange
}: {
  label: string
  value: string
  onChange: (value: string) => void
}): JSX.Element {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-500">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-accent-500 focus:outline-none"
      />
    </div>
  )
}

function ToggleRow({
  label,
  description,
  checked
}: {
  label: string
  description: string
  checked: boolean
}): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-gray-800">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <MiniToggle checked={checked} />
    </div>
  )
}

function MiniToggle({ checked, onClick }: { checked: boolean; onClick?: () => void }): JSX.Element {
  return (
    <span
      onClick={onClick}
      role={onClick ? 'switch' : undefined}
      aria-checked={onClick ? checked : undefined}
      className={
        `inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${checked ? 'bg-accent-500' : 'bg-gray-200'} ` +
        (onClick ? 'cursor-pointer' : '')
      }
    >
      <span
        className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`}
      />
    </span>
  )
}
