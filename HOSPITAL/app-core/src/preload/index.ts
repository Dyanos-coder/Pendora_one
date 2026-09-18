import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { LoginResult, Session } from '../shared/auth-types'
import type { AiApiResult, AiConversation, AiConversationMessage, ApiCalculatedAlert, AskAiResponse } from '../shared/ai-types'
import type {
  ApiPatientDossier,
  ApiPrescription,
  ApiVitalsRow,
  CreatePatientInput,
  CreatePrescriptionInput,
  CreateVitalsInput,
  PatientApiResult,
  PatientDetail,
  PatientSummary,
  UpdatePatientInput,
  UpdatePrescriptionInput
} from '../shared/patient-types'
import type {
  ApiAppointment,
  ApiEmployee,
  ApiResult,
  CreateAppointmentInput,
  UpdateAppointmentInput
} from '../shared/appointment-types'
import type { ApiConsultation, CreateConsultationInput, UpdateConsultationInput } from '../shared/consultation-types'
import type {
  ApiBed,
  ApiBedOccupancy,
  ApiHospitalization,
  CreateHospitalizationInput,
  UpdateHospitalizationInput
} from '../shared/hospitalization-types'
import type { ApiEmergencyVisit, CreateEmergencyVisitInput, UpdateEmergencyVisitInput } from '../shared/emergency-types'
import type { ApiOperatingRoom, ApiSurgery, CreateSurgeryInput, UpdateSurgeryInput } from '../shared/operating-room-types'
import type { ApiLabRequest, CreateLabRequestInput, UpdateLabRequestInput } from '../shared/laboratory-types'
import type { ApiImagingRequest, CreateImagingRequestInput, UpdateImagingRequestInput } from '../shared/imaging-types'
import type { ApiCardioExam, CreateCardioExamInput, UpdateCardioExamInput } from '../shared/cardiology-types'
import type { ApiPathologyRequest, CreatePathologyRequestInput, UpdatePathologyRequestInput } from '../shared/pathology-types'
import type { ApiEndoscopyProcedure, CreateEndoscopyProcedureInput, UpdateEndoscopyProcedureInput } from '../shared/endoscopy-types'
import type { ApiMedication, CreateMedicationInput, UpdateMedicationInput } from '../shared/pharmacy-types'
import type { ApiDepot, ApiDepotItem, CreateDepotItemInput, UpdateDepotItemInput } from '../shared/stocks-types'
import type {
  ApiProcurementRequest,
  ApiSupplier,
  CreateProcurementRequestInput,
  UpdateProcurementRequestInput
} from '../shared/procurement-types'
import type { ApiBloodPouch, CreateBloodPouchInput, UpdateBloodPouchInput } from '../shared/blood-bank-types'
import type { ApiFinanceTransaction, CreateFinanceTransactionInput, UpdateFinanceTransactionInput } from '../shared/finance-types'
import type { ApiHrEmployee, CreateHrEmployeeInput, UpdateHrEmployeeInput } from '../shared/hr-types'
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
} from '../shared/quality-types'
import type { ApiRisk, CreateRiskInput, UpdateRiskInput } from '../shared/risk-types'
import type {
  ApiAudit,
  ApiAuditFinding,
  ApiComplianceFramework,
  CreateAuditInput,
  UpdateAuditInput
} from '../shared/audit-compliance-types'
import type { ApiProtocolDocument, CreateProtocolDocumentInput, UpdateProtocolDocumentInput } from '../shared/documents-types'
import type { ApiDashboardSummary } from '../shared/dashboard-types'
import type { ApiAutomationLog, ApiAutomationRule } from '../shared/automation-types'
import type {
  ApiDepartmentComparison,
  ApiGeneratedReport,
  ApiReportCategory,
  ApiReportCategoryCount
} from '../shared/reports-types'
import type { ApiUser, CreateUserInput, UpdateUserInput } from '../shared/user-types'

