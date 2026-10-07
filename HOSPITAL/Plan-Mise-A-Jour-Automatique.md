# Mise à jour automatique des postes : fonctionnement et plan

*Rédigé le : 2026-09-28*

---

## 0. État (2026-09-28) : implémenté, option B (GitHub Releases)

**Fait**
- **Dépôt de publication** : `Dyanos-coder/pandora-health-releases` (bloc `publish` d'`electron-builder.yml`).
- **Service** : `main/services/updater.service.ts`, avec son IPC `updater:*`.
- **Interface** :
  - encart de progression puis « Redémarrer maintenant », sur tous les écrans ;
  - Paramètres › Mises à jour ;
  - bouton « Mettre à jour maintenant » sur l'écran du poste bloqué.
- **Publication** : script `npm run release`, procédure décrite dans `app-core/README.md`.

**Vérifié**
- Typecheck et lint : OK.
- L'installateur NSIS génère bien le `.exe`, le `.blockmap` et `latest.yml`, et embarque `app-update.yml`.
- L'app installée contacte bien le dépôt au lancement. Réponse 404 tant que le dépôt n'existe pas, affichée « Aucune version publiée ».

**Reste**
- Créer le dépôt public et le jeton `GH_TOKEN`.
- Publier la 0.1.0 puis une 0.1.1, pour tester la mise à jour de bout en bout.

Écart avec le §4 : l'installateur reste en mode « un clic », comme avant. Les mises à jour s'installent de toute façon en silence.

---

## 1. Pourquoi c'est devenu indispensable

Depuis que le backend est intégré à l'application (voir [Plan-Backend-Embarque-Travaux.md](Plan-Backend-Embarque-Travaux.md)), **chaque poste embarque sa propre version du code serveur**. Au démarrage, un poste qui trouve une base mise à jour par une version plus récente de l'application **refuse de démarrer** : il affiche « Mettez à jour l'application ». C'est voulu, pour qu'une ancienne version n'écrive jamais dans un schéma qu'elle ne connaît pas.

Sans mise à jour automatique, il faudrait donc réinstaller l'application **à la main sur chaque poste** à chaque nouvelle version. Sinon, les postes non mis à jour restent bloqués.

## 2. Comment ça marche

L'outil standard pour les applications Electron est **`electron-updater`**, qui complète `electron-builder`, déjà utilisé pour produire l'installateur.

### 2.1 Côté développeur, à chaque nouvelle version

```
1. On augmente le numéro de version dans package.json   (0.1.0 → 0.2.0)
2. npm run build:win   →  génère 3 fichiers dans release/ :
      pandora-health-0.2.0-setup.exe            ← l'installateur complet
      pandora-health-0.2.0-setup.exe.blockmap   ← « empreinte » par blocs, pour ne télécharger que ce qui change
      latest.yml                                ← la « fiche » de la dernière version
3. On dépose ces 3 fichiers sur le serveur de mises à jour (voir §3)
```

`latest.yml` est un petit fichier texte qui ressemble à ceci :

```yaml
version: 0.2.0
files:
  - url: pandora-health-0.2.0-setup.exe
    sha512: 9f86d081884c7d659a2feaa0c55ad015...   # empreinte, pour vérifier que le fichier n'est pas corrompu ou modifié
    size: 98234112
releaseDate: '2026-10-05T09:12:00.000Z'
```

### 2.2 Côté poste de l'hôpital, automatiquement

```
Lancement de l'app (puis toutes les 4 h tant qu'elle reste ouverte)
      │
      ▼
Télécharge latest.yml depuis le serveur de mises à jour
      │
      ▼
Version de latest.yml > version installée ?
      │
      ├── NON ──► rien, l'utilisateur ne voit rien
      │
      └── OUI ──► téléchargement en arrière-plan de la nouvelle version
                  (seulement les blocs modifiés grâce au .blockmap, souvent quelques Mo)
                        │
                        ▼
                  Vérification de l'empreinte sha512 → fichier refusé s'il ne correspond pas
                        │
                        ▼
                  Bandeau dans l'app : « Mise à jour 0.2.0 prête — Redémarrer maintenant »
                        │
                        ├── clic sur « Redémarrer » ──► l'app se ferme, installe, se relance (≈ 10 s)
                        └── sinon ──► installation automatique à la prochaine fermeture de l'app
```

Points importants :
- **Aucun droit administrateur nécessaire.** L'installateur actuel (NSIS) installe l'application pour l'utilisateur Windows courant, donc la mise à jour se fait sans demande d'autorisation.
- **Données préservées.** La base locale hors connexion, les accès à la base distante et la session sont dans le dossier utilisateur (`userData`), que la mise à jour ne touche pas.
- **Sans Internet, rien ne se passe.** La vérification échoue silencieusement et sera retentée plus tard.
- **En développement (`npm run dev`), rien ne se passe.** La mise à jour ne fonctionne que sur une application installée.

### 2.3 Le cas « poste bloqué »

Si le poste démarre et que la base est plus récente que lui (écran « Mise à jour de l'application nécessaire »), l'écran proposera un bouton **« Mettre à jour maintenant »**. Ce bouton lance immédiatement la recherche et le téléchargement de la mise à jour, affiche la progression, puis redémarre l'application. Le poste se débloque ainsi tout seul, sans intervention technique.

### 2.4 Ordre de déploiement d'une version qui modifie la base

1. On publie la nouvelle version sur le serveur de mises à jour.
2. Le premier poste qui se met à jour applique la migration de la base.
3. Les autres postes encore ouverts continuent de fonctionner, puisque nos migrations ne font qu'ajouter des éléments. Au prochain lancement, ils se mettent à jour, ou ils sont bloqués puis débloqués par le bouton du §2.3.

## 3. Où héberger les fichiers de mise à jour ? (à décider)

Il faut un emplacement accessible en HTTPS où déposer les 3 fichiers. Ce n'est **pas** un serveur applicatif, juste des fichiers statiques. Rien à maintenir.

| Option | Principe | Avantages | Inconvénients |
| --- | --- | --- | --- |
| **A. Hébergement web Hostinger** (recommandé si tu as un hébergement web, pas seulement MySQL) | Un dossier, par ex. `https://updates.ton-domaine.com/pandora-health/`, où l'on dépose les fichiers par FTP ou le gestionnaire de fichiers | Même fournisseur que la base, pas de nouveau compte, gratuit si l'offre existe déjà | Dépôt manuel des 3 fichiers à chaque version (ou script FTP) |
| **B. GitHub Releases** | Un dépôt GitHub **public dédié aux installateurs** (le code reste dans le dépôt privé). `electron-builder` publie tout seul avec `--publish always` | Publication en une commande, historique des versions, gratuit | Les installateurs sont téléchargeables publiquement. Un dépôt privé obligerait à embarquer un jeton GitHub dans l'app, ce qui est à proscrire |
| **C. Stockage objet** (Cloudflare R2, Amazon S3…) | Un « bucket » public | Très fiable, publication automatisable | Un compte et un service de plus |

**Google Drive : déconseillé.** Le système de mise à jour a besoin d'adresses de fichiers fixes et d'un téléchargement direct. Drive ne remplit aucune des deux conditions de façon fiable :
- chaque fichier a un identifiant, pas un chemin ;
- au-delà d'environ 100 Mo (la taille de notre installateur), Drive affiche une page « impossible d'analyser ce fichier pour détecter les virus » au lieu du fichier : la mise à jour échoue ;
- les quotas de téléchargement (« quota dépassé ») bloquent quand plusieurs postes téléchargent le même jour ;
- le téléchargement partiel (`.blockmap`, seulement ce qui a changé) n'est pas pris en charge.

Drive reste pratique pour transmettre **l'installateur initial** à la main à un hôpital, mais pas pour les mises à jour automatiques.

Dans les trois cas, c'est une seule ligne de configuration dans `electron-builder.yml` (`publish:`). On peut en changer plus tard, mais les postes déjà installés continueront de chercher à l'ancienne adresse jusqu'à leur prochaine mise à jour. Mieux vaut donc choisir une adresse stable dès le départ.

## 4. Ce que je vais faire

1. **Dépendance** : ajouter `electron-updater` à `app-core`.
2. **Configuration** (`electron-builder.yml`) :
   - bloc `publish` avec l'adresse choisie au §3 ;
   - NSIS en mode assisté, non « one-click », pour afficher la progression de l'installation ;
   - vérification que le `.blockmap` est bien généré.
3. **Service de mise à jour** (`main/services/updater.service.ts`) :
   - vérification au lancement puis toutes les 4 h ;
   - téléchargement automatique en arrière-plan ;
   - envoi de l'état à l'interface : disponible, pourcentage, prête, erreur ;
   - installation au clic « Redémarrer », ou à la fermeture de l'app ;
   - inactif en développement ;
   - journalisation des erreurs dans un fichier de log.
4. **Interface** :
   - **bandeau discret** en haut de l'app : « Mise à jour 0.2.0 en cours de téléchargement… 45 % », puis « prête — Redémarrer maintenant » ;
   - **Paramètres** : version installée + bouton « Rechercher des mises à jour » ;
   - **écran « Mise à jour de l'application nécessaire »** : bouton « Mettre à jour maintenant » avec barre de progression (§2.3).
5. **Procédure de publication** : une section dans le `README.md` d'`app-core` (changer la version → build → déposer les 3 fichiers), et si possible un script `npm run release` qui fait tout, selon l'option retenue au §3.
6. **Test réel** : installer la version 0.1.0, publier une 0.1.1 sur le serveur de mises à jour, vérifier la détection, le téléchargement, le redémarrage et la conservation des données et de la session.

## 5. Point complémentaire : la signature du code

Sans certificat de signature de code, Windows affiche l'avertissement **SmartScreen** (« Windows a protégé votre ordinateur ») à la **première installation** sur chaque poste. Il faut alors cliquer sur « Informations complémentaires » puis « Exécuter quand même ».

- **Les mises à jour automatiques fonctionnent quand même sans signature.** L'intégrité est garantie par l'empreinte sha512 de `latest.yml`, et l'avertissement n'apparaît pas lors des mises à jour.
- **Un certificat** (≈ 200 à 400 €/an, ou Azure Trusted Signing ≈ 10 $/mois) supprime l'avertissement et renforce la sécurité : la mise à jour vérifie alors aussi l'éditeur. C'est à prévoir avant un déploiement dans plusieurs hôpitaux, mais ce n'est pas bloquant pour démarrer.

## 6. Décision attendue

**Où héberger les fichiers de mise à jour : option A (Hostinger), B (GitHub Releases public) ou C (stockage objet) ?** Si c'est A, il me faudra l'adresse du dossier (par ex. `https://ton-domaine.com/updates/pandora-health/`).
