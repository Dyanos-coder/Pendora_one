// Lit les champs de connexion MySQL séparés (comme dans phpMyAdmin/hPanel Hostinger) plutôt
// qu'une DATABASE_URL unique — évite les soucis d'encodage si le mot de passe contient des
// caractères spéciaux (@, :, /, etc.).

export interface DbConnectionConfig {
  host: string
  port: number
  database: string
  user: string
  password: string
}

export function getDbConnectionConfig(): DbConnectionConfig {
  const host = process.env['DB_HOST']
  const database = process.env['DB_NAME']
  const user = process.env['DB_USER']
  const password = process.env['DB_PASSWORD']
  const port = Number(process.env['DB_PORT'] ?? 3306)

  // Le mot de passe peut légitimement être vide (ex: root local sans mot de passe) — on ne
  // vérifie donc que l'absence pure et simple de la variable, pas sa "vérité" JS.
  if (host === undefined || database === undefined || user === undefined || password === undefined) {
    throw new Error(
      'Connexion MySQL incomplète : vérifie DB_HOST, DB_NAME, DB_USER, DB_PASSWORD dans .env (voir .env.example).'
    )
  }

  return { host, port, database, user, password }
}

/** Construit une URL de connexion encodée — nécessaire uniquement pour la CLI Prisma (migrate/seed config). */
export function buildDatabaseUrl(config: DbConnectionConfig): string {
  const user = encodeURIComponent(config.user)
  const password = encodeURIComponent(config.password)
  return `mysql://${user}:${password}@${config.host}:${config.port}/${config.database}`
}
