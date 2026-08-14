import { useState } from 'react'
import { UserPlus, MoreVertical } from 'lucide-react'
import { Card } from '@renderer/components/Card'
import { PageHeader } from '@renderer/components/PageHeader'

interface Member {
  initials: string
  name: string
  email: string
  role: 'Dirigeant' | 'Manager' | 'Employé'
  status: 'Actif' | 'Invité en attente'
}

const MEMBERS: Member[] = [
  { initials: 'AD', name: 'Amina Dirigeante', email: 'amina.d@entreprise.com', role: 'Dirigeant', status: 'Actif' },
  { initials: 'JL', name: 'Jean Lefebvre', email: 'jean.l@entreprise.com', role: 'Manager', status: 'Actif' },
  { initials: 'SR', name: 'Sophie Robert', email: 'sophie.r@entreprise.com', role: 'Employé', status: 'Invité en attente' },
  { initials: 'MK', name: 'Marc Kone', email: 'marc.k@entreprise.com', role: 'Manager', status: 'Actif' }
]

const ROLE_BADGE: Record<Member['role'], string> = {
  Dirigeant: 'bg-violet-50 text-violet-700',
  Manager: 'bg-blue-50 text-blue-700',
  Employé: 'bg-gray-100 text-gray-700'
}

const AVATAR_BG = ['bg-green-100 text-green-700', 'bg-blue-100 text-blue-700', 'bg-gray-100 text-gray-600', 'bg-amber-100 text-amber-700']

export function UsersPage(): JSX.Element {
  const [tab, setTab] = useState<'members' | 'invites'>('members')
  const pendingCount = MEMBERS.filter((m) => m.status === 'Invité en attente').length

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        breadcrumb={['RH', 'Utilisateurs & Rôles']}
        title="Gestion de l'équipe"
        subtitle="Gérez les accès et les permissions des membres de votre organisation."
        actions={
          <button className="flex items-center gap-2 rounded-lg bg-accent-500 px-3.5 py-2 text-sm font-medium text-white hover:bg-accent-600">
            <UserPlus className="h-4 w-4" />
            Inviter un utilisateur
          </button>
        }
      />

      <Card className="p-0">
        <div className="flex items-center gap-6 border-b border-gray-100 px-6">
          <button
            onClick={() => setTab('members')}
            className={
              'border-b-2 py-3.5 text-sm font-medium ' +
              (tab === 'members' ? 'border-accent-500 text-accent-600' : 'border-transparent text-gray-500 hover:text-gray-700')
            }
          >
            Tous les membres ({MEMBERS.length})
          </button>
          <button
            onClick={() => setTab('invites')}
            className={
              'border-b-2 py-3.5 text-sm font-medium ' +
              (tab === 'invites' ? 'border-accent-500 text-accent-600' : 'border-transparent text-gray-500 hover:text-gray-700')
            }
          >
            Invitations en attente ({pendingCount})
          </button>
        </div>

        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <th className="px-6 py-3 font-medium">Membre</th>
              <th className="px-6 py-3 font-medium">Rôle</th>
              <th className="px-6 py-3 font-medium">Statut</th>
              <th className="w-10 px-6 py-3" />
            </tr>
          </thead>
          <tbody>
            {MEMBERS.filter((m) => (tab === 'members' ? true : m.status === 'Invité en attente')).map((member, index) => (
              <tr key={member.email} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                <td className="px-6 py-3.5">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold ${AVATAR_BG[index % AVATAR_BG.length]}`}>
                      {member.initials}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">{member.name}</p>
                      <p className="text-xs text-gray-500">{member.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-3.5">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ROLE_BADGE[member.role]}`}>{member.role}</span>
                </td>
                <td className="px-6 py-3.5">
                  <span className={'inline-flex items-center gap-1.5 text-sm ' + (member.status === 'Actif' ? 'text-green-600' : 'text-gray-500')}>
                    <span className={'h-1.5 w-1.5 rounded-full ' + (member.status === 'Actif' ? 'bg-green-500' : 'bg-gray-300')} />
                    {member.status}
                  </span>
                </td>
                <td className="px-6 py-3.5 text-right">
                  <MoreVertical className="ml-auto h-4 w-4 text-gray-400" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="px-6 py-4 text-xs text-gray-500">Affichage de {MEMBERS.length} sur 12 membres</div>
      </Card>
    </div>
  )
}
