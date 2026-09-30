// Types partagés entre main, preload et renderer pour le domaine Ressources Humaines.

export type ApiEmployeeContractType = 'CDI' | 'CDD'
export type ApiEmployeeDailyStatus = 'PRESENT' | 'ABSENT' | 'CONGE' | 'RETARD'

export interface ApiHrEmployee {
  id: string
  firstName: string
  lastName: string
  role: string
  specialty: string | null
  department: string | null
  matricule: string | null
  contractType: ApiEmployeeContractType | null
  contractNumber: string | null
  hireDate: string | null
  contractEndDate: string | null
  dailyStatus: ApiEmployeeDailyStatus | null
  presentDays: number | null
  absentDays: number | null
  lateDays: number | null
  monthlyPresenceRate: number | null
  averageHoursMin: number | null
  overtimeHoursMin: number | null
  updatedAt: string
}

export type ApiRole = 'DIRIGEANT' | 'MEDECIN' | 'INFIRMIER' | 'TECHNICIEN' | 'PHARMACIEN' | 'ADMINISTRATIF' | 'CAISSIER'

export interface CreateHrEmployeeInput {
  /** Optionnel : id généré côté client pour une création hors-ligne. */
  id?: string
  firstName: string
  lastName: string
  role: ApiRole
  specialty?: string
  department?: string
  matricule?: string
  contractType?: ApiEmployeeContractType
  contractNumber?: string
  hireDate?: string
  contractEndDate?: string
}

export interface UpdateHrEmployeeInput {
  firstName?: string
  lastName?: string
  role?: ApiRole
  specialty?: string | null
  department?: string | null
  matricule?: string | null
  contractType?: ApiEmployeeContractType | null
  contractNumber?: string | null
  hireDate?: string | null
  contractEndDate?: string | null
  /** Posé en interne par hr.service.ts (main) en mode hors-ligne, jamais fourni par le renderer —
   * voir Plan-Mode-Hors-Ligne-Synchronisation.md §6.3. */
  expectedUpdatedAt?: string
}

// --- Présences & Absences (item 12) -----------------------------------------------------------

export interface ApiAttendance {
  id: string
  employeeId: string
  employeeName: string
  date: string
  status: ApiEmployeeDailyStatus
  checkIn: string | null
  checkOut: string | null
  latitude: number | null
  longitude: number | null
  note: string | null
}

/** Pointeuse automatique à la connexion (item 14 PETITES MODIFS) — position facultative (best
 * effort si la géolocalisation échoue ou est refusée, voir useAuth.ts). */
export interface CheckInAttendanceInput {
  latitude?: number
  longitude?: number
}

export interface CreateAttendanceInput {
  employeeId: string
  date: string
  status: ApiEmployeeDailyStatus
  checkIn?: string
  checkOut?: string
  note?: string
}

export interface UpdateAttendanceInput {
  date?: string
  status?: ApiEmployeeDailyStatus
  checkIn?: string | null
  checkOut?: string | null
  note?: string | null
}

// --- Contrats (item 12) -------------------------------------------------------------------------

export type ApiEmployeeContractStatus = 'ACTIF' | 'TERMINE' | 'RESILIE'

export interface ApiContract {
  id: string
  employeeId: string
  employeeName: string
  type: ApiEmployeeContractType
  contractNumber: string
  position: string
  startDate: string
  endDate: string | null
  salary: number | null
  status: ApiEmployeeContractStatus
}

export interface CreateContractInput {
  employeeId: string
  type: ApiEmployeeContractType
  contractNumber: string
  position: string
  startDate: string
  endDate?: string
  salary?: number
  status?: ApiEmployeeContractStatus
}

export interface UpdateContractInput {
  type?: ApiEmployeeContractType
  contractNumber?: string
  position?: string
  startDate?: string
  endDate?: string | null
  salary?: number | null
  status?: ApiEmployeeContractStatus
}

// --- Performances (item 12) ---------------------------------------------------------------------

export type ApiPerformanceRating = 'INSUFFISANT' | 'A_AMELIORER' | 'SATISFAISANT' | 'BON' | 'EXCELLENT'

export interface ApiPerformanceReview {
  id: string
  employeeId: string
  employeeName: string
  reviewDate: string
  reviewerName: string
  rating: ApiPerformanceRating
  comments: string | null
  nextReviewDate: string | null
}

export interface CreatePerformanceReviewInput {
  employeeId: string
  reviewDate: string
  reviewerName: string
  rating: ApiPerformanceRating
  comments?: string
  nextReviewDate?: string
}

export interface UpdatePerformanceReviewInput {
  reviewDate?: string
  reviewerName?: string
  rating?: ApiPerformanceRating
  comments?: string | null
  nextReviewDate?: string | null
}

// --- Formations (item 12) -----------------------------------------------------------------------

export type ApiTrainingStatus = 'PLANIFIEE' | 'EN_COURS' | 'TERMINEE' | 'ANNULEE'

export interface ApiTraining {
  id: string
  employeeId: string
  employeeName: string
  title: string
  provider: string | null
  startDate: string
  endDate: string | null
  status: ApiTrainingStatus
  certified: boolean
}

export interface CreateTrainingInput {
  employeeId: string
  title: string
  provider?: string
  startDate: string
  endDate?: string
  status?: ApiTrainingStatus
  certified?: boolean
}

export interface UpdateTrainingInput {
  title?: string
  provider?: string | null
  startDate?: string
  endDate?: string | null
  status?: ApiTrainingStatus
  certified?: boolean
}

// --- Paie (item 12) -------------------------------------------------------------------------------

export type ApiPayrollStatus = 'EN_PREPARATION' | 'VALIDEE' | 'PAYEE'

export interface ApiPayrollEntry {
  id: string
  employeeId: string
  employeeName: string
  period: string
  baseSalary: number
  bonuses: number
  deductions: number
  netPay: number
  status: ApiPayrollStatus
  paidAt: string | null
}

export interface CreatePayrollEntryInput {
  employeeId: string
  period: string
  baseSalary: number
  bonuses?: number
  deductions?: number
  status?: ApiPayrollStatus
  paidAt?: string
}

export interface UpdatePayrollEntryInput {
  period?: string
  baseSalary?: number
  bonuses?: number
  deductions?: number
  status?: ApiPayrollStatus
  paidAt?: string | null
}

// --- Documents employé (item 12) ------------------------------------------------------------------

export interface ApiEmployeeDocument {
  id: string
  employeeId: string
  employeeName: string
  title: string
  category: string | null
  fileName: string | null
  fileSize: number | null
  uploadedAt: string
}

export interface CreateEmployeeDocumentInput {
  employeeId: string
  title: string
  category?: string
}
