import type { Session } from '../../shared/auth-types'
import type { ApiFileDocument } from '../../shared/file-types'
import type {
  ApiCashRegister,
  ApiCashSession,
  ApiEligibleCashier,
  ApiPendingExam,
  ApiReceipt,
  ApiReceiptPrintData,
  ApiTariffItem,
  CashRegisterInput,
  CloseSessionInput,
  CreateReceiptInput,
  QuickPatientInput,
  ReceiptFilters,
  TariffItemInput
} from '../../shared/cashier-types'
import type { AiConversation, AiConversationMessage, ApiCalculatedAlert, AskAiResponse } from '../../shared/ai-types'
import type {
  ApiPatientDocument,
  ApiPatientDossier,
  ApiPrescription,
  ApiPrintDocument,
  ApiVitalsRow,
  CreatePatientDocumentInput,
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
import type {
  ApiDepot,
  ApiDepotItem,
  CreateDepotItemInput,
  UpdateDepotItemInput,
  ApiStockMovement,
  CreateStockMovementInput,
  UpdateStockMovementInput,
  ApiStockTransfer,
  CreateStockTransferInput,
  UpdateStockTransferInput,
  ApiInventoryCount,
  CreateInventoryCountInput,
  UpdateInventoryCountInput,
  ApiStockLoss,
  CreateStockLossInput,
  UpdateStockLossInput,
  ApiStockAnalysis
} from '../../shared/stocks-types'
import type {
  ApiGoodsReception,
  ApiProcurementRequest,
  ApiPurchaseOrder,
  ApiSupplier,
  CreateGoodsReceptionInput,
  CreateProcurementRequestInput,
  CreatePurchaseOrderInput,
  UpdateGoodsReceptionInput,
  UpdateProcurementRequestInput,
  UpdatePurchaseOrderInput
} from '../../shared/procurement-types'
import type {
  ApiBloodPouch,
  CreateBloodPouchInput,
  UpdateBloodPouchInput,
  ApiDonation,
  CreateDonationInput,
  UpdateDonationInput,
  ApiTransfusionRequest,
  CreateTransfusionRequestInput,
  UpdateTransfusionRequestInput,
  ApiTransfusion,
  CreateTransfusionInput,
  UpdateTransfusionInput,
  ApiBloodAnalysis,
  CreateBloodAnalysisInput,
  UpdateBloodAnalysisInput
} from '../../shared/blood-bank-types'
import type {
  ApiFinanceTransaction,
  CreateFinanceTransactionInput,
  UpdateFinanceTransactionInput,
  ApiSupplierInvoice,
  CreateSupplierInvoiceInput,
  UpdateSupplierInvoiceInput,
  ApiPaymentReceived,
  CreatePaymentReceivedInput,
  UpdatePaymentReceivedInput,
  ApiServiceExpense,
  CreateServiceExpenseInput,
  UpdateServiceExpenseInput,
  ApiBudget,
  CreateBudgetInput,
  UpdateBudgetInput,
  ApiBankAccount,
  CreateBankAccountInput,
  UpdateBankAccountInput
} from '../../shared/finance-types'
import type { ApiUser, CreateUserInput, UpdateUserInput } from '../../shared/user-types'
import type {
  ApiCompany,
  ApiCompanyLogo,
  UpdateCompanyInput,
  ApiNotificationPreference,
  UpdateNotificationPreferenceInput
} from '../../shared/company-types'
import type { BackupFile } from '../../shared/backup-types'
import type {
  ApiAttendance,
  ApiContract,
  ApiEmployeeDocument,
  ApiHrEmployee,
  ApiPayrollEntry,
  ApiPerformanceReview,
  ApiTraining,
  CheckInAttendanceInput,
  CreateAttendanceInput,
  CreateContractInput,
  CreateEmployeeDocumentInput,
  CreateHrEmployeeInput,
  CreatePayrollEntryInput,
  CreatePerformanceReviewInput,
  CreateTrainingInput,
  UpdateAttendanceInput,
  UpdateContractInput,
  UpdateHrEmployeeInput,
  UpdatePayrollEntryInput,
  UpdatePerformanceReviewInput,
  UpdateTrainingInput
} from '../../shared/hr-types'
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
import type {
  ApiProtocolDocument,
  ApiSignatureImage,
  ApiSignatureRequest,
  CreateProtocolDocumentInput,
  UpdateProtocolDocumentInput
} from '../../shared/documents-types'
import type { ApiDashboardSummary } from '../../shared/dashboard-types'
import type { ApiAutomationLog, ApiAutomationRule } from '../../shared/automation-types'
import type {
  ApiDepartmentComparison,
  ApiGeneratedReport,
  ApiReportCategory,
  ApiReportCategoryCount,
  ApiReportContent
} from '../../shared/reports-types'

// URL du backend EMBARQUÉ (src/main/server, ex app-server hébergé) : il écoute sur un port libre
// de 127.0.0.1 choisi au démarrage, et `setApiUrl()` est appelé dès qu'il est prêt (voir
// embedded-backend.service.ts) — avant tout appel. Voir Plan-Backend-Embarque-Travaux.md.
let apiUrl = 'http://127.0.0.1:0'

export function setApiUrl(url: string): void {
  apiUrl = url
}

export function getApiUrl(): string {
  return apiUrl
}

// Réutilisé par le mode hors-ligne (patients.service.ts, etc., voir
// Plan-Mode-Hors-Ligne-Synchronisation.md) pour distinguer une vraie erreur métier (4xx/5xx, à
// afficher telle quelle) d'une coupure réseau (à traiter en local + file d'attente). Ce message ne
// remonte jusqu'à l'écran QUE pour les modules qui n'ont pas de miroir local (voir la liste dans
// Reste-A-Faire.md) — le texte le précise explicitement pour éviter de faire croire à une panne
// générale de l'app quand seul cet écran-là ne fonctionne pas hors connexion.
export const NETWORK_ERROR_MESSAGE =
  'Serveur injoignable — cet écran nécessite une connexion (pas de copie locale hors ligne pour ces données). Réessayez une fois le serveur de nouveau joignable.'

// Appelé quand le backend refuse le jeton (401 : absent, expiré, révoqué, ou signé par un autre
// poste/serveur) — voir auth.ipc.ts, qui efface la session et renvoie l'interface à la connexion.
let onUnauthorized: (() => void) | null = null

export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler
}

