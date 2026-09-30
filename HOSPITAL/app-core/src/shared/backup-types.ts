// Types partagés pour la sauvegarde/restauration complète de la base (item 21). Le contenu exact
// des tables (`BackupTable.rows`) n'a pas besoin d'être typé plus finement ici — app-core ne fait
// que le transporter entre le serveur et un fichier local, jamais l'interpréter.

export interface BackupTable {
  table: string
  rows: Record<string, unknown>[]
}

export interface BackupFile {
  version: 1
  generatedAt: string
  database: string
  tables: BackupTable[]
}

export interface LocalBackupInfo {
  fileName: string
  filePath: string
  sizeBytes: number
  createdAt: string
}
