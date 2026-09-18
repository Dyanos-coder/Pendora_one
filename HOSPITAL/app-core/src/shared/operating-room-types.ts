// Types partagés entre main, preload et renderer pour le domaine Bloc opératoire.

export type ApiSurgeryStatus = 'TERMINEE' | 'EN_COURS' | 'EN_ATTENTE' | 'ANNULEE'
export type ApiOperatingRoomStatus = 'OCCUPIED' | 'AVAILABLE' | 'MAINTENANCE'

export interface ApiSurgery {
  id: string
  scheduledAt: string
  procedure: string
  procedureDetail: string | null
  specialty: string | null
  status: ApiSurgeryStatus
  expectedDuration: string | null
  patientId: string | null
  patientName: string | null
  patientCode: string | null
  age: number | null
  gender: 'M' | 'F' | null
  surgeonId: string | null
  surgeonName: string | null
  anesthetistId: string | null
  anesthetistName: string | null
  roomId: string | null
  roomName: string | null
}

export interface ApiOperatingRoom {
  id: string
  name: string
  status: ApiOperatingRoomStatus
}

export interface CreateSurgeryInput {
  patientId?: string
  patientName?: string
  patientCode?: string
  patientAge?: number
  patientGender?: 'M' | 'F'
  scheduledAt: string
  procedure: string
  procedureDetail?: string
  specialty?: string
  surgeonId?: string
  anesthetistId?: string
  roomId?: string
  status?: ApiSurgeryStatus
  expectedDurationMin?: number
}

export interface UpdateSurgeryInput {
  patientId?: string | null
  surgeonId?: string | null
  anesthetistId?: string | null
  roomId?: string | null
  scheduledAt?: string
  procedure?: string
  procedureDetail?: string | null
  specialty?: string | null
  status?: ApiSurgeryStatus
  expectedDurationMin?: number | null
}
