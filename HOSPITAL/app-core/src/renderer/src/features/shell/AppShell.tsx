import { useEffect, useState, type ComponentType } from 'react'
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Stethoscope,
  BedDouble,
  Siren,
  Scissors,
  FlaskConical,
  ScanLine,
  HeartPulse,
  Microscope,
  Telescope,
  Pill,
  Boxes,
  Droplets,
  Landmark,
  Wallet,
  Truck,
  UserCog,
  Settings,
  ShieldCheck,
  TriangleAlert,
  ClipboardCheck,
  FileText,
  BrainCircuit,
  BarChart3,
  Workflow,
  LogOut,
  Bell,
  Search,
  ChevronDown,
  Moon,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react'
import type { Session } from '@shared/auth-types'
import { applyModuleDependencies } from '@shared/setup-types'
import type { ConnectivityStatus } from '@shared/sync-types'
import type { PageId } from './nav-types'
import { PAGE_DOMAIN } from './nav-types'
import { accessLevel } from '@shared/permissions'
import { Modal } from '@renderer/components/Modal'
import { Button } from '@renderer/components/Button'
import { BrandMark } from '@renderer/components/BrandMark'
import { ConnectivityIndicator } from './ConnectivityIndicator'
import { SyncConflictToast } from './SyncConflictToast'
import { LayoutEditBanner, LayoutToggle } from './LayoutControls'
import { LayoutProvider } from '@renderer/components/layout-context'
import { DashboardPage } from '@renderer/features/dashboard/DashboardPage'
import { PatientsPage } from '@renderer/features/patients/PatientsPage'
import { PatientDetailPage } from '@renderer/features/patients/PatientDetailPage'
import { AppointmentsPage } from '@renderer/features/appointments/AppointmentsPage'
import { ConsultationsPage } from '@renderer/features/consultations/ConsultationsPage'
import { HospitalizationPage } from '@renderer/features/hospitalization/HospitalizationPage'
import { EmergenciesPage } from '@renderer/features/emergencies/EmergenciesPage'
import { OperatingRoomPage } from '@renderer/features/operating-room/OperatingRoomPage'
import { LaboratoryPage } from '@renderer/features/laboratory/LaboratoryPage'
import { ImagingPage } from '@renderer/features/imaging/ImagingPage'
import { CardiologyPage } from '@renderer/features/cardiology/CardiologyPage'
import { PathologyPage } from '@renderer/features/pathology/PathologyPage'
import { EndoscopyPage } from '@renderer/features/endoscopy/EndoscopyPage'
import { PharmacyPage } from '@renderer/features/pharmacy/PharmacyPage'
import { StocksPage } from '@renderer/features/stocks/StocksPage'
import { BloodBankPage } from '@renderer/features/blood-bank/BloodBankPage'
import { FinancePage } from '@renderer/features/finance/FinancePage'
import { CashierPage } from '@renderer/features/cashier/CashierPage'
import { ProcurementPage } from '@renderer/features/procurement/ProcurementPage'
import { HRPage } from '@renderer/features/hr/HrPage'
import { QualityPage } from '@renderer/features/quality/QualityPage'
import { RiskManagementPage } from '@renderer/features/risk-management/RiskManagementPage'
import { AuditCompliancePage } from '@renderer/features/audit-compliance/AuditCompliancePage'
import { DocumentsPage } from '@renderer/features/documents/DocumentsPage'
import { SettingsPage } from '@renderer/features/settings/SettingsPage'
import { AIPredictionsPage } from '@renderer/features/ai-predictions/AIPredictionsPage'
import { AnalyticsPage } from '@renderer/features/analytics/AnalyticsPage'
import { AutomationStudioPage } from '@renderer/features/automation-studio/AutomationStudioPage'
import { ComingSoonPage } from '@renderer/features/shell/ComingSoonPage'
import { CommandPalette, type PaletteCommand } from './CommandPalette'
import { SubscriptionBanner, SubscriptionLock } from '@renderer/features/subscription/SubscriptionLock'
import { useSubscription } from '@renderer/features/subscription/useSubscription'

interface AppShellProps {
  session: Session
  /** Écrans à afficher dans la navigation pour ce poste (voir Plan-Installeur-Configurable.md) —
   * `dashboard` et `settings` restent toujours visibles quel que soit ce tableau (voir plus bas). */
  enabledModules: string[]
  onLogout: () => void
}

