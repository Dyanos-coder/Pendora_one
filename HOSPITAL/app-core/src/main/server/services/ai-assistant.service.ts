import { GoogleGenAI, Type, type Content, type FunctionDeclaration } from '@google/genai'
import { getPrismaClient } from '../db/client'
import { listPatients } from './patients.service'
import { listAppointments } from './appointments.service'
import { listConsultations } from './consultations.service'
import { listEmergencyVisits } from './emergencies.service'
import { listSurgeries } from './surgeries.service'
import { bedOccupancySummary } from './beds.service'
import { listHospitalizations } from './hospitalizations.service'
import { listLabRequests } from './laboratory.service'
import { listImagingRequests } from './imaging.service'
import { listCardioExams } from './cardiology.service'
import { listPathologyRequests } from './pathology.service'
import { listEndoscopyProcedures } from './endoscopy.service'
import { listMedications } from './pharmacy.service'
import { listDepotItems } from './stocks.service'
import { listBloodPouches } from './blood-bank.service'
import { listFinanceTransactions } from './finance.service'
import { listProcurementRequests, listSuppliers } from './procurement.service'
import { listHrEmployees } from './hr.service'
import { listQualityIndicators, listQualityCertifications } from './quality.service'
import { listRisks } from './risk.service'
import { listAudits, listComplianceFrameworks } from './audit.compliance.service'
import { listProtocolDocuments } from './documents.service'
import { getDashboardSummary } from './dashboard.service'
import { listAutomationRules, listAutomationLogs } from './automation.service'

const MODEL = 'gemini-flash-latest'
const MAX_TOOL_TURNS = 5

let client: { apiKey: string; instance: GoogleGenAI } | undefined

// Clé lue en base (Company.aiApiKey, saisie dans Paramètres) — plus de .env de serveur depuis que
// le backend est embarqué dans chaque poste. Client recréé si la clé change.
async function getClient(): Promise<GoogleGenAI> {
  const company = await getPrismaClient().company.findFirst({ select: { aiApiKey: true } })
  const apiKey = company?.aiApiKey
  if (!apiKey) {
    throw new Error("Clé API Gemini non configurée (Paramètres › Ultra Admin) — l'assistant IA est désactivé.")
  }
  if (!client || client.apiKey !== apiKey) {
    client = { apiKey, instance: new GoogleGenAI({ apiKey }) }
  }
  return client.instance
}

const SYSTEM_INSTRUCTION = `Tu es l'assistant IA de Pandora Health. Tu réponds en français, de façon
concise et factuelle, aux questions du personnel sur les données réelles de l'établissement. Utilise
toujours les outils fournis pour obtenir des données réelles avant de répondre — ne devine jamais un
chiffre. Si les outils ne permettent pas de répondre à la question posée, dis-le clairement plutôt
que d'inventer une réponse. Tu n'as accès à aucun modèle de prédiction ou de machine learning — si on
te demande une prévision (ex. "combien de patients demain ?"), explique que tu peux seulement décrire
l'état actuel des données, pas prédire l'avenir.`

