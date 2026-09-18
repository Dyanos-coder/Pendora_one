import { useState, type ComponentType } from 'react'
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
  ChevronDown
} from 'lucide-react'
import type { Session } from '@shared/auth-types'
import type { PageId } from './nav-types'
import { IMPLEMENTED_PAGES } from './nav-types'
import { Modal } from '@renderer/components/Modal'
import { Button } from '@renderer/components/Button'
import { BrandMark } from '@renderer/components/BrandMark'
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

interface AppShellProps {
  session: Session
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
      { id: 'emergencies', label: 'Urgences', icon: Siren },
      { id: 'operating-room', label: 'Bloc opératoire', icon: Scissors }
    ]
  },
  {
    label: 'Examens & plateau technique',
    items: [
      { id: 'laboratory', label: 'Laboratoire', icon: FlaskConical },
      { id: 'imaging', label: 'Imagerie médicale', icon: ScanLine },
      { id: 'cardiology', label: 'Cardiologie', icon: HeartPulse },
      { id: 'pathology', label: 'Anatomopathologie', icon: Microscope },
      { id: 'endoscopy', label: 'Endoscopie', icon: Telescope }
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
    label: 'Administration',
    items: [
      { id: 'finance', label: 'Finances', icon: Landmark },
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
      { id: 'documents', label: 'Documents & Protocoles', icon: FileText }
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
  ADMINISTRATIF: 'Administratif'
}

export function AppShell({ session, onLogout }: AppShellProps): JSX.Element {
  const [activePage, setActivePage] = useState<PageId>('dashboard')
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [openGroups, setOpenGroups] = useState<ReadonlySet<string>>(() => new Set([NAV[0].label]))

  const role = session.user.role
  const initials = session.user.name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  function toggleGroup(label: string): void {
    setOpenGroups((prev) => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  function navigate(page: PageId): void {
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
      return <AppointmentsPage onOpenPatient={openPatient} />
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
      return <DocumentsPage />
    }
    if (activePage === 'settings') {
      return <SettingsPage session={session} onLogout={onLogout} />
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
    <div className="flex h-screen bg-gray-50 text-gray-900">
      {/* Sidebar */}
      <aside className="flex w-64 shrink-0 flex-col border-r border-gray-200 bg-white">
        <div className="flex items-center gap-2.5 border-b border-gray-100 px-5 py-5">
          <BrandMark />
          <div className="leading-tight">
            <p className="text-sm font-bold tracking-tight text-gray-900">PANDORA</p>
            <p className="text-xs font-semibold tracking-wide text-accent-600">HEALTH</p>
          </div>
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto px-3 pt-4 pb-4">
          <button
            onClick={() => navigate('dashboard')}
            className={
              'flex w-full items-center gap-3 rounded-lg border-l-2 py-2 pl-2.5 pr-3 text-sm font-medium transition-colors ' +
              (activePage === 'dashboard'
                ? 'border-accent-500 bg-accent-50 font-semibold text-accent-700'
                : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900')
            }
          >
            <LayoutDashboard className="h-4 w-4" />
            Tableau de bord
          </button>

          {NAV.map((group) => {
            const open = openGroups.has(group.label)
            return (
              <div key={group.label}>
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="flex w-full items-center justify-between px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 hover:text-gray-600"
                >
                  {group.label}
                  <ChevronDown className={'h-3 w-3 transition-transform ' + (open ? 'rotate-0' : '-rotate-90')} />
                </button>
                <div
                  className={
                    'grid transition-all duration-200 ease-out ' +
                    (open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')
                  }
                >
                  <div className="space-y-0.5 overflow-hidden">
                    {group.items.map((item) => {
                      const Icon = item.icon
                      const active = item.id === activePage
                      return (
                        <button
                          key={item.id}
                          onClick={() => navigate(item.id)}
                          className={
                            'flex w-full items-center gap-3 rounded-lg border-l-2 py-2 pl-2.5 pr-3 text-sm font-medium transition-colors ' +
                            (active
                              ? 'border-accent-500 bg-accent-50 font-semibold text-accent-700'
                              : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900')
                          }
                        >
                          <Icon className="h-4 w-4" />
                          {item.label}
                          {!IMPLEMENTED_PAGES.has(item.id) && (
                            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-gray-300" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}
        </nav>
      </aside>

      {/* Colonne principale */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="z-10 flex items-center justify-between gap-4 border-b border-gray-100 bg-white px-6 py-3 shadow-sm">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              placeholder="Rechercher un patient, dossier, acte, médicament..."
              className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-accent-500 focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <button
              title="Notifications"
              className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              <Bell className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2.5 rounded-full border border-gray-200 py-1 pl-1 pr-3 transition-colors hover:border-gray-300">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-accent-500 text-xs font-semibold text-white">
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

        <main className="flex-1 overflow-auto p-8">{renderPage()}</main>
      </div>

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
  )
}
