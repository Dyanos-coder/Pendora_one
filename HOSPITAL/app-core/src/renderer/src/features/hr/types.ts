// Modèle "Employé" pour cette itération front-end (v1, données locales — voir la note
// équivalente dans features/patients/types.ts).

export type EmployeeStatus = 'Présent' | 'Absent' | 'Congé' | 'Retard'
export type ContractType = 'CDI' | 'CDD'

export interface Employee {
  id: string
  name: string
  matricule: string
  service: string
  role: string
  status: EmployeeStatus
  contractType: ContractType
  hireDate: string
  contractEnd: string | null
  contractNumber: string
  monthlyPresenceRate: number
  presentDays: number
  absentDays: number
  lateDays: number
  averageHours: string
  overtimeHours: string
}
