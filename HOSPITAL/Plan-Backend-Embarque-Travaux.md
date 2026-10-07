# Backend embarqué : ce que je vais faire maintenant

*Rédigé le : 2026-09-28. Suite de [Plan-Backend-Embarque.md](Plan-Backend-Embarque.md). Choix retenu : **option A** (serveur Express embarqué dans l'application, joignable uniquement depuis le poste lui-même).*

---

## 0. État d'avancement (2026-09-28)

**Étapes 1 à 8 : faites.**

| Élément | Emplacement |
| --- | --- |
| Backend embarqué | `app-core/src/main/server/` (démarrage : `server/index.ts`) |
| Schéma et migrations MariaDB | `app-core/prisma-remote/` (client : `npm run prisma:remote:generate`) |
| Orchestration au lancement | `main/services/embedded-backend.service.ts` |
| Accès chiffrés | `main/services/app-config.service.ts` |
| Écrans | `features/setup/DbAccessForm.tsx`, `DbStatusScreen.tsx`, `SetupWizard.tsx`, Paramètres › Ultra Admin |
| Clé Gemini | colonne `company.aiApiKey` (migration `20260928120000_add_company_ai_api_key`, appliquée automatiquement au premier lancement) |

Cas particulier : un poste déjà configuré avec l'ancienne version (assistant déjà passé, mais aucun accès à la base enregistré) voit directement l'écran « Connexion à la base de données ».

**Vérifié**
- Typecheck et lint : 0 erreur.
- Build : OK.
- Démarrage de l'app : OK.
- Test réel du backend embarqué contre la base :
  - bons accès : OK ;
  - mauvais mot de passe : « Accès refusé » ;
  - mauvaise base : « Base introuvable » ;
  - hôte inconnu : « Hôte introuvable » ;
  - `/health` : 200 si la base répond, 503 sinon ;
  - connexion utilisateur refusée : 401 ;
  - route protégée sans jeton : 401 ;
  - base coupée : 503 `dbUnavailable`, qui déclenche le repli hors connexion.

**Reste (étape 9)**
- Parcours complet dans l'interface : premier lancement, accès changés, lancement sans Internet, puis resynchronisation.
- Installeur de test.
- Arrêt de Render une fois validé.

---

## 1. Ta demande

1. **Au premier lancement**, l'application demande les accès à la base de données : **hôte**, **nom de la base**, **utilisateur** et **mot de passe**. Le port vaut 3306 par défaut et reste modifiable.
2. **À chaque lancement suivant**, si l'application n'arrive pas à se connecter à la base **alors qu'Internet fonctionne**, elle **redemande les accès**. Cela couvre le cas d'un mot de passe changé, d'une base déplacée ou d'un hôte modifié.
3. Plus aucun serveur à héberger. La base MariaDB reste distante, et la base locale continue d'assurer le mode hors connexion.

## 2. Le parcours au lancement

```
Lancement de l'app
      │
      ▼
Des accès à la base sont-ils enregistrés ?
      │
      ├── NON (premier lancement) ──► Écran « Connexion à la base »
      │                                  │  (hôte, port, base, utilisateur, mot de passe)
      │                                  │  bouton « Tester et continuer »
      │                                  ▼
      │                              Connexion réussie ? ── non ──► message d'erreur clair, on reste sur l'écran
      │                                  │ oui
      │                                  ▼
      │                              Accès enregistrés (chiffrés) → suite de l'assistant
      │                              (connexion DIRIGEANT, choix des modules), comme aujourd'hui
      │
      └── OUI ──► Tentative de connexion à la base
                     │
                     ├── Réussie ──► écran de connexion habituel
                     │
                     └── Échec ──► Internet fonctionne-t-il ?
                                     │
                                     ├── NON ──► mode hors connexion habituel (base locale)
                                     │           l'app se reconnectera seule quand le réseau reviendra
                                     │
                                     └── OUI ──► Écran « Connexion à la base impossible »
                                                 - raison affichée (mot de passe refusé, base introuvable,
                                                   hôte injoignable…)
                                                 - formulaire pré-rempli (sauf le mot de passe)
                                                 - bouton « Réessayer / Enregistrer »
                                                 - bouton « Continuer hors connexion »
```

**Pourquoi un bouton « Continuer hors connexion » ?** Si la base est seulement en panne chez l'hébergeur, les accès ne sont pas en cause. On ne doit pas bloquer l'hôpital pour autant : ce bouton permet de travailler sur la base locale, comme en mode hors connexion, et l'application se resynchronise d'elle-même quand la base redevient joignable.

**Comment l'app sait si « Internet fonctionne » :** elle tente une requête courte vers un service public fiable (par exemple `https://www.google.com/generate_204`, avec `1.1.1.1` en secours). Si elle obtient une réponse, Internet est là et c'est la base qui pose problème.

## 3. Travaux, dans l'ordre

### Étape 1 : faire entrer le backend dans l'application
- Copier le code de `app-server/src` (routes, services, middlewares, auth, permissions, exports Excel/PDF, IA) dans `app-core/src/main/server/`.
- Copier le schéma MariaDB et ses migrations dans `app-core/prisma-remote/`, avec son propre client Prisma généré à part (`src/generated/prisma-remote`), sans mélange avec le client SQLite local.
- Ajouter les dépendances serveur à `app-core` (`express`, `helmet`, `multer`, `bcryptjs`, `jsonwebtoken`, `mariadb`, `@prisma/adapter-mariadb`, `exceljs`, `pdfkit`, `@google/genai`).
- Retirer ce qui n'a plus de sens en local : le limiteur de requêtes global et le CORS « toutes origines ».

### Étape 2 : démarrer le backend avec l'application
- Au lancement, le processus principal démarre le serveur sur `127.0.0.1`, avec un port libre choisi automatiquement. Il n'est **pas accessible depuis le réseau**.
- `remote-api.client.ts` utilise cette adresse locale au lieu de l'URL Render. Les ≈ 260 fonctions existantes, la synchronisation hors connexion et l'interface restent inchangées.
- Le serveur démarre même sans accès à la base : ce sont les requêtes qui échouent proprement, et l'app bascule en mode hors connexion.

### Étape 3 : stocker les accès à la base
- Les accès sont enregistrés dans `config.json`, **chiffrés avec le coffre de Windows** (`safeStorage`, le même mécanisme que la clé de la base locale).
- Le mot de passe n'est jamais renvoyé à l'interface : le formulaire de modification l'affiche vide.
- Le champ « URL du backend » de la configuration disparaît.
- En développement, le `.env` (`DB_HOST`, `DB_NAME`…) reste utilisable.

### Étape 4 : écrans « Connexion à la base »
- **Assistant de premier lancement** : l'étape « URL du backend » est remplacée par le formulaire hôte / port / base / utilisateur / mot de passe, avec un test réel de connexion (`SELECT 1`) avant de continuer.
- **Nouvel écran « Connexion à la base impossible »** pour les lancements suivants (§2), avec la raison de l'échec traduite en français :
  - accès refusé : utilisateur ou mot de passe incorrect ;
  - base inconnue : nom de base incorrect ;
  - hôte introuvable ou injoignable : adresse incorrecte, ou connexions distantes non autorisées chez l'hébergeur.
- **Dans Paramètres** (DIRIGEANT) : une entrée « Connexion à la base » pour modifier les accès sans réinstaller.

### Étape 5 : détection de la connexion
- Aujourd'hui, la sonde `/health` vérifie seulement que le serveur répond. Le serveur étant désormais local, **elle vérifiera réellement la base** avec un `SELECT 1` et un délai court.
- La bascule en ligne / hors connexion, la file d'attente et la resynchronisation fonctionnent comme aujourd'hui.

### Étape 6 : migrations de la base au démarrage
- Le logiciel en ligne de commande de Prisma n'est pas livré avec l'app. J'écris donc le même mécanisme que pour la base locale (`migrate-local-db.ts`) : au démarrage, l'app applique elle-même les migrations MariaDB manquantes, en les notant dans la table `_prisma_migrations` que Prisma utilise déjà. La base actuelle reste ainsi compatible.
- **Si la base est plus récente que l'application** (un autre poste a déjà été mis à jour) : message « Mettez à jour l'application » au lieu de risquer d'écrire dans un schéma inconnu.
- Un verrou en base empêche deux postes de migrer en même temps.
- L'utilisateur saisi doit donc avoir les droits de modifier la structure de la base (`ALTER`, `CREATE`). C'est le cas par défaut chez Hostinger. Un utilisateur séparé pour les migrations pourra venir plus tard.

### Étape 7 : tâches à exécuter une seule fois pour tout l'hôpital
- L'évaluation des automatisations (toutes les 15 min) et la création du premier compte DIRIGEANT sont protégées par un **verrou MariaDB** (`GET_LOCK`). Un seul poste les exécute, même si 20 postes sont allumés.

### Étape 8 : clé IA (Gemini)
- La clé n'est plus dans un `.env` de serveur. Elle se saisit dans **Paramètres** et s'enregistre **en base** : saisie une fois, valable pour tous les postes.

### Étape 9 : vérifications
- Typecheck et lint de `app-core`.
- Tests réels :
  - premier lancement avec des accès faux puis corrects ;
  - relance avec un mot de passe changé, donc accès redemandés ;
  - relance sans Internet, donc mode hors connexion sans demande d'accès ;
  - bouton « Continuer hors connexion » ;
  - connexion utilisateur ;
  - création et modification de dossiers ;
  - upload et lecture de fichiers de résultats ;
  - exports Excel et PDF ;
  - sauvegarde et restauration ;
  - resynchronisation après coupure.
- Génération d'un installeur de test.

## 4. Ce qui restera à faire de ton côté

- **Chez l'hébergeur MySQL :** activer **« MySQL distant »** et autoriser les connexions depuis l'IP de l'hôpital, ou depuis toutes les IP (`%`).
- **Sur Render :** une fois le nouvel installeur validé sur les postes, arrêter le service. Le dossier `app-server` sera gardé un temps comme référence, puis supprimé.
- **Premier lancement de chaque poste :** saisir les accès à la base. Ce sont les mêmes informations que celles du `.env` actuel du serveur.

## 5. Rappel sécurité

Chaque poste détiendra les accès à la base, chiffrés par Windows, mais récupérables par un administrateur du poste qui s'y connaît (voir §3.1 de [Plan-Backend-Embarque.md](Plan-Backend-Embarque.md)). C'est acceptable sur un parc de postes maîtrisé par l'hôpital. Pour réduire le risque plus tard : un utilisateur MariaDB aux droits limités, une connexion SSL et une liste blanche d'IP chez l'hébergeur.
