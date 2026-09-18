import { useState, type ComponentType } from 'react'
import {
  LayoutDashboard,
  BrainCircuit,
  Landmark,
  ShoppingCart,
  Package,
  Users,
  Settings,
  LogOut,
  Bell
} from 'lucide-react'
import type { Session } from '@shared/auth-types'
import type { PageId } from './nav-types'
import { Modal } from '@renderer/components/Modal'
import { DashboardPage } from '@renderer/features/dashboard/DashboardPage'
import { ControlTowerPage } from '@renderer/features/control-tower/ControlTowerPage'
import { AlertsPage } from '@renderer/features/alerts/AlertsPage'
import { FinancePage } from '@renderer/features/finance/FinancePage'
import { UsersPage } from '@renderer/features/users/UsersPage'
import { MemoryPage } from '@renderer/features/memory/MemoryPage'
import { StocksPage } from '@renderer/features/stocks/StocksPage'
import { SalesPage } from '@renderer/features/sales/SalesPage'
import { SettingsPage } from '@renderer/features/settings/SettingsPage'

interface AppShellProps {
  session: Session
  onLogout: () => void
}

interface NavItem {
  id: PageId
  label: string
  icon: ComponentType<{ className?: string }>
}

const FULL_NAV: NavItem[] = [
  { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { id: 'memory', label: "Mémoire d'entreprise", icon: BrainCircuit },
  { id: 'finance', label: 'Finance', icon: Landmark },
  { id: 'sales', label: 'Ventes', icon: ShoppingCart },
  { id: 'stocks', label: 'Stocks', icon: Package },
  { id: 'hr', label: 'RH', icon: Users },
  { id: 'settings', label: 'Paramètres', icon: Settings }
]

const LIMITED_NAV: NavItem[] = [
  { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { id: 'sales', label: 'Ventes', icon: ShoppingCart }
]

const ROLE_LABEL: Record<string, string> = {
  DIRIGEANT: 'Dirigeant',
  EMPLOYE: 'Employé'
}

export function AppShell({ session, onLogout }: AppShellProps): JSX.Element {
  const [activePage, setActivePage] = useState<PageId>('dashboard')
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const role = session.user.role
  const nav = role === 'DIRIGEANT' ? FULL_NAV : LIMITED_NAV
  const firstName = session.user.name.split(' ')[0]
  const initials = session.user.name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  function renderPage(): JSX.Element {
    switch (activePage) {
      case 'dashboard':
        return <DashboardPage userFirstName={firstName} onNavigate={setActivePage} />
      case 'control-tower':
        return <ControlTowerPage />
      case 'alerts':
        return <AlertsPage />
      case 'finance':
        return <FinancePage />
      case 'hr':
        return <UsersPage session={session} />
      case 'memory':
        return <MemoryPage />
      case 'stocks':
        return <StocksPage />
      case 'sales':
        return <SalesPage />
      case 'settings':
        return <SettingsPage session={session} />
    }
  }

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      {/* Sidebar */}
      <aside className="flex w-60 flex-col bg-brand-900 text-gray-200">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-500 font-bold text-brand-950">
            P
          </div>
          <span className="text-base font-semibold text-white">Pandora One</span>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {nav.map((item) => {
            const Icon = item.icon
            const active = item.id === activePage
            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                className={
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ' +
                  (active
                    ? 'bg-white/10 text-white'
                    : 'text-gray-300 hover:bg-white/5 hover:text-white')
                }
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="border-t border-white/10 px-3 py-4">
          <p className="px-3 text-[11px] uppercase tracking-wide text-gray-500">
            Secteur : {session.company.sector ?? 'non défini'}
          </p>
        </div>
      </aside>

      {/* Colonne principale */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3.5">
          <h1 className="text-sm font-semibold text-gray-900">{session.company.name}</h1>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActivePage('alerts')}
              title="Centre d'alertes"
              className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              <Bell className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2.5 rounded-full border border-gray-200 py-1 pl-1 pr-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-900 text-xs font-semibold text-white">
                {initials}
              </span>
              <div className="text-left leading-tight">
                <p className="text-xs font-medium text-gray-800">{session.user.name}</p>
                <p className="text-[11px] text-gray-500">{ROLE_LABEL[role]}</p>
              </div>
            </div>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              title="Déconnexion"
              className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-8">{renderPage()}</main>
      </div>

      {showLogoutConfirm && (
        <Modal title="Confirmer la déconnexion" onClose={() => setShowLogoutConfirm(false)}>
          <p className="text-sm text-gray-600">Voulez-vous vraiment vous déconnecter ?</p>
          <div className="mt-6 flex justify-end gap-2">
            <button
              onClick={() => setShowLogoutConfirm(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              onClick={onLogout}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Se déconnecter
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
