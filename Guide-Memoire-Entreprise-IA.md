# Mémoire d'entreprise — Héberger et brancher une vraie IA

Ce document explique comment transformer l'écran `MemoryPage.tsx` (actuellement une maquette avec
un échange codé en dur) en une vraie fonctionnalité, et répond à la question "comment héberger un
modèle d'IA entraîné sur les données de l'entreprise".

## 1. Clarification importante : "entraîner" un modèle n'est pas la bonne approche

Ce que tu décris ("un modèle entraîné sur les données de l'entreprise qui aide pour les
recommandations") est le bon **objectif**, mais "entraîner" (fine-tuning) un modèle d'IA par
client n'est **pas** la bonne méthode pour y arriver :

- Il faudrait ré-entraîner le modèle à chaque nouvelle facture, incident ou embauche — intenable.
- Ça coûte cher et demande des volumes de données que peu de PME africaines auront.
- Un modèle fine-tuné a tendance à "halluciner" (inventer) plutôt qu'à citer ses sources — exactement
  l'inverse de ce que promet déjà la maquette ("réponse sourcée, jamais inventée", §3.7 du cahier
  des charges).

**La bonne approche s'appelle RAG (Retrieval-Augmented Generation)** : on ne modifie jamais le
modèle lui-même. À chaque question, on va chercher les quelques passages de données pertinents
(factures, incidents, contrats...) dans une base, et on les donne au modèle **en même temps que la
question**, en lui disant "réponds uniquement à partir de ça". C'est exactement ce que montre déjà
la maquette avec ses puces "Sources & références" — c'est la signature visuelle du RAG, pas d'un
modèle fine-tuné.

```
Question → recherche des passages pertinents → modèle IA (avec ces passages en contexte) → réponse + sources
```

## 2. Décision : modèle local, pas d'API payante

Tu as tranché : pas d'API payante à l'usage (Claude/Voyage facturent au token, ça devient cher à
l'échelle) — tu veux un **petit modèle local**, léger et efficace. C'est un choix cohérent, et qui
colle même mieux à l'esprit du produit : un modèle qui tourne en local peut répondre **sans
connexion internet**, ce qui n'était pas le cas avec des API cloud. Ça devient un vrai atout
"offline-first" pour Mémoire d'entreprise, pas juste une contrainte de coût.

### La stack retenue

Tout tourne via **[Ollama](https://ollama.com)** (gratuit, open-source, un seul programme à
installer qui sert à la fois le modèle de génération et le modèle d'embeddings via une API HTTP
locale sur `http://localhost:11434`).

| Rôle | Modèle recommandé pour démarrer | Alternative si le français n'est pas assez bon |
|---|---|---|
| Génération de la réponse | `qwen3:4b` ou `llama3.2:3b` | `mistral:8b` (meilleur en français, plus lourd) |
| Embeddings (recherche) | `nomic-embed-text` (léger, natif Ollama) | `bge-m3` (meilleure qualité multilingue, un peu plus lourd) |

**Config machine réaliste** : 8 Go de RAM suffisent pour les petits modèles ci-dessus, aucun GPU
n'est obligatoire (juste plus lent sur CPU seul — compte quelques secondes par réponse, ce qui est
tout à fait acceptable pour une question posée ponctuellement, pas pour un chat temps réel).

### Comment démarrer (avant même d'écrire du code)

```bash
# 1. Installer Ollama : https://ollama.com/download
# 2. Récupérer les modèles
ollama pull qwen3:4b
ollama pull nomic-embed-text

# 3. Tester que ça répond
ollama run qwen3:4b "Réponds en une phrase : qu'est-ce qu'une PME ?"
```

Si la qualité en français ou la pertinence des réponses déçoit, remplace juste `qwen3:4b` par
`mistral:8b` — le reste du pipeline (§4) ne change pas, seul le nom du modèle appelé change.

### Ce que ça change pour l'intégration

Dans le code, appeler Ollama en local est **le même genre d'appel HTTP** que d'appeler une API
cloud (Claude/Voyage) — seule l'URL change (`http://localhost:11434` au lieu d'une URL Anthropic).
Toute l'architecture RAG du §1 reste identique. Concrètement :
- `POST http://localhost:11434/api/embed` avec `{ model: "nomic-embed-text", input: "..." }` → vecteur.
- `POST http://localhost:11434/api/chat` avec `{ model: "qwen3:4b", messages: [...] }` → réponse.

Pas de SDK tiers requis (pas de `@anthropic-ai/sdk` ni de client Voyage) : un simple `fetch` suffit
depuis le process main.

## 3. Stockage vectoriel : tu as déjà ce qu'il faut

Bonne nouvelle : `app-core` utilise déjà **libSQL** (`@prisma/adapter-libsql`), qui a une
**recherche vectorielle native** — types de colonne `F32_BLOB`, fonction `vector_top_k`, et un
index approximatif (DiskANN) pour rester rapide même avec beaucoup de données. Pas besoin d'ajouter
une base vectorielle séparée (Pinecone, Qdrant, etc.).

Seule limite : Prisma n'a pas encore de type vectoriel "de première classe" dans son schéma. On
contourne ça proprement avec le type `Unsupported(...)` et des requêtes SQL brutes
(`$queryRawUnsafe`) — c'est une méthode documentée par Prisma, pas un bricolage fragile.

