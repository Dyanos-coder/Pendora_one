import { app } from 'electron'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'fs'
import { join } from 'path'
import { getCurrentToken } from './session.store'
import { exportBackup, restoreBackup } from './remote-api.client'
import type { BackupFile, LocalBackupInfo } from '../../shared/backup-types'

// Sauvegarde/restauration complète de la base (item 21) — voir backup.service.ts côté serveur pour
// le mécanisme d'export/import. Le disque du serveur d'hébergement n'étant pas persistant (voir
// documents.service.ts), le fichier de sauvegarde est téléchargé et conservé ICI, dans le dossier
// Documents de l'utilisateur, sur SON poste — jamais sur le serveur.

function requireToken(): string {
  const token = getCurrentToken()
  if (!token) {
    throw new Error('Non authentifié.')
  }
  return token
}

function backupsDir(): string {
  const dir = join(app.getPath('documents'), 'Pandora Health', 'Sauvegardes')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** `sauvegarde-YYYY-MM-DD_HHmmss.json` — triable par ordre alphabétique = ordre chronologique. */
function timestampFileName(date: Date): string {
  const datePart = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  const timePart = `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  return `sauvegarde-${datePart}_${timePart}.json`
}

function todayFileNamePrefix(date: Date): string {
  return `sauvegarde-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export async function runBackup(): Promise<LocalBackupInfo> {
  const token = requireToken()
  const result = await exportBackup(token)
  if (!result.ok) {
    throw new Error(result.error)
  }

  const dir = backupsDir()
  const now = new Date()
  const fileName = timestampFileName(now)
  const filePath = join(dir, fileName)
  writeFileSync(filePath, JSON.stringify(result.data.backup))
  const stats = statSync(filePath)
  return { fileName, filePath, sizeBytes: stats.size, createdAt: now.toISOString() }
}

export function listLocalBackups(): LocalBackupInfo[] {
  const dir = backupsDir()
  return readdirSync(dir)
    .filter((fileName) => fileName.endsWith('.json'))
    .map((fileName) => {
      const filePath = join(dir, fileName)
      const stats = statSync(filePath)
      return { fileName, filePath, sizeBytes: stats.size, createdAt: stats.birthtime.toISOString() }
    })
    .sort((a, b) => b.fileName.localeCompare(a.fileName))
}

export async function restoreFromFile(filePath: string): Promise<void> {
  const token = requireToken()
  const content = readFileSync(filePath, 'utf-8')
  const backup = JSON.parse(content) as BackupFile
  const result = await restoreBackup(token, backup)
  if (!result.ok) {
    throw new Error(result.error)
  }
}

/** Appelée une fois par ouverture de session (voir AppShell.tsx) : si aucune sauvegarde n'a déjà
 * été faite aujourd'hui, en déclenche une silencieusement — c'est ce qui donne la cadence
 * "une sauvegarde par jour" demandée, sans dépendre d'une tâche planifiée côté OS. Échec
 * volontairement avalé (journalisé seulement) : ne doit jamais bloquer l'ouverture de l'app. */
export async function ensureDailyBackup(): Promise<{ ranBackup: boolean }> {
  const prefix = todayFileNamePrefix(new Date())
  const alreadyDoneToday = listLocalBackups().some((b) => b.fileName.startsWith(prefix))
  if (alreadyDoneToday) return { ranBackup: false }

  try {
    await runBackup()
    return { ranBackup: true }
  } catch (error) {
    console.error('[backup] échec de la sauvegarde automatique quotidienne', error)
    return { ranBackup: false }
  }
}