// Un outil par domaine déjà raccordé à un vrai schéma (voir Proposition-Architecture-Backend.md
// et Phase6-Intelligence-Pilotage.md §2-3.4) — mécanique une fois le premier fait. Tous en
// lecture seule, sans paramètre : les jeux de données de chaque domaine sont petits (dizaines de
// lignes), pas besoin de pagination pour l'instant.
const TOOLS: FunctionDeclaration[] = [
  {
    name: 'get_company_info',
    description: "Renvoie le nom et le secteur de l'établissement.",
    parameters: { type: Type.OBJECT, properties: {} }
  },
  {
    name: 'list_staff_accounts',
    description:
      "Liste les comptes utilisateurs de l'application (nom, email, rôle, actif ou non). Ce ne sont que les comptes ayant un accès à l'application, pas l'ensemble du personnel de l'établissement.",
    parameters: { type: Type.OBJECT, properties: {} }
  },
  {
    name: 'get_recent_activity',
    description:
      "Renvoie les dernières actions journalisées dans l'application (connexions, créations, modifications), les plus récentes en premier.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        limit: { type: Type.INTEGER, description: 'Nombre maximum d’entrées à renvoyer (défaut 10, max 50).' }
      }
    }
  },
  { name: 'list_patients', description: "Liste les patients de l'établissement (identité, contact, statut, assurance).", parameters: { type: Type.OBJECT, properties: {} } },
  { name: 'list_appointments', description: 'Liste les rendez-vous (patient, médecin, date, service, statut).', parameters: { type: Type.OBJECT, properties: {} } },
  { name: 'list_consultations', description: 'Liste les consultations (patient, médecin, date, motif, statut).', parameters: { type: Type.OBJECT, properties: {} } },
  { name: 'list_emergency_visits', description: 'Liste les passages aux urgences (patient, gravité, statut, zone).', parameters: { type: Type.OBJECT, properties: {} } },
  { name: 'list_surgeries', description: 'Liste les interventions du bloc opératoire (chirurgien, anesthésiste, salle, statut).', parameters: { type: Type.OBJECT, properties: {} } },
  { name: 'get_bed_occupancy', description: "Renvoie l'occupation des lits d'hospitalisation (total, occupés, disponibles, en nettoyage, en maintenance).", parameters: { type: Type.OBJECT, properties: {} } },
  { name: 'list_hospitalizations', description: 'Liste les hospitalisations (patient, lit, service, statut, dates).', parameters: { type: Type.OBJECT, properties: {} } },
  { name: 'list_lab_requests', description: 'Liste les demandes de laboratoire (analyse, priorité, statut, technicien).', parameters: { type: Type.OBJECT, properties: {} } },
  { name: 'list_imaging_requests', description: "Liste les demandes d'imagerie médicale (type d'examen, priorité, statut).", parameters: { type: Type.OBJECT, properties: {} } },
  { name: 'list_cardio_exams', description: 'Liste les examens de cardiologie (type, statut, médecin).', parameters: { type: Type.OBJECT, properties: {} } },
  { name: 'list_pathology_requests', description: "Liste les demandes d'anatomopathologie (statut, priorité).", parameters: { type: Type.OBJECT, properties: {} } },
  { name: 'list_endoscopy_procedures', description: "Liste les procédures d'endoscopie (type, statut, salle).", parameters: { type: Type.OBJECT, properties: {} } },
  { name: 'list_medications', description: 'Liste les médicaments en pharmacie (stock disponible, seuil, état, péremption).', parameters: { type: Type.OBJECT, properties: {} } },
  { name: 'list_depot_items', description: 'Liste les articles des dépôts de stocks généraux (hors pharmacie et banque de sang).', parameters: { type: Type.OBJECT, properties: {} } },
  { name: 'list_blood_pouches', description: 'Liste les poches de la banque de sang (groupe, composant, statut, expiration).', parameters: { type: Type.OBJECT, properties: {} } },
  { name: 'list_finance_transactions', description: 'Liste les opérations financières (recettes et dépenses, montant, statut de paiement).', parameters: { type: Type.OBJECT, properties: {} } },
  { name: 'list_procurement_requests', description: "Liste les demandes d'approvisionnement (article, quantité, priorité, statut).", parameters: { type: Type.OBJECT, properties: {} } },
  { name: 'list_suppliers', description: 'Liste les fournisseurs (commandes, ponctualité, qualité, note).', parameters: { type: Type.OBJECT, properties: {} } },
  { name: 'list_hr_employees', description: "Liste le personnel avec ses données RH (matricule, contrat, présence du mois).", parameters: { type: Type.OBJECT, properties: {} } },
  { name: 'list_quality_indicators', description: 'Liste les indicateurs qualité suivis (valeur actuelle, cible, statut de conformité).', parameters: { type: Type.OBJECT, properties: {} } },
  { name: 'list_quality_certifications', description: "Liste les certifications de l'établissement (organisme, date d'expiration).", parameters: { type: Type.OBJECT, properties: {} } },
  { name: 'list_risks', description: 'Liste le registre des risques (catégorie, probabilité, impact, statut, responsable).', parameters: { type: Type.OBJECT, properties: {} } },
  { name: 'list_audits', description: 'Liste les audits internes et externes (type, service, statut, score).', parameters: { type: Type.OBJECT, properties: {} } },
  { name: 'list_compliance_frameworks', description: 'Liste les référentiels de conformité suivis et leur taux de conformité (HAS, ISO, RGPD...).', parameters: { type: Type.OBJECT, properties: {} } },
  { name: 'list_protocol_documents', description: 'Liste les documents et protocoles institutionnels (catégorie, version, statut).', parameters: { type: Type.OBJECT, properties: {} } },
  { name: 'get_dashboard_summary', description: "Renvoie une vue d'ensemble temps réel de l'hôpital : patients et consultations du jour, recettes du jour, occupation des lits, urgences en attente, ruptures de stock, validations en attente.", parameters: { type: Type.OBJECT, properties: {} } },
  { name: 'list_automation_rules', description: "Liste les règles d'automatisation configurées et si elles sont actives.", parameters: { type: Type.OBJECT, properties: {} } },
  { name: 'list_automation_logs', description: "Liste les dernières exécutions du moteur d'automatisation (règle déclenchée, détail, date).", parameters: { type: Type.OBJECT, properties: {} } }
]

