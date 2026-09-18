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
}

export type ApiRole = 'DIRIGEANT' | 'MEDECIN' | 'INFIRMIER' | 'TECHNICIEN' | 'PHARMACIEN' | 'ADMINISTRATIF'

export interface CreateHrEmployeeInput {
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
}
