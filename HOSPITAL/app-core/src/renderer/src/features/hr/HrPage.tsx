import { useEffect, useMemo, useState } from 'react'
import {
  Users,
  UserCheck,
  UserX,
  CalendarClock,
  FileSignature,
  Search,
  FileDown,
  Plus,
  TriangleAlert,
  FileText,
  Download,
  UserPlus,
  ClipboardCheck,
  CalendarPlus,
  GraduationCap,
  Star,
  FileBarChart,
  Wallet,
  Loader2,
  Pencil,
  Trash2
} from 'lucide-react'
import { Card } from '@renderer/components/Card'
import { PageHeader } from '@renderer/components/PageHeader'
import { Button } from '@renderer/components/Button'
import { StatusBadge } from '@renderer/components/StatusBadge'
import { ConfirmDialog } from '@renderer/components/ConfirmDialog'
import type { ApiEmployeeDailyStatus, ApiHrEmployee } from '@shared/hr-types'
import { employeeStatusTone, DAY_STATUS_COLOR } from './status'
import type { Employee, EmployeeStatus } from './types'
import { HrEmployeeFormModal } from './HrEmployeeFormModal'
import { AttendanceTab } from './tabs/AttendanceTab'
import { ContractsTab } from './tabs/ContractsTab'
import { PerformanceTab } from './tabs/PerformanceTab'
import { TrainingTab } from './tabs/TrainingTab'
import { PayrollTab } from './tabs/PayrollTab'
import { DocumentsTab } from './tabs/DocumentsTab'
import { SortableGroup } from '@renderer/components/SortableGroup'

type Tab = 'overview' | 'employees' | 'attendance' | 'contracts' | 'performance' | 'training' | 'payroll' | 'documents'

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: "Vue d'ensemble" },
  { id: 'employees', label: 'Employés' },
  { id: 'attendance', label: 'Présences & Absences' },
  { id: 'contracts', label: 'Contrats' },
  { id: 'performance', label: 'Performances' },
  { id: 'training', label: 'Formations' },
  { id: 'payroll', label: 'Paie' },
  { id: 'documents', label: 'Documents' }
]

const ALL_FILTER = '__all__'

const EMPLOYEE_DOCUMENTS = [{ label: 'CV.pdf' }, { label: 'Diplômes & Certifications.pdf' }, { label: 'Contrat de travail.pdf' }]

const STATUS_LABEL: Record<ApiEmployeeDailyStatus, EmployeeStatus> = {
  PRESENT: 'Présent',
  ABSENT: 'Absent',
  CONGE: 'Congé',
  RETARD: 'Retard'
}

const SPECIALTY_ROLE_LABEL: Record<string, string> = {
  Cardiologie: 'Cardiologue',
  'Médecine interne': 'Médecin généraliste',
  'Gynécologie-Obstétrique': 'Gynécologue',
  Pneumologie: 'Pneumologue',
  Endocrinologie: 'Endocrinologue',
  Ophtalmologie: 'Ophtalmologue',
  'Anesthésie-Réanimation': 'Anesthésiste',
  'Médecine générale': 'Médecin généraliste',
  Radiologie: 'Radiologue',
  'Imagerie médicale': 'Radiologue',
  Rhumatologie: 'Rhumatologue',
  Psychiatrie: 'Psychiatre',
  Neurologie: 'Neurologue',
  ORL: 'ORL',
  Laboratoire: 'Technicien de laboratoire'
}

function displayName(e: ApiHrEmployee): string {
  if (e.role === 'MEDECIN') return `Dr. ${e.lastName} ${e.firstName}.`
  return `${e.firstName}. ${e.lastName}`
}

function roleLabel(e: ApiHrEmployee): string {
  return SPECIALTY_ROLE_LABEL[e.specialty ?? ''] ?? e.specialty ?? e.role
}

function hoursLabel(min: number | null): string {
  if (min === null) return '—'
  return `${Math.floor(min / 60)} h ${min % 60} min`
}

