import { GoogleGenAI, Type, type Content, type FunctionDeclaration } from '@google/genai'
import { getFinanceSummary, listInvoices } from './finance.service'

const MODEL = 'gemini-flash-latest'
const MAX_TOOL_TURNS = 5

let client: GoogleGenAI | undefined

function getClient(): GoogleGenAI {
  const apiKey = process.env['GEMINI_API_KEY']
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY manquante dans .env — l'assistant mémoire est désactivé.")
  }
  if (!client) {
    client = new GoogleGenAI({ apiKey })
  }
  return client
}

const SYSTEM_INSTRUCTION = `Tu es l'assistant "Mémoire d'entreprise" de Pandora One. Tu réponds en
français, de façon concise et factuelle, aux questions du dirigeant sur les données financières de
son entreprise (factures, chiffre d'affaires, trésorerie). Utilise toujours les outils fournis pour
obtenir des données réelles avant de répondre — ne devine jamais un chiffre. Si les outils ne
permettent pas de répondre à la question posée, dis-le clairement plutôt que d'inventer.`

const TOOLS: FunctionDeclaration[] = [
  {
    name: 'get_finance_summary',
    description:
      "Renvoie le chiffre d'affaires (factures payées), le total et le nombre de factures impayées, et la trésorerie actuelle.",
    parameters: { type: Type.OBJECT, properties: {} }
  },
  {
    name: 'list_invoices',
    description:
      "Liste les factures triées par date décroissante, 20 par page. Utilise le filtre de statut pour cibler une catégorie précise (ex: factures en retard).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        page: { type: Type.INTEGER, description: 'Numéro de page, commence à 1. Par défaut 1.' },
        status: {
          type: Type.STRING,
          enum: ['PAYE', 'EN_ATTENTE', 'EN_RETARD'],
          description: 'Filtre optionnel par statut de facture.'
        }
      }
    }
  }
]

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'get_finance_summary':
      return getFinanceSummary()
    case 'list_invoices': {
      const page = typeof args['page'] === 'number' ? args['page'] : 1
      const status = args['status']
      const validStatus = status === 'PAYE' || status === 'EN_ATTENTE' || status === 'EN_RETARD' ? status : undefined
      return listInvoices(page, validStatus)
    }
    default:
      return { error: `Outil inconnu : ${name}` }
  }
}

/** Fait tourner l'assistant sur un historique de conversation déjà construit (dernier tour = la
 * nouvelle question). Ne persiste rien — c'est le rôle de memory-conversation.service.ts. */
export async function runAssistant(contents: Content[]): Promise<string> {
  const ai = getClient()

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
