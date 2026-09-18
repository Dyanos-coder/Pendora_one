import { dialog } from 'electron'
import { writeFileSync } from 'fs'
import { getCurrentToken } from './session.store'
import { generateReport, getReportContent, listReports, reportDepartmentComparison } from './remote-api.client'
import type { ApiReportCategory } from '../../shared/reports-types'

function requireToken(): string {
  const token = getCurrentToken()
  if (!token) {
    throw new Error('Non authentifié.')
  }
  return token
}

export function list() {
  return listReports(requireToken())
}

export function departmentComparison() {
  return reportDepartmentComparison(requireToken())
}

export function generate(category: ApiReportCategory) {
  return generateReport(requireToken(), category)
}

/** Récupère le contenu depuis app-server puis propose un « Enregistrer sous » natif — le
 * renderer n'écrit jamais de fichier lui-même (sandboxé), seul le process main a accès au
 * système de fichiers. Renvoie false si l'utilisateur annule la boîte de dialogue. */
export async function download(id: string): Promise<boolean> {
  const result = await getReportContent(requireToken(), id)
  if (!result.ok) {
    throw new Error(result.error)
  }

  const extension = result.data.format === 'CSV' ? 'csv' : result.data.format.toLowerCase()
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Enregistrer le rapport',
    defaultPath: `${result.data.title.replace(/[\\/:*?"<>|]/g, '_')}.${extension}`
  })
  if (canceled || !filePath) return false

  writeFileSync(filePath, Buffer.from(result.data.contentBase64, 'base64'))
  return true
}
