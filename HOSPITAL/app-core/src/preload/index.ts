import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { LoginResult, Session } from '../shared/auth-types'
import type { ConnectivityStatus, SyncConflictNotification, SyncOutboxEntry } from '../shared/sync-types'
import type { ActivationInfo, AppConfig, DbAccessInput, DbAccessPrefill, DbStartupStatus, SaveDbAccessResult } from '../shared/setup-types'
import type { UpdateInfo, UpdateStatus } from '../shared/update-types'
import type {
  CheckoutInput,
  PendingPayment,
  SubscriptionCatalogItem,
  SubscriptionInfo,
  SubscriptionPayment,
  SubscriptionQuote,
  SubscriptionResult
} from '../shared/subscription-types'
import type {
  ApiCashRegister,
  ApiCashSession,
  ApiEligibleCashier,
  ApiPendingExam,
  ApiReceipt,
  ApiTariffItem,
  CashRegisterInput,
  CloseSessionInput,
  CreateReceiptInput,
  QuickPatientInput,
  ReceiptFilters,
  TariffItemInput
} from '../shared/cashier-types'
import type { AiApiResult, AiConversation, AiConversationMessage, ApiCalculatedAlert, AskAiResponse } from '../shared/ai-types'
import type {
  ApiPatientDocument,
  ApiPatientDossier,
  ApiPrescription,
  ApiVitalsRow,
  CreatePatientDocumentInput,
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
} from '../shared/stocks-types'
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
} from '../shared/procurement-types'
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
} from '../shared/blood-bank-types'
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
} from '../shared/finance-types'
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
} from '../shared/hr-types'
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
import type {
  ApiProtocolDocument,
  ApiSignatureImage,
  ApiSignatureRequest,
  CreateProtocolDocumentInput,
  UpdateProtocolDocumentInput
} from '../shared/documents-types'
import type { ApiDashboardSummary } from '../shared/dashboard-types'
import type { ApiAutomationLog, ApiAutomationRule } from '../shared/automation-types'
import type {
  ApiDepartmentComparison,
  ApiGeneratedReport,
  ApiReportCategory,
  ApiReportCategoryCount
} from '../shared/reports-types'
import type { ApiUser, CreateUserInput, UpdateUserInput } from '../shared/user-types'
import type {
  ApiCompany,
  ApiCompanyLogo,
  UpdateCompanyInput,
  ApiNotificationPreference,
  UpdateNotificationPreferenceInput
} from '../shared/company-types'
import type { LocalBackupInfo } from '../shared/backup-types'

