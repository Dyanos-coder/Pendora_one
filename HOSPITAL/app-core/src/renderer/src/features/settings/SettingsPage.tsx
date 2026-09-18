import { useEffect, useState } from 'react'
import { Plus, Shield, Moon, Sun, Download, Upload, KeyRound, Loader2, KeySquare } from 'lucide-react'
import { Card } from '@renderer/components/Card'
import { PageHeader } from '@renderer/components/PageHeader'
import { Button } from '@renderer/components/Button'
import { StatusBadge } from '@renderer/components/StatusBadge'
import { ConfirmDialog } from '@renderer/components/ConfirmDialog'
import { MODULES_STATUS, NOTIFICATION_SETTINGS, SETTINGS_SECTIONS, type SettingsSection } from './mock-data'
import { UserFormModal } from './UserFormModal'
import { ResetPasswordModal } from './ResetPasswordModal'
import { ChangePasswordModal } from './ChangePasswordModal'
import type { Session } from '@shared/auth-types'
import type { ApiUser } from '@shared/user-types'

const ROLE_LABEL: Record<string, string> = {
  DIRIGEANT: 'Directeur Général',
  MEDECIN: 'Médecin',
  INFIRMIER: 'Infirmier(ère)',
  TECHNICIEN: 'Technicien',
  PHARMACIEN: 'Pharmacien',
  ADMINISTRATIF: 'Administratif'
}

function initials(name: string): string {
  const parts = name.replace('Dr. ', '').trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
}

interface SettingsPageProps {
  session: Session
  onLogout: () => void
}