async function getCompanyInfo() {
  const prisma = getPrismaClient()
  const company = await prisma.company.findFirst()
  return company ? { name: company.name, sector: company.sector } : { error: 'Aucun établissement configuré.' }
}

async function listStaffAccounts() {
  const prisma = getPrismaClient()
  const users = await prisma.user.findMany({
    select: { name: true, email: true, role: true, isActive: true },
    orderBy: { name: 'asc' }
  })
  return { users, total: users.length }
}

async function getRecentActivity(limitArg: unknown) {
  const prisma = getPrismaClient()
  const limit = Math.min(typeof limitArg === 'number' ? limitArg : 10, 50)
  const entries = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: { action: true, entityType: true, createdAt: true }
  })
  return { entries }
}

// Chaque outil renvoie { items, total } — forme uniforme, simple à raisonner pour le modèle.
const LIST_TOOLS: Record<string, () => Promise<unknown>> = {
  list_patients: listPatients,
  list_appointments: listAppointments,
  list_consultations: listConsultations,
  list_emergency_visits: listEmergencyVisits,
  list_surgeries: listSurgeries,
  list_hospitalizations: listHospitalizations,
  list_lab_requests: listLabRequests,
  list_imaging_requests: listImagingRequests,
  list_cardio_exams: listCardioExams,
  list_pathology_requests: listPathologyRequests,
  list_endoscopy_procedures: listEndoscopyProcedures,
  list_medications: listMedications,
  list_depot_items: listDepotItems,
  list_blood_pouches: listBloodPouches,
  list_finance_transactions: listFinanceTransactions,
  list_procurement_requests: listProcurementRequests,
  list_suppliers: listSuppliers,
  list_hr_employees: listHrEmployees,
  list_quality_indicators: listQualityIndicators,
  list_quality_certifications: listQualityCertifications,
  list_risks: listRisks,
  list_audits: listAudits,
  list_compliance_frameworks: listComplianceFrameworks,
  list_protocol_documents: listProtocolDocuments,
  list_automation_rules: listAutomationRules,
  list_automation_logs: listAutomationLogs
}

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'get_company_info':
      return getCompanyInfo()
    case 'list_staff_accounts':
      return listStaffAccounts()
    case 'get_recent_activity':
      return getRecentActivity(args['limit'])
    case 'get_bed_occupancy':
      return bedOccupancySummary()
    case 'get_dashboard_summary':
      return getDashboardSummary()
    default: {
      const listFn = LIST_TOOLS[name]
      if (!listFn) return { error: `Outil inconnu : ${name}` }
      const items = await listFn()
      return { items, total: Array.isArray(items) ? items.length : undefined }
    }
  }
}

/** Fait tourner l'assistant sur un historique de conversation déjà construit (dernier tour = la
 * nouvelle question). Ne persiste rien — c'est le rôle de ai-conversation.service.ts. */
export async function runAssistant(contents: Content[]): Promise<string> {
  const ai = await getClient()

  for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ functionDeclarations: TOOLS }]
      }
    })

    const calls = response.functionCalls
    if (!calls || calls.length === 0) {
      return response.text ?? "Désolé, je n'ai pas pu générer de réponse."
    }

    // Réinjecte les parts telles que renvoyées par l'API (avec thoughtSignature si présent) —
    // les modèles à raisonnement exigent cet écho exact, pas une reconstruction du functionCall seul.
    contents.push({
      role: 'model',
      parts: response.candidates?.[0]?.content?.parts ?? calls.map((call) => ({ functionCall: call }))
    })

    const results = await Promise.all(
      calls.map(async (call) => ({
        name: call.name ?? '',
        response: await callTool(call.name ?? '', call.args ?? {})
      }))
    )

    contents.push({
      role: 'user',
      parts: results.map((r) => ({
        functionResponse: { name: r.name, response: { output: r.response } }
      }))
    })
  }

  return "Désolé, je n'ai pas pu répondre après plusieurs tentatives — reformule ta question."
}