/** Le backend embarqué répond toujours ; c'est la base distante derrière lui qui peut être
 * injoignable (503 `dbUnavailable`). Traité exactement comme l'ancien « serveur injoignable » pour
 * déclencher le repli hors-ligne (base locale + file d'attente). */
function isDbUnavailable(response: Response, body: { dbUnavailable?: boolean }): boolean {
  return response.status === 503 && body?.dbUnavailable === true
}

// Forme brute renvoyée par /auth/login (avec le jeton) — usage interne à ce module et à
// auth.service.ts uniquement. Le renderer ne voit jamais le jeton (voir session.store.ts).
export type RemoteLoginResponse =
  | { ok: true; session: Session; token: string }
  | { ok: false; error: string }

export async function remoteLogin(email: string, password: string): Promise<RemoteLoginResponse> {
  try {
    const response = await fetch(`${apiUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    const body = await response.json()
    if (isDbUnavailable(response, body)) return { ok: false, error: NETWORK_ERROR_MESSAGE }
    return body as RemoteLoginResponse
  } catch {
    return { ok: false, error: NETWORK_ERROR_MESSAGE }
  }
}

/** Révoque le jeton côté serveur (sessionVersion, voir app-server/src/services/auth.service.ts)
 * — sans cet appel, "se déconnecter" n'effaçait que le cache local et le JWT restait valable
 * jusqu'à ses 30 jours d'expiration naturelle. Best-effort : si le serveur est injoignable, la
 * déconnexion locale doit quand même avoir lieu (voir auth.service.ts côté app-core). */
export async function remoteLogout(token: string): Promise<void> {
  try {
    await fetch(`${apiUrl}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    })
  } catch {
    // Hors-ligne ou serveur injoignable : la révocation n'a pas pu avoir lieu, mais on ne doit
    // jamais bloquer la déconnexion locale pour autant.
  }
}

// `conflict`/`current` : posés par app-server quand `updateX()` détecte que la fiche a été
// modifiée entre-temps par quelqu'un d'autre (409, voir ConflictError côté serveur et §6.3 du
// plan hors-ligne) — `current` porte la version qui fait autorité, pour l'afficher à l'utilisateur.
interface ApiError {
  ok: false
  error: string
  conflict?: boolean
  current?: unknown
}

/** Helper générique pour tous les futurs domaines (Patients, Rendez-vous...) — un seul point
 * qui pose le Bearer token et normalise les erreurs réseau/serveur. */
