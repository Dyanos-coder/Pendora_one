import type { Session } from '../../shared/auth-types'
import type { AiConversation, AiConversationMessage, ApiCalculatedAlert, AskAiResponse } from '../../shared/ai-types'
import type {
  ApiPatientDossier,
  ApiPrescription,
  ApiPrintDocument,
  ApiVitalsRow,
  CreatePatientInput,
  CreatePrescriptionInput,
  CreateVitalsInput,
  PatientDetail,
  PatientSummary,
  UpdatePatientInput,
  UpdatePrescriptionInput
} from '../../shared/patient-types'
import type { ApiAppointment, ApiEmployee, CreateAppointmentInput, UpdateAppointmentInput } from '../../shared/appointment-types'
import type { ApiConsultation, CreateConsultationInput, UpdateConsultationInput } from '../../shared/consultation-types'
import type {
  ApiBed,
  ApiBedOccupancy,
  ApiHospitalization,
  CreateHospitalizationInput,
  UpdateHospitalizationInput
} from '../../shared/hospitalization-types'
import type { ApiEmergencyVisit, CreateEmergencyVisitInput, UpdateEmergencyVisitInput } from '../../shared/emergency-types'
import type { ApiOperatingRoom, ApiSurgery, CreateSurgeryInput, UpdateSurgeryInput } from '../../shared/operating-room-types'
import type { ApiLabRequest, CreateLabRequestInput, UpdateLabRequestInput } from '../../shared/laboratory-types'
import type { ApiImagingRequest, CreateImagingRequestInput, UpdateImagingRequestInput } from '../../shared/imaging-types'
import type { ApiCardioExam, CreateCardioExamInput, UpdateCardioExamInput } from '../../shared/cardiology-types'
import type { ApiPathologyRequest, CreatePathologyRequestInput, UpdatePathologyRequestInput } from '../../shared/pathology-types'
import type { ApiEndoscopyProcedure, CreateEndoscopyProcedureInput, UpdateEndoscopyProcedureInput } from '../../shared/endoscopy-types'
import type { ApiMedication, CreateMedicationInput, UpdateMedicationInput } from '../../shared/pharmacy-types'
import type { ApiDepot, ApiDepotItem, CreateDepotItemInput, UpdateDepotItemInput } from '../../shared/stocks-types'
import type {
  ApiProcurementRequest,
  ApiSupplier,
  CreateProcurementRequestInput,
  UpdateProcurementRequestInput
} from '../../shared/procurement-types'
import type { ApiBloodPouch, CreateBloodPouchInput, UpdateBloodPouchInput } from '../../shared/blood-bank-types'
import type { ApiFinanceTransaction, CreateFinanceTransactionInput, UpdateFinanceTransactionInput } from '../../shared/finance-types'
import type { ApiUser, CreateUserInput, UpdateUserInput } from '../../shared/user-types'
import type { ApiHrEmployee, CreateHrEmployeeInput, UpdateHrEmployeeInput } from '../../shared/hr-types'
import type {
  ApiQualityAction,
  ApiQualityCertification,
  ApiQualityIndicator,
  CreateQualityActionInput,
  CreateQualityCertificationInput,
  CreateQualityIndicatorInput,
  UpdateQualityActionInput,
  UpdateQualityCertificationInput,
  UpdateQualityIndicatorInput
} from '../../shared/quality-types'
import type { ApiRisk, CreateRiskInput, UpdateRiskInput } from '../../shared/risk-types'
import type {
  ApiAudit,
  ApiAuditFinding,
  ApiComplianceFramework,
  CreateAuditInput,
  UpdateAuditInput
} from '../../shared/audit-compliance-types'
import type { ApiProtocolDocument, CreateProtocolDocumentInput, UpdateProtocolDocumentInput } from '../../shared/documents-types'
import type { ApiDashboardSummary } from '../../shared/dashboard-types'
import type { ApiAutomationLog, ApiAutomationRule } from '../../shared/automation-types'
import type {
  ApiDepartmentComparison,
  ApiGeneratedReport,
  ApiReportCategory,
  ApiReportCategoryCount,
  ApiReportContent
} from '../../shared/reports-types'