function toEmployee(e: ApiHrEmployee): Employee {
  return {
    id: e.id,
    name: displayName(e),
    matricule: e.matricule ?? '—',
    service: e.specialty ?? '—',
    role: roleLabel(e),
    status: e.dailyStatus ? STATUS_LABEL[e.dailyStatus] : 'Absent',
    contractType: e.contractType ?? 'CDI',
    hireDate: e.hireDate ? new Date(e.hireDate).toLocaleDateString('fr-FR') : '—',
    contractEnd: e.contractEndDate ? new Date(e.contractEndDate).toLocaleDateString('fr-FR') : null,
    contractNumber: e.contractNumber ?? '—',
    monthlyPresenceRate: e.monthlyPresenceRate ?? 0,
    presentDays: e.presentDays ?? 0,
    absentDays: e.absentDays ?? 0,
    lateDays: e.lateDays ?? 0,
    averageHours: hoursLabel(e.averageHoursMin),
    overtimeHours: hoursLabel(e.overtimeHoursMin)
  }
}

function initials(name: string): string {
  const parts = name.replace('Dr. ', '').trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
}

export function HRPage(): JSX.Element {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [rawEmployees, setRawEmployees] = useState<ApiHrEmployee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<ApiHrEmployee | null>(null)
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null)
  const [exporting, setExporting] = useState(false)
  const [filterService, setFilterService] = useState(ALL_FILTER)
  const [filterRole, setFilterRole] = useState(ALL_FILTER)
  const [filterStatus, setFilterStatus] = useState(ALL_FILTER)
  const [filterContractType, setFilterContractType] = useState(ALL_FILTER)

  useEffect(() => {
    let cancelled = false
    window.api.hr.list().then((result) => {
      if (cancelled) return
      if (result.ok) {
        const mapped = result.data.employees.map(toEmployee)
        setRawEmployees(result.data.employees)
        setEmployees(mapped)
        setSelectedId(mapped[0]?.id ?? null)
      } else {
        setError(result.error)
      }
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleExportExcel(): Promise<void> {
    setExporting(true)
    await window.api.hr.exportExcel()
    setExporting(false)
  }

  const serviceOptions = useMemo(() => Array.from(new Set(employees.map((e) => e.service).filter(Boolean))).sort(), [employees])
  const roleOptions = useMemo(() => Array.from(new Set(employees.map((e) => e.role).filter(Boolean))).sort(), [employees])
  const contractTypeOptions = useMemo(() => Array.from(new Set(employees.map((e) => e.contractType))).sort(), [employees])

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase()
    return employees.filter((e) => {
      if (term && !`${e.name} ${e.service} ${e.role}`.toLowerCase().includes(term)) return false
      if (filterService !== ALL_FILTER && e.service !== filterService) return false
      if (filterRole !== ALL_FILTER && e.role !== filterRole) return false
      if (filterStatus !== ALL_FILTER && e.status !== filterStatus) return false
      if (filterContractType !== ALL_FILTER && e.contractType !== filterContractType) return false
      return true
    })
  }, [search, employees, filterService, filterRole, filterStatus, filterContractType])

  function handleResetFilters(): void {
    setFilterService(ALL_FILTER)
    setFilterRole(ALL_FILTER)
    setFilterStatus(ALL_FILTER)
    setFilterContractType(ALL_FILTER)
  }

  const selected = employees.find((e) => e.id === selectedId) ?? employees[0]

  const presents = useMemo(() => employees.filter((e) => e.status === 'Présent' || e.status === 'Retard'), [employees])
  const absents = useMemo(() => employees.filter((e) => e.status === 'Absent'), [employees])
  const enConge = useMemo(() => employees.filter((e) => e.status === 'Congé'), [employees])
  const enRetard = useMemo(() => employees.filter((e) => e.status === 'Retard'), [employees])
  const cdd = useMemo(() => employees.filter((e) => e.contractType === 'CDD'), [employees])

  const contractExpiries = useMemo(() => {
    const now = Date.now()
    const daysUntil = (dateStr: string | null): number | null => {
      if (!dateStr) return null
      const [d, m, y] = dateStr.split('/').map(Number)
      return Math.round((new Date(y, m - 1, d).getTime() - now) / 86400000)
    }
    const within = (max: number) => cdd.filter((e) => {
      const days = daysUntil(e.contractEnd)
      return days !== null && days <= max
    }).length
    return [
      { label: '30 jours', count: within(30) },
      { label: '60 jours', count: within(60) },
      { label: '90 jours', count: within(90) }
    ]
  }, [cdd])

  const presenceDonutBackground = useMemo(() => {
    const total = employees.length || 1
    const presentPct = (presents.length / total) * 100
    const absentPct = (absents.length / total) * 100
    return `conic-gradient(${DAY_STATUS_COLOR.Présent} 0% ${presentPct}%, ${DAY_STATUS_COLOR.Absent} ${presentPct}% ${presentPct + absentPct}%, ${DAY_STATUS_COLOR.Congé} ${presentPct + absentPct}% 100%)`
  }, [employees, presents, absents])

  const totalPresentDays = useMemo(() => employees.reduce((sum, e) => sum + e.presentDays, 0), [employees])
  const totalAbsentDays = useMemo(() => employees.reduce((sum, e) => sum + e.absentDays, 0), [employees])
  const attendanceDonutBackground = useMemo(() => {
    const total = totalPresentDays + totalAbsentDays || 1
    const percent = (totalPresentDays / total) * 100
    return `conic-gradient(#10b981 0% ${percent}%, #ef4444 ${percent}% 100%)`
  }, [totalPresentDays, totalAbsentDays])
  const globalPresenceRate = totalPresentDays + totalAbsentDays === 0 ? 0 : Math.round((totalPresentDays / (totalPresentDays + totalAbsentDays)) * 1000) / 10

  const QUICK_ACTIONS: { icon: typeof UserPlus; label: string; onClick?: () => void }[] = [
    { icon: UserPlus, label: 'Nouvel employé', onClick: () => setShowCreateModal(true) },
    { icon: FileSignature, label: 'Ajouter un contrat', onClick: () => setActiveTab('contracts') },
    { icon: ClipboardCheck, label: 'Enregistrer présence', onClick: () => setActiveTab('attendance') },
    { icon: CalendarPlus, label: 'Demande de congé', onClick: () => setActiveTab('attendance') },
    { icon: GraduationCap, label: 'Planifier formation', onClick: () => setActiveTab('training') },
    { icon: Star, label: 'Évaluation employé', onClick: () => setActiveTab('performance') },
    { icon: FileBarChart, label: "Rapport d'absences", onClick: () => setActiveTab('attendance') },
    { icon: Wallet, label: 'Export de paie', onClick: () => setActiveTab('payroll') }
  ]

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        breadcrumb={['Accueil', 'Ressources Humaines']}
        title="Ressources Humaines"
        subtitle="Gestion du personnel, des contrats, des temps de travail et des performances."
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={handleExportExcel} disabled={exporting}>
              {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
              Exporter
            </Button>
            <Button size="sm" onClick={() => setShowCreateModal(true)}>
              <Plus className="h-3.5 w-3.5" />
              Nouvel employé
            </Button>
          </>
        }
      />

      {showCreateModal && (
        <HrEmployeeFormModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(employee) => {
            setRawEmployees((prev) => [...prev, employee])
            setEmployees((prev) => [...prev, toEmployee(employee)])
            setShowCreateModal(false)
          }}
        />
      )}

      {editingEmployee && (
        <HrEmployeeFormModal
          editing={editingEmployee}
          onClose={() => setEditingEmployee(null)}
          onCreated={(employee) => {
            setRawEmployees((prev) => prev.map((e) => (e.id === employee.id ? employee : e)))
            setEmployees((prev) => prev.map((e) => (e.id === employee.id ? toEmployee(employee) : e)))
            setEditingEmployee(null)
          }}
        />
      )}

      {deletingEmployee && (
        <ConfirmDialog
          title="Supprimer l'employé"
          message={`Voulez-vous vraiment supprimer le dossier de ${deletingEmployee.name} ?`}
          onCancel={() => setDeletingEmployee(null)}
          onConfirm={() => window.api.hr.delete(deletingEmployee.id)}
          onConfirmed={() => {
            setRawEmployees((prev) => prev.filter((e) => e.id !== deletingEmployee.id))
            setEmployees((prev) => prev.filter((e) => e.id !== deletingEmployee.id))
            setSelectedId(null)
            setDeletingEmployee(null)
          }}
        />
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-24 text-sm text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement du personnel…
        </div>
      ) : error ? (
        <p className="py-12 text-center text-sm text-red-500">{error}</p>
      ) : (
        <>
          {/* KPI row */}
          <SortableGroup id="hr.grid1" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <Card className="border-t-4 border-t-violet-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50">
                <Users className="h-5 w-5 text-violet-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Effectif total</p>
              <p className="text-xl font-bold text-gray-900">{employees.length}</p>
            </Card>
            <Card className="border-t-4 border-t-emerald-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
                <UserCheck className="h-5 w-5 text-emerald-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Présents aujourd&apos;hui</p>
              <p className="text-xl font-bold text-gray-900">{presents.length}</p>
            </Card>
            <Card className="border-t-4 border-t-red-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50">
                <UserX className="h-5 w-5 text-red-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Absents aujourd&apos;hui</p>
              <p className="text-xl font-bold text-gray-900">{absents.length}</p>
            </Card>
            <Card className="border-t-4 border-t-blue-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                <CalendarClock className="h-5 w-5 text-blue-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">En congé</p>
              <p className="text-xl font-bold text-gray-900">{enConge.length}</p>
            </Card>
            <Card className="border-t-4 border-t-amber-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50">
                <CalendarClock className="h-5 w-5 text-amber-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">En retard</p>
              <p className="text-xl font-bold text-gray-900">{enRetard.length}</p>
            </Card>
            <Card className="border-t-4 border-t-orange-400 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50">
                <FileSignature className="h-5 w-5 text-orange-600" />
              </div>
              <p className="mt-3 text-xs font-medium text-gray-500">Contrats à échéance (90j)</p>
              <p className="text-xl font-bold text-gray-900">{contractExpiries[2].count}</p>
            </Card>
          </SortableGroup>

          <SortableGroup id="hr.grid2" className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Liste principale */}
            <Card className="p-0 lg:col-span-2">
              <div className="flex flex-wrap items-center gap-1 border-b border-gray-100 px-4 pt-2">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={
                      'rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ' +
                      (activeTab === tab.id
                        ? 'border-accent-500 text-accent-700'
                        : 'border-transparent text-gray-500 hover:text-gray-800')
                    }
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeTab === 'attendance' ? (
                <AttendanceTab employees={rawEmployees} />
              ) : activeTab === 'contracts' ? (
                <ContractsTab employees={rawEmployees} />
              ) : activeTab === 'performance' ? (
                <PerformanceTab employees={rawEmployees} />
              ) : activeTab === 'training' ? (
                <TrainingTab employees={rawEmployees} />
              ) : activeTab === 'payroll' ? (
                <PayrollTab employees={rawEmployees} />
              ) : activeTab === 'documents' ? (
                <DocumentsTab employees={rawEmployees} />
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-6 py-3">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Rechercher un employé, service, fonction..."
                        className="w-72 rounded-lg border border-gray-200 py-1.5 pl-8 pr-3 text-xs text-gray-700 placeholder:text-gray-400 focus:border-accent-500 focus:outline-none"
                      />
                    </div>
                    <Button variant="secondary" size="sm" onClick={handleExportExcel} disabled={exporting}>
                      {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
                      Export Excel
                    </Button>
                  </div>

                  {filteredRows.length === 0 ? (
                    <p className="px-6 py-8 text-center text-sm text-gray-400">
                      {employees.length === 0
                        ? 'Aucun employé enregistré.'
                        : 'Aucun employé ne correspond à la recherche ou aux filtres.'}
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                            <th className="px-6 py-2.5 font-medium">Employé</th>
                            <th className="px-6 py-2.5 font-medium">Service</th>
                            <th className="px-6 py-2.5 font-medium">Fonction</th>
                            <th className="px-6 py-2.5 font-medium">Contrat</th>
                            <th className="px-6 py-2.5 font-medium">Statut</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredRows.map((e) => (
                            <tr
                              key={e.id}
                              onClick={() => setSelectedId(e.id)}
                              className={
                                'cursor-pointer border-b border-gray-100 last:border-0 hover:bg-gray-50 ' +
                                (selectedId === e.id ? 'bg-accent-50/50' : '')
                              }
                            >
                              <td className="px-6 py-3">
                                <div className="flex items-center gap-2.5">
                                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-50 text-[11px] font-semibold text-accent-700">
                                    {initials(e.name)}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="truncate font-medium text-gray-900">{e.name}</p>
                                    <p className="truncate text-xs text-gray-400">{e.matricule}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-3 text-gray-600">{e.service}</td>
                              <td className="px-6 py-3 text-gray-600">{e.role}</td>
                              <td className="px-6 py-3 text-gray-600">{e.contractType}</td>
                              <td className="px-6 py-3">
                                <StatusBadge label={e.status} tone={employeeStatusTone(e.status)} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 px-6 py-3 text-xs text-gray-400">
                    <span>
                      Affichage de {filteredRows.length === 0 ? 0 : 1} à {filteredRows.length} sur {employees.length} employés
                    </span>
                  </div>
                </>
              )}
            </Card>

            {/* Colonne latérale */}
            <SortableGroup id="hr.side1" className="space-y-6">
              <Card>
                <h3 className="mb-4 flex items-center justify-between text-sm font-semibold text-gray-900">
                  Filtres
                  <button onClick={handleResetFilters} className="text-xs font-normal text-accent-600 hover:text-accent-500">
                    Réinitialiser
                  </button>
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500">Service</label>
                    <select
                      value={filterService}
                      onChange={(e) => setFilterService(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 focus:border-accent-500 focus:outline-none"
                    >
                      <option value={ALL_FILTER}>Tous les services</option>
                      {serviceOptions.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500">Fonction</label>
                    <select
                      value={filterRole}
                      onChange={(e) => setFilterRole(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 focus:border-accent-500 focus:outline-none"
                    >
                      <option value={ALL_FILTER}>Toutes les fonctions</option>
                      {roleOptions.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500">Statut</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 focus:border-accent-500 focus:outline-none"
                    >
                      <option value={ALL_FILTER}>Tous les statuts</option>
                      {Object.values(STATUS_LABEL).map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500">Type de contrat</label>
                    <select
                      value={filterContractType}
                      onChange={(e) => setFilterContractType(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 focus:border-accent-500 focus:outline-none"
                    >
                      <option value={ALL_FILTER}>Tous les types</option>
                      {contractTypeOptions.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button size="sm" className="w-full" onClick={() => setActiveTab('overview')}>
                    Filtrer
                  </Button>
                </div>
              </Card>

              <Card>
                <h3 className="mb-3 text-sm font-semibold text-gray-900">Contrats CDD à échéance</h3>
                <div className="space-y-2.5 text-xs">
                  {contractExpiries.map((c) => (
                    <div key={c.label} className="flex items-center justify-between">
                      <span className="text-gray-600">CDD &lt; {c.label}</span>
                      <span className="font-semibold text-gray-900">{c.count}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between border-t border-gray-100 pt-2">
                    <span className="font-medium text-gray-700">Total CDD</span>
                    <span className="font-semibold text-gray-900">{cdd.length}</span>
                  </div>
                </div>
              </Card>

              <Card>
                <h3 className="mb-4 text-sm font-semibold text-gray-900">Présence aujourd&apos;hui</h3>
                <div className="flex items-center gap-4">
                  <div
                    className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full"
                    style={{ background: presenceDonutBackground }}
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-xs font-bold text-gray-900">
                      {employees.length === 0 ? '—' : Math.round((presents.length / employees.length) * 100) + '%'}
                    </div>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="text-gray-600">Présents</span>
                      <span className="font-medium text-gray-900">{presents.length}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-red-500" />
                      <span className="text-gray-600">Absents</span>
                      <span className="font-medium text-gray-900">{absents.length}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-blue-500" />
                      <span className="text-gray-600">Congé</span>
                      <span className="font-medium text-gray-900">{enConge.length}</span>
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-center text-xs text-gray-400">Total {employees.length}</p>
              </Card>

              <Card className="p-0">
                <div className="border-b border-gray-100 px-5 py-3.5">
                  <h3 className="text-sm font-semibold text-gray-900">Alertes RH</h3>
                </div>
                <div className="space-y-3 p-5">
                  {contractExpiries[0].count === 0 && absents.length === 0 && enConge.length === 0 ? (
                    <p className="text-xs text-gray-400">Aucune alerte pour le moment.</p>
                  ) : (
                    <>
                      {contractExpiries[0].count > 0 && (
                        <div className="flex items-start gap-2.5 text-xs">
                          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                          <span className="text-gray-600">
                            {contractExpiries[0].count} contrat{contractExpiries[0].count > 1 ? 's' : ''} CDD arrivant à échéance sous 30 jours
                          </span>
                        </div>
                      )}
                      {absents.length > 0 && (
                        <div className="flex items-start gap-2.5 text-xs">
                          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                          <span className="text-gray-600">{absents.length} employé{absents.length > 1 ? 's' : ''} absent{absents.length > 1 ? 's' : ''} aujourd&apos;hui</span>
                        </div>
                      )}
                      {enConge.length > 0 && (
                        <div className="flex items-start gap-2.5 text-xs">
                          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" />
                          <span className="text-gray-600">{enConge.length} employé{enConge.length > 1 ? 's' : ''} en congé aujourd&apos;hui</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </Card>
            </SortableGroup>
          </SortableGroup>

          {/* Présences & Absences (mois en cours) */}
          <SortableGroup id="hr.grid3" className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card>
              <h3 className="mb-4 text-sm font-semibold text-gray-900">Présences & Absences (mois en cours)</h3>
              <div className="flex items-center gap-4">
                <div
                  className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full"
                  style={{ background: attendanceDonutBackground }}
                >
                  <div className="h-11 w-11 rounded-full bg-white" />
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-gray-600">Présences</span>
                    <span className="font-medium text-gray-900">{totalPresentDays}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    <span className="text-gray-600">Absences</span>
                    <span className="font-medium text-gray-900">{totalAbsentDays}</span>
                  </div>
                </div>
              </div>
              <p className="mt-3 text-center text-xs text-gray-400">Total {totalPresentDays + totalAbsentDays} jours</p>
            </Card>

            <Card className="lg:col-span-2">
              <h3 className="text-sm font-semibold text-gray-900">Taux de présence global (mois en cours)</h3>
              <p className="mt-1 text-2xl font-bold text-gray-900">{globalPresenceRate}%</p>
              <p className="mt-1 text-xs text-gray-400">
                Calculé sur {employees.length} employés — {totalPresentDays} jours présents sur {totalPresentDays + totalAbsentDays} jours ouvrés cumulés.
              </p>
            </Card>
          </SortableGroup>

          {/* Détail des présences */}
          {selected && (
            <SortableGroup id="hr.grid4" className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">Détail des présences</h3>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setEditingEmployee(rawEmployees.find((r) => r.id === selected.id) ?? null)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Modifier
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => setDeletingEmployee(selected)}>
                      <Trash2 className="h-3.5 w-3.5" />
                      Supprimer
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-50 text-sm font-semibold text-accent-700">
                    {initials(selected.name)}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{selected.name}</p>
                    <p className="text-xs text-gray-500">
                      {selected.role} · {selected.service}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 py-4 sm:grid-cols-6">
                  <Stat label="Présences" value={String(selected.presentDays)} />
                  <Stat label="Absences" value={String(selected.absentDays)} />
                  <Stat label="Taux présence" value={`${selected.monthlyPresenceRate}%`} />
                  <Stat label="Retards" value={String(selected.lateDays)} />
                  <Stat label="Heures moy." value={selected.averageHours} />
                  <Stat label="Heures sup." value={selected.overtimeHours} />
                </div>
              </Card>

              <SortableGroup id="hr.side2" className="space-y-6">
                <Card>
                  <h3 className="mb-3 text-sm font-semibold text-gray-900">Informations du contrat</h3>
                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Date d&apos;embauche</span>
                      <span className="font-medium text-gray-900">{selected.hireDate}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Date de fin</span>
                      <span className="font-medium text-gray-900">{selected.contractEnd ?? 'CDI'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">N° contrat</span>
                      <span className="font-medium text-gray-900">{selected.contractNumber}</span>
                    </div>
                  </div>
                  <Button variant="secondary" size="sm" className="mt-4 w-full">
                    Voir le contrat
                  </Button>
                </Card>

                <Card className="p-0">
                  <div className="border-b border-gray-100 px-5 py-3.5">
                    <h3 className="text-sm font-semibold text-gray-900">Télécharger</h3>
                  </div>
                  <div className="space-y-1 p-2">
                    {EMPLOYEE_DOCUMENTS.map((doc) => (
                      <button
                        key={doc.label}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
                      >
                        <FileText className="h-3.5 w-3.5 text-gray-400" />
                        <span className="min-w-0 flex-1 truncate">
                          {initials(selected.name)} {doc.label}
                        </span>
                        <Download className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                      </button>
                    ))}
                  </div>
                </Card>
              </SortableGroup>
            </SortableGroup>
          )}

          {/* Actions rapides */}
          <Card className="p-0">
            <div className="border-b border-gray-100 px-6 py-4">
              <h3 className="text-sm font-semibold text-gray-900">Actions rapides</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 p-6 sm:grid-cols-4">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  onClick={action.onClick}
                  className="flex flex-col items-center gap-2 rounded-xl border border-gray-100 py-4 text-center transition-all hover:-translate-y-0.5 hover:border-accent-200 hover:shadow-sm"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-50 text-accent-600">
                    <action.icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-medium text-gray-700">{action.label}</span>
                </button>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div>
      <p className="text-sm font-bold text-gray-900">{value}</p>
      <p className="text-[11px] text-gray-500">{label}</p>
    </div>
  )
}