interface NavItem {
  id: PageId
  label: string
  icon: ComponentType<{ className?: string }>
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const NAV: NavGroup[] = [
  {
    label: 'Soins & Patients',
    items: [
      { id: 'patients', label: 'Patients', icon: Users },
      { id: 'appointments', label: 'Rendez-vous', icon: CalendarDays },
      { id: 'consultations', label: 'Consultations', icon: Stethoscope },
      { id: 'hospitalization', label: 'Hospitalisation', icon: BedDouble },
      { id: 'emergencies', label: 'Urgences', icon: Siren }
    ]
  },
  {
    label: 'Examens & plateau technique',
    items: [
      { id: 'laboratory', label: 'Laboratoire', icon: FlaskConical },
      { id: 'imaging', label: 'Imagerie médicale', icon: ScanLine },
      { id: 'cardiology', label: 'Cardiologie', icon: HeartPulse },
      { id: 'pathology', label: 'Anatomopathologie', icon: Microscope },
      { id: 'endoscopy', label: 'Endoscopie', icon: Telescope },
      { id: 'operating-room', label: 'Bloc opératoire', icon: Scissors }
    ]
  },
  {
    label: 'Médicaments & stocks',
    items: [
      { id: 'pharmacy', label: 'Pharmacie', icon: Pill },
      { id: 'stocks', label: 'Stocks & Dépôts', icon: Boxes },
      { id: 'blood-bank', label: 'Banque de sang', icon: Droplets }
    ]
  },
  {
    label: 'Finance',
    items: [
      { id: 'cashier', label: 'Caisse', icon: Wallet },
      { id: 'finance', label: 'Comptabilité', icon: Landmark }
    ]
  },
  {
    label: 'Administration',
    items: [
      { id: 'procurement', label: 'Approvisionnement', icon: Truck },
      { id: 'hr', label: 'Ressources Humaines', icon: UserCog },
      { id: 'settings', label: 'Paramètres', icon: Settings }
    ]
  },
  {
    label: 'Gouvernance & qualité',
    items: [
      { id: 'quality', label: 'Qualité & Accréditation', icon: ShieldCheck },
      { id: 'risk-management', label: 'Gestion des risques', icon: TriangleAlert },
      { id: 'audit-compliance', label: 'Audit & Conformité', icon: ClipboardCheck },
      { id: 'documents', label: 'Documents & signature électronique', icon: FileText }
    ]
  },
  {
    label: 'Intelligence & pilotage',
    items: [
      { id: 'ai-predictions', label: 'IA & Prédictions', icon: BrainCircuit },
      { id: 'analytics', label: 'Rapports & Analyse', icon: BarChart3 },
      { id: 'automation-studio', label: 'Automation Studio', icon: Workflow }
    ]
  }
]

const NAV_LABELS: Record<PageId, string> = NAV.reduce(
  (acc, group) => {
    for (const item of group.items) acc[item.id] = item.label
    return acc
  },
  { dashboard: 'Tableau de bord' } as Record<PageId, string>
)

const ROLE_LABEL: Record<string, string> = {
  DIRIGEANT: 'Directeur Général',
  MEDECIN: 'Médecin',
  INFIRMIER: 'Infirmier(ère)',
  TECHNICIEN: 'Technicien',
  PHARMACIEN: 'Pharmacien',
  ADMINISTRATIF: 'Administratif',
  CAISSIER: 'Caissier(ère)'
}

interface RailItemProps {
  icon: ComponentType<{ className?: string }>
  label: string
  active: boolean
  collapsed: boolean
  onClick: () => void
}

/** Entrée de la barre latérale : l'écran actif porte une barre verte lumineuse à gauche. */
function RailItem({ icon: Icon, label, active, collapsed, onClick }: RailItemProps): JSX.Element {
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      aria-current={active ? 'page' : undefined}
      className={
        'relative flex w-full items-center gap-3 rounded-[10px] py-2 text-[13.5px] transition-colors ' +
        (collapsed ? 'justify-center px-0 ' : 'px-2.5 ') +
        (active
          ? 'bg-gradient-to-r from-[#34cc6b]/[0.16] to-transparent font-semibold text-white'
          : 'text-[#c3d1c9] hover:bg-white/[0.05] hover:text-white')
      }
    >
      {active && (
        <span
          className={
            'absolute top-1.5 bottom-1.5 w-[3px] rounded-full bg-[#34cc6b] shadow-[0_0_10px_#34cc6b] left-0'
          }
        />
      )}
      <Icon className={'h-[17px] w-[17px] shrink-0 ' + (active ? 'text-[#34cc6b]' : 'opacity-80')} />
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  )
}