async function authorizedFetch<T>(
  path: string,
  token: string,
  init?: RequestInit
): Promise<{ ok: true; data: T } | ApiError> {
  try {
    const response = await fetch(`${apiUrl}${path}`, {
      ...init,
      headers: {
        ...init?.headers,
        Authorization: `Bearer ${token}`
      }
    })
    const body = await response.json()
    if (isDbUnavailable(response, body)) return { ok: false, error: NETWORK_ERROR_MESSAGE }
    if (response.status === 401) onUnauthorized?.()
    if (!response.ok) {
      return { ok: false, error: body.error ?? 'Erreur serveur.', conflict: body.conflict === true, current: body.current }
    }
    return { ok: true, data: body as T }
  } catch {
    return { ok: false, error: NETWORK_ERROR_MESSAGE }
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
  return authorizedFetch<{ vitalsId: string; vitals: ApiVitalsRow[] }>(`/patients/${id}/vitals`, token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function getVitalsFile(token: string, patientId: string, vitalsId: string) {
  return authorizedFetch<{ document: ApiFileDocument }>(`/patients/${patientId}/vitals/${vitalsId}/file`, token)
}

export function uploadVitalsFile(
  token: string,
  patientId: string,
  vitalsId: string,
  fileName: string,
  mimeType: string,
  content: Buffer
) {
  const formData = new FormData()
  formData.append('file', new Blob([new Uint8Array(content)], { type: mimeType }), fileName)
  return authorizedFetch<{ vitalsId: string; vitals: ApiVitalsRow[] }>(`/patients/${patientId}/vitals/${vitalsId}/file`, token, {
    method: 'POST',
    body: formData
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

// --- Documents patient (item 11) ------------------------------------------------------------------

export function listPatientDocuments(token: string, patientId: string) {
  return authorizedFetch<{ documents: ApiPatientDocument[] }>(`/patients/${patientId}/documents`, token)
}

export function createPatientDocument(token: string, input: CreatePatientDocumentInput) {
  return authorizedFetch<{ document: ApiPatientDocument }>(`/patients/${input.patientId}/documents`, token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function deletePatientDocument(token: string, patientId: string, documentId: string) {
  return authorizedFetch<Record<string, never>>(`/patients/${patientId}/documents/${documentId}`, token, { method: 'DELETE' })
}

export function getPatientDocumentFile(token: string, patientId: string, documentId: string) {
  return authorizedFetch<{ document: ApiFileDocument }>(`/patients/${patientId}/documents/${documentId}/file`, token)
}

export function uploadPatientDocumentFile(
  token: string,
  patientId: string,
  documentId: string,
  fileName: string,
  mimeType: string,
  content: Buffer
) {
  const formData = new FormData()
  formData.append('file', new Blob([new Uint8Array(content)], { type: mimeType }), fileName)
  return authorizedFetch<{ document: ApiPatientDocument }>(`/patients/${patientId}/documents/${documentId}/file`, token, {
    method: 'POST',
    body: formData
  })
}

export function listEmployees(token: string) {
  return authorizedFetch<{ employees: ApiEmployee[] }>('/employees', token)
}

export function listUnlinkedEmployees(token: string) {
  return authorizedFetch<{ employees: ApiEmployee[] }>('/employees/unlinked', token)
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

export function exportConsultations(token: string) {
  return authorizedFetch<{ document: ApiFileDocument }>('/consultations/export', token)
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

export function getConsultationDocument(token: string, id: string) {
  return authorizedFetch<{ document: ApiFileDocument }>(`/consultations/${id}/document`, token)
}

export function uploadConsultationDocument(token: string, id: string, fileName: string, mimeType: string, content: Buffer) {
  const formData = new FormData()
  formData.append('file', new Blob([new Uint8Array(content)], { type: mimeType }), fileName)
  return authorizedFetch<{ consultation: ApiConsultation }>(`/consultations/${id}/document`, token, {
    method: 'POST',
    body: formData
  })
}

export function listHospitalizations(token: string) {
  return authorizedFetch<{ hospitalizations: ApiHospitalization[] }>('/hospitalizations', token)
}

export function exportHospitalizations(token: string) {
  return authorizedFetch<{ document: ApiFileDocument }>('/hospitalizations/export', token)
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

export function exportEmergencyVisits(token: string) {
  return authorizedFetch<{ document: ApiFileDocument }>('/emergencies/export', token)
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

export function exportSurgeries(token: string) {
  return authorizedFetch<{ document: ApiFileDocument }>('/operating-room/export', token)
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

export function exportLabRequests(token: string) {
  return authorizedFetch<{ document: ApiFileDocument }>('/laboratory/export', token)
}

export function createLabRequest(token: string, input: CreateLabRequestInput) {
  return authorizedFetch<{ request: ApiLabRequest }>('/laboratory', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function getLabResultFile(token: string, id: string) {
  return authorizedFetch<{ document: ApiFileDocument }>(`/laboratory/${id}/file`, token)
}

export function uploadLabResultFile(token: string, id: string, fileName: string, mimeType: string, content: Buffer) {
  const formData = new FormData()
  formData.append('file', new Blob([new Uint8Array(content)], { type: mimeType }), fileName)
  return authorizedFetch<{ request: ApiLabRequest }>(`/laboratory/${id}/file`, token, { method: 'POST', body: formData })
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

export function exportImagingRequests(token: string) {
  return authorizedFetch<{ document: ApiFileDocument }>('/imaging/export', token)
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

export function getImagingResultFile(token: string, id: string) {
  return authorizedFetch<{ document: ApiFileDocument }>(`/imaging/${id}/file`, token)
}

export function uploadImagingResultFile(token: string, id: string, fileName: string, mimeType: string, content: Buffer) {
  const formData = new FormData()
  formData.append('file', new Blob([new Uint8Array(content)], { type: mimeType }), fileName)
  return authorizedFetch<{ request: ApiImagingRequest }>(`/imaging/${id}/file`, token, { method: 'POST', body: formData })
}

export function listCardioExams(token: string) {
  return authorizedFetch<{ exams: ApiCardioExam[] }>('/cardiology', token)
}

export function exportCardioExams(token: string) {
  return authorizedFetch<{ document: ApiFileDocument }>('/cardiology/export', token)
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

export function getCardioExamResultFile(token: string, id: string) {
  return authorizedFetch<{ document: ApiFileDocument }>(`/cardiology/${id}/file`, token)
}

export function uploadCardioExamResultFile(token: string, id: string, fileName: string, mimeType: string, content: Buffer) {
  const formData = new FormData()
  formData.append('file', new Blob([new Uint8Array(content)], { type: mimeType }), fileName)
  return authorizedFetch<{ exam: ApiCardioExam }>(`/cardiology/${id}/file`, token, { method: 'POST', body: formData })
}

export function listPathologyRequests(token: string) {
  return authorizedFetch<{ requests: ApiPathologyRequest[] }>('/pathology', token)
}

export function exportPathologyRequests(token: string) {
  return authorizedFetch<{ document: ApiFileDocument }>('/pathology/export', token)
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

export function getPathologyResultFile(token: string, id: string) {
  return authorizedFetch<{ document: ApiFileDocument }>(`/pathology/${id}/file`, token)
}

export function uploadPathologyResultFile(token: string, id: string, fileName: string, mimeType: string, content: Buffer) {
  const formData = new FormData()
  formData.append('file', new Blob([new Uint8Array(content)], { type: mimeType }), fileName)
  return authorizedFetch<{ request: ApiPathologyRequest }>(`/pathology/${id}/file`, token, { method: 'POST', body: formData })
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

export function getEndoscopyResultFile(token: string, id: string) {
  return authorizedFetch<{ document: ApiFileDocument }>(`/endoscopy/${id}/file`, token)
}

export function uploadEndoscopyResultFile(token: string, id: string, fileName: string, mimeType: string, content: Buffer) {
  const formData = new FormData()
  formData.append('file', new Blob([new Uint8Array(content)], { type: mimeType }), fileName)
  return authorizedFetch<{ procedure: ApiEndoscopyProcedure }>(`/endoscopy/${id}/file`, token, { method: 'POST', body: formData })
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

export function exportDepotItems(token: string) {
  return authorizedFetch<{ document: ApiFileDocument }>('/stocks/export', token)
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

// --- Mouvements (item 16) ---------------------------------------------------------------------------

export function listStockMovements(token: string) {
  return authorizedFetch<{ movements: ApiStockMovement[] }>('/stocks/movements', token)
}

export function createStockMovement(token: string, input: CreateStockMovementInput) {
  return authorizedFetch<{ movement: ApiStockMovement }>('/stocks/movements', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function updateStockMovement(token: string, id: string, input: UpdateStockMovementInput) {
  return authorizedFetch<{ movement: ApiStockMovement }>(`/stocks/movements/${id}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function deleteStockMovement(token: string, id: string) {
  return authorizedFetch<Record<string, never>>(`/stocks/movements/${id}`, token, { method: 'DELETE' })
}

// --- Transferts (item 16) ---------------------------------------------------------------------------

export function listStockTransfers(token: string) {
  return authorizedFetch<{ transfers: ApiStockTransfer[] }>('/stocks/transfers', token)
}

export function createStockTransfer(token: string, input: CreateStockTransferInput) {
  return authorizedFetch<{ transfer: ApiStockTransfer }>('/stocks/transfers', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function updateStockTransfer(token: string, id: string, input: UpdateStockTransferInput) {
  return authorizedFetch<{ transfer: ApiStockTransfer }>(`/stocks/transfers/${id}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function deleteStockTransfer(token: string, id: string) {
  return authorizedFetch<Record<string, never>>(`/stocks/transfers/${id}`, token, { method: 'DELETE' })
}

// --- Inventaires (item 16) --------------------------------------------------------------------------

export function listInventoryCounts(token: string) {
  return authorizedFetch<{ counts: ApiInventoryCount[] }>('/stocks/inventory-counts', token)
}

export function createInventoryCount(token: string, input: CreateInventoryCountInput) {
  return authorizedFetch<{ count: ApiInventoryCount }>('/stocks/inventory-counts', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function updateInventoryCount(token: string, id: string, input: UpdateInventoryCountInput) {
  return authorizedFetch<{ count: ApiInventoryCount }>(`/stocks/inventory-counts/${id}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function deleteInventoryCount(token: string, id: string) {
  return authorizedFetch<Record<string, never>>(`/stocks/inventory-counts/${id}`, token, { method: 'DELETE' })
}

// --- Pertes / Retour (item 16) -----------------------------------------------------------------------

export function listStockLosses(token: string) {
  return authorizedFetch<{ losses: ApiStockLoss[] }>('/stocks/losses', token)
}

export function createStockLoss(token: string, input: CreateStockLossInput) {
  return authorizedFetch<{ loss: ApiStockLoss }>('/stocks/losses', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function updateStockLoss(token: string, id: string, input: UpdateStockLossInput) {
  return authorizedFetch<{ loss: ApiStockLoss }>(`/stocks/losses/${id}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function deleteStockLoss(token: string, id: string) {
  return authorizedFetch<Record<string, never>>(`/stocks/losses/${id}`, token, { method: 'DELETE' })
}

// --- Analyse (item 16, lecture seule) -----------------------------------------------------------------

export function getStockAnalysis(token: string) {
  return authorizedFetch<{ analysis: ApiStockAnalysis }>('/stocks/analysis', token)
}

export function listProcurementRequests(token: string) {
  return authorizedFetch<{ requests: ApiProcurementRequest[] }>('/procurement', token)
}

export function exportProcurementRequests(token: string) {
  return authorizedFetch<{ document: ApiFileDocument }>('/procurement/export', token)
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

export function listPurchaseOrders(token: string) {
  return authorizedFetch<{ orders: ApiPurchaseOrder[] }>('/procurement/orders', token)
}

export function createPurchaseOrder(token: string, input: CreatePurchaseOrderInput) {
  return authorizedFetch<{ order: ApiPurchaseOrder }>('/procurement/orders', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function updatePurchaseOrder(token: string, id: string, input: UpdatePurchaseOrderInput) {
  return authorizedFetch<{ order: ApiPurchaseOrder }>(`/procurement/orders/${id}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function deletePurchaseOrder(token: string, id: string) {
  return authorizedFetch<Record<string, never>>(`/procurement/orders/${id}`, token, { method: 'DELETE' })
}

export function listGoodsReceptions(token: string) {
  return authorizedFetch<{ receptions: ApiGoodsReception[] }>('/procurement/receptions', token)
}

export function createGoodsReception(token: string, input: CreateGoodsReceptionInput) {
  return authorizedFetch<{ reception: ApiGoodsReception }>('/procurement/receptions', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function updateGoodsReception(token: string, id: string, input: UpdateGoodsReceptionInput) {
  return authorizedFetch<{ reception: ApiGoodsReception }>(`/procurement/receptions/${id}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function deleteGoodsReception(token: string, id: string) {
  return authorizedFetch<Record<string, never>>(`/procurement/receptions/${id}`, token, { method: 'DELETE' })
}

export function listBloodPouches(token: string) {
  return authorizedFetch<{ pouches: ApiBloodPouch[] }>('/blood-bank', token)
}

export function exportBloodPouches(token: string) {
  return authorizedFetch<{ document: ApiFileDocument }>('/blood-bank/export', token)
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

// --- Dons (item 15) --------------------------------------------------------------------------------

export function listDonations(token: string) {
  return authorizedFetch<{ donations: ApiDonation[] }>('/blood-bank/donations', token)
}

export function createDonation(token: string, input: CreateDonationInput) {
  return authorizedFetch<{ donation: ApiDonation }>('/blood-bank/donations', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function updateDonation(token: string, id: string, input: UpdateDonationInput) {
  return authorizedFetch<{ donation: ApiDonation }>(`/blood-bank/donations/${id}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function deleteDonation(token: string, id: string) {
  return authorizedFetch<Record<string, never>>(`/blood-bank/donations/${id}`, token, { method: 'DELETE' })
}

// --- Demandes transfusionnelles (item 15) ----------------------------------------------------------

export function listTransfusionRequests(token: string) {
  return authorizedFetch<{ requests: ApiTransfusionRequest[] }>('/blood-bank/transfusion-requests', token)
}

export function createTransfusionRequest(token: string, input: CreateTransfusionRequestInput) {
  return authorizedFetch<{ request: ApiTransfusionRequest }>('/blood-bank/transfusion-requests', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function updateTransfusionRequest(token: string, id: string, input: UpdateTransfusionRequestInput) {
  return authorizedFetch<{ request: ApiTransfusionRequest }>(`/blood-bank/transfusion-requests/${id}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function deleteTransfusionRequest(token: string, id: string) {
  return authorizedFetch<Record<string, never>>(`/blood-bank/transfusion-requests/${id}`, token, { method: 'DELETE' })
}

// --- Transfusions (item 15) -------------------------------------------------------------------------

export function listTransfusions(token: string) {
  return authorizedFetch<{ transfusions: ApiTransfusion[] }>('/blood-bank/transfusions', token)
}

export function createTransfusion(token: string, input: CreateTransfusionInput) {
  return authorizedFetch<{ transfusion: ApiTransfusion }>('/blood-bank/transfusions', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function updateTransfusion(token: string, id: string, input: UpdateTransfusionInput) {
  return authorizedFetch<{ transfusion: ApiTransfusion }>(`/blood-bank/transfusions/${id}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function deleteTransfusion(token: string, id: string) {
  return authorizedFetch<Record<string, never>>(`/blood-bank/transfusions/${id}`, token, { method: 'DELETE' })
}

// --- Analyses (item 15) --------------------------------------------------------------------------

export function listBloodAnalyses(token: string) {
  return authorizedFetch<{ analyses: ApiBloodAnalysis[] }>('/blood-bank/analyses', token)
}

export function createBloodAnalysis(token: string, input: CreateBloodAnalysisInput) {
  return authorizedFetch<{ analysis: ApiBloodAnalysis }>('/blood-bank/analyses', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function updateBloodAnalysis(token: string, id: string, input: UpdateBloodAnalysisInput) {
  return authorizedFetch<{ analysis: ApiBloodAnalysis }>(`/blood-bank/analyses/${id}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function deleteBloodAnalysis(token: string, id: string) {
  return authorizedFetch<Record<string, never>>(`/blood-bank/analyses/${id}`, token, { method: 'DELETE' })
}

export function listHrEmployees(token: string) {
  return authorizedFetch<{ employees: ApiHrEmployee[] }>('/hr', token)
}

export function exportHrEmployees(token: string) {
  return authorizedFetch<{ document: ApiFileDocument }>('/hr/export', token)
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

// --- Présences & Absences (item 12) -------------------------------------------------------------

export function listAttendances(token: string) {
  return authorizedFetch<{ attendances: ApiAttendance[] }>('/hr/attendance', token)
}

export function createAttendance(token: string, input: CreateAttendanceInput) {
  return authorizedFetch<{ attendance: ApiAttendance }>('/hr/attendance', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function updateAttendance(token: string, id: string, input: UpdateAttendanceInput) {
  return authorizedFetch<{ attendance: ApiAttendance }>(`/hr/attendance/${id}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function deleteAttendance(token: string, id: string) {
  return authorizedFetch<Record<string, never>>(`/hr/attendance/${id}`, token, { method: 'DELETE' })
}

// Pointeuse automatique à la connexion (item 14) — `attendance: null` si le compte n'a pas de
// fiche employé ou est DIRIGEANT (voir hr.routes.ts), ou si le pointage du jour existe déjà.
export function checkInAttendance(token: string, input: CheckInAttendanceInput) {
  return authorizedFetch<{ attendance: ApiAttendance | null }>('/hr/attendance/check-in', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

// --- Contrats (item 12) ---------------------------------------------------------------------------

export function listContracts(token: string) {
  return authorizedFetch<{ contracts: ApiContract[] }>('/hr/contracts', token)
}

export function createContract(token: string, input: CreateContractInput) {
  return authorizedFetch<{ contract: ApiContract }>('/hr/contracts', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function updateContract(token: string, id: string, input: UpdateContractInput) {
  return authorizedFetch<{ contract: ApiContract }>(`/hr/contracts/${id}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function deleteContract(token: string, id: string) {
  return authorizedFetch<Record<string, never>>(`/hr/contracts/${id}`, token, { method: 'DELETE' })
}

// --- Performances (item 12) -----------------------------------------------------------------------

export function listPerformanceReviews(token: string) {
  return authorizedFetch<{ reviews: ApiPerformanceReview[] }>('/hr/performance-reviews', token)
}

export function createPerformanceReview(token: string, input: CreatePerformanceReviewInput) {
  return authorizedFetch<{ review: ApiPerformanceReview }>('/hr/performance-reviews', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function updatePerformanceReview(token: string, id: string, input: UpdatePerformanceReviewInput) {
  return authorizedFetch<{ review: ApiPerformanceReview }>(`/hr/performance-reviews/${id}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function deletePerformanceReview(token: string, id: string) {
  return authorizedFetch<Record<string, never>>(`/hr/performance-reviews/${id}`, token, { method: 'DELETE' })
}

// --- Formations (item 12) -------------------------------------------------------------------------

export function listTrainings(token: string) {
  return authorizedFetch<{ trainings: ApiTraining[] }>('/hr/trainings', token)
}

export function createTraining(token: string, input: CreateTrainingInput) {
  return authorizedFetch<{ training: ApiTraining }>('/hr/trainings', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function updateTraining(token: string, id: string, input: UpdateTrainingInput) {
  return authorizedFetch<{ training: ApiTraining }>(`/hr/trainings/${id}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function deleteTraining(token: string, id: string) {
  return authorizedFetch<Record<string, never>>(`/hr/trainings/${id}`, token, { method: 'DELETE' })
}

// --- Paie (item 12) ---------------------------------------------------------------------------------

export function listPayrollEntries(token: string) {
  return authorizedFetch<{ entries: ApiPayrollEntry[] }>('/hr/payroll', token)
}

export function createPayrollEntry(token: string, input: CreatePayrollEntryInput) {
  return authorizedFetch<{ entry: ApiPayrollEntry }>('/hr/payroll', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function updatePayrollEntry(token: string, id: string, input: UpdatePayrollEntryInput) {
  return authorizedFetch<{ entry: ApiPayrollEntry }>(`/hr/payroll/${id}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function deletePayrollEntry(token: string, id: string) {
  return authorizedFetch<Record<string, never>>(`/hr/payroll/${id}`, token, { method: 'DELETE' })
}

// --- Documents employé (item 12) ------------------------------------------------------------------

export function listEmployeeDocuments(token: string) {
  return authorizedFetch<{ documents: ApiEmployeeDocument[] }>('/hr/documents', token)
}

export function createEmployeeDocument(token: string, input: CreateEmployeeDocumentInput) {
  return authorizedFetch<{ document: ApiEmployeeDocument }>('/hr/documents', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function deleteEmployeeDocument(token: string, id: string) {
  return authorizedFetch<Record<string, never>>(`/hr/documents/${id}`, token, { method: 'DELETE' })
}

export function getEmployeeDocumentFile(token: string, id: string) {
  return authorizedFetch<{ document: ApiFileDocument }>(`/hr/documents/${id}/file`, token)
}

export function uploadEmployeeDocumentFile(token: string, id: string, fileName: string, mimeType: string, content: Buffer) {
  const formData = new FormData()
  formData.append('file', new Blob([new Uint8Array(content)], { type: mimeType }), fileName)
  return authorizedFetch<{ document: ApiEmployeeDocument }>(`/hr/documents/${id}/file`, token, {
    method: 'POST',
    body: formData
  })
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

export function getProtocolDocumentFile(token: string, id: string) {
  return authorizedFetch<{ document: ApiFileDocument }>(`/documents/${id}/file`, token)
}

// multipart/form-data : ne surtout pas fixer Content-Type nous-mêmes, fetch/undici calcule seul
// la frontière (boundary) du formulaire — voir authorizedFetch, qui ne force ce header que quand
// l'appelant le demande explicitement.
export function uploadProtocolDocumentFile(token: string, id: string, fileName: string, mimeType: string, content: Buffer) {
  const formData = new FormData()
  formData.append('file', new Blob([new Uint8Array(content)], { type: mimeType }), fileName)
  return authorizedFetch<{ document: ApiProtocolDocument }>(`/documents/${id}/file`, token, {
    method: 'POST',
    body: formData
  })
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

export function exportFinanceTransactions(token: string) {
  return authorizedFetch<{ document: ApiFileDocument }>('/finance/export', token)
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

// --- Factures fournisseurs (item 14) --------------------------------------------------------------

export function listSupplierInvoices(token: string) {
  return authorizedFetch<{ invoices: ApiSupplierInvoice[] }>('/finance/supplier-invoices', token)
}

export function createSupplierInvoice(token: string, input: CreateSupplierInvoiceInput) {
  return authorizedFetch<{ invoice: ApiSupplierInvoice }>('/finance/supplier-invoices', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function updateSupplierInvoice(token: string, id: string, input: UpdateSupplierInvoiceInput) {
  return authorizedFetch<{ invoice: ApiSupplierInvoice }>(`/finance/supplier-invoices/${id}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function deleteSupplierInvoice(token: string, id: string) {
  return authorizedFetch<Record<string, never>>(`/finance/supplier-invoices/${id}`, token, { method: 'DELETE' })
}

// --- Paiements reçus (item 14) --------------------------------------------------------------------

export function listPaymentsReceived(token: string) {
  return authorizedFetch<{ payments: ApiPaymentReceived[] }>('/finance/payments', token)
}

export function createPaymentReceived(token: string, input: CreatePaymentReceivedInput) {
  return authorizedFetch<{ payment: ApiPaymentReceived }>('/finance/payments', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function updatePaymentReceived(token: string, id: string, input: UpdatePaymentReceivedInput) {
  return authorizedFetch<{ payment: ApiPaymentReceived }>(`/finance/payments/${id}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function deletePaymentReceived(token: string, id: string) {
  return authorizedFetch<Record<string, never>>(`/finance/payments/${id}`, token, { method: 'DELETE' })
}

// --- Dépenses par service (item 14) ---------------------------------------------------------------

export function listServiceExpenses(token: string) {
  return authorizedFetch<{ expenses: ApiServiceExpense[] }>('/finance/service-expenses', token)
}

export function createServiceExpense(token: string, input: CreateServiceExpenseInput) {
  return authorizedFetch<{ expense: ApiServiceExpense }>('/finance/service-expenses', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function updateServiceExpense(token: string, id: string, input: UpdateServiceExpenseInput) {
  return authorizedFetch<{ expense: ApiServiceExpense }>(`/finance/service-expenses/${id}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function deleteServiceExpense(token: string, id: string) {
  return authorizedFetch<Record<string, never>>(`/finance/service-expenses/${id}`, token, { method: 'DELETE' })
}

// --- Budgets (item 14) ------------------------------------------------------------------------------

export function listBudgets(token: string) {
  return authorizedFetch<{ budgets: ApiBudget[] }>('/finance/budgets', token)
}

export function createBudget(token: string, input: CreateBudgetInput) {
  return authorizedFetch<{ budget: ApiBudget }>('/finance/budgets', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function updateBudget(token: string, id: string, input: UpdateBudgetInput) {
  return authorizedFetch<{ budget: ApiBudget }>(`/finance/budgets/${id}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function deleteBudget(token: string, id: string) {
  return authorizedFetch<Record<string, never>>(`/finance/budgets/${id}`, token, { method: 'DELETE' })
}

// --- Comptes bancaires (item 14) --------------------------------------------------------------------

export function listBankAccounts(token: string) {
  return authorizedFetch<{ accounts: ApiBankAccount[] }>('/finance/bank-accounts', token)
}

export function createBankAccount(token: string, input: CreateBankAccountInput) {
  return authorizedFetch<{ account: ApiBankAccount }>('/finance/bank-accounts', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function updateBankAccount(token: string, id: string, input: UpdateBankAccountInput) {
  return authorizedFetch<{ account: ApiBankAccount }>(`/finance/bank-accounts/${id}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function deleteBankAccount(token: string, id: string) {
  return authorizedFetch<Record<string, never>>(`/finance/bank-accounts/${id}`, token, { method: 'DELETE' })
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

export function getCompany(token: string) {
  return authorizedFetch<{ company: ApiCompany }>('/company', token)
}

export function getCompanyLogo(token: string) {
  return authorizedFetch<{ logo: ApiCompanyLogo | null }>('/company/logo', token)
}

export function uploadCompanyLogo(token: string, fileName: string, mimeType: string, content: Buffer) {
  const formData = new FormData()
  formData.append('file', new Blob([new Uint8Array(content)], { type: mimeType }), fileName)
  return authorizedFetch<{ company: ApiCompany }>('/company/logo', token, { method: 'POST', body: formData })
}

export function deleteCompanyLogo(token: string) {
  return authorizedFetch<{ company: ApiCompany }>('/company/logo', token, { method: 'DELETE' })
}

export function updateCompany(token: string, input: UpdateCompanyInput) {
  return authorizedFetch<{ company: ApiCompany }>('/company', token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

export function listNotificationPreferences(token: string) {
  return authorizedFetch<{ preferences: ApiNotificationPreference[] }>('/notification-preferences', token)
}

export function updateNotificationPreference(token: string, id: string, input: UpdateNotificationPreferenceInput) {
  return authorizedFetch<{ preference: ApiNotificationPreference }>(`/notification-preferences/${id}`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  })
}

// --- Sauvegarde/restauration complète de la base (item 21) ---------------------------------------

export function exportBackup(token: string) {
  return authorizedFetch<{ backup: BackupFile }>('/admin/backup', token)
}

export function restoreBackup(token: string, backup: BackupFile) {
  return authorizedFetch<Record<string, never>>('/admin/backup/restore', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(backup)
  })
}

// --- Listes déroulantes "avec ajout automatique" (PETITES MODIFS items 3/6/7/8/12) ----------------
// Lecture seule : l'écriture se fait en effet de bord des créations/modifications des domaines
// concernés, jamais via un appel dédié depuis le renderer.

export function listPicklistValues(token: string, listKey: string) {
  return authorizedFetch<{ values: string[] }>(`/picklists/${listKey}`, token)
}

// --- Caisse (Plan-Module-Caisse.md) — en ligne uniquement, pas de miroir local -----------------

function jsonBody(method: string, body: unknown): RequestInit {
  return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
}

function filtersQuery(filters: ReceiptFilters): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value)
  const query = params.toString()
  return query ? `?${query}` : ''
}

export function listCashRegisters(token: string) {
  return authorizedFetch<{ registers: ApiCashRegister[] }>('/cashier/registers', token)
}

export function createCashRegister(token: string, input: CashRegisterInput) {
  return authorizedFetch<{ registers: ApiCashRegister[] }>('/cashier/registers', token, jsonBody('POST', input))
}

export function updateCashRegister(token: string, id: string, input: CashRegisterInput) {
  return authorizedFetch<{ registers: ApiCashRegister[] }>(`/cashier/registers/${id}`, token, jsonBody('PATCH', input))
}

export function listEligibleCashiers(token: string) {
  return authorizedFetch<{ users: ApiEligibleCashier[] }>('/cashier/eligible-cashiers', token)
}

export function openCashSession(token: string, registerId: string, openingFloat: number) {
  return authorizedFetch<{ session: ApiCashSession }>(`/cashier/registers/${registerId}/open`, token, jsonBody('POST', { openingFloat }))
}

export function getCashSession(token: string, id: string) {
  return authorizedFetch<{ session: ApiCashSession }>(`/cashier/sessions/${id}`, token)
}

export function closeCashSession(token: string, id: string, input: CloseSessionInput) {
  return authorizedFetch<{ session: ApiCashSession }>(`/cashier/sessions/${id}/close`, token, jsonBody('POST', input))
}

export function listCashSessions(token: string, filters: ReceiptFilters) {
  return authorizedFetch<{ sessions: ApiCashSession[] }>(`/cashier/sessions${filtersQuery(filters)}`, token)
}

export function listTariffs(token: string) {
  return authorizedFetch<{ tariffs: ApiTariffItem[] }>('/cashier/tariffs', token)
}

export function createTariff(token: string, input: TariffItemInput) {
  return authorizedFetch<{ tariff: ApiTariffItem }>('/cashier/tariffs', token, jsonBody('POST', input))
}

export function updateTariff(token: string, id: string, input: TariffItemInput) {
  return authorizedFetch<{ tariff: ApiTariffItem }>(`/cashier/tariffs/${id}`, token, jsonBody('PATCH', input))
}

export function cashierCreatePatient(token: string, input: QuickPatientInput) {
  return authorizedFetch<{ patient: { id: string; code: string; firstName: string; lastName: string } }>(
    '/cashier/patients',
    token,
    jsonBody('POST', input)
  )
}

export function listPendingExams(token: string, patientId: string) {
  return authorizedFetch<{ exams: ApiPendingExam[] }>(`/cashier/patients/${patientId}/pending-exams`, token)
}

export function createReceipt(token: string, input: CreateReceiptInput) {
  return authorizedFetch<{ receipt: ApiReceipt }>('/cashier/receipts', token, jsonBody('POST', input))
}

export function listReceipts(token: string, filters: ReceiptFilters) {
  return authorizedFetch<{ receipts: ApiReceipt[] }>(`/cashier/receipts${filtersQuery(filters)}`, token)
}

export function exportReceipts(token: string, filters: ReceiptFilters) {
  return authorizedFetch<{ document: ApiFileDocument }>(`/cashier/receipts/export${filtersQuery(filters)}`, token)
}

export function cancelReceipt(token: string, id: string, reason: string) {
  return authorizedFetch<{ receipt: ApiReceipt }>(`/cashier/receipts/${id}/cancel`, token, jsonBody('POST', { reason }))
}

export function refundReceipt(token: string, id: string, reason: string) {
  return authorizedFetch<{ receipt: ApiReceipt }>(`/cashier/receipts/${id}/refund`, token, jsonBody('POST', { reason }))
}

export function getReceiptPrintData(token: string, id: string) {
  return authorizedFetch<{ data: ApiReceiptPrintData }>(`/cashier/receipts/${id}/print-data`, token)
}

// --- Signature électronique (Documents & signature électronique) ------------------------------

export function getMySignature(token: string) {
  return authorizedFetch<{ signature: ApiSignatureImage | null }>('/documents/signature/me', token)
}

export function uploadMySignature(token: string, fileName: string, mimeType: string, content: Buffer) {
  const formData = new FormData()
  formData.append('file', new Blob([new Uint8Array(content)], { type: mimeType }), fileName)
  return authorizedFetch<{ signature: ApiSignatureImage | null }>('/documents/signature/me', token, { method: 'POST', body: formData })
}

export function deleteMySignature(token: string) {
  return authorizedFetch<Record<string, never>>('/documents/signature/me', token, { method: 'DELETE' })
}

export function listSignatureRequests(token: string) {
  return authorizedFetch<{ requests: ApiSignatureRequest[] }>('/documents/signature-requests', token)
}

export function createSignatureRequest(token: string, documentId: string, message: string | null) {
  return authorizedFetch<{ request: ApiSignatureRequest }>('/documents/signature-requests', token, jsonBody('POST', { documentId, message }))
}

export function createSignatureRequestWithFile(token: string, title: string, message: string | null, fileName: string, content: Buffer) {
  const formData = new FormData()
  formData.append('title', title)
  if (message) formData.append('message', message)
  formData.append('file', new Blob([new Uint8Array(content)], { type: 'application/pdf' }), fileName)
  return authorizedFetch<{ request: ApiSignatureRequest }>('/documents/signature-requests/upload', token, { method: 'POST', body: formData })
}

export function signSignatureRequest(token: string, id: string) {
  return authorizedFetch<{ request: ApiSignatureRequest }>(`/documents/signature-requests/${id}/sign`, token, { method: 'POST' })
}

export function refuseSignatureRequest(token: string, id: string, reason: string) {
  return authorizedFetch<{ request: ApiSignatureRequest }>(`/documents/signature-requests/${id}/refuse`, token, jsonBody('POST', { reason }))
}
