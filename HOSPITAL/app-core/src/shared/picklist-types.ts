// Listes "avec ajout automatique" (PETITES MODIFS items 3/6/7/8/12) — miroir manuel des clés
// définies côté serveur (`app-server/src/services/picklist.service.ts`), pas d'import croisé
// serveur → app-core.
export const PICKLIST_KEYS = {
  PATIENT_DOCUMENT_CATEGORY: 'patientDocumentCategory',
  HOSPITALIZATION_SERVICE: 'hospitalizationService',
  EMERGENCY_ZONE: 'emergencyZone',
  LABORATORY_ANALYSIS_TYPE: 'laboratoryAnalysisType',
  PHARMACY_MEDICATION_NAME: 'pharmacyMedicationName',
  PHARMACY_MEDICATION_CATEGORY: 'pharmacyMedicationCategory',
  BLOOD_DONOR_NAME: 'bloodDonorName'
} as const

export type PicklistKey = (typeof PICKLIST_KEYS)[keyof typeof PICKLIST_KEYS]
