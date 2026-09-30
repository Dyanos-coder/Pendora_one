// Accès à la base MariaDB distante (partagée par tous les postes de l'hôpital). Plus de `.env` de
// serveur : les accès sont saisis dans l'assistant de premier lancement, enregistrés chiffrés sur
// le poste (voir main/services/db-config.service.ts) puis injectés ici au démarrage — voir
// Plan-Backend-Embarque-Travaux.md.

export interface DbConnectionConfig {
  host: string
  port: number
  database: string
  user: string
  password: string
  /** Connexion chiffrée (TLS) vers MariaDB. */
  ssl: boolean
}

let current: DbConnectionConfig | null = null

export function setDbConnectionConfig(config: DbConnectionConfig | null): void {
  current = config
}

export function hasDbConnectionConfig(): boolean {
  return current !== null
}

export function getDbConnectionConfig(): DbConnectionConfig {
  if (!current) {
    throw new Error('Base de données distante non configurée.')
  }
  return current
}

/** Options communes à toutes les connexions mariadb (pool Prisma, test, migrations, verrous).
 * Délais courts : une base injoignable doit être détectée vite pour basculer en hors-ligne. Le
 * certificat n'est pas vérifié en SSL : les hébergeurs mutualisés présentent souvent un
 * certificat qui ne correspond pas au nom d'hôte saisi — le chiffrement reste effectif. */
export function mariadbOptions(config: DbConnectionConfig) {
  return {
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    connectTimeout: 6000,
    ssl: config.ssl ? { rejectUnauthorized: false } : undefined
  }
}
