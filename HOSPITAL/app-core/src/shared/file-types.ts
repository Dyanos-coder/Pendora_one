// Type partagé pour tout document binaire renvoyé en base64 par app-server (export Excel,
// impression PDF...) — le renderer ne manipule jamais de fichier directement (sandboxé), seul
// le process main d'app-core écrit sur disque (voir main/services/*.service.ts).
export interface ApiFileDocument {
  filename: string
  contentBase64: string
}