export function AppShell({ session, enabledModules, onLogout }: AppShellProps): JSX.Element {
  // `settings` toujours visible (sinon impossible de rouvrir Paramètres → Établissement pour
  // réactiver un module décoché par erreur) — voir ModuleTree.tsx pour l'édition de ce réglage.
  // Deux filtres cumulés : modules activés pour l'établissement ET droits du rôle (un écran sans
  // aucun accès pour ce rôle est masqué — ex. un caissier ne voit que Caisse, Patients et Paramètres).
  // Troisième filtre : modules couverts par l'abonnement Pandora (payés + gratuits) — voir
  // subscription.service.ts ; null = pas de restriction (contrôle non appliqué en développement).
  const subscription = useSubscription()
  const paidSet = subscription?.allowedModules ? new Set(subscription.allowedModules) : null
  const enabledSet = new Set(applyModuleDependencies(enabledModules).filter((id) => !paidSet || paidSet.has(id)))
  const canSee = (page: PageId): boolean => accessLevel(session.user.role, PAGE_DOMAIN[page]) !== 'none'
  const visibleNav = NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.id === 'settings' || (enabledSet.has(item.id) && canSee(item.id)))
  })).filter((group) => group.items.length > 0)
  const showDashboard = canSee('dashboard')
  // Page d'arrivée : le tableau de bord, ou — pour un rôle qui n'y a pas accès (caissier) — le
  // premier écran autorisé du menu.
  const cashierVisible = visibleNav.some((group) => group.items.some((item) => item.id === 'cashier'))
  const [activePage, setActivePage] = useState<PageId>(() =>
    showDashboard ? 'dashboard' : cashierVisible ? 'cashier' : (visibleNav[0]?.items[0]?.id ?? 'settings')
  )
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  // Ouverture de Paramètres directement sur « Abonnement » (bandeau d'échéance) ; `settingsKey`
  // remonte la page pour appliquer la section même si Paramètres est déjà affiché.
  const [settingsSection, setSettingsSection] = useState<'Abonnement' | 'Apparence' | undefined>(undefined)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('pandora-sidebar-collapsed') === '1'
    } catch {
      return false
    }
  })

  function toggleCollapsed(): void {
    setCollapsed((value) => {
      try {
        localStorage.setItem('pandora-sidebar-collapsed', value ? '0' : '1')
      } catch {
        // Préférence non mémorisée : sans conséquence.
      }
      return !value
    })
  }
  const [settingsKey, setSettingsKey] = useState(0)
  const [openGroups, setOpenGroups] = useState<ReadonlySet<string>>(
    () => new Set([visibleNav[0]?.label ?? NAV[0].label, ...(showDashboard || !cashierVisible ? [] : ['Finance'])])
  )
  // Bandeau hors-ligne (voir ConnectivityIndicator.tsx pour l'icône détaillée dans l'en-tête) :
  // un rappel explicite au-dessus de chaque écran évite de laisser croire à une panne générale de
  // l'app quand seuls certains modules manquent de copie locale — voir NETWORK_ERROR_MESSAGE côté
  // main (remote-api.client.ts).
  const [connectivityStatus, setConnectivityStatus] = useState<ConnectivityStatus | null>(null)

  useEffect(() => {
    let cancelled = false
    window.api.connectivity.status().then((s) => {
      if (!cancelled) setConnectivityStatus(s)
    })
    const unsubscribe = window.api.connectivity.onChange(setConnectivityStatus)
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  const role = session.user.role
  const initials = session.user.name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  useEffect(() => {
    // Sauvegarde automatique quotidienne (item 21) : une tentative par ouverture de session,
    // silencieuse (voir ensureDailyBackup) — seul le DIRIGEANT y a accès côté serveur.
    if (role === 'DIRIGEANT') {
      window.api.backup.ensureDaily().catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Recherche universelle : Ctrl+K (ou Cmd+K) depuis n'importe quel écran.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPaletteOpen((open) => !open)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  function openSettingsSection(sectionName: 'Abonnement' | 'Apparence'): void {
    navigate('settings')
    setSettingsSection(sectionName)
    setSettingsKey((k) => k + 1)
  }

  const paletteCommands: PaletteCommand[] = [
    ...(showDashboard ? [{ id: 'page:dashboard', group: 'Écrans' as const, label: 'Tableau de bord', icon: LayoutDashboard, run: () => navigate('dashboard') }] : []),
    ...visibleNav.flatMap((group) =>
      group.items.map((item) => ({
        id: `page:${item.id}`,
        group: 'Écrans' as const,
        label: item.label,
        hint: group.label,
        icon: item.icon,
        run: () => navigate(item.id)
      }))
    ),
    { id: 'action:subscription', group: 'Actions', label: 'Voir mon abonnement', hint: 'Paramètres', keywords: 'abonnement payer renouveler', icon: Settings, run: () => openSettingsSection('Abonnement') },
    { id: 'action:theme', group: 'Actions', label: 'Changer le thème (clair / sombre)', hint: 'Apparence', keywords: 'mode sombre clair nuit', icon: Moon, run: () => openSettingsSection('Apparence') },
    { id: 'action:logout', group: 'Actions', label: 'Se déconnecter', icon: LogOut, run: () => setShowLogoutConfirm(true) }
  ]

  function toggleGroup(label: string): void {
    setOpenGroups((prev) => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  function navigate(page: PageId): void {
    setSettingsSection(undefined)
    setActivePage(page)
    if (page !== 'patients') setSelectedPatientId(null)
    const group = NAV.find((g) => g.items.some((item) => item.id === page))
    if (group) setOpenGroups((prev) => new Set(prev).add(group.label))
  }

  function openPatient(id: string): void {
    setSelectedPatientId(id)
    setActivePage('patients')
  }

  function renderPage(): JSX.Element {
    // Écran ouvert avant l'arrivée de l'état d'abonnement (ou lien interne) vers un module non payé.
    if (paidSet && activePage !== 'dashboard' && activePage !== 'settings' && !paidSet.has(activePage)) {
      return (
        <div className="mx-auto mt-16 max-w-md text-center">
          <p className="text-sm font-semibold text-gray-900">{NAV_LABELS[activePage]} n&apos;est pas inclus dans votre abonnement.</p>
          <p className="mt-1 text-sm text-gray-500">Le dirigeant peut l&apos;ajouter dans Paramètres › Abonnement.</p>
        </div>
      )
    }
    if (activePage === 'dashboard') {
      return <DashboardPage userFirstName={session.user.name.split(' ')[0]} onNavigate={navigate} />
    }
    if (activePage === 'patients') {
      if (selectedPatientId) {
        return (
          <PatientDetailPage patientId={selectedPatientId} onBack={() => setSelectedPatientId(null)} />
        )
      }
      return <PatientsPage onOpenPatient={openPatient} />
    }
    if (activePage === 'appointments') {
      return <AppointmentsPage onOpenPatient={openPatient} session={session} />
    }
    if (activePage === 'consultations') {
      return <ConsultationsPage onOpenPatient={openPatient} onNavigate={navigate} />
    }
    if (activePage === 'hospitalization') {
      return <HospitalizationPage onOpenPatient={openPatient} />
    }
    if (activePage === 'emergencies') {
      return <EmergenciesPage onOpenPatient={openPatient} />
    }
    if (activePage === 'operating-room') {
      return <OperatingRoomPage onOpenPatient={openPatient} />
    }
    if (activePage === 'laboratory') {
      return <LaboratoryPage onOpenPatient={openPatient} />
    }
    if (activePage === 'imaging') {
      return <ImagingPage onOpenPatient={openPatient} />
    }
    if (activePage === 'cardiology') {
      return <CardiologyPage onOpenPatient={openPatient} />
    }
    if (activePage === 'pathology') {
      return <PathologyPage onOpenPatient={openPatient} />
    }
    if (activePage === 'endoscopy') {
      return <EndoscopyPage onOpenPatient={openPatient} />
    }
    if (activePage === 'pharmacy') {
      return <PharmacyPage onNavigate={navigate} />
    }
    if (activePage === 'stocks') {
      return <StocksPage />
    }
    if (activePage === 'blood-bank') {
      return <BloodBankPage onOpenPatient={openPatient} />
    }
    if (activePage === 'cashier') {
      return <CashierPage session={session} />
    }
    if (activePage === 'finance') {
      return <FinancePage />
    }
    if (activePage === 'procurement') {
      return <ProcurementPage />
    }
    if (activePage === 'hr') {
      return <HRPage />
    }
    if (activePage === 'quality') {
      return <QualityPage />
    }
    if (activePage === 'risk-management') {
      return <RiskManagementPage />
    }
    if (activePage === 'audit-compliance') {
      return <AuditCompliancePage />
    }
    if (activePage === 'documents') {
      return <DocumentsPage session={session} />
    }
    if (activePage === 'settings') {
      return <SettingsPage key={settingsKey} session={session} onLogout={onLogout} initialSection={settingsSection} />
    }
    if (activePage === 'ai-predictions') {
      return <AIPredictionsPage />
    }
    if (activePage === 'analytics') {
      return <AnalyticsPage />
    }
    if (activePage === 'automation-studio') {
      return <AutomationStudioPage />
    }
    return <ComingSoonPage title={NAV_LABELS[activePage]} />
  }

  return (
    <LayoutProvider userId={session.user.id}>
    <div className="flex h-screen bg-gray-50 text-gray-900">
      <SyncConflictToast />
      {/* Barre latérale « encre » (Plan-Refonte-Graphique.md §5) : toujours sombre, élément actif
          signalé par une barre verte lumineuse ; réductible en icônes seules (mémorisé sur le poste). */}
      <aside
        className={
          'flex shrink-0 flex-col border-r border-white/[0.04] bg-ink-950 text-[#d3e0d8] transition-[width] duration-200 ' +
          (collapsed ? 'w-[72px]' : 'w-64')
        }
      >
        <div className={'flex items-center gap-2.5 border-b border-white/[0.06] py-4 ' + (collapsed ? 'justify-center px-2' : 'px-4')}>
          <BrandMark className="h-9 w-9 shadow-[0_0_18px_rgba(52,204,107,0.25)]" />
          {!collapsed && (
            <div className="leading-none">
              <p className="font-display text-[14px] font-extrabold tracking-[0.04em] text-white">PANDORA</p>
              <p className="mt-1 text-[10px] font-semibold tracking-[0.24em] text-gold-400">HEALTH</p>
            </div>
          )}
        </div>

        <nav className={'rail-scroll flex-1 overflow-y-auto pt-4 pb-4 ' + (collapsed ? 'space-y-1 px-2' : 'space-y-4 px-3')}>
          {showDashboard && (
            <RailItem
              icon={LayoutDashboard}
              label="Tableau de bord"
              active={activePage === 'dashboard'}
              collapsed={collapsed}
              onClick={() => navigate('dashboard')}
            />
          )}

          {visibleNav.map((group) => {
            const open = collapsed || openGroups.has(group.label)
            return (
              <div key={group.label} className={collapsed ? 'space-y-1 border-t border-white/[0.06] pt-1' : ''}>
                {!collapsed && (
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className="flex w-full items-center justify-between gap-2 px-2.5 pb-1.5 text-left text-[10px] font-semibold tracking-[0.12em] text-[#74877c] uppercase hover:text-[#b8c7bf]"
                  >
                    <span className="truncate">{group.label}</span>
                    <ChevronDown className={'h-3 w-3 shrink-0 transition-transform ' + (open ? 'rotate-0' : '-rotate-90')} />
                  </button>
                )}
                <div className={'grid transition-all duration-200 ease-out ' + (open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}>
                  <div className="space-y-0.5 overflow-hidden">
                    {group.items.map((item) => (
                      <RailItem
                        key={item.id}
                        icon={item.icon}
                        label={item.label}
                        active={item.id === activePage}
                        collapsed={collapsed}
                        onClick={() => navigate(item.id)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </nav>

        {subscription && (subscription.state === 'ACTIVE' || subscription.state === 'EXPIRING') && subscription.endDate && !collapsed && (
          <button
            onClick={() => openSettingsSection('Abonnement')}
            className={
              'mx-3 mb-2 rounded-xl border px-3 py-2.5 text-left text-xs transition-colors ' +
              (subscription.state === 'EXPIRING'
                ? 'border-amber-400/40 bg-amber-400/10 hover:bg-amber-400/15'
                : 'border-gold-400/30 bg-gradient-to-br from-gold-400/[0.12] to-transparent hover:border-gold-400/50')
            }
          >
            <span className={'block font-semibold ' + (subscription.state === 'EXPIRING' ? 'text-amber-300' : 'text-gold-400')}>
              {subscription.state === 'EXPIRING' ? 'Abonnement à renouveler' : 'Abonnement à jour'}
            </span>
            <span className="text-[#8fa398]">Jusqu&apos;au {subscription.endDate.split('-').reverse().join('/')}</span>
          </button>
        )}

        <button
          onClick={toggleCollapsed}
          title={collapsed ? 'Déplier le menu' : 'Réduire le menu'}
          className={'flex items-center gap-2 border-t border-white/[0.06] py-3 text-xs text-[#74877c] hover:text-white ' + (collapsed ? 'justify-center' : 'px-5')}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          {!collapsed && 'Réduire le menu'}
        </button>
      </aside>

      {/* Colonne principale */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="z-10 flex items-center justify-between gap-4 border-b border-gray-200/80 bg-white px-6 py-3">
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="flex w-full max-w-md items-center gap-2.5 rounded-[10px] border border-gray-200 bg-gray-50 px-3 py-2 text-left text-sm text-gray-400 transition-colors hover:border-accent-500/50 hover:bg-white"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">Rechercher un patient, un dossier, un écran…</span>
            <kbd className="shrink-0 rounded-md border border-gray-300 bg-white px-1.5 py-0.5 font-mono text-[11px] text-gray-500">Ctrl K</kbd>
          </button>

          <div className="flex shrink-0 items-center gap-3">
            <LayoutToggle />
            <ConnectivityIndicator />

            <button
              title="Notifications"
              className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              <Bell className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2.5 rounded-full border border-gray-200 py-1 pl-1 pr-3 transition-colors hover:border-gray-300">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#34cc6b] to-gold-400 font-display text-xs font-bold text-ink-950">
                {initials}
              </span>
              <div className="text-left leading-tight">
                <p className="text-xs font-medium text-gray-800">{session.user.name}</p>
                <p className="text-[11px] text-gray-500">{ROLE_LABEL[role] ?? role}</p>
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

        <main className="flex-1 overflow-auto px-8 py-7">
          {connectivityStatus === 'OFFLINE' && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-100 px-4 py-2.5 text-xs text-gray-600">
              <TriangleAlert className="h-3.5 w-3.5 shrink-0 text-gray-400" />
              Hors ligne — certains écrans affichent uniquement les données déjà consultées en ligne
              auparavant ; d&apos;autres nécessitent une connexion pour fonctionner.
            </div>
          )}
          {session.user.email === 'admin@pandorahealth.local' && (
            <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
              <span className="flex items-center gap-2">
                <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
                Vous utilisez encore le compte administrateur par défaut créé à l&apos;installation — pensez à
                changer son email et son mot de passe.
              </span>
              <button
                onClick={() => navigate('settings')}
                className="shrink-0 rounded-lg border border-amber-300 bg-white px-2.5 py-1 font-medium text-amber-700 hover:bg-amber-100"
              >
                Aller aux Paramètres
              </button>
            </div>
          )}
          {subscription && (
            <SubscriptionBanner
              info={subscription}
              onOpen={() => openSettingsSection('Abonnement')}
            />
          )}
          <LayoutEditBanner pageKey={`${activePage}:${selectedPatientId ?? ''}`} />
          {renderPage()}
        </main>
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        commands={paletteCommands}
        onOpenPatient={canSee('patients') && enabledSet.has('patients') ? openPatient : undefined}
      />

      {subscription?.blocked && <SubscriptionLock info={subscription} session={session} onLogout={onLogout} />}

      {showLogoutConfirm && (
        <Modal title="Confirmer la déconnexion" onClose={() => setShowLogoutConfirm(false)}>
          <p className="text-sm text-gray-600">Voulez-vous vraiment vous déconnecter ?</p>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowLogoutConfirm(false)}>
              Annuler
            </Button>
            <Button variant="danger" onClick={onLogout}>
              Se déconnecter
            </Button>
          </div>
        </Modal>
      )}
    </div>
    </LayoutProvider>
  )
}