// URL du backend distant (HOSPITAL/app-server). En dev, pointe sur le serveur lancé en local
// (npm run dev dans HOSPITAL/app-server, sur un port distinct de app-server — voir .env.example)
// ; en prod, sur l'URL réelle une fois déployé.
const API_URL = process.env['PANDORA_HEALTH_API_URL'] ?? 'http://localhost:3001'

// Forme brute renvoyée par /auth/login (avec le jeton) — usage interne à ce module et à
// auth.service.ts uniquement. Le renderer ne voit jamais le jeton (voir session.store.ts).
export type RemoteLoginResponse =
  | { ok: true; session: Session; token: string }
  | { ok: false; error: string }

export async function remoteLogin(email: string, password: string): Promise<RemoteLoginResponse> {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    return (await response.json()) as RemoteLoginResponse
  } catch {
    return { ok: false, error: 'Impossible de contacter le serveur. Vérifiez votre connexion.' }
  }
}

/** Révoque le jeton côté serveur (sessionVersion, voir app-server/src/services/auth.service.ts)
 * — sans cet appel, "se déconnecter" n'effaçait que le cache local et le JWT restait valable
 * jusqu'à ses 30 jours d'expiration naturelle. Best-effort : si le serveur est injoignable, la
 * déconnexion locale doit quand même avoir lieu (voir auth.service.ts côté app-core). */
export async function remoteLogout(token: string): Promise<void> {
  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    })
  } catch {
    // Hors-ligne ou serveur injoignable : la révocation n'a pas pu avoir lieu, mais on ne doit
    // jamais bloquer la déconnexion locale pour autant.
  }
}

interface ApiError {
  ok: false
  error: string
}

/** Helper générique pour tous les futurs domaines (Patients, Rendez-vous...) — un seul point
 * qui pose le Bearer token et normalise les erreurs réseau/serveur. */
async function authorizedFetch<T>(
  path: string,
  token: string,
  init?: RequestInit
): Promise<{ ok: true; data: T } | ApiError> {
  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        ...init?.headers,
        Authorization: `Bearer ${token}`
      }
    })
    const body = await response.json()
    if (!response.ok) {
      return { ok: false, error: body.error ?? 'Erreur serveur.' }
    }
    return { ok: true, data: body as T }
  } catch {
    return { ok: false, error: 'Impossible de contacter le serveur. Vérifiez votre connexion.' }
  }
}

export function listAiConversations(token: string) {
  return authorizedFetch<{ conversations: AiConversation[] }>('/ai/conversations', token)
}

export function createAiConversation(token: string, title?: string) {
  return authorizedFetch<{ conversation: AiConversation }>('/ai/conversations', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title })
  })
}