export function SettingsPage({ session, onLogout }: SettingsPageProps): JSX.Element {
  const [section, setSection] = useState<SettingsSection>('Établissement')
  // §2 de l'audit : ADMINISTRATIF peut consulter la liste des comptes (lecture seule), seul
  // DIRIGEANT peut créer un compte, changer un rôle, suspendre ou réinitialiser un mot de passe.
  const canViewUsers = session.user.role === 'DIRIGEANT' || session.user.role === 'ADMINISTRATIF'
  const canManageUsers = session.user.role === 'DIRIGEANT'

  const [users, setUsers] = useState<ApiUser[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [usersError, setUsersError] = useState<string | null>(null)
  const [showCreateUserModal, setShowCreateUserModal] = useState(false)
  const [resettingPasswordFor, setResettingPasswordFor] = useState<ApiUser | null>(null)
  const [suspendingUser, setSuspendingUser] = useState<ApiUser | null>(null)
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false)
  const [passwordChanged, setPasswordChanged] = useState(false)

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
            {SETTINGS_SECTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setSection(s)}
                className={
                  'flex w-full items-center rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ' +
                  (section === s ? 'bg-accent-50 text-accent-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900')
                }
              >
                {s}
              </button>
            ))}
          </nav>
        </Card>

        <div className="lg:col-span-3">
          {section === 'Établissement' && (
            <Card>
              <h3 className="mb-4 text-sm font-semibold text-gray-900">Informations de l&apos;établissement</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Nom de l'établissement" value="Hôpital Démo" />
                <Field label="Secteur" value="Santé" />
                <Field label="Adresse" value="Cotonou, Bénin" />
                <Field label="Téléphone" value="+229 21 00 00 00" />
                <Field label="Email de contact" value="contact@pandorahealth.demo" />
                <Field label="Fuseau horaire" value="Africa/Porto-Novo (GMT+1)" />
              </div>
              <Button size="sm" className="mt-4">
                Enregistrer les modifications
              </Button>
            </Card>
          )}

          {section === 'Utilisateurs & rôles' && (
            <>
              {!canViewUsers ? (
                <Card>
                  <p className="text-center text-sm text-gray-400">
                    La gestion des comptes et des rôles est réservée au Directeur Général.
                  </p>
                </Card>
              ) : (
                <Card className="p-0">
                  <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                    <h3 className="text-sm font-semibold text-gray-900">Comptes utilisateurs</h3>
                    {canManageUsers ? (
                      <Button size="sm" onClick={() => setShowCreateUserModal(true)}>
                        <Plus className="h-3.5 w-3.5" />
                        Inviter un utilisateur
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
                              title={u.id === session.user.id ? 'Vous ne pouvez pas changer votre propre rôle ici' : undefined}
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
                              title={u.id === session.user.id ? 'Vous ne pouvez pas suspendre votre propre compte' : undefined}
                            >
                              <StatusBadge label={u.isActive ? 'Actif' : 'Inactif'} tone={u.isActive ? 'success' : 'neutral'} />
                            </button>
                          ) : (
                            <StatusBadge label={u.isActive ? 'Actif' : 'Inactif'} tone={u.isActive ? 'success' : 'neutral'} />
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
              )}

              {showCreateUserModal && canManageUsers && (
                <UserFormModal
                  onClose={() => setShowCreateUserModal(false)}
                  onCreated={(user) => {
                    setUsers((prev) => [...prev, user])
                    setShowCreateUserModal(false)
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
                <ToggleRow label="Authentification à deux facteurs (2FA)" description="Exiger un code de vérification à la connexion." checked />
                <ToggleRow label="Déconnexion automatique après inactivité" description="Verrouille la session après 30 minutes d'inactivité." checked />
                <ToggleRow label="Historique des connexions" description="Journaliser chaque connexion avec IP et appareil." checked />
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

          {section === 'Notifications' && (
            <Card className="p-0">
              <div className="border-b border-gray-100 px-6 py-4">
                <h3 className="text-sm font-semibold text-gray-900">Préférences de notification</h3>
              </div>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                    <th className="px-6 py-2.5 font-medium">Type de notification</th>
                    <th className="px-6 py-2.5 font-medium">Email</th>
                    <th className="px-6 py-2.5 font-medium">SMS</th>
                  </tr>
                </thead>
                <tbody>
                  {NOTIFICATION_SETTINGS.map((n) => (
                    <tr key={n.label} className="border-b border-gray-100 last:border-0">
                      <td className="px-6 py-3 text-gray-700">{n.label}</td>
                      <td className="px-6 py-3">
                        <MiniToggle checked={n.email} />
                      </td>
                      <td className="px-6 py-3">
                        <MiniToggle checked={n.sms} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {section === 'Modules activés' && (
            <Card className="p-0">
              <div className="border-b border-gray-100 px-6 py-4">
                <h3 className="text-sm font-semibold text-gray-900">Modules de l&apos;application</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {MODULES_STATUS.map((m) => (
                  <div key={m.label} className="flex items-center justify-between px-6 py-3.5">
                    <span className="text-sm text-gray-700">{m.label}</span>
                    <StatusBadge label={m.active ? 'Activé' : 'Non activé'} tone={m.active ? 'success' : 'neutral'} />
                  </div>
                ))}
              </div>
            </Card>
          )}

          {section === 'Sauvegardes' && (
            <Card>
              <h3 className="mb-4 text-sm font-semibold text-gray-900">Sauvegardes & export de données</h3>
              <p className="mb-4 text-xs text-gray-500">Dernière sauvegarde automatique : 21/05/2025 à 02:00 — statut : réussie.</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm">
                  <Download className="h-3.5 w-3.5" />
                  Exporter une sauvegarde
                </Button>
                <Button variant="secondary" size="sm">
                  <Upload className="h-3.5 w-3.5" />
                  Restaurer une sauvegarde
                </Button>
              </div>
            </Card>
          )}

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

function Field({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-500">{label}</label>
      <input
        defaultValue={value}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-accent-500 focus:outline-none"
      />
    </div>
  )
}

function ToggleRow({ label, description, checked }: { label: string; description: string; checked: boolean }): JSX.Element {
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

function MiniToggle({ checked }: { checked: boolean }): JSX.Element {
  return (
    <span className={`inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${checked ? 'bg-accent-500' : 'bg-gray-200'}`}>
      <span className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </span>
  )
}
