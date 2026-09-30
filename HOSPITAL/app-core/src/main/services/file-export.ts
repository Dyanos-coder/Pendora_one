import { dialog } from 'electron'
import { writeFileSync } from 'fs'
import type { ApiFileDocument } from '../../shared/file-types'

type DocumentResult = { ok: true; data: { document: ApiFileDocument } } | { ok: false; error: string }

/** Propose un "Enregistrer sous" natif pour un document déjà généré par app-server (export Excel,
 * item 10 — même logique que reports.service.ts::download pour les rapports) — le renderer
 * n'écrit jamais de fichier lui-même (sandboxé), seul le process main a accès au système de
 * fichiers. Renvoie false si l'utilisateur annule la boîte de dialogue. */
export async function saveGeneratedDocument(result: DocumentResult, dialogTitle: string): Promise<boolean> {
  if (!result.ok) {
    throw new Error(result.error)
  }

  const { canceled, filePath } = await dialog.showSaveDialog({
    title: dialogTitle,
    defaultPath: result.data.document.filename
  })
  if (canceled || !filePath) return false

  writeFileSync(filePath, Buffer.from(result.data.document.contentBase64, 'base64'))
  return true
}