export function renameAiConversation(token: string, id: string, title: string) {
  return authorizedFetch<{ conversation: AiConversation }>(`/ai/conversations/${id}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title })
  })
}

export function getAiConversationMessages(token: string, id: string) {
  return authorizedFetch<{ messages: AiConversationMessage[] }>(`/ai/conversations/${id}/messages`, token)
}

export function askAi(token: string, id: string, question: string) {
  return authorizedFetch<AskAiResponse>(`/ai/conversations/${id}/messages`, token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question })
  })
}

export function listCalculatedAlerts(token: string) {
  return authorizedFetch<{ alerts: ApiCalculatedAlert[] }>('/ai/alerts', token)
}

export function listPatients(token: string) {
  return authorizedFetch<{ patients: PatientSummary[] }>('/patients', token)
}

export function getPatient(token: string, id: string) {
  return authorizedFetch<{ patient: PatientDetail }>(`/patients/${id}`, token)
}

export function createPatient(token: string, input: CreatePatientInput) {
  return authorizedFetch<{ patient: PatientDetail }>('/patients', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function updatePatient(token: string, id: string, input: UpdatePatientInput) {
  return authorizedFetch<{ patient: PatientDetail }>(`/patients/${id}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function deletePatient(token: string, id: string) {
  return authorizedFetch<Record<string, never>>(`/patients/${id}`, token, { method: 'DELETE' })
}

export function getPatientDossier(token: string, id: string) {
  return authorizedFetch<{ dossier: ApiPatientDossier }>(`/patients/${id}/dossier`, token)
}

export function createPatientVitals(token: string, id: string, input: CreateVitalsInput) {
  return authorizedFetch<{ vitals: ApiVitalsRow[] }>(`/patients/${id}/vitals`, token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function createPatientPrescription(token: string, id: string, input: CreatePrescriptionInput) {
  return authorizedFetch<{ prescription: ApiPrescription }>(`/patients/${id}/prescriptions`, token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function updatePatientPrescription(
  token: string,
  id: string,
  prescriptionId: string,
  input: UpdatePrescriptionInput
) {
  return authorizedFetch<{ prescription: ApiPrescription }>(`/patients/${id}/prescriptions/${prescriptionId}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function getPatientPrintDocument(token: string, id: string) {
  return authorizedFetch<{ document: ApiPrintDocument }>(`/patients/${id}/print`, token)
}

export function listEmployees(token: string) {
  return authorizedFetch<{ employees: ApiEmployee[] }>('/employees', token)
}

export function listAppointments(token: string) {
  return authorizedFetch<{ appointments: ApiAppointment[] }>('/appointments', token)
}

export function createAppointment(token: string, input: CreateAppointmentInput) {
  return authorizedFetch<{ appointment: ApiAppointment }>('/appointments', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function updateAppointment(token: string, id: string, input: UpdateAppointmentInput) {
  return authorizedFetch<{ appointment: ApiAppointment }>(`/appointments/${id}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function deleteAppointment(token: string, id: string) {
  return authorizedFetch<Record<string, never>>(`/appointments/${id}`, token, { method: 'DELETE' })
}

export function listConsultations(token: string) {
  return authorizedFetch<{ consultations: ApiConsultation[] }>('/consultations', token)
}

export function createConsultation(token: string, input: CreateConsultationInput) {
  return authorizedFetch<{ consultation: ApiConsultation }>('/consultations', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function updateConsultation(token: string, id: string, input: UpdateConsultationInput) {
  return authorizedFetch<{ consultation: ApiConsultation }>(`/consultations/${id}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function deleteConsultation(token: string, id: string) {
  return authorizedFetch<Record<string, never>>(`/consultations/${id}`, token, { method: 'DELETE' })
}

export function listHospitalizations(token: string) {
  return authorizedFetch<{ hospitalizations: ApiHospitalization[] }>('/hospitalizations', token)
}

export function listBeds(token: string) {
  return authorizedFetch<{ beds: ApiBed[] }>('/hospitalizations/beds', token)
}

export function bedOccupancy(token: string) {
  return authorizedFetch<{ occupancy: ApiBedOccupancy }>('/hospitalizations/beds/occupancy', token)
}

export function createHospitalization(token: string, input: CreateHospitalizationInput) {
  return authorizedFetch<{ hospitalization: ApiHospitalization }>('/hospitalizations', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function updateHospitalization(token: string, id: string, input: UpdateHospitalizationInput) {
  return authorizedFetch<{ hospitalization: ApiHospitalization }>(`/hospitalizations/${id}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function deleteHospitalization(token: string, id: string) {
  return authorizedFetch<Record<string, never>>(`/hospitalizations/${id}`, token, { method: 'DELETE' })
}

export function listEmergencyVisits(token: string) {
  return authorizedFetch<{ visits: ApiEmergencyVisit[] }>('/emergencies', token)
}

export function createEmergencyVisit(token: string, input: CreateEmergencyVisitInput) {
  return authorizedFetch<{ visit: ApiEmergencyVisit }>('/emergencies', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function updateEmergencyVisit(token: string, id: string, input: UpdateEmergencyVisitInput) {
  return authorizedFetch<{ visit: ApiEmergencyVisit }>(`/emergencies/${id}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function deleteEmergencyVisit(token: string, id: string) {
  return authorizedFetch<Record<string, never>>(`/emergencies/${id}`, token, { method: 'DELETE' })
}

export function listSurgeries(token: string) {
  return authorizedFetch<{ surgeries: ApiSurgery[] }>('/operating-room', token)
}

export function listOperatingRooms(token: string) {
  return authorizedFetch<{ rooms: ApiOperatingRoom[] }>('/operating-room/rooms', token)
}

export function createSurgery(token: string, input: CreateSurgeryInput) {
  return authorizedFetch<{ surgery: ApiSurgery }>('/operating-room', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function updateSurgery(token: string, id: string, input: UpdateSurgeryInput) {
  return authorizedFetch<{ surgery: ApiSurgery }>(`/operating-room/${id}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function deleteSurgery(token: string, id: string) {
  return authorizedFetch<Record<string, never>>(`/operating-room/${id}`, token, { method: 'DELETE' })
}

export function listLabRequests(token: string) {
  return authorizedFetch<{ requests: ApiLabRequest[] }>('/laboratory', token)
}

export function createLabRequest(token: string, input: CreateLabRequestInput) {
  return authorizedFetch<{ request: ApiLabRequest }>('/laboratory', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function updateLabRequest(token: string, id: string, input: UpdateLabRequestInput) {
  return authorizedFetch<{ request: ApiLabRequest }>(`/laboratory/${id}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function deleteLabRequest(token: string, id: string) {
  return authorizedFetch<Record<string, never>>(`/laboratory/${id}`, token, { method: 'DELETE' })
}

export function listImagingRequests(token: string) {
  return authorizedFetch<{ requests: ApiImagingRequest[] }>('/imaging', token)
}

export function createImagingRequest(token: string, input: CreateImagingRequestInput) {
  return authorizedFetch<{ request: ApiImagingRequest }>('/imaging', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function updateImagingRequest(token: string, id: string, input: UpdateImagingRequestInput) {
  return authorizedFetch<{ request: ApiImagingRequest }>(`/imaging/${id}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function deleteImagingRequest(token: string, id: string) {
  return authorizedFetch<Record<string, never>>(`/imaging/${id}`, token, { method: 'DELETE' })
}

export function listCardioExams(token: string) {
  return authorizedFetch<{ exams: ApiCardioExam[] }>('/cardiology', token)
}

export function cardioPatientsFollowed(token: string) {
  return authorizedFetch<{ count: number }>('/cardiology/patients-followed', token)
}

export function createCardioExam(token: string, input: CreateCardioExamInput) {
  return authorizedFetch<{ exam: ApiCardioExam }>('/cardiology', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function updateCardioExam(token: string, id: string, input: UpdateCardioExamInput) {
  return authorizedFetch<{ exam: ApiCardioExam }>(`/cardiology/${id}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function deleteCardioExam(token: string, id: string) {
  return authorizedFetch<Record<string, never>>(`/cardiology/${id}`, token, { method: 'DELETE' })
}

export function listPathologyRequests(token: string) {
  return authorizedFetch<{ requests: ApiPathologyRequest[] }>('/pathology', token)
}

export function pathologyPatientsFollowed(token: string) {
  return authorizedFetch<{ count: number }>('/pathology/patients-followed', token)
}

export function createPathologyRequest(token: string, input: CreatePathologyRequestInput) {
  return authorizedFetch<{ request: ApiPathologyRequest }>('/pathology', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function updatePathologyRequest(token: string, id: string, input: UpdatePathologyRequestInput) {
  return authorizedFetch<{ request: ApiPathologyRequest }>(`/pathology/${id}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function deletePathologyRequest(token: string, id: string) {
  return authorizedFetch<Record<string, never>>(`/pathology/${id}`, token, { method: 'DELETE' })
}

export function listEndoscopyProcedures(token: string) {
  return authorizedFetch<{ procedures: ApiEndoscopyProcedure[] }>('/endoscopy', token)
}

export function endoscopyPatientsFollowed(token: string) {
  return authorizedFetch<{ count: number }>('/endoscopy/patients-followed', token)
}

export function createEndoscopyProcedure(token: string, input: CreateEndoscopyProcedureInput) {
  return authorizedFetch<{ procedure: ApiEndoscopyProcedure }>('/endoscopy', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function updateEndoscopyProcedure(token: string, id: string, input: UpdateEndoscopyProcedureInput) {
  return authorizedFetch<{ procedure: ApiEndoscopyProcedure }>(`/endoscopy/${id}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function deleteEndoscopyProcedure(token: string, id: string) {
  return authorizedFetch<Record<string, never>>(`/endoscopy/${id}`, token, { method: 'DELETE' })
}

export function listMedications(token: string) {
  return authorizedFetch<{ medications: ApiMedication[] }>('/pharmacy', token)
}

export function createMedication(token: string, input: CreateMedicationInput) {
  return authorizedFetch<{ medication: ApiMedication }>('/pharmacy', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function updateMedication(token: string, id: string, input: UpdateMedicationInput) {
  return authorizedFetch<{ medication: ApiMedication }>(`/pharmacy/${id}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function deleteMedication(token: string, id: string) {
  return authorizedFetch<Record<string, never>>(`/pharmacy/${id}`, token, { method: 'DELETE' })
}

export function listDepots(token: string) {
  return authorizedFetch<{ depots: ApiDepot[] }>('/stocks/depots', token)
}

export function listDepotItems(token: string) {
  return authorizedFetch<{ items: ApiDepotItem[] }>('/stocks', token)
}

export function createDepotItem(token: string, input: CreateDepotItemInput) {
  return authorizedFetch<{ item: ApiDepotItem }>('/stocks', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function updateDepotItem(token: string, id: string, input: UpdateDepotItemInput) {
  return authorizedFetch<{ item: ApiDepotItem }>(`/stocks/${id}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function deleteDepotItem(token: string, id: string) {
  return authorizedFetch<Record<string, never>>(`/stocks/${id}`, token, { method: 'DELETE' })
}

export function listProcurementRequests(token: string) {
  return authorizedFetch<{ requests: ApiProcurementRequest[] }>('/procurement', token)
}

export function listSuppliers(token: string) {
  return authorizedFetch<{ suppliers: ApiSupplier[] }>('/procurement/suppliers', token)
}

export function createProcurementRequest(token: string, input: CreateProcurementRequestInput) {
  return authorizedFetch<{ request: ApiProcurementRequest }>('/procurement', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function updateProcurementRequest(token: string, id: string, input: UpdateProcurementRequestInput) {
  return authorizedFetch<{ request: ApiProcurementRequest }>(`/procurement/${id}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function deleteProcurementRequest(token: string, id: string) {
  return authorizedFetch<Record<string, never>>(`/procurement/${id}`, token, { method: 'DELETE' })
}

export function listBloodPouches(token: string) {
  return authorizedFetch<{ pouches: ApiBloodPouch[] }>('/blood-bank', token)
}

export function createBloodPouch(token: string, input: CreateBloodPouchInput) {
  return authorizedFetch<{ pouch: ApiBloodPouch }>('/blood-bank', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function updateBloodPouch(token: string, id: string, input: UpdateBloodPouchInput) {
  return authorizedFetch<{ pouch: ApiBloodPouch }>(`/blood-bank/${id}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function deleteBloodPouch(token: string, id: string) {
  return authorizedFetch<Record<string, never>>(`/blood-bank/${id}`, token, { method: 'DELETE' })
}

export function listHrEmployees(token: string) {
  return authorizedFetch<{ employees: ApiHrEmployee[] }>('/hr', token)
}

export function createHrEmployee(token: string, input: CreateHrEmployeeInput) {
  return authorizedFetch<{ employee: ApiHrEmployee }>('/hr', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function updateHrEmployee(token: string, id: string, input: UpdateHrEmployeeInput) {
  return authorizedFetch<{ employee: ApiHrEmployee }>(`/hr/${id}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function deleteHrEmployee(token: string, id: string) {
  return authorizedFetch<Record<string, never>>(`/hr/${id}`, token, { method: 'DELETE' })
}

export function listQualityIndicators(token: string) {
  return authorizedFetch<{ indicators: ApiQualityIndicator[] }>('/quality', token)
}

export function createQualityIndicator(token: string, input: CreateQualityIndicatorInput) {
  return authorizedFetch<{ indicator: ApiQualityIndicator }>('/quality', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function updateQualityIndicator(token: string, id: string, input: UpdateQualityIndicatorInput) {
  return authorizedFetch<{ indicator: ApiQualityIndicator }>(`/quality/${id}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function deleteQualityIndicator(token: string, id: string) {
  return authorizedFetch<Record<string, never>>(`/quality/${id}`, token, { method: 'DELETE' })
}

export function listQualityCertifications(token: string) {
  return authorizedFetch<{ certifications: ApiQualityCertification[] }>('/quality/certifications', token)
}

export function createQualityCertification(token: string, input: CreateQualityCertificationInput) {
  return authorizedFetch<{ certification: ApiQualityCertification }>('/quality/certifications', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function updateQualityCertification(token: string, id: string, input: UpdateQualityCertificationInput) {
  return authorizedFetch<{ certification: ApiQualityCertification }>(`/quality/certifications/${id}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function deleteQualityCertification(token: string, id: string) {
  return authorizedFetch<Record<string, never>>(`/quality/certifications/${id}`, token, { method: 'DELETE' })
}

export function listQualityActions(token: string) {
  return authorizedFetch<{ actions: ApiQualityAction[] }>('/quality/actions', token)
}

export function createQualityAction(token: string, input: CreateQualityActionInput) {
  return authorizedFetch<{ action: ApiQualityAction }>('/quality/actions', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function updateQualityAction(token: string, id: string, input: UpdateQualityActionInput) {
  return authorizedFetch<{ action: ApiQualityAction }>(`/quality/actions/${id}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function deleteQualityAction(token: string, id: string) {
  return authorizedFetch<Record<string, never>>(`/quality/actions/${id}`, token, { method: 'DELETE' })
}

export function listRisks(token: string) {
  return authorizedFetch<{ risks: ApiRisk[] }>('/risks', token)
}

export function createRisk(token: string, input: CreateRiskInput) {
  return authorizedFetch<{ risk: ApiRisk }>('/risks', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function updateRisk(token: string, id: string, input: UpdateRiskInput) {
  return authorizedFetch<{ risk: ApiRisk }>(`/risks/${id}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function deleteRisk(token: string, id: string) {
  return authorizedFetch<Record<string, never>>(`/risks/${id}`, token, { method: 'DELETE' })
}

export function listAudits(token: string) {
  return authorizedFetch<{ audits: ApiAudit[] }>('/audit-compliance', token)
}

export function createAudit(token: string, input: CreateAuditInput) {
  return authorizedFetch<{ audit: ApiAudit }>('/audit-compliance', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function updateAudit(token: string, id: string, input: UpdateAuditInput) {
  return authorizedFetch<{ audit: ApiAudit }>(`/audit-compliance/${id}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function deleteAudit(token: string, id: string) {
  return authorizedFetch<Record<string, never>>(`/audit-compliance/${id}`, token, { method: 'DELETE' })
}

export function listAuditFindings(token: string) {
  return authorizedFetch<{ findings: ApiAuditFinding[] }>('/audit-compliance/findings', token)
}

export function listComplianceFrameworks(token: string) {
  return authorizedFetch<{ frameworks: ApiComplianceFramework[] }>('/audit-compliance/frameworks', token)
}

export function listProtocolDocuments(token: string) {
  return authorizedFetch<{ documents: ApiProtocolDocument[] }>('/documents', token)
}

export function createProtocolDocument(token: string, input: CreateProtocolDocumentInput) {
  return authorizedFetch<{ document: ApiProtocolDocument }>('/documents', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function updateProtocolDocument(token: string, id: string, input: UpdateProtocolDocumentInput) {
  return authorizedFetch<{ document: ApiProtocolDocument }>(`/documents/${id}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function deleteProtocolDocument(token: string, id: string) {
  return authorizedFetch<Record<string, never>>(`/documents/${id}`, token, { method: 'DELETE' })
}

export function getDashboardSummary(token: string) {
  return authorizedFetch<{ summary: ApiDashboardSummary }>('/dashboard/summary', token)
}

export function listAutomationRules(token: string) {
  return authorizedFetch<{ rules: ApiAutomationRule[] }>('/automation', token)
}

export function listAutomationLogs(token: string) {
  return authorizedFetch<{ logs: ApiAutomationLog[] }>('/automation/logs', token)
}

export function toggleAutomationRule(token: string, id: string, active: boolean) {
  return authorizedFetch<{ rule: ApiAutomationRule }>(`/automation/${id}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ active })
  })
}

export function listReports(token: string) {
  return authorizedFetch<{ categories: ApiReportCategoryCount[]; reports: ApiGeneratedReport[] }>('/reports', token)
}

export function reportDepartmentComparison(token: string) {
  return authorizedFetch<{ departments: ApiDepartmentComparison[] }>('/reports/department-comparison', token)
}

export function generateReport(token: string, category: ApiReportCategory) {
  return authorizedFetch<{ report: ApiGeneratedReport }>('/reports', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category })
  })
}

export function getReportContent(token: string, id: string) {
  return authorizedFetch<ApiReportContent>(`/reports/${id}/content`, token)
}

export function listFinanceTransactions(token: string) {
  return authorizedFetch<{ transactions: ApiFinanceTransaction[] }>('/finance', token)
}

export function createFinanceTransaction(token: string, input: CreateFinanceTransactionInput) {
  return authorizedFetch<{ transaction: ApiFinanceTransaction }>('/finance', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function updateFinanceTransaction(token: string, id: string, input: UpdateFinanceTransactionInput) {
  return authorizedFetch<{ transaction: ApiFinanceTransaction }>(`/finance/${id}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function deleteFinanceTransaction(token: string, id: string) {
  return authorizedFetch<Record<string, never>>(`/finance/${id}`, token, { method: 'DELETE' })
}

export function listUsers(token: string) {
  return authorizedFetch<{ users: ApiUser[] }>('/users', token)
}

export function createUser(token: string, input: CreateUserInput) {
  return authorizedFetch<{ user: ApiUser }>('/users', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function updateUser(token: string, id: string, input: UpdateUserInput) {
  return authorizedFetch<{ user: ApiUser }>(`/users/${id}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function resetUserPassword(token: string, id: string, newPassword: string) {
  return authorizedFetch<Record<string, never>>(`/users/${id}/reset-password`, token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newPassword })
  })
}

export function changeOwnPassword(token: string, currentPassword: string, newPassword: string) {
  return authorizedFetch<Record<string, never>>('/users/me/change-password', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword })
  })
}
