import { useEffect, useState } from 'react'
import { Ban, CheckCircle2, History, Loader2 } from 'lucide-react'
import { Card } from '@renderer/components/Card'
import { StatusBadge, type StatusTone } from '@renderer/components/StatusBadge'
import { PageHeader } from '@renderer/components/PageHeader'
import { Modal } from '@renderer/components/Modal'
import type { Session } from '@shared/auth-types'
import type { AuditLogEntry, ManagedUser } from '@shared/users-types'

interface UsersPageProps {
  session: Session
}

const ROLE_LABEL: Record<string, string> = {
  DIRIGEANT: 'Dirigeant',
  EMPLOYE: 'Employé'
}

const ROLE_TONE: Record<string, StatusTone> = {
  DIRIGEANT: 'opportunity',
  EMPLOYE: 'info'
}

const ACTION_LABEL: Record<string, string> = {
  'auth.login': 'Connexion',
  'finance.invoice.create': "Création d'une facture",
  'sales.sale.create': "Enregistrement d'une vente",
  'stocks.item.create': "Ajout d'un article en stock",
  'memory.question.ask': "Question posée à l'assistant mémoire",
  'company.logo.update': "Mise à jour du logo de l'entreprise"
}

function actionLabel(action: string): string {
  return ACTION_LABEL[action] ?? action
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function initialsOf(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function UsersPage({ session }: UsersPageProps): JSX.Element {
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [suspendTarget, setSuspendTarget] = useState<ManagedUser | null>(null)
  const [historyTarget, setHistoryTarget] = useState<ManagedUser | null>(null)

  async function loadUsers(): Promise<void> {
    setLoading(true)
    setError(null)
    const result = await window.api.users.list()
    if (!result.ok) {
      setError(result.error)
      setLoading(false)
      return
    }
    setUsers(result.data.users)
    setLoading(false)
  }

  useEffect(() => {
    loadUsers()
  }, [])

  async function applySetActive(id: string, isActive: boolean): Promise<void> {
    setPendingId(id)
    const result = await window.api.users.setActive(id, isActive)
    setPendingId(null)

    if (!result.ok) {
      setError(result.error)
      return
    }

    setUsers((prev) => prev.map((u) => (u.id === id ? result.data.user : u)))
    setSuspendTarget(null)
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        breadcrumb={['RH', 'Utilisateurs & Rôles']}
        title="Gestion de l'équipe"
        subtitle="Gérez les accès de votre organisation et consultez l'activité de chacun."
      />

      {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}

      <Card className="p-0">
        {loading ? (
          <p className="px-6 py-8 text-center text-sm text-gray-400">Chargement…</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <th className="px-6 py-3 font-medium">Membre</th>
                <th className="px-6 py-3 font-medium">Rôle</th>
                <th className="px-6 py-3 font-medium">Statut</th>
                <th className="px-6 py-3 font-medium">Depuis</th>
                <th className="px-6 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const isSelf = user.id === session.user.id
                return (
                  <tr key={user.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
                          {initialsOf(user.name)}
                        </span>
                        <div>
                          <p className="font-medium text-gray-900">
                            {user.name}
                            {isSelf && <span className="ml-1.5 text-xs font-normal text-gray-400">(vous)</span>}
                          </p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <StatusBadge label={ROLE_LABEL[user.role] ?? user.role} tone={ROLE_TONE[user.role] ?? 'neutral'} />
                    </td>
                    <td className="px-6 py-3.5">
                      <StatusBadge label={user.isActive ? 'Actif' : 'Suspendu'} tone={user.isActive ? 'success' : 'neutral'} />
                    </td>
                    <td className="px-6 py-3.5 text-gray-500">{formatDate(user.createdAt)}</td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setHistoryTarget(user)}
                          title="Historique d'activité"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        >
                          <History className="h-4 w-4" />
                        </button>
                        {user.isActive ? (
                          <button
                            onClick={() => setSuspendTarget(user)}
                            disabled={isSelf || pendingId === user.id}
                            title={isSelf ? 'Vous ne pouvez pas suspendre votre propre compte' : 'Suspendre'}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400"
                          >
                            {pendingId === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                          </button>
                        ) : (
                          <button
                            onClick={() => applySetActive(user.id, true)}
                            disabled={pendingId === user.id}
                            title="Réactiver"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-green-50 hover:text-green-600 disabled:opacity-30"
                          >
                            {pendingId === user.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>

      {suspendTarget && (
        <Modal title="Confirmer la suspension" onClose={() => setSuspendTarget(null)}>
          <p className="text-sm text-gray-600">
            Voulez-vous vraiment suspendre l&apos;accès de <span className="font-medium text-gray-900">{suspendTarget.name}</span>{' '}
            ? Sa session en cours sera immédiatement coupée et il ne pourra plus se reconnecter tant que vous ne
            réactivez pas son compte.
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <button
              onClick={() => setSuspendTarget(null)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              onClick={() => applySetActive(suspendTarget.id, false)}
              disabled={pendingId === suspendTarget.id}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
            >
              {pendingId === suspendTarget.id ? 'Suspension…' : 'Suspendre'}
            </button>
          </div>
        </Modal>
      )}

      {historyTarget && <UserHistoryModal user={historyTarget} onClose={() => setHistoryTarget(null)} />}
    </div>
  )
}

function UserHistoryModal({ user, onClose }: { user: ManagedUser; onClose: () => void }): JSX.Element {
  const [entries, setEntries] = useState<AuditLogEntry[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadPage(targetPage: number): Promise<void> {
    setLoading(true)
    setError(null)
    const result = await window.api.users.activity(user.id, targetPage)
    setLoading(false)

    if (!result.ok) {
      setError(result.error)
      return
    }

    setEntries((prev) => (targetPage === 1 ? result.data.items : [...prev, ...result.data.items]))
    setTotal(result.data.total)
    setPage(targetPage)
  }

  useEffect(() => {
    loadPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id])

  const hasMore = entries.length < total

  return (
    <Modal title={`Historique — ${user.name}`} onClose={onClose} widthClassName="max-w-lg">
      {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {loading && entries.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">Chargement…</p>
      ) : entries.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">Aucune activité enregistrée pour cet utilisateur.</p>
      ) : (
        <div className="max-h-[60vh] space-y-1 overflow-y-auto">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between border-b border-gray-100 py-2.5 last:border-0">
              <span className="text-sm text-gray-800">{actionLabel(entry.action)}</span>
              <span className="text-xs text-gray-400">{formatDate(entry.createdAt)}</span>
            </div>
          ))}
        </div>
      )}

      {hasMore && (
        <button
          onClick={() => loadPage(page + 1)}
          disabled={loading}
          className="mt-4 w-full rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60"
        >
          {loading ? 'Chargement…' : 'Charger plus'}
        </button>
      )}
    </Modal>
  )
}