const api = {
  auth: {
    login: (email: string, password: string): Promise<LoginResult> =>
      ipcRenderer.invoke('auth:login', email, password),
    logout: (): Promise<void> => ipcRenderer.invoke('auth:logout'),
    getSession: (): Promise<Session | null> => ipcRenderer.invoke('auth:getSession'),
    onSessionExpired: (callback: () => void): (() => void) => {
      const handler = (): void => callback()
      ipcRenderer.on('auth:sessionExpired', handler)
      return () => ipcRenderer.removeListener('auth:sessionExpired', handler)
    }
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
    addVitals: (id: string, input: CreateVitalsInput): Promise<PatientApiResult<{ vitalsId: string; vitals: ApiVitalsRow[] }>> =>
      ipcRenderer.invoke('patients:addVitals', id, input),
    uploadVitalsFile: (
      patientId: string,
      vitalsId: string
    ): Promise<PatientApiResult<{ vitalsId: string; vitals: ApiVitalsRow[] }> | null> =>
      ipcRenderer.invoke('patients:vitals:uploadFile', patientId, vitalsId),
    viewVitalsFile: (patientId: string, vitalsId: string): Promise<void> =>
      ipcRenderer.invoke('patients:vitals:viewFile', patientId, vitalsId),
    addPrescription: (id: string, input: CreatePrescriptionInput): Promise<PatientApiResult<{ prescription: ApiPrescription }>> =>
      ipcRenderer.invoke('patients:addPrescription', id, input),
    updatePrescription: (
      id: string,
      prescriptionId: string,
      input: UpdatePrescriptionInput
    ): Promise<PatientApiResult<{ prescription: ApiPrescription }>> =>
      ipcRenderer.invoke('patients:updatePrescription', id, prescriptionId, input),
    print: (id: string): Promise<void> => ipcRenderer.invoke('patients:print', id),
    documents: {
      list: (patientId: string): Promise<PatientApiResult<{ documents: ApiPatientDocument[] }>> =>
        ipcRenderer.invoke('patients:documents:list', patientId),
      create: (input: CreatePatientDocumentInput): Promise<PatientApiResult<{ document: ApiPatientDocument }>> =>
        ipcRenderer.invoke('patients:documents:create', input),
      delete: (patientId: string, documentId: string): Promise<PatientApiResult<Record<string, never>>> =>
        ipcRenderer.invoke('patients:documents:delete', patientId, documentId),
      uploadFile: (patientId: string, documentId: string): Promise<PatientApiResult<{ document: ApiPatientDocument }> | null> =>
        ipcRenderer.invoke('patients:documents:uploadFile', patientId, documentId),
      view: (patientId: string, documentId: string): Promise<void> => ipcRenderer.invoke('patients:documents:view', patientId, documentId)
    }
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
    delete: (id: string): Promise<ApiResult<Record<string, never>>> => ipcRenderer.invoke('consultations:delete', id),
    exportExcel: (): Promise<boolean> => ipcRenderer.invoke('consultations:exportExcel'),
    uploadDocument: (id: string): Promise<ApiResult<{ consultation: ApiConsultation }> | null> =>
      ipcRenderer.invoke('consultations:uploadDocument', id),
    viewDocument: (id: string): Promise<void> => ipcRenderer.invoke('consultations:viewDocument', id)
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
    occupancy: (): Promise<ApiResult<{ occupancy: ApiBedOccupancy }>> => ipcRenderer.invoke('hospitalizations:occupancy'),
    exportExcel: (): Promise<boolean> => ipcRenderer.invoke('hospitalizations:exportExcel')
  },
  emergencies: {
    list: (): Promise<ApiResult<{ visits: ApiEmergencyVisit[] }>> => ipcRenderer.invoke('emergencies:list'),
    create: (input: CreateEmergencyVisitInput): Promise<ApiResult<{ visit: ApiEmergencyVisit }>> =>
      ipcRenderer.invoke('emergencies:create', input),
    update: (id: string, input: UpdateEmergencyVisitInput): Promise<ApiResult<{ visit: ApiEmergencyVisit }>> =>
      ipcRenderer.invoke('emergencies:update', id, input),
    delete: (id: string): Promise<ApiResult<Record<string, never>>> => ipcRenderer.invoke('emergencies:delete', id),
    exportExcel: (): Promise<boolean> => ipcRenderer.invoke('emergencies:exportExcel')
  },
  operatingRoom: {
    list: (): Promise<ApiResult<{ surgeries: ApiSurgery[] }>> => ipcRenderer.invoke('operatingRoom:list'),
    create: (input: CreateSurgeryInput): Promise<ApiResult<{ surgery: ApiSurgery }>> =>
      ipcRenderer.invoke('operatingRoom:create', input),
    update: (id: string, input: UpdateSurgeryInput): Promise<ApiResult<{ surgery: ApiSurgery }>> =>
      ipcRenderer.invoke('operatingRoom:update', id, input),
    delete: (id: string): Promise<ApiResult<Record<string, never>>> => ipcRenderer.invoke('operatingRoom:delete', id),
    rooms: (): Promise<ApiResult<{ rooms: ApiOperatingRoom[] }>> => ipcRenderer.invoke('operatingRoom:rooms'),
    exportExcel: (): Promise<boolean> => ipcRenderer.invoke('operatingRoom:exportExcel')
  },
  laboratory: {
    list: (): Promise<ApiResult<{ requests: ApiLabRequest[] }>> => ipcRenderer.invoke('laboratory:list'),
    create: (input: CreateLabRequestInput): Promise<ApiResult<{ request: ApiLabRequest }>> =>
      ipcRenderer.invoke('laboratory:create', input),
    update: (id: string, input: UpdateLabRequestInput): Promise<ApiResult<{ request: ApiLabRequest }>> =>
      ipcRenderer.invoke('laboratory:update', id, input),
    delete: (id: string): Promise<ApiResult<Record<string, never>>> => ipcRenderer.invoke('laboratory:delete', id),
    exportExcel: (): Promise<boolean> => ipcRenderer.invoke('laboratory:exportExcel'),
    uploadResultFile: (id: string): Promise<ApiResult<{ request: ApiLabRequest }> | null> =>
      ipcRenderer.invoke('laboratory:uploadResultFile', id),
    viewResultFile: (id: string): Promise<void> => ipcRenderer.invoke('laboratory:viewResultFile', id)
  },
  imaging: {
    list: (): Promise<ApiResult<{ requests: ApiImagingRequest[] }>> => ipcRenderer.invoke('imaging:list'),
    create: (input: CreateImagingRequestInput): Promise<ApiResult<{ request: ApiImagingRequest }>> =>
      ipcRenderer.invoke('imaging:create', input),
    update: (id: string, input: UpdateImagingRequestInput): Promise<ApiResult<{ request: ApiImagingRequest }>> =>
      ipcRenderer.invoke('imaging:update', id, input),
    delete: (id: string): Promise<ApiResult<Record<string, never>>> => ipcRenderer.invoke('imaging:delete', id),
    exportExcel: (): Promise<boolean> => ipcRenderer.invoke('imaging:exportExcel'),
    uploadResultFile: (id: string): Promise<ApiResult<{ request: ApiImagingRequest }> | null> =>
      ipcRenderer.invoke('imaging:uploadResultFile', id),
    viewResultFile: (id: string): Promise<void> => ipcRenderer.invoke('imaging:viewResultFile', id)
  },
  cardiology: {
    list: (): Promise<ApiResult<{ exams: ApiCardioExam[] }>> => ipcRenderer.invoke('cardiology:list'),
    create: (input: CreateCardioExamInput): Promise<ApiResult<{ exam: ApiCardioExam }>> =>
      ipcRenderer.invoke('cardiology:create', input),
    update: (id: string, input: UpdateCardioExamInput): Promise<ApiResult<{ exam: ApiCardioExam }>> =>
      ipcRenderer.invoke('cardiology:update', id, input),
    delete: (id: string): Promise<ApiResult<Record<string, never>>> => ipcRenderer.invoke('cardiology:delete', id),
    patientsFollowed: (): Promise<ApiResult<{ count: number }>> => ipcRenderer.invoke('cardiology:patientsFollowed'),
    exportExcel: (): Promise<boolean> => ipcRenderer.invoke('cardiology:exportExcel'),
    uploadResultFile: (id: string): Promise<ApiResult<{ exam: ApiCardioExam }> | null> =>
      ipcRenderer.invoke('cardiology:uploadResultFile', id),
    viewResultFile: (id: string): Promise<void> => ipcRenderer.invoke('cardiology:viewResultFile', id)
  },
  pathology: {
    list: (): Promise<ApiResult<{ requests: ApiPathologyRequest[] }>> => ipcRenderer.invoke('pathology:list'),
    create: (input: CreatePathologyRequestInput): Promise<ApiResult<{ request: ApiPathologyRequest }>> =>
      ipcRenderer.invoke('pathology:create', input),
    update: (id: string, input: UpdatePathologyRequestInput): Promise<ApiResult<{ request: ApiPathologyRequest }>> =>
      ipcRenderer.invoke('pathology:update', id, input),
    delete: (id: string): Promise<ApiResult<Record<string, never>>> => ipcRenderer.invoke('pathology:delete', id),
    patientsFollowed: (): Promise<ApiResult<{ count: number }>> => ipcRenderer.invoke('pathology:patientsFollowed'),
    exportExcel: (): Promise<boolean> => ipcRenderer.invoke('pathology:exportExcel'),
    uploadResultFile: (id: string): Promise<ApiResult<{ request: ApiPathologyRequest }> | null> =>
      ipcRenderer.invoke('pathology:uploadResultFile', id),
    viewResultFile: (id: string): Promise<void> => ipcRenderer.invoke('pathology:viewResultFile', id)
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
    patientsFollowed: (): Promise<ApiResult<{ count: number }>> => ipcRenderer.invoke('endoscopy:patientsFollowed'),
    uploadResultFile: (id: string): Promise<ApiResult<{ procedure: ApiEndoscopyProcedure }> | null> =>
      ipcRenderer.invoke('endoscopy:uploadResultFile', id),
    viewResultFile: (id: string): Promise<void> => ipcRenderer.invoke('endoscopy:viewResultFile', id)
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
    delete: (id: string): Promise<ApiResult<Record<string, never>>> => ipcRenderer.invoke('stocks:delete', id),
    exportExcel: (): Promise<boolean> => ipcRenderer.invoke('stocks:exportExcel'),
    movements: {
      list: (): Promise<ApiResult<{ movements: ApiStockMovement[] }>> => ipcRenderer.invoke('stocks:movements:list'),
      create: (input: CreateStockMovementInput): Promise<ApiResult<{ movement: ApiStockMovement }>> =>
        ipcRenderer.invoke('stocks:movements:create', input),
      update: (id: string, input: UpdateStockMovementInput): Promise<ApiResult<{ movement: ApiStockMovement }>> =>
        ipcRenderer.invoke('stocks:movements:update', id, input),
      delete: (id: string): Promise<ApiResult<Record<string, never>>> => ipcRenderer.invoke('stocks:movements:delete', id)
    },
    transfers: {
      list: (): Promise<ApiResult<{ transfers: ApiStockTransfer[] }>> => ipcRenderer.invoke('stocks:transfers:list'),
      create: (input: CreateStockTransferInput): Promise<ApiResult<{ transfer: ApiStockTransfer }>> =>
        ipcRenderer.invoke('stocks:transfers:create', input),
      update: (id: string, input: UpdateStockTransferInput): Promise<ApiResult<{ transfer: ApiStockTransfer }>> =>
        ipcRenderer.invoke('stocks:transfers:update', id, input),
      delete: (id: string): Promise<ApiResult<Record<string, never>>> => ipcRenderer.invoke('stocks:transfers:delete', id)
    },
    inventory: {
      list: (): Promise<ApiResult<{ counts: ApiInventoryCount[] }>> => ipcRenderer.invoke('stocks:inventory:list'),
      create: (input: CreateInventoryCountInput): Promise<ApiResult<{ count: ApiInventoryCount }>> =>
        ipcRenderer.invoke('stocks:inventory:create', input),
      update: (id: string, input: UpdateInventoryCountInput): Promise<ApiResult<{ count: ApiInventoryCount }>> =>
        ipcRenderer.invoke('stocks:inventory:update', id, input),
      delete: (id: string): Promise<ApiResult<Record<string, never>>> => ipcRenderer.invoke('stocks:inventory:delete', id)
    },
    losses: {
      list: (): Promise<ApiResult<{ losses: ApiStockLoss[] }>> => ipcRenderer.invoke('stocks:losses:list'),
      create: (input: CreateStockLossInput): Promise<ApiResult<{ loss: ApiStockLoss }>> =>
        ipcRenderer.invoke('stocks:losses:create', input),
      update: (id: string, input: UpdateStockLossInput): Promise<ApiResult<{ loss: ApiStockLoss }>> =>
        ipcRenderer.invoke('stocks:losses:update', id, input),
      delete: (id: string): Promise<ApiResult<Record<string, never>>> => ipcRenderer.invoke('stocks:losses:delete', id)
    },
    analysis: (): Promise<ApiResult<{ analysis: ApiStockAnalysis }>> => ipcRenderer.invoke('stocks:analysis')
  },
  procurement: {
    list: (): Promise<ApiResult<{ requests: ApiProcurementRequest[] }>> => ipcRenderer.invoke('procurement:list'),
    suppliers: (): Promise<ApiResult<{ suppliers: ApiSupplier[] }>> => ipcRenderer.invoke('procurement:suppliers'),
    create: (input: CreateProcurementRequestInput): Promise<ApiResult<{ request: ApiProcurementRequest }>> =>
      ipcRenderer.invoke('procurement:create', input),
    update: (id: string, input: UpdateProcurementRequestInput): Promise<ApiResult<{ request: ApiProcurementRequest }>> =>
      ipcRenderer.invoke('procurement:update', id, input),
    delete: (id: string): Promise<ApiResult<Record<string, never>>> => ipcRenderer.invoke('procurement:delete', id),
    exportExcel: (): Promise<boolean> => ipcRenderer.invoke('procurement:exportExcel'),
    orders: {
      list: (): Promise<ApiResult<{ orders: ApiPurchaseOrder[] }>> => ipcRenderer.invoke('procurement:orders:list'),
      create: (input: CreatePurchaseOrderInput): Promise<ApiResult<{ order: ApiPurchaseOrder }>> =>
        ipcRenderer.invoke('procurement:orders:create', input),
      update: (id: string, input: UpdatePurchaseOrderInput): Promise<ApiResult<{ order: ApiPurchaseOrder }>> =>
        ipcRenderer.invoke('procurement:orders:update', id, input),
      delete: (id: string): Promise<ApiResult<Record<string, never>>> => ipcRenderer.invoke('procurement:orders:delete', id)
    },
    receptions: {
      list: (): Promise<ApiResult<{ receptions: ApiGoodsReception[] }>> => ipcRenderer.invoke('procurement:receptions:list'),
      create: (input: CreateGoodsReceptionInput): Promise<ApiResult<{ reception: ApiGoodsReception }>> =>
        ipcRenderer.invoke('procurement:receptions:create', input),
      update: (id: string, input: UpdateGoodsReceptionInput): Promise<ApiResult<{ reception: ApiGoodsReception }>> =>
        ipcRenderer.invoke('procurement:receptions:update', id, input),
      delete: (id: string): Promise<ApiResult<Record<string, never>>> => ipcRenderer.invoke('procurement:receptions:delete', id)
    }
  },
  bloodBank: {
    list: (): Promise<ApiResult<{ pouches: ApiBloodPouch[] }>> => ipcRenderer.invoke('bloodBank:list'),
    create: (input: CreateBloodPouchInput): Promise<ApiResult<{ pouch: ApiBloodPouch }>> =>
      ipcRenderer.invoke('bloodBank:create', input),
    update: (id: string, input: UpdateBloodPouchInput): Promise<ApiResult<{ pouch: ApiBloodPouch }>> =>
      ipcRenderer.invoke('bloodBank:update', id, input),
    delete: (id: string): Promise<ApiResult<Record<string, never>>> => ipcRenderer.invoke('bloodBank:delete', id),
    exportExcel: (): Promise<boolean> => ipcRenderer.invoke('bloodBank:exportExcel'),
    donations: {
      list: (): Promise<ApiResult<{ donations: ApiDonation[] }>> => ipcRenderer.invoke('bloodBank:donations:list'),
      create: (input: CreateDonationInput): Promise<ApiResult<{ donation: ApiDonation }>> =>
        ipcRenderer.invoke('bloodBank:donations:create', input),
      update: (id: string, input: UpdateDonationInput): Promise<ApiResult<{ donation: ApiDonation }>> =>
        ipcRenderer.invoke('bloodBank:donations:update', id, input),
      delete: (id: string): Promise<ApiResult<Record<string, never>>> => ipcRenderer.invoke('bloodBank:donations:delete', id)
    },
    requests: {
      list: (): Promise<ApiResult<{ requests: ApiTransfusionRequest[] }>> => ipcRenderer.invoke('bloodBank:requests:list'),
      create: (input: CreateTransfusionRequestInput): Promise<ApiResult<{ request: ApiTransfusionRequest }>> =>
        ipcRenderer.invoke('bloodBank:requests:create', input),
      update: (id: string, input: UpdateTransfusionRequestInput): Promise<ApiResult<{ request: ApiTransfusionRequest }>> =>
        ipcRenderer.invoke('bloodBank:requests:update', id, input),
      delete: (id: string): Promise<ApiResult<Record<string, never>>> => ipcRenderer.invoke('bloodBank:requests:delete', id)
    },
    transfusions: {
      list: (): Promise<ApiResult<{ transfusions: ApiTransfusion[] }>> => ipcRenderer.invoke('bloodBank:transfusions:list'),
      create: (input: CreateTransfusionInput): Promise<ApiResult<{ transfusion: ApiTransfusion }>> =>
        ipcRenderer.invoke('bloodBank:transfusions:create', input),
      update: (id: string, input: UpdateTransfusionInput): Promise<ApiResult<{ transfusion: ApiTransfusion }>> =>
        ipcRenderer.invoke('bloodBank:transfusions:update', id, input),
      delete: (id: string): Promise<ApiResult<Record<string, never>>> => ipcRenderer.invoke('bloodBank:transfusions:delete', id)
    },
    analyses: {
      list: (): Promise<ApiResult<{ analyses: ApiBloodAnalysis[] }>> => ipcRenderer.invoke('bloodBank:analyses:list'),
      create: (input: CreateBloodAnalysisInput): Promise<ApiResult<{ analysis: ApiBloodAnalysis }>> =>
        ipcRenderer.invoke('bloodBank:analyses:create', input),
      update: (id: string, input: UpdateBloodAnalysisInput): Promise<ApiResult<{ analysis: ApiBloodAnalysis }>> =>
        ipcRenderer.invoke('bloodBank:analyses:update', id, input),
      delete: (id: string): Promise<ApiResult<Record<string, never>>> => ipcRenderer.invoke('bloodBank:analyses:delete', id)
    }
  },
  finance: {
    list: (): Promise<ApiResult<{ transactions: ApiFinanceTransaction[] }>> => ipcRenderer.invoke('finance:list'),
    create: (input: CreateFinanceTransactionInput): Promise<ApiResult<{ transaction: ApiFinanceTransaction }>> =>
      ipcRenderer.invoke('finance:create', input),
    update: (id: string, input: UpdateFinanceTransactionInput): Promise<ApiResult<{ transaction: ApiFinanceTransaction }>> =>
      ipcRenderer.invoke('finance:update', id, input),
    delete: (id: string): Promise<ApiResult<Record<string, never>>> => ipcRenderer.invoke('finance:delete', id),
    exportExcel: (): Promise<boolean> => ipcRenderer.invoke('finance:exportExcel'),
    invoices: {
      list: (): Promise<ApiResult<{ invoices: ApiSupplierInvoice[] }>> => ipcRenderer.invoke('finance:invoices:list'),
      create: (input: CreateSupplierInvoiceInput): Promise<ApiResult<{ invoice: ApiSupplierInvoice }>> =>
        ipcRenderer.invoke('finance:invoices:create', input),
      update: (id: string, input: UpdateSupplierInvoiceInput): Promise<ApiResult<{ invoice: ApiSupplierInvoice }>> =>
        ipcRenderer.invoke('finance:invoices:update', id, input),
      delete: (id: string): Promise<ApiResult<Record<string, never>>> => ipcRenderer.invoke('finance:invoices:delete', id)
    },
    payments: {
      list: (): Promise<ApiResult<{ payments: ApiPaymentReceived[] }>> => ipcRenderer.invoke('finance:payments:list'),
      create: (input: CreatePaymentReceivedInput): Promise<ApiResult<{ payment: ApiPaymentReceived }>> =>
        ipcRenderer.invoke('finance:payments:create', input),
      update: (id: string, input: UpdatePaymentReceivedInput): Promise<ApiResult<{ payment: ApiPaymentReceived }>> =>
        ipcRenderer.invoke('finance:payments:update', id, input),
      delete: (id: string): Promise<ApiResult<Record<string, never>>> => ipcRenderer.invoke('finance:payments:delete', id)
    },
    expenses: {
      list: (): Promise<ApiResult<{ expenses: ApiServiceExpense[] }>> => ipcRenderer.invoke('finance:expenses:list'),
      create: (input: CreateServiceExpenseInput): Promise<ApiResult<{ expense: ApiServiceExpense }>> =>
        ipcRenderer.invoke('finance:expenses:create', input),
      update: (id: string, input: UpdateServiceExpenseInput): Promise<ApiResult<{ expense: ApiServiceExpense }>> =>
        ipcRenderer.invoke('finance:expenses:update', id, input),
      delete: (id: string): Promise<ApiResult<Record<string, never>>> => ipcRenderer.invoke('finance:expenses:delete', id)
    },
    budgets: {
      list: (): Promise<ApiResult<{ budgets: ApiBudget[] }>> => ipcRenderer.invoke('finance:budgets:list'),
      create: (input: CreateBudgetInput): Promise<ApiResult<{ budget: ApiBudget }>> =>
        ipcRenderer.invoke('finance:budgets:create', input),
      update: (id: string, input: UpdateBudgetInput): Promise<ApiResult<{ budget: ApiBudget }>> =>
        ipcRenderer.invoke('finance:budgets:update', id, input),
      delete: (id: string): Promise<ApiResult<Record<string, never>>> => ipcRenderer.invoke('finance:budgets:delete', id)
    },
    bankAccounts: {
      list: (): Promise<ApiResult<{ accounts: ApiBankAccount[] }>> => ipcRenderer.invoke('finance:bankAccounts:list'),
      create: (input: CreateBankAccountInput): Promise<ApiResult<{ account: ApiBankAccount }>> =>
        ipcRenderer.invoke('finance:bankAccounts:create', input),
      update: (id: string, input: UpdateBankAccountInput): Promise<ApiResult<{ account: ApiBankAccount }>> =>
        ipcRenderer.invoke('finance:bankAccounts:update', id, input),
      delete: (id: string): Promise<ApiResult<Record<string, never>>> => ipcRenderer.invoke('finance:bankAccounts:delete', id)
    }
  },
  hr: {
    list: (): Promise<ApiResult<{ employees: ApiHrEmployee[] }>> => ipcRenderer.invoke('hr:list'),
    create: (input: CreateHrEmployeeInput): Promise<ApiResult<{ employee: ApiHrEmployee }>> =>
      ipcRenderer.invoke('hr:create', input),
    update: (id: string, input: UpdateHrEmployeeInput): Promise<ApiResult<{ employee: ApiHrEmployee }>> =>
      ipcRenderer.invoke('hr:update', id, input),
    delete: (id: string): Promise<ApiResult<Record<string, never>>> => ipcRenderer.invoke('hr:delete', id),
    exportExcel: (): Promise<boolean> => ipcRenderer.invoke('hr:exportExcel'),
    attendance: {
      list: (): Promise<ApiResult<{ attendances: ApiAttendance[] }>> => ipcRenderer.invoke('hr:attendance:list'),
      create: (input: CreateAttendanceInput): Promise<ApiResult<{ attendance: ApiAttendance }>> =>
        ipcRenderer.invoke('hr:attendance:create', input),
      update: (id: string, input: UpdateAttendanceInput): Promise<ApiResult<{ attendance: ApiAttendance }>> =>
        ipcRenderer.invoke('hr:attendance:update', id, input),
      delete: (id: string): Promise<ApiResult<Record<string, never>>> => ipcRenderer.invoke('hr:attendance:delete', id),
      checkIn: (input: CheckInAttendanceInput): Promise<ApiResult<{ attendance: ApiAttendance | null }>> =>
        ipcRenderer.invoke('hr:attendance:checkIn', input)
    },
    contracts: {
      list: (): Promise<ApiResult<{ contracts: ApiContract[] }>> => ipcRenderer.invoke('hr:contracts:list'),
      create: (input: CreateContractInput): Promise<ApiResult<{ contract: ApiContract }>> =>
        ipcRenderer.invoke('hr:contracts:create', input),
      update: (id: string, input: UpdateContractInput): Promise<ApiResult<{ contract: ApiContract }>> =>
        ipcRenderer.invoke('hr:contracts:update', id, input),
      delete: (id: string): Promise<ApiResult<Record<string, never>>> => ipcRenderer.invoke('hr:contracts:delete', id)
    },
    performance: {
      list: (): Promise<ApiResult<{ reviews: ApiPerformanceReview[] }>> => ipcRenderer.invoke('hr:performance:list'),
      create: (input: CreatePerformanceReviewInput): Promise<ApiResult<{ review: ApiPerformanceReview }>> =>
        ipcRenderer.invoke('hr:performance:create', input),
      update: (id: string, input: UpdatePerformanceReviewInput): Promise<ApiResult<{ review: ApiPerformanceReview }>> =>
        ipcRenderer.invoke('hr:performance:update', id, input),
      delete: (id: string): Promise<ApiResult<Record<string, never>>> => ipcRenderer.invoke('hr:performance:delete', id)
    },
    training: {
      list: (): Promise<ApiResult<{ trainings: ApiTraining[] }>> => ipcRenderer.invoke('hr:training:list'),
      create: (input: CreateTrainingInput): Promise<ApiResult<{ training: ApiTraining }>> =>
        ipcRenderer.invoke('hr:training:create', input),
      update: (id: string, input: UpdateTrainingInput): Promise<ApiResult<{ training: ApiTraining }>> =>
        ipcRenderer.invoke('hr:training:update', id, input),
      delete: (id: string): Promise<ApiResult<Record<string, never>>> => ipcRenderer.invoke('hr:training:delete', id)
    },
    payroll: {
      list: (): Promise<ApiResult<{ entries: ApiPayrollEntry[] }>> => ipcRenderer.invoke('hr:payroll:list'),
      create: (input: CreatePayrollEntryInput): Promise<ApiResult<{ entry: ApiPayrollEntry }>> =>
        ipcRenderer.invoke('hr:payroll:create', input),
      update: (id: string, input: UpdatePayrollEntryInput): Promise<ApiResult<{ entry: ApiPayrollEntry }>> =>
        ipcRenderer.invoke('hr:payroll:update', id, input),
      delete: (id: string): Promise<ApiResult<Record<string, never>>> => ipcRenderer.invoke('hr:payroll:delete', id)
    },
    documents: {
      list: (): Promise<ApiResult<{ documents: ApiEmployeeDocument[] }>> => ipcRenderer.invoke('hr:documents:list'),
      create: (input: CreateEmployeeDocumentInput): Promise<ApiResult<{ document: ApiEmployeeDocument }>> =>
        ipcRenderer.invoke('hr:documents:create', input),
      delete: (id: string): Promise<ApiResult<Record<string, never>>> => ipcRenderer.invoke('hr:documents:delete', id),
      uploadFile: (id: string): Promise<ApiResult<{ document: ApiEmployeeDocument }> | null> =>
        ipcRenderer.invoke('hr:documents:uploadFile', id),
      viewFile: (id: string): Promise<void> => ipcRenderer.invoke('hr:documents:viewFile', id)
    }
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
    delete: (id: string): Promise<ApiResult<Record<string, never>>> => ipcRenderer.invoke('documents:delete', id),
    uploadFile: (id: string): Promise<ApiResult<{ document: ApiProtocolDocument }> | null> =>
      ipcRenderer.invoke('documents:uploadFile', id),
    viewFile: (id: string): Promise<void> => ipcRenderer.invoke('documents:viewFile', id),
    signature: {
      get: (): Promise<ApiResult<{ signature: ApiSignatureImage | null }>> => ipcRenderer.invoke('documents:signature:get'),
      upload: (): Promise<ApiResult<{ signature: ApiSignatureImage | null }> | null> =>
        ipcRenderer.invoke('documents:signature:upload'),
      remove: (): Promise<ApiResult<Record<string, never>>> => ipcRenderer.invoke('documents:signature:remove'),
      requests: (): Promise<ApiResult<{ requests: ApiSignatureRequest[] }>> => ipcRenderer.invoke('documents:signature:requests'),
      request: (documentId: string, message: string | null): Promise<ApiResult<{ request: ApiSignatureRequest }>> =>
        ipcRenderer.invoke('documents:signature:request', documentId, message),
      requestWithFile: (title: string, message: string | null): Promise<ApiResult<{ request: ApiSignatureRequest }> | null> =>
        ipcRenderer.invoke('documents:signature:requestWithFile', title, message),
      sign: (id: string): Promise<ApiResult<{ request: ApiSignatureRequest }>> => ipcRenderer.invoke('documents:signature:sign', id),
      refuse: (id: string, reason: string): Promise<ApiResult<{ request: ApiSignatureRequest }>> =>
        ipcRenderer.invoke('documents:signature:refuse', id, reason)
    }
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
    listUnlinkedEmployees: (): Promise<ApiResult<{ employees: ApiEmployee[] }>> => ipcRenderer.invoke('users:listUnlinkedEmployees'),
    update: (id: string, input: UpdateUserInput): Promise<ApiResult<{ user: ApiUser }>> =>
      ipcRenderer.invoke('users:update', id, input),
    resetPassword: (id: string, newPassword: string): Promise<ApiResult<Record<string, never>>> =>
      ipcRenderer.invoke('users:resetPassword', id, newPassword),
    changePassword: (currentPassword: string, newPassword: string): Promise<ApiResult<Record<string, never>>> =>
      ipcRenderer.invoke('users:changePassword', currentPassword, newPassword)
  },
  company: {
    get: (): Promise<ApiResult<{ company: ApiCompany }>> => ipcRenderer.invoke('company:get'),
    update: (input: UpdateCompanyInput): Promise<ApiResult<{ company: ApiCompany }>> =>
      ipcRenderer.invoke('company:update', input),
    getLogo: (): Promise<ApiResult<{ logo: ApiCompanyLogo | null }>> => ipcRenderer.invoke('company:getLogo'),
    uploadLogo: (): Promise<ApiResult<{ company: ApiCompany }> | null> => ipcRenderer.invoke('company:uploadLogo'),
    removeLogo: (): Promise<ApiResult<{ company: ApiCompany }>> => ipcRenderer.invoke('company:removeLogo'),
    locate: (): Promise<
      | { ok: true; latitude: number; longitude: number; accuracyMeters: number | null; source: 'windows' | 'ip' }
      | { ok: false; error: string }
    > => ipcRenderer.invoke('company:locate')
  },
  notificationPreferences: {
    list: (): Promise<ApiResult<{ preferences: ApiNotificationPreference[] }>> =>
      ipcRenderer.invoke('notificationPreferences:list'),
    update: (id: string, input: UpdateNotificationPreferenceInput): Promise<ApiResult<{ preference: ApiNotificationPreference }>> =>
      ipcRenderer.invoke('notificationPreferences:update', id, input)
  },
  picklists: {
    list: (listKey: string): Promise<ApiResult<{ values: string[] }>> => ipcRenderer.invoke('picklists:list', listKey)
  },
  backup: {
    run: (): Promise<LocalBackupInfo> => ipcRenderer.invoke('backup:run'),
    list: (): Promise<LocalBackupInfo[]> => ipcRenderer.invoke('backup:list'),
    restore: (filePath: string): Promise<void> => ipcRenderer.invoke('backup:restore', filePath),
    ensureDaily: (): Promise<{ ranBackup: boolean }> => ipcRenderer.invoke('backup:ensureDaily')
  },
  cashier: {
    registers: (): Promise<ApiResult<{ registers: ApiCashRegister[] }>> => ipcRenderer.invoke('cashier:registers'),
    createRegister: (input: CashRegisterInput): Promise<ApiResult<{ registers: ApiCashRegister[] }>> =>
      ipcRenderer.invoke('cashier:createRegister', input),
    updateRegister: (id: string, input: CashRegisterInput): Promise<ApiResult<{ registers: ApiCashRegister[] }>> =>
      ipcRenderer.invoke('cashier:updateRegister', id, input),
    eligibleCashiers: (): Promise<ApiResult<{ users: ApiEligibleCashier[] }>> => ipcRenderer.invoke('cashier:eligibleCashiers'),
    openSession: (registerId: string, openingFloat: number): Promise<ApiResult<{ session: ApiCashSession }>> =>
      ipcRenderer.invoke('cashier:openSession', registerId, openingFloat),
    getSession: (id: string): Promise<ApiResult<{ session: ApiCashSession }>> => ipcRenderer.invoke('cashier:getSession', id),
    closeSession: (id: string, input: CloseSessionInput): Promise<ApiResult<{ session: ApiCashSession }>> =>
      ipcRenderer.invoke('cashier:closeSession', id, input),
    sessions: (filters: ReceiptFilters): Promise<ApiResult<{ sessions: ApiCashSession[] }>> =>
      ipcRenderer.invoke('cashier:sessions', filters),
    tariffs: (): Promise<ApiResult<{ tariffs: ApiTariffItem[] }>> => ipcRenderer.invoke('cashier:tariffs'),
    createTariff: (input: TariffItemInput): Promise<ApiResult<{ tariff: ApiTariffItem }>> =>
      ipcRenderer.invoke('cashier:createTariff', input),
    updateTariff: (id: string, input: TariffItemInput): Promise<ApiResult<{ tariff: ApiTariffItem }>> =>
      ipcRenderer.invoke('cashier:updateTariff', id, input),
    quickCreatePatient: (
      input: QuickPatientInput
    ): Promise<ApiResult<{ patient: { id: string; code: string; firstName: string; lastName: string } }>> =>
      ipcRenderer.invoke('cashier:quickCreatePatient', input),
    pendingExams: (patientId: string): Promise<ApiResult<{ exams: ApiPendingExam[] }>> =>
      ipcRenderer.invoke('cashier:pendingExams', patientId),
    checkout: (input: CreateReceiptInput): Promise<ApiResult<{ receipt: ApiReceipt }> & { printError: string | null }> =>
      ipcRenderer.invoke('cashier:checkout', input),
    receipts: (filters: ReceiptFilters): Promise<ApiResult<{ receipts: ApiReceipt[] }>> =>
      ipcRenderer.invoke('cashier:receipts', filters),
    cancelReceipt: (id: string, reason: string): Promise<ApiResult<{ receipt: ApiReceipt }>> =>
      ipcRenderer.invoke('cashier:cancelReceipt', id, reason),
    refundReceipt: (id: string, reason: string): Promise<ApiResult<{ receipt: ApiReceipt }>> =>
      ipcRenderer.invoke('cashier:refundReceipt', id, reason),
    printReceipt: (id: string, duplicate: boolean): Promise<{ ok: true } | { ok: false; error: string }> =>
      ipcRenderer.invoke('cashier:printReceipt', id, duplicate),
    printSessionReport: (sessionId: string): Promise<{ ok: true } | { ok: false; error: string }> =>
      ipcRenderer.invoke('cashier:printSessionReport', sessionId),
    exportJournal: (filters: ReceiptFilters): Promise<boolean> => ipcRenderer.invoke('cashier:exportJournal', filters),
    listPrinters: (): Promise<{ name: string; displayName: string; isDefault: boolean }[]> =>
      ipcRenderer.invoke('cashier:listPrinters'),
    getPrinter: (): Promise<string | null> => ipcRenderer.invoke('cashier:getPrinter'),
    setPrinter: (name: string | null): Promise<void> => ipcRenderer.invoke('cashier:setPrinter', name)
  },
  updater: {
    getInfo: (): Promise<UpdateInfo> => ipcRenderer.invoke('updater:getInfo'),
    check: (): Promise<UpdateInfo> => ipcRenderer.invoke('updater:check'),
    install: (): Promise<void> => ipcRenderer.invoke('updater:install'),
    onStatus: (callback: (status: UpdateStatus) => void): (() => void) => {
      const handler = (_event: IpcRendererEvent, status: UpdateStatus): void => callback(status)
      ipcRenderer.on('updater:status', handler)
      return () => ipcRenderer.removeListener('updater:status', handler)
    }
  },
  subscription: {
    getInfo: (): Promise<SubscriptionInfo> => ipcRenderer.invoke('subscription:getInfo'),
    refresh: (): Promise<SubscriptionInfo> => ipcRenderer.invoke('subscription:refresh'),
    catalog: (): Promise<SubscriptionResult<SubscriptionCatalogItem[]>> => ipcRenderer.invoke('subscription:catalog'),
    quote: (items: string[], months: number): Promise<SubscriptionResult<SubscriptionQuote>> =>
      ipcRenderer.invoke('subscription:quote', items, months),
    payments: (): Promise<SubscriptionResult<SubscriptionPayment[]>> => ipcRenderer.invoke('subscription:payments'),
    checkout: (input: CheckoutInput): Promise<SubscriptionResult<PendingPayment>> => ipcRenderer.invoke('subscription:checkout', input),
    getPending: (): Promise<PendingPayment | null> => ipcRenderer.invoke('subscription:getPending'),
    checkPending: (): Promise<SubscriptionResult<PendingPayment | null>> => ipcRenderer.invoke('subscription:checkPending'),
    dismissPending: (): Promise<void> => ipcRenderer.invoke('subscription:dismissPending'),
    onStatus: (callback: (info: SubscriptionInfo) => void): (() => void) => {
      const handler = (_event: IpcRendererEvent, info: SubscriptionInfo): void => callback(info)
      ipcRenderer.on('subscription:status', handler)
      return () => ipcRenderer.removeListener('subscription:status', handler)
    },
    onPayment: (callback: (payment: PendingPayment | null) => void): (() => void) => {
      const handler = (_event: IpcRendererEvent, payment: PendingPayment | null): void => callback(payment)
      ipcRenderer.on('subscription:payment', handler)
      return () => ipcRenderer.removeListener('subscription:payment', handler)
    }
  },
  setup: {
    getConfig: (): Promise<AppConfig> => ipcRenderer.invoke('setup:getConfig'),
    markComplete: (): Promise<AppConfig> => ipcRenderer.invoke('setup:markComplete'),
    getDbStatus: (): Promise<DbStartupStatus> => ipcRenderer.invoke('setup:getDbStatus'),
    getDbPrefill: (): Promise<DbAccessPrefill | null> => ipcRenderer.invoke('setup:getDbPrefill'),
    saveDbAccess: (input: DbAccessInput): Promise<SaveDbAccessResult> => ipcRenderer.invoke('setup:saveDbAccess', input),
    retryDb: (): Promise<DbStartupStatus> => ipcRenderer.invoke('setup:retryDb'),
    continueOffline: (): Promise<DbStartupStatus> => ipcRenderer.invoke('setup:continueOffline'),
    activate: (code: string): Promise<SaveDbAccessResult> => ipcRenderer.invoke('setup:activate', code),
    getActivation: (): Promise<ActivationInfo> => ipcRenderer.invoke('setup:getActivation')
  },
  connectivity: {
    status: (): Promise<ConnectivityStatus> => ipcRenderer.invoke('connectivity:status'),
    checkNow: (): Promise<ConnectivityStatus> => ipcRenderer.invoke('connectivity:checkNow'),
    onChange: (callback: (status: ConnectivityStatus) => void): (() => void) => {
      const handler = (_event: IpcRendererEvent, status: ConnectivityStatus): void => callback(status)
      ipcRenderer.on('connectivity:changed', handler)
      return () => ipcRenderer.removeListener('connectivity:changed', handler)
    }
  },
  sync: {
    listOutbox: (): Promise<SyncOutboxEntry[]> => ipcRenderer.invoke('sync:outbox:list'),
    processNow: (): Promise<void> => ipcRenderer.invoke('sync:processNow'),
    onConflict: (callback: (notification: SyncConflictNotification) => void): (() => void) => {
      const handler = (_event: IpcRendererEvent, notification: SyncConflictNotification): void => callback(notification)
      ipcRenderer.on('sync:conflict', handler)
      return () => ipcRenderer.removeListener('sync:conflict', handler)
    }
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