## 4. Plan étape par étape

### Étape 1 — Étendre le schéma Prisma

Nouveau modèle dans `prisma/schema.prisma` :

```prisma
model MemoryChunk {
  id          String                    @id @default(uuid())
  tenantId    String
  sourceType  String   // "audit_log" | "invoice" | "incident" | "document" ...
  sourceId    String?
  sourceLabel String   // ce qui s'affiche dans "Sources & références" (ex: "Contrat Logistix 2023")
  content     String   // le passage de texte réel
  embedding   Unsupported("F32_BLOB(1024)")
  createdAt   DateTime @default(now())

  tenant Tenant @relation(fields: [tenantId], references: [id])
}
```

Puis, dans une migration, créer l'index vectoriel via SQL brut :

```sql
CREATE INDEX memory_chunk_embedding_idx ON MemoryChunk (libsql_vector_idx(embedding));
```

### Étape 2 — Pipeline d'ingestion

Nouveau service `src/main/services/memory-ingestion.service.ts` :

1. Découpe le texte source en passages (~300-500 tokens chacun).
2. Appelle Ollama en local (`POST /api/embed`, modèle `nomic-embed-text`) pour obtenir le vecteur
   de chaque passage.
3. Enregistre `{ content, embedding, sourceLabel, sourceType }` dans `MemoryChunk`.

**Quoi ingérer en premier** (données déjà présentes dans le Core, zéro travail de collecte) :
- `AuditLog` (déjà en place, §3.8) — chaque entrée devient un passage.
- Les transactions Finance (factures, statuts).
- Les incidents/alertes.

Les documents libres (contrats PDF, etc.) demandent un upload + extraction de texte — à traiter
dans une itération suivante, une fois le pipeline de base validé sur les données déjà structurées.

### Étape 3 — Pipeline de requête (le cœur de la fonctionnalité)

Nouveau handler IPC `memory:ask` (même pattern que `auth:login` déjà en place) :

1. Calcule l'embedding de la question posée (Ollama, `nomic-embed-text`).
2. Exécute `vector_top_k` sur `MemoryChunk`, filtré par `tenantId`, pour récupérer les 5-8 passages
   les plus proches.
3. Construit le prompt envoyé au modèle local, avec une instruction stricte :
   > "Réponds uniquement à partir des extraits fournis ci-dessous. Si l'information n'y figure pas,
   > dis-le clairement plutôt que de deviner. Ne cite que les sources réellement utilisées."
4. Appelle Ollama en local (`POST /api/chat`, modèle `qwen3:4b`) avec les passages en contexte + la
   question.
5. Renvoie la réponse **et** la liste des sources (déjà connue grâce à l'étape 2 — pas besoin de
   faire deviner les sources au modèle, ce qui élimine le risque d'invention).

### Étape 4 — Brancher sur `MemoryPage.tsx`

Remplacer l'échange codé en dur par :
- Un état de chargement pendant l'appel (compte 2-10 secondes sur CPU selon le modèle choisi).
- Le vrai appel IPC `window.api.memory.ask(question)`.
- Un message clair si Ollama n'est pas lancé ("Le module IA local n'est pas démarré") plutôt qu'un
  plantage silencieux — à vérifier via un simple ping sur `http://localhost:11434` au démarrage de
  l'app.

Pas de message "hors-ligne" nécessaire : le modèle étant local, la fonctionnalité marche **sans
connexion internet**, exactement comme le reste du Core.

### Étape 5 — Ce que ça implique niveau distribution

Pas de clé API à gérer, pas de coût à l'usage — mais en échange, il faut que **chaque poste (ou le
serveur local de l'entreprise, §6.2 de l'architecture)** ait Ollama installé et les modèles
téléchargés (~2-5 Go selon les modèles choisis). Deux façons de gérer ça :
- **En dev, maintenant** : installation manuelle (§2), suffisant pour construire et tester la
  fonctionnalité.
- **En production, plus tard** : un écran d'installation qui vérifie si Ollama est présent, sinon
  guide l'utilisateur (ou l'installe silencieusement) — à traiter avec le reste du packaging
  (chapitre "Fichiers concernés" du plan Core initial), pas maintenant.

## 5. Ce qui n'est volontairement pas couvert ici

- Le fine-tuning d'un modèle : pas nécessaire pour ce cas d'usage (voir §1).
- L'upload et l'extraction de documents (PDF, Word) : itération suivante.
- L'installation automatique d'Ollama dans l'installeur de l'app : à traiter avec le packaging,
  plus tard.

## Sources

- [Native Vector Search for SQLite — Turso](https://turso.tech/vector)
- [AI & Embeddings — Turso Docs](https://docs.turso.tech/features/ai-and-embeddings)
- [Prisma — Raw queries / Unsupported types workaround pour le vecteur](https://www.prisma.io/docs/orm/prisma-client/using-raw-sql/raw-queries)
- [Meilleurs modèles Ollama 2026 — comparatif par usage](https://shubham-sharma.fr/articles/meilleurs-modeles-ollama-2026/)
- [Meilleurs modèles d'embeddings locaux pour RAG 2026](https://d-central.tech/local-embedding-models/)