const api = {
  auth: {
    login: (email: string, password: string): Promise<LoginResult> =>
      ipcRenderer.invoke('auth:login', email, password),
    logout: (): Promise<void> => ipcRenderer.invoke('auth:logout'),
    getSession: (): Promise<Session | null> => ipcRenderer.invoke('auth:getSession')
  },
  ai: {
    listConversations: (): Promise<AiApiResult<{ conversations: AiConversation[] }>> =>
      ipcRenderer.invoke('ai:listConversations'),
    createConversation: (title?: string): Promise<AiApiResult<{ conversation: AiConversation }>> =>
      ipcRenderer.invoke('ai:createConversation', title),
    renameConversation: (id: string, title: string): Promise<AiApiResult<{ conversation: AiConversation }>> =>
      ipcRenderer.invoke('ai:renameConversation', id, title),
    getMessages: (id: string): Promise<AiApiResult<{ messages: AiConversationMessage[] }>> =>
      ipcRenderer.invoke('ai:getMessages', id),
    ask: (id: string, question: string): Promise<AiApiResult<AskAiResponse>> =>
      ipcRenderer.invoke('ai:ask', id, question),
    alerts: (): Promise<AiApiResult<{ alerts: ApiCalculatedAlert[] }>> => ipcRenderer.invoke('ai:alerts')
  },
  patients: {
    list: (): Promise<PatientApiResult<{ patients: PatientSummary[] }>> => ipcRenderer.invoke('patients:list'),
    get: (id: string): Promise<PatientApiResult<{ patient: PatientDetail }>> => ipcRenderer.invoke('patients:get', id),
    create: (input: CreatePatientInput): Promise<PatientApiResult<{ patient: PatientDetail }>> =>
      ipcRenderer.invoke('patients:create', input),
    update: (id: string, input: UpdatePatientInput): Promise<PatientApiResult<{ patient: PatientDetail }>> =>
      ipcRenderer.invoke('patients:update', id, input),
    delete: (id: string): Promise<PatientApiResult<Record<string, never>>> => ipcRenderer.invoke('patients:delete', id),
    dossier: (id: string): Promise<PatientApiResult<{ dossier: ApiPatientDossier }>> => ipcRenderer.invoke('patients:dossier', id),
    addVitals: (id: string, input: CreateVitalsInput): Promise<PatientApiResult<{ vitals: ApiVitalsRow[] }>> =>
      ipcRenderer.invoke('patients:addVitals', id, input),
    addPrescription: (id: string, input: CreatePrescriptionInput): Promise<PatientApiResult<{ prescription: ApiPrescription }>> =>
      ipcRenderer.invoke('patients:addPrescription', id, input),
    updatePrescription: (
      id: string,
      prescriptionId: string,
      input: UpdatePrescriptionInput
    ): Promise<PatientApiResult<{ prescription: ApiPrescription }>> =>
      ipcRenderer.invoke('patients:updatePrescription', id, prescriptionId, input),
    print: (id: string): Promise<void> => ipcRenderer.invoke('patients:print', id)
  },
  appointments: {
    list: (): Promise<ApiResult<{ appointments: ApiAppointment[] }>> => ipcRenderer.invoke('appointments:list'),
    create: (input: CreateAppointmentInput): Promise<ApiResult<{ appointment: ApiAppointment }>> =>
      ipcRenderer.invoke('appointments:create', input),
    update: (id: string, input: UpdateAppointmentInput): Promise<ApiResult<{ appointment: ApiAppointment }>> =>
      ipcRenderer.invoke('appointments:update', id, input),
    delete: (id: string): Promise<ApiResult<Record<string, never>>> => ipcRenderer.invoke('appointments:delete', id),
    listDoctors: (): Promise<ApiResult<{ employees: ApiEmployee[] }>> => ipcRenderer.invoke('appointments:listDoctors')
  },
  consultations: {
    list: (): Promise<ApiResult<{ consultations: ApiConsultation[] }>> => ipcRenderer.invoke('consultations:list'),
    create: (input: CreateConsultationInput): Promise<ApiResult<{ consultation: ApiConsultation }>> =>
      ipcRenderer.invoke('consultations:create', input),
    update: (id: string, input: UpdateConsultationInput): Promise<ApiResult<{ consultation: ApiConsultation }>> =>
      ipcRenderer.invoke('consultations:update', id, input),
    delete: (id: string): Promise<ApiResult<Record<string, never>>> => ipcRenderer.invoke('consultations:delete', id)
  },
  hospitalizations: {
    list: (): Promise<ApiResult<{ hospitalizations: ApiHospitalization[] }>> => ipcRenderer.invoke('hospitalizations:list'),
    create: (input: CreateHospitalizationInput): Promise<ApiResult<{ hospitalization: ApiHospitalization }>> =>
      ipcRenderer.invoke('hospitalizations:create', input),
    update: (
      id: string,
      input: UpdateHospitalizationInput
    ): Promise<ApiResult<{ hospitalization: ApiHospitalization }>> =>
      ipcRenderer.invoke('hospitalizations:update', id, input),
    delete: (id: string): Promise<ApiResult<Record<string, never>>> => ipcRenderer.invoke('hospitalizations:delete', id),
    beds: (): Promise<ApiResult<{ beds: ApiBed[] }>> => ipcRenderer.invoke('hospitalizations:beds'),
    occupancy: (): Promise<ApiResult<{ occupancy: ApiBedOccupancy }>> => ipcRenderer.invoke('hospitalizations:occupancy')
  },
  emergencies: {
    list: (): Promise<ApiResult<{ visits: ApiEmergencyVisit[] }>> => ipcRenderer.invoke('emergencies:list'),
    create: (input: CreateEmergencyVisitInput): Promise<ApiResult<{ visit: ApiEmergencyVisit }>> =>
      ipcRenderer.invoke('emergencies:create', input),
    update: (id: string, input: UpdateEmergencyVisitInput): Promise<ApiResult<{ visit: ApiEmergencyVisit }>> =>
      ipcRenderer.invoke('emergencies:update', id, input),
    delete: (id: string): Promise<ApiResult<Record<string, never>>> => ipcRenderer.invoke('emergencies:delete', id)
  },
  operatingRoom: {
    list: (): Promise<ApiResult<{ surgeries: ApiSurgery[] }>> => ipcRenderer.invoke('operatingRoom:list'),
    create: (input: CreateSurgeryInput): Promise<ApiResult<{ surgery: ApiSurgery }>> =>
      ipcRenderer.invoke('operatingRoom:create', input),
    update: (id: string, input: UpdateSurgeryInput): Promise<ApiResult<{ surgery: ApiSurgery }>> =>
      ipcRenderer.invoke('operatingRoom:update', id, input),
    delete: (id: string): Promise<ApiResult<Record<string, never>>> => ipcRenderer.invoke('operatingRoom:delete', id),
    rooms: (): Promise<ApiResult<{ rooms: ApiOperatingRoom[] }>> => ipcRenderer.invoke('operatingRoom:rooms')
  },
  laboratory: {
    list: (): Promise<ApiResult<{ requests: ApiLabRequest[] }>> => ipcRenderer.invoke('laboratory:list'),
    create: (input: CreateLabRequestInput): Promise<ApiResult<{ request: ApiLabRequest }>> =>
      ipcRenderer.invoke('laboratory:create', input),
    update: (id: string, input: UpdateLabRequestInput): Promise<ApiResult<{ request: ApiLabRequest }>> =>
      ipcRenderer.invoke('laboratory:update', id, input),
    delete: (id: string): Promise<ApiResult<Record<string, never>>> => ipcRenderer.invoke('laboratory:delete', id)
  },
  imaging: {
    list: (): Promise<ApiResult<{ requests: ApiImagingRequest[] }>> => ipcRenderer.invoke('imaging:list'),
    create: (input: CreateImagingRequestInput): Promise<ApiResult<{ request: ApiImagingRequest }>> =>
      ipcRenderer.invoke('imaging:create', input),
    update: (id: string, input: UpdateImagingRequestInput): Promise<ApiResult<{ request: ApiImagingRequest }>> =>
      ipcRenderer.invoke('imaging:update', id, input),
    delete: (id: string): Promise<ApiResult<Record<string, never>>> => ipcRenderer.invoke('imaging:delete', id)
  },
  cardiology: {
    list: (): Promise<ApiResult<{ exams: ApiCardioExam[] }>> => ipcRenderer.invoke('cardiology:list'),
    create: (input: CreateCardioExamInput): Promise<ApiResult<{ exam: ApiCardioExam }>> =>
      ipcRenderer.invoke('cardiology:create', input),
    update: (id: string, input: UpdateCardioExamInput): Promise<ApiResult<{ exam: ApiCardioExam }>> =>
      ipcRenderer.invoke('cardiology:update', id, input),
    delete: (id: string): Promise<ApiResult<Record<string, never>>> => ipcRenderer.invoke('cardiology:delete', id),
    patientsFollowed: (): Promise<ApiResult<{ count: number }>> => ipcRenderer.invoke('cardiology:patientsFollowed')
  },
  pathology: {
    list: (): Promise<ApiResult<{ requests: ApiPathologyRequest[] }>> => ipcRenderer.invoke('pathology:list'),
    create: (input: CreatePathologyRequestInput): Promise<ApiResult<{ request: ApiPathologyRequest }>> =>
      ipcRenderer.invoke('pathology:create', input),
    update: (id: string, input: UpdatePathologyRequestInput): Promise<ApiResult<{ request: ApiPathologyRequest }>> =>
      ipcRenderer.invoke('pathology:update', id, input),
    delete: (id: string): Promise<ApiResult<Record<string, never>>> => ipcRenderer.invoke('pathology:delete', id),
    patientsFollowed: (): Promise<ApiResult<{ count: number }>> => ipcRenderer.invoke('pathology:patientsFollowed')
  },
  endoscopy: {
    list: (): Promise<ApiResult<{ procedures: ApiEndoscopyProcedure[] }>> => ipcRenderer.invoke('endoscopy:list'),
    create: (input: CreateEndoscopyProcedureInput): Promise<ApiResult<{ procedure: ApiEndoscopyProcedure }>> =>
      ipcRenderer.invoke('endoscopy:create', input),
    update: (
      id: string,
      input: UpdateEndoscopyProcedureInput
    ): Promise<ApiResult<{ procedure: ApiEndoscopyProcedure }>> =>
      ipcRenderer.invoke('endoscopy:update', id, input),
    delete: (id: string): Promise<ApiResult<Record<string, never>>> => ipcRenderer.invoke('endoscopy:delete', id),
    patientsFollowed: (): Promise<ApiResult<{ count: number }>> => ipcRenderer.invoke('endoscopy:patientsFollowed')
  },
  pharmacy: {
    list: (): Promise<ApiResult<{ medications: ApiMedication[] }>> => ipcRenderer.invoke('pharmacy:list'),
    create: (input: CreateMedicationInput): Promise<ApiResult<{ medication: ApiMedication }>> =>
      ipcRenderer.invoke('pharmacy:create', input),
    update: (id: string, input: UpdateMedicationInput): Promise<ApiResult<{ medication: ApiMedication }>> =>
      ipcRenderer.invoke('pharmacy:update', id, input),
    delete: (id: string): Promise<ApiResult<Record<string, never>>> => ipcRenderer.invoke('pharmacy:delete', id)
  },
  stocks: {
    depots: (): Promise<ApiResult<{ depots: ApiDepot[] }>> => ipcRenderer.invoke('stocks:depots'),
    items: (): Promise<ApiResult<{ items: ApiDepotItem[] }>> => ipcRenderer.invoke('stocks:items'),
    create: (input: CreateDepotItemInput): Promise<ApiResult<{ item: ApiDepotItem }>> => ipcRenderer.invoke('stocks:create', input),
    update: (id: string, input: UpdateDepotItemInput): Promise<ApiResult<{ item: ApiDepotItem }>> =>
      ipcRenderer.invoke('stocks:update', id, input),
    delete: (id: string): Promise<ApiResult<Record<string, never>>> => ipcRenderer.invoke('stocks:delete', id)
  },
  procurement: {
    list: (): Promise<ApiResult<{ requests: ApiProcurementRequest[] }>> => ipcRenderer.invoke('procurement:list'),
    suppliers: (): Promise<ApiResult<{ suppliers: ApiSupplier[] }>> => ipcRenderer.invoke('procurement:suppliers'),
    create: (input: CreateProcurementRequestInput): Promise<ApiResult<{ request: ApiProcurementRequest }>> =>
      ipcRenderer.invoke('procurement:create', input),
    update: (id: string, input: UpdateProcurementRequestInput): Promise<ApiResult<{ request: ApiProcurementRequest }>> =>
      ipcRenderer.invoke('procurement:update', id, input),
    delete: (id: string): Promise<ApiResult<Record<string, never>>> => ipcRenderer.invoke('procurement:delete', id)
  },
  bloodBank: {
    list: (): Promise<ApiResult<{ pouches: ApiBloodPouch[] }>> => ipcRenderer.invoke('bloodBank:list'),
    create: (input: CreateBloodPouchInput): Promise<ApiResult<{ pouch: ApiBloodPouch }>> =>
      ipcRenderer.invoke('bloodBank:create', input),
    update: (id: string, input: UpdateBloodPouchInput): Promise<ApiResult<{ pouch: ApiBloodPouch }>> =>
      ipcRenderer.invoke('bloodBank:update', id, input),
    delete: (id: string): Promise<ApiResult<Record<string, never>>> => ipcRenderer.invoke('bloodBank:delete', id)
  },
  finance: {
    list: (): Promise<ApiResult<{ transactions: ApiFinanceTransaction[] }>> => ipcRenderer.invoke('finance:list'),
    create: (input: CreateFinanceTransactionInput): Promise<ApiResult<{ transaction: ApiFinanceTransaction }>> =>
      ipcRenderer.invoke('finance:create', input),
    update: (id: string, input: UpdateFinanceTransactionInput): Promise<ApiResult<{ transaction: ApiFinanceTransaction }>> =>
      ipcRenderer.invoke('finance:update', id, input),
    delete: (id: string): Promise<ApiResult<Record<string, never>>> => ipcRenderer.invoke('finance:delete', id)
  },
  hr: {
    list: (): Promise<ApiResult<{ employees: ApiHrEmployee[] }>> => ipcRenderer.invoke('hr:list'),
    create: (input: CreateHrEmployeeInput): Promise<ApiResult<{ employee: ApiHrEmployee }>> =>
      ipcRenderer.invoke('hr:create', input),
    update: (id: string, input: UpdateHrEmployeeInput): Promise<ApiResult<{ employee: ApiHrEmployee }>> =>
      ipcRenderer.invoke('hr:update', id, input),
    delete: (id: string): Promise<ApiResult<Record<string, never>>> => ipcRenderer.invoke('hr:delete', id)
  },
  quality: {
    indicators: (): Promise<ApiResult<{ indicators: ApiQualityIndicator[] }>> => ipcRenderer.invoke('quality:indicators'),
    createIndicator: (input: CreateQualityIndicatorInput): Promise<ApiResult<{ indicator: ApiQualityIndicator }>> =>
      ipcRenderer.invoke('quality:createIndicator', input),
    updateIndicator: (
      id: string,
      input: UpdateQualityIndicatorInput
    ): Promise<ApiResult<{ indicator: ApiQualityIndicator }>> => ipcRenderer.invoke('quality:updateIndicator', id, input),
    deleteIndicator: (id: string): Promise<ApiResult<Record<string, never>>> => ipcRenderer.invoke('quality:deleteIndicator', id),
    certifications: (): Promise<ApiResult<{ certifications: ApiQualityCertification[] }>> =>
      ipcRenderer.invoke('quality:certifications'),
    createCertification: (
      input: CreateQualityCertificationInput
    ): Promise<ApiResult<{ certification: ApiQualityCertification }>> =>
      ipcRenderer.invoke('quality:createCertification', input),
    updateCertification: (
      id: string,
      input: UpdateQualityCertificationInput
    ): Promise<ApiResult<{ certification: ApiQualityCertification }>> =>
      ipcRenderer.invoke('quality:updateCertification', id, input),
    deleteCertification: (id: string): Promise<ApiResult<Record<string, never>>> =>
      ipcRenderer.invoke('quality:deleteCertification', id),
    actions: (): Promise<ApiResult<{ actions: ApiQualityAction[] }>> => ipcRenderer.invoke('quality:actions'),
    createAction: (input: CreateQualityActionInput): Promise<ApiResult<{ action: ApiQualityAction }>> =>
      ipcRenderer.invoke('quality:createAction', input),
    updateAction: (id: string, input: UpdateQualityActionInput): Promise<ApiResult<{ action: ApiQualityAction }>> =>
      ipcRenderer.invoke('quality:updateAction', id, input),
    deleteAction: (id: string): Promise<ApiResult<Record<string, never>>> => ipcRenderer.invoke('quality:deleteAction', id)
  },
  risk: {
    list: (): Promise<ApiResult<{ risks: ApiRisk[] }>> => ipcRenderer.invoke('risk:list'),
    create: (input: CreateRiskInput): Promise<ApiResult<{ risk: ApiRisk }>> => ipcRenderer.invoke('risk:create', input),
    update: (id: string, input: UpdateRiskInput): Promise<ApiResult<{ risk: ApiRisk }>> =>
      ipcRenderer.invoke('risk:update', id, input),
    delete: (id: string): Promise<ApiResult<Record<string, never>>> => ipcRenderer.invoke('risk:delete', id)
  },
  auditCompliance: {
    audits: (): Promise<ApiResult<{ audits: ApiAudit[] }>> => ipcRenderer.invoke('auditCompliance:audits'),
    createAudit: (input: CreateAuditInput): Promise<ApiResult<{ audit: ApiAudit }>> =>
      ipcRenderer.invoke('auditCompliance:createAudit', input),
    updateAudit: (id: string, input: UpdateAuditInput): Promise<ApiResult<{ audit: ApiAudit }>> =>
      ipcRenderer.invoke('auditCompliance:updateAudit', id, input),
    deleteAudit: (id: string): Promise<ApiResult<Record<string, never>>> => ipcRenderer.invoke('auditCompliance:deleteAudit', id),
    findings: (): Promise<ApiResult<{ findings: ApiAuditFinding[] }>> => ipcRenderer.invoke('auditCompliance:findings'),
    frameworks: (): Promise<ApiResult<{ frameworks: ApiComplianceFramework[] }>> =>
      ipcRenderer.invoke('auditCompliance:frameworks')
  },
  documents: {
    list: (): Promise<ApiResult<{ documents: ApiProtocolDocument[] }>> => ipcRenderer.invoke('documents:list'),
    create: (input: CreateProtocolDocumentInput): Promise<ApiResult<{ document: ApiProtocolDocument }>> =>
      ipcRenderer.invoke('documents:create', input),
    update: (id: string, input: UpdateProtocolDocumentInput): Promise<ApiResult<{ document: ApiProtocolDocument }>> =>
      ipcRenderer.invoke('documents:update', id, input),
    delete: (id: string): Promise<ApiResult<Record<string, never>>> => ipcRenderer.invoke('documents:delete', id)
  },
  dashboard: {
    summary: (): Promise<ApiResult<{ summary: ApiDashboardSummary }>> => ipcRenderer.invoke('dashboard:summary')
  },
  automation: {
    rules: (): Promise<ApiResult<{ rules: ApiAutomationRule[] }>> => ipcRenderer.invoke('automation:rules'),
    logs: (): Promise<ApiResult<{ logs: ApiAutomationLog[] }>> => ipcRenderer.invoke('automation:logs'),
    toggle: (id: string, active: boolean): Promise<ApiResult<{ rule: ApiAutomationRule }>> =>
      ipcRenderer.invoke('automation:toggle', id, active)
  },
  reports: {
    list: (): Promise<ApiResult<{ categories: ApiReportCategoryCount[]; reports: ApiGeneratedReport[] }>> =>
      ipcRenderer.invoke('reports:list'),
    departmentComparison: (): Promise<ApiResult<{ departments: ApiDepartmentComparison[] }>> =>
      ipcRenderer.invoke('reports:departmentComparison'),
    generate: (category: ApiReportCategory): Promise<ApiResult<{ report: ApiGeneratedReport }>> =>
      ipcRenderer.invoke('reports:generate', category),
    download: (id: string): Promise<boolean> => ipcRenderer.invoke('reports:download', id)
  },
  users: {
    list: (): Promise<ApiResult<{ users: ApiUser[] }>> => ipcRenderer.invoke('users:list'),
    create: (input: CreateUserInput): Promise<ApiResult<{ user: ApiUser }>> => ipcRenderer.invoke('users:create', input),
    update: (id: string, input: UpdateUserInput): Promise<ApiResult<{ user: ApiUser }>> =>
      ipcRenderer.invoke('users:update', id, input),
    resetPassword: (id: string, newPassword: string): Promise<ApiResult<Record<string, never>>> =>
      ipcRenderer.invoke('users:resetPassword', id, newPassword),
    changePassword: (currentPassword: string, newPassword: string): Promise<ApiResult<Record<string, never>>> =>
      ipcRenderer.invoke('users:changePassword', currentPassword, newPassword)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}

export type Api = typeof api
