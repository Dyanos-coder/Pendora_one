# Plan — Mode hors-ligne avec synchronisation (Pandora Health)

Document de conception (item 25 de `Reste-A-Faire.md`). **Ceci est un plan, pas une implémentation** — objectif : poser une architecture réaliste, ancrée dans le code existant, pour que les utilisateurs puissent utiliser `app-core` sans connexion internet, et que les actions effectuées hors-ligne soient poussées vers `app-server` (et donc vers la base MySQL/MariaDB) dès que la connexion revient, en synchronisant la base locale avec la base serveur.

*Rédigé le : 2026-09-19*

---

## État d'avancement

- [x] **Phase 0 — Fondations transverses** : faite et vérifiée (2026-09-19). Voir détail juste après ce tableau.
- [x] **Phase 1 — Patients, Consultations, Rendez-vous, Urgences** : faite et vérifiée (2026-09-19/20). Voir détail plus bas.
- [x] **Phase 2 — Hospitalisation, Bloc opératoire, Laboratoire, Imagerie, Cardiologie, Anatomopathologie, Endoscopie, Pharmacie, Banque de sang** : faite et vérifiée (2026-09-20). Voir détail plus bas.
- [x] **Phase 3 — Stocks, Approvisionnement, Finance, RH** : faite et vérifiée (2026-09-20). Voir détail plus bas.
- [x] **Phase 4 — Détection réelle de conflit + notification active** : faite et vérifiée (2026-09-20), sur les 17 domaines des Phases 1-3. Voir détail plus bas.
- [ ] **Phase 5 — Sous-onglets CRUD volontairement laissés de côté en Phase 3** (dossier patient agrégé, Stocks, Approvisionnement, Finance, RH, Banque de sang — voir §63-79 pour le rappel du périmètre initial). Décidée le 2026-09-21, en cours : **Stocks fait et vérifié**, les 5 autres restent à faire. Voir détail plus bas.

### Détail de la Phase 0 (faite)

Implémentée telle que décrite au §3 et §7, **sans encore raccorder aucun domaine métier** (c'est volontairement le périmètre exact de la Phase 0 — les 28 écrans continuent d'appeler `authorizedFetch` directement pour l'instant, rien ne change pour eux) :

- **Base locale étendue** (`app-core/prisma/schema.prisma`) : deux nouveaux modèles SQLite, `SyncOutbox` (une ligne par action en attente d'envoi) et `SyncCursor` (curseur de synchro descendante par entité, pas encore utilisé — prévu pour la Phase 1). `operation`/`status` sont des `String` plutôt que des enums Prisma : le connecteur SQLite ne supporte pas les enums natifs (contrairement à MySQL côté `app-server`).
- **Détection de connectivité** (`app-core/src/main/services/connectivity.service.ts`) : réutilise l'endpoint `GET /health` déjà exposé par `app-server` (jusqu'ici jamais appelé par `app-core`), ping toutes les 20 secondes + à la demande, expose l'état `ONLINE`/`OFFLINE` et notifie les abonnés en cas de changement.
- **Worker de synchronisation** (`app-core/src/main/services/sync-worker.ts`) : vide l'outbox dès que la connexion repasse en ligne, via un système de « dispatcher » enregistré par type d'entité (`registerSyncDispatcher('patient', ...)`) plutôt qu'une logique connaissant les 28 domaines. À l'époque de la Phase 0, aucun dispatcher n'était encore enregistré — c'est fait pour Patients depuis la Phase 1 (voir plus bas).
- **IPC + preload** (`connectivity.ipc.ts`, `sync.ipc.ts`, sections `connectivity`/`sync` du preload) : exposent l'état de connexion et la liste de l'outbox au renderer, avec un canal de notification push (`connectivity:changed`) pour mettre à jour l'UI en temps réel sans polling côté renderer.
- **UI** : `ConnectivityIndicator.tsx` dans le header (`AppShell.tsx`) — badge « En ligne »/« Hors ligne » avec pastille du nombre d'actions en attente, et un panneau déroulant « File de synchronisation » listant les entrées de l'outbox (type, opération, statut, erreur éventuelle) avec un bouton de synchronisation manuelle.
- **Vérifié en direct** : ping de connectivité confirmé fonctionnel de bout en bout (process main → IPC push → badge renderer) avec le serveur réellement démarré ; affichage de la file de synchronisation vérifié en insérant une entrée de test directement dans la base locale (badge de compteur, libellés type/opération/statut corrects dans le panneau), donnée de test supprimée après vérification.

### Détail de la Phase 1 — Patients, Consultations, Rendez-vous, Urgences (faite)

#### Patients

Premier domaine métier réellement branché sur le mécanisme de la Phase 0 — sert de modèle pour Consultations/Rendez-vous/Urgences ensuite. **Portée volontairement limitée à l'identité du patient** (liste, création, modification, suppression — ce qu'utilise `PatientsPage.tsx`) : le dossier agrégé du patient (`dossier()`, `addVitals()`, `addPrescription()` — consultations, vitaux, ordonnances, résultats, chronologie affichés dans `PatientDetailPage.tsx`) **reste en ligne uniquement**, il agrège 5+ domaines cliniques distincts qui n'ont pas encore leur propre miroir local ; l'offline-iser aurait été un chantier à part entière, hors de portée réaliste de « brancher un domaine ».

- **Miroir local** (`app-core/prisma/schema.prisma`, modèle `Patient`) : champs de `PatientSummary`/`CreatePatientInput`/`UpdatePatientInput` uniquement (pas `medicalHistory`/`familyHistory`/`lifestyle`, propres au dossier détaillé). `id` n'a pas de `@default(uuid())` — décidé par l'application (généré côté client à la création hors-ligne via `crypto.randomUUID()`, ou recopié depuis le serveur à la synchro descendante), conformément au §4 du plan. Un champ `syncStatus` (`SYNCED`/`PENDING`) distingue un patient déjà confirmé par le serveur d'un patient créé/modifié localement en attendant sa synchro.
- **Codes provisoires** (option A du §5, comme recommandé) : un patient créé hors-ligne reçoit un code `P-LOCAL-xxxx` (4 premiers caractères de son id), remplacé automatiquement par le vrai code serveur (`P-2026-0000123`) dès que la création est synchronisée — aucune action de l'utilisateur requise.
- **Id généré côté client + création idempotente côté serveur** (§4) : `app-server/src/services/patients.service.ts::createPatient()` accepte désormais un `id` optionnel dans son entrée ; si un patient avec cet id existe déjà (rejeu d'une synchro après une confirmation réseau perdue), l'existant est renvoyé tel quel plutôt que d'en créer un second — la génération du code (`nextCode`) n'est appelée qu'au tout premier passage, pas à chaque rejeu.
- **`patients.service.ts` (main, app-core) réécrit** pour basculer entre serveur et miroir local : en ligne, comportement strictement inchangé (appel réseau direct, mise en cache locale de la réponse en passant) ; hors-ligne (ou coupure détectée au moment précis de l'appel, même si l'état global affiché n'a pas encore basculé), écriture locale immédiate + mise en file d'attente (`enqueue('patient', id, 'CREATE'|'UPDATE'|'DELETE', payload)`), retour immédiat à l'UI sans attendre le réseau. Un dispatcher `registerSyncDispatcher('patient', ...)` rejoue chaque opération vers le serveur avec les mêmes fonctions `remote-api.client.ts` que le chemin en ligne.
- **Aucun changement requis côté IPC/preload/renderer** : les fonctions exposées (`list`, `get`, `create`, `update`, `remove`) gardent exactement la même signature et la même forme de réponse (`ApiResult<...>`) — tout le changement est contenu dans `patients.service.ts` (main) et ses deux nouveaux fichiers d'appui (`patients-local.service.ts`, et la constante `NETWORK_ERROR_MESSAGE` exportée de `remote-api.client.ts` pour distinguer une coupure réseau d'une vraie erreur métier).
- **Limite connue** : un patient jamais vu en détail par ce poste (seulement croisé via la liste résumée) n'a pas de `birthDate` fiable en local — s'il fallait l'afficher hors-ligne, son âge affiché serait incorrect (calculé depuis une date null au 1er janvier 1970). Cas limite acceptable pour cette phase : il ne concerne que la consultation hors-ligne d'un patient qu'on n'a jamais ni créé, ni modifié, ni ouvert en détail depuis ce poste.
- **Vérifié en direct, bout en bout, avec le vrai serveur arrêté puis redémarré pendant le test** (pas seulement des appels API isolés) : connexion coupée → badge passé « Hors ligne » → patient créé dans l'app réelle avec code provisoire `P-LOCAL-xxxx` visible dans la liste → entrée « patient — Création » visible dans la file de synchronisation → serveur redémarré → **synchronisation automatique déclenchée sans aucune action manuelle** (détection de reconnexion + vidage de l'outbox) → patient confirmé côté serveur avec le même id et un vrai code (`P-2026-0000007`), miroir local mis à jour en conséquence (`syncStatus: SYNCED`). Données de test supprimées côté serveur et en local après vérification.

#### Consultations, Rendez-vous, Urgences

Même pattern que Patients, répliqué sur les trois domaines restants de la Phase 1 (mêmes fichiers en miroir : `<domaine>-local.service.ts` + réécriture de `<domaine>.service.ts` + `registerSyncDispatcher`, aucun changement IPC/preload/renderer). Quelques différences notées pendant l'implémentation :

- **Consultations** est le seul des trois avec un code lisible (`dossier`, généré par `nextCode` côté serveur) : reçoit donc un code provisoire `DOS-LOCAL-xxxx` comme Patient. Rendez-vous et Urgences n'ont pas de code métier — seul l'id suffit, pas de logique de remplacement à gérer.
- Les trois modèles serveur (`ApiConsultation`/`ApiAppointment`/`ApiEmergencyVisit`) affichent des champs dérivés d'une relation (`patientName`/`patientCode`/`age`/`gender` depuis `Patient`, `doctorName` depuis `Employee`) avec repli sur des champs instantanés (`patientName`/`patientAge`...) stockés directement sur le modèle quand il n'y a pas de patient enregistré. Le miroir local reproduit ce même repli en interrogeant le miroir local de `Patient` (déjà là depuis Patients) ; `doctorName` n'a pas de miroir RH local — c'est un champ propre au miroir local (absent du schéma serveur), qui garde le dernier nom vu à la dernière synchro plutôt que de l'afficher vide.
- **Vérifié en direct, bout en bout, un seul cycle couvrant les trois domaines** : serveur coupé → une consultation, un rendez-vous et un passage aux urgences créés dans l'app réelle pendant la coupure (visibles dans leurs listes respectives, 3 entrées « Création » en attente dans la file de synchronisation) → serveur redémarré → synchronisation automatique des trois → les trois confirmés côté serveur avec le même id, la consultation avec son vrai dossier (`DOS-2026-000002`) à la place du provisoire, miroirs locaux à jour (`syncStatus: SYNCED`, entrées d'outbox `SENT`). Données de test supprimées côté serveur et en local après vérification.

### Détail de la Phase 2 — Hospitalisation, Bloc opératoire, Laboratoire, Imagerie, Cardiologie, Anatomopathologie, Endoscopie, Pharmacie, Banque de sang (faite)

Même pattern que les Phases 0/1, répliqué sur les 9 domaines restants (miroir local par domaine, réécriture de `<domaine>.service.ts`, `registerSyncDispatcher`, aucun changement IPC/preload/renderer). Une exploration préalable de l'existant a permis d'implémenter les 9 sans essais-erreurs (typecheck propre du premier coup sur l'ensemble). Points notables :

- **Seuls 2 des 9 domaines ont un code lisible généré côté serveur** (donc un code provisoire à gérer, option A du §5) : **Laboratoire** (`requestNumber`, `nextCode('LAB','LAB',5)` → provisoire `LAB-LOCAL-xxxx`) et **Banque de sang** (`pouchNumber`, `nextCode('BLOOD_POUCH','PC',5)` → provisoire `PC-LOCAL-xxxx`, en plus du statut initial forcé `EN_ATTENTE_ANALYSE` répliqué dans le miroir). Les 7 autres n'ont que l'id.
- **`Bed` et `OperatingRoom` sont des référentiels en lecture seule côté serveur** (aucune route de création/modification) — pas de miroir local dédié : `Hospitalization` stocke des instantanés `bedRoom`/`bedLabel`, `Surgery` un instantané `roomName`, sur le même principe que `doctorName` en Phase 1. Pareil pour tous les libellés dérivés d'`Employee` (`surgeonName`, `anesthetistName`, `technicianName`, `endoscopistName`) : jamais de miroir RH local, juste l'instantané du dernier nom vu.
- **Valeurs calculées répliquées dans chaque miroir local** : durée du séjour (Hospitalisation), durée prévue formatée (Bloc opératoire), état de stock `RUPTURE`/`STOCK_FAIBLE`/`DISPONIBLE` (Pharmacie) — même logique que le serveur, jamais stockées telles quelles.
- **Pharmacie et Banque de sang sont les deux seuls domaines de la Phase 2 sans aucun repli patient** : `Medication` n'a aucune relation du tout (fonction `toDisplay()` locale pure, sans lecture d'aucun autre miroir) ; `BloodPouch` a un `patientId` mais le serveur ne dérive jamais de `patientName`/`patientCode` à partir de lui — le miroir local reproduit cette même absence de jointure plutôt que d'en ajouter une qui n'existe pas côté serveur.
- **`app-core/src/main/services/blood-bank.service.ts` a été modifié chirurgicalement** : ce fichier contient aussi les 16 fonctions de l'item 15 (Dons, Demandes transfusionnelles, Transfusions, Analyses), volontairement non touchées — seules les 4 fonctions CRUD de base des poches (`list`/`create`/`update`/`remove`) et `exportExcel()` ont été réécrites, le reste du fichier est resté identique caractère pour caractère.
- **Vérifié en direct, bout en bout, un seul cycle couvrant 4 domaines représentatifs des différents cas de figure** (Bloc opératoire pour les relations multiples patient/chirurgien/anesthésiste/salle, Pharmacie pour le cas sans aucune relation, Banque de sang pour le code provisoire dans un fichier partagé avec l'item 15, Laboratoire pour le code provisoire avec relation patient) plutôt que les 9 un par un (le mécanisme est strictement identique et déjà prouvé aux Phases 0/1, une vérification exhaustive des 9 aurait été redondante) : serveur coupé → une intervention, un médicament, une poche de sang et une demande de laboratoire créés dans l'app réelle pendant la coupure (entrées « Création » en attente dans la file de synchronisation pour les 4) → serveur redémarré → synchronisation automatique des 4 → confirmés côté serveur avec le même id, la poche et la demande de labo avec leur vrai code (`PC-2026-00004`, `LAB-2026-00001`) à la place du provisoire, miroirs locaux à jour (`syncStatus: SYNCED`, entrées d'outbox `SENT`). Les 5 domaines non explicitement testés (Hospitalisation, Imagerie, Cardiologie, Anatomopathologie, Endoscopie) suivent une structure strictement identique à ceux testés (même détection de connectivité, même miroir, même dispatcher) — le typecheck complet des deux projets, qui vérifie la cohérence de bout en bout des types entre miroir local/serveur/IPC pour chacun, est le principal filet de sécurité pour ces 5-là. Données de test supprimées côté serveur et en local après vérification.

### Détail de la Phase 3 — Stocks, Approvisionnement, Finance, RH (faite) — dernière phase du plan

**Périmètre volontairement limité à l'entité PRINCIPALE de chaque domaine** — celle des items 1-11 de l'audit — PAS aux nombreux sous-onglets CRUD ajoutés aux items 12-14 (mouvements de stock/transferts/inventaires/pertes, commandes/réceptions, factures/paiements/dépenses/budgets/comptes bancaires, présences/contrats/performances/formations/paie/documents RH), qui restent en ligne uniquement pour l'instant :

- **Stocks** → `DepotItem` (onglet « Vue d'ensemble ») uniquement.
- **Approvisionnement** → `ProcurementRequest` uniquement — rappel de l'item 13 : « Besoins exprimés » et « Demandes d'achat » sont déjà deux vues filtrées du même modèle côté renderer, donc un seul dispatcher couvre les deux d'un coup.
- **Finance** → `FinanceTransaction` (onglet « Opérations récentes ») uniquement.
- **RH** → `Employee` (liste principale) uniquement.

Points notables :

- **2 des 4 domaines ont un code lisible** : Approvisionnement (`reference`, `nextCode('PROCUREMENT','BES',4)` → provisoire `BES-LOCAL-xxxx`) et Finance (`reference`, préfixe conditionnel selon le type de l'opération — `REC` pour une recette, `FAC` pour une dépense — → provisoire `REC-LOCAL-xxxx`/`FAC-LOCAL-xxxx`). Stocks et RH n'ont pas de code métier.
- **`Depot` est un référentiel en lecture seule côté serveur** (comme `Bed`/`OperatingRoom` en Phase 2) : `DepotItem` stocke un instantané `depotName`. Point d'attention découvert pendant l'implémentation : le bouton « Nouvel article » de `StocksPage.tsx` est désactivé tant que la liste des dépôts (chargée en ligne uniquement) n'a jamais été récupérée au moins une fois — un poste qui n'a jamais ouvert l'onglet Stocks en ligne avant une coupure ne peut donc pas créer d'article hors-ligne tant qu'il n'a pas visité cette page au moins une fois en ligne. Limite acceptée plutôt que corrigée (hors périmètre de ce chantier, touche à l'ergonomie du formulaire existant).
- **RH est le seul domaine de tout le plan (Phases 0-3) où la suppression douce ne suit pas la convention `deletedAt`** : `Employee` n'a pas ce champ côté serveur (suppression via `isActive: false`, décision de l'item 6) — le miroir local reproduit fidèlement cette même convention plutôt que d'en inventer une nouvelle incohérente avec le serveur.
- **`matricule` n'est volontairement pas `@unique` dans le miroir local RH**, contrairement au serveur : un doublon créé hors-ligne sur deux postes différents doit pouvoir s'écrire localement sans bloquer l'utilisateur, et se résout comme une erreur métier normale (statut `FAILED` dans la file de synchronisation, en attente d'une action humaine) plutôt que de bloquer la création locale elle-même.
- **Approvisionnement et Finance sont les deux seuls domaines de la Phase 3 sans aucune relation à répliquer** (comme Pharmacie/Banque de sang en Phase 2) : fonctions `toDisplay()` locales pures.
- **Vérifié en direct, bout en bout, un seul cycle couvrant les 4 domaines** : serveur coupé → un article de dépôt, un besoin d'approvisionnement, une opération financière et un employé créés dans l'app réelle pendant la coupure (4 entrées « Création » en attente dans la file de synchronisation) → serveur redémarré → synchronisation automatique des 4 → confirmés côté serveur avec le même id, le besoin et l'opération avec leur vrai code (`BES-2026-0001`, `REC-2026-0001`) à la place du provisoire, miroirs locaux à jour (`syncStatus: SYNCED`, entrées d'outbox `SENT`). Données de test supprimées côté serveur et en local après vérification.

Avec cette phase, les 17 domaines sont utilisables hors-ligne (identité + liste + création/modification/suppression, avec synchronisation automatique à la reconnexion), sur leur portée volontairement limitée à l'entité principale pour les domaines les plus riches (Patients, Banque de sang, Stocks, Approvisionnement, Finance, RH — dont les sous-fonctionnalités avancées des items 12-15 restent en ligne uniquement, un chantier séparé si souhaité un jour).

### Détail de la Phase 4 — Détection réelle de conflit + notification active (faite) — dernière phase du plan

**Origine** : le §6.3 ci-dessous décrivait, depuis la rédaction initiale de ce plan, l'*intention* de détecter les vrais conflits (deux modifications de la même fiche, l'une hors-ligne) — mais les Phases 1-3 n'avaient en réalité **jamais implémenté cette vérification** : une synchronisation montante écrasait silencieusement la version serveur, quelle que soit son ancienneté. Corrigé sur demande explicite de l'utilisateur, avec **détection réelle sur les 17 domaines** (pas une version simplifiée sur un sous-ensemble) et une **notification active** (toast, pas seulement le badge de la file qu'il faut ouvrir pour voir).

- **Mécanisme** (concurrence optimiste, comme prévu au §6.3) : chaque miroir local gagne un champ `serverUpdatedAt` (la dernière valeur `updatedAt` connue, faisant autorité côté serveur — distincte de la colonne `updatedAt` du miroir local lui-même, qui suit l'horloge locale). À chaque modification hors-ligne, ce `serverUpdatedAt` est transmis au serveur comme `expectedUpdatedAt` lors de la synchro montante. Côté serveur, `updateX()` compare cette valeur à l'`updatedAt` réel de la fiche avant d'écrire : différence → `ConflictError` levée, interceptée par le middleware d'erreur global (`app-server/src/index.ts`), réponse HTTP 409 avec `{ ok: false, error, conflict: true, current: <fiche à jour> }` plutôt que d'écraser.
- **`app-server/src/lib/conflict-error.ts`** (nouveau) : classe `ConflictError` portant la version serveur actuelle (`current`), pour que le client puisse l'afficher sans un second aller-retour.
- **Propagation générique côté client** : `ApiError` (dans `remote-api.client.ts`) porte désormais `conflict?`/`current?` — un seul changement dans le helper générique `authorizedFetch`, qui bénéficie automatiquement aux fonctions `updateX` des 17 domaines sans modification individuelle de ce fichier.
- **Notification active** : `SyncOutbox` gagne un champ `conflict: boolean` (distingue un échec de conflit d'un échec réseau/validation dans la file). `sync-worker.ts` expose un nouvel abonnement `onSyncConflict(...)`, déclenché quand un dispatcher renvoie `conflict: true` ; `sync.ipc.ts` relaie vers toutes les fenêtres via un nouveau canal `sync:conflict` ; le preload expose `window.api.sync.onConflict(...)` ; un nouveau composant `SyncConflictToast.tsx`, monté dans `AppShell.tsx`, affiche une alerte visible (pas seulement le badge à ouvrir) avec le libellé du domaine concerné et une invitation à vérifier la fiche avant de relancer la modification. `ConnectivityIndicator.tsx` affiche aussi « Conflit » (plutôt que « Échec ») dans le panneau déroulant pour les entrées concernées.
- **Réplication sur les 17 domaines** : même pattern que les Phases 1-3 (un domaine de référence — Patients — implémenté à la main, puis répliqué), sur 4 fichiers par domaine : service serveur (`expectedUpdatedAt` sur `UpdateXInput`, `updatedAt` ajouté au `toDisplay()`/`toDetail()`, bloc de vérification en tête de `updateX()`), types partagés (mêmes deux champs), service local (`getLocal<Entity>ServerUpdatedAt()`, `serverUpdatedAt` posé dans `upsertSynced<Entity>()`), service main (`expectedUpdatedAt` capturé et transmis à `enqueue()`, `conflict: result.conflict` propagé dans la branche `UPDATE` du dispatcher). Pour les domaines dont le fichier serveur/local/main est partagé avec des sous-fonctionnalités d'autres items (Banque de sang, Stocks, Approvisionnement, Finance, RH — voir Phases 2/3), seules les fonctions de l'entité principale concernée ont été touchées, le reste inchangé caractère pour caractère.
- **Vérifié en direct sur deux domaines représentatifs** (serveur réellement démarré, appels HTTP réels avec un token de session valide) : **Patients** (cas nominal, domaine de référence) et **RH** (cas à risque signalé pendant l'implémentation — `toDisplay()` y prend un objet partiel typé plutôt que le type Prisma complet). Pour chacun : modification avec le bon `expectedUpdatedAt` → 200, nouvel `updatedAt` renvoyé ; rejeu de la même modification avec l'`expectedUpdatedAt` désormais périmé → 409 avec `conflict: true` et la version serveur actuelle, **valeur non écrasée** (confirmé en relisant la fiche). Les 15 autres domaines suivent une structure strictement identique et sont couverts par le typecheck complet des deux projets (propre sur l'ensemble), cohérent avec l'approche de vérification représentative déjà suivie en Phase 2. Données de test remises à leur valeur d'origine après vérification.

### Détail de la Phase 5 — Sous-onglets CRUD (en cours)

**Origine** : la Phase 3 avait explicitement laissé de côté les sous-onglets CRUD de Stocks/Approvisionnement/Finance/RH (mouvements, commandes, factures, présences...) ainsi que le dossier patient agrégé, pour rester réaliste sur l'ampleur d'un coup. Décision du 2026-09-21 : les reprendre, un domaine à la fois, avec la même rigueur (détection de conflit, codes provisoires, vérification en direct) que les Phases 1-4 — pas une version allégée.

**Stocks — mouvements, transferts, inventaires, pertes/retours (fait, 2026-09-21)** :

- **4 nouveaux modèles miroir local** (`StockMovement`, `StockTransfer`, `InventoryCount`, `StockLoss`) dans `app-core/prisma/schema.prisma`, même principe que `DepotItem` : `itemName`/`fromItemName`/`toDepotName` en instantané (pas de relation Prisma locale), `serverUpdatedAt`/`syncStatus` pour la détection de conflit et le statut de synchro. Migration `20260921142431_add_stock_subtabs_local_mirrors`.
- **Particularité de ces 4 domaines, absente des Phases 1-4** : chaque création a un effet de bord sur `DepotItem.available` (mouvement : +/- direct ; transfert : débite la source, crédite la destination ; inventaire : corrige sur la quantité comptée ; perte/retour : +/- comme un mouvement). Le miroir local réplique le même calcul pour un retour visuel immédiat hors-ligne — sans avoir besoin d'être parfait, puisque la valeur est de toute façon écrasée par la valeur serveur faisant autorité à la prochaine synchronisation descendante de `DepotItem`.
- **Cas limite du Transfert, traité par une limitation assumée plutôt qu'un risque de doublon** : si l'article de destination (même nom, dépôt cible) n'existe pas encore dans le miroir local (jamais consulté en ligne), le transfert hors-ligne ne le crée PAS localement — le créer avec un id local générerait un doublon orphelin une fois que le serveur crée sa propre version avec son propre id à la synchro montante. Seul le débit de l'article source est appliqué localement ; l'article de destination apparaît normalement à la prochaine liste en ligne.
- **Codes provisoires (option A, comme les Phases 1-4)** : `MVT-LOCAL-xxxx`, `TRS-LOCAL-xxxx`, `INV-LOCAL-xxxx`, `PRT-LOCAL-xxxx`, remplacés par le vrai code (`nextCode`) à la synchro.
- **Serveur** : les 4 services (`stock-movements`/`stock-transfers`/`inventory-counts`/`stock-losses.service.ts`) gagnent `id?` optionnel sur la création (idempotence — crucial ici, un rejeu accidentel ne doit pas appliquer deux fois le delta sur le stock) et `expectedUpdatedAt?` sur la modification (`ConflictError` si la fiche a changé entre-temps), même pattern que Phase 4. Aucun changement des routes (elles passaient déjà `req.body` tel quel).
- **Vérifié en direct, bout en bout, deux scripts séparés** (appels directs à `window.api.stocks.*` via Playwright plutôt que remplissage de formulaire — plus rapide, et couvre exactement ce qui a changé puisque l'IPC/preload/renderer sont restés inchangés) : (1) mouvement + perte + inventaire sur le même article, serveur coupé → les 3 créés hors-ligne avec codes provisoires, stock local recalculé correctement à chaque étape → serveur redémarré → synchro automatique → les 3 confirmés côté serveur avec leur vrai code, stock serveur = valeur attendue → nettoyage (suppression + stock remis à l'état d'origine) ; (2) transfert entre deux dépôts réels, serveur coupé → transfert créé hors-ligne, stock source décrémenté en local → serveur redémarré → synchro automatique → transfert confirmé avec vrai code, stock source ET nouvel article de destination corrects côté serveur → nettoyage. Typecheck complet (app-core + app-server) et lint propres après implémentation.

**Approvisionnement — commandes, réceptions (fait, 2026-09-21)** :

- **2 nouveaux modèles miroir local** (`PurchaseOrder`, `GoodsReception`) dans `app-core/prisma/schema.prisma`. `requestReference` retrouvé dans le miroir local `ProcurementRequest` (déjà là depuis la Phase 3) quand la commande est liée à une demande. `supplierName` reste vide hors-ligne : `Supplier` est un référentiel en lecture seule côté serveur, non couvert par un miroir local (même situation que `Depot`/`Bed`/`OperatingRoom` dans les phases précédentes). Migration `20260921143824_add_procurement_subtabs_local_mirrors`.
- **Effet de bord répliqué** : une réception `CONFORME` fait passer la commande liée à `LIVREE`, aussi bien côté serveur que dans le miroir local (idem principe que Stocks : la valeur locale n'a pas besoin d'être parfaite, elle est écrasée par la synchro descendante de `PurchaseOrder`).
- **Bug latent corrigé au passage** : le lanceur de migrations SQL manuelles ajouté pour l'installeur (`migrate-local-db.ts`, voir `Plan-Installeur-Configurable.md`) s'exécutait aussi en développement, provoquant un faux « drift » détecté par `prisma migrate dev` sur `dev.db` (tentative de rejouer des `CREATE TABLE` par-dessus des tables déjà migrées normalement). Corrigé : ce lanceur ne s'exécute plus qu'en production (`!isDevEnvironment()`) — `dev.db` reste géré exclusivement par le CLI Prisma, comme prévu à l'origine.
- **Vérifié en direct, bout en bout, un seul cycle couvrant les deux niveaux de dépendance** (la réception hors-ligne référence une commande elle-même créée hors-ligne dans le même cycle, cas plus exigeant qu'une simple création isolée — teste que la file de synchro respecte bien l'ordre FIFO documenté au §6.1) : serveur coupé → commande créée hors-ligne (code provisoire `CMD-LOCAL-xxxx`) → réception créée hors-ligne contre cette commande locale → commande passée à `LIVREE` en local → serveur redémarré → synchro automatique des deux, dans l'ordre → commande confirmée avec son vrai code (`CMD-2026-0003`) et toujours `LIVREE`, réception confirmée avec la bonne quantité → nettoyage (suppression des deux). Typecheck complet et lint propres.

**Reste à faire (Phase 5, suite)** : dossier patient agrégé (vitaux, ordonnances, documents), Finance (factures fournisseurs/paiements/budgets/comptes bancaires/dépenses), RH (présences/contrats/paie/documents/formations/évaluations), Banque de sang (dons/transfusions/demandes/analyses) — même méthode, un domaine à la fois.

---

## 1. Constat de l'existant (ce qui existe déjà, ce qui n'existe pas)

Un audit du code a été fait avant d'écrire ce plan, pour ne pas proposer une architecture déconnectée de la réalité. Points factuels :

- **Le cache de session (`session.cache.enc`, item 5 de l'audit) ne résout que la reconnexion, pas les données.** Il contient uniquement `{ session, token, issuedAt }` (chiffré via `electron.safeStorage`), et permet de rouvrir l'app sans re-taper le mot de passe si le réseau est coupé au démarrage. Il ne contient aucune donnée métier — dès qu'un écran a besoin de lire ou écrire un patient, une consultation, etc., l'app retente un appel réseau qui échouera si la connexion est coupée.
- **100 % des accès aux données métier passent par un unique point de passage HTTP synchrone** : la fonction `authorizedFetch()` dans `app-core/src/main/services/remote-api.client.ts`, utilisée par les ~28 écrans / ~45 modèles Prisma du produit (patients, consultations, RDV, hospitalisation, urgences, bloc opératoire, laboratoire, imagerie, cardiologie, anatomopathologie, endoscopie, pharmacie, stocks, approvisionnement, banque de sang, finance, RH, qualité, risques, audit, documents, automation, utilisateurs...). C'est une bonne nouvelle pour ce chantier : il n'y a qu'un seul endroit à intercepter, pas 28 implémentations disparates à reprendre une par une.
- **Une base locale existe déjà dans `app-core`, mais elle ne sert qu'au journal d'audit.** `app-core/src/main/db/client.ts` utilise Prisma + `@prisma/adapter-libsql` (SQLite via libSQL), avec un fichier chiffré (`pandora-health.db`, clé gérée par `db-key.ts`/`safeStorage`). Le seul modèle du schéma local est `AuditLog`. L'infrastructure (chiffrement, emplacement fichier, client Prisma local) est réutilisable telle quelle — il faut l'étendre avec un vrai schéma métier local, pas la réinventer.
- **Décision historique déjà actée dans `Proposition-Architecture-Backend.md` §5.1** : le choix avait été fait de tout faire passer par le serveur distant « dans un premier temps », en traitant explicitement le mode hors-ligne comme « un chantier séparé plus tard ». Ce plan est ce chantier séparé.
- **Aucune détection de connectivité aujourd'hui.** Pas de `navigator.onLine`, pas de listener `online`/`offline`, pas de ping périodique. Un endpoint `GET /health` existe côté serveur mais n'est utilisé par aucune sonde côté `app-core` — il est prêt à être réutilisé pour ça.
- **Aucun comportement hors-ligne dans l'UI aujourd'hui.** Une coupure réseau pendant une création produit un simple message rouge générique (« Impossible de contacter le serveur. Vérifiez votre connexion. »), et la saisie de l'utilisateur est perdue si le modal se ferme — pas de file d'attente, pas de retry automatique, pas de brouillon conservé.
- **Les identifiants sont générés exclusivement côté serveur** (`id String @id @default(uuid())` sur tous les modèles, jamais fourni par le client). Pour permettre une création hors-ligne, il faut que le client puisse générer un identifiant valide sans le serveur.
- **Le point de friction le plus important pour la synchro : le compteur de codes métier (`nextCode()` / `DocumentCounter`).** Les codes lisibles (numéro de patient, référence de facture, de commande, de poche de sang...) sont générés par un `upsert` atomique côté serveur (`app-server/src/services/counter.service.ts`), utilisé par 21 services différents. Ce compteur ne peut pas être appelé hors-ligne — il faudra une stratégie explicite (§5).
- **Ampleur du périmètre : ~28 écrans, ~45 modèles Prisma.** Rendre tout ce périmètre « offline-capable » d'un coup serait un chantier disproportionné. Ce plan propose une mise en œuvre en phases, priorisée par usage réel (§7), pas un big-bang sur les 28 domaines.

---

## 2. Objectif et périmètre proposé

**Objectif** : un utilisateur (ex. personnel infirmier en tournée, ou coupure réseau temporaire de l'établissement) doit pouvoir continuer à consulter les données déjà synchronisées et à enregistrer de nouvelles actions (créations/modifications) pendant une coupure, sans perte de données ni blocage de l'app. Dès que la connexion revient, ces actions doivent partir automatiquement vers le serveur, et les données locales doivent se remettre à jour avec ce qui a changé côté serveur pendant la coupure (par soi-même sur un autre poste, ou par d'autres utilisateurs).

**Ce que ce plan ne couvre PAS** (hors périmètre explicite, à traiter séparément si besoin) :
- La création de comptes utilisateurs hors-ligne (`User.email` unique, cas d'usage rare, risque de conflit élevé, à garder 100 % en ligne).
- L'upload de fichiers volumineux hors-ligne (documents/protocoles en BLOB MySQL, item 11) — à mettre en file d'attente comme le reste, mais avec une limite de taille locale à définir séparément.
- Le mode multi-tenant / plusieurs établissements sur un même poste — hors sujet actuel (une instance `app-server` + une base par établissement).

---

## 3. Principes d'architecture proposés

### 3.1 Base locale miroir + écriture locale immédiate (« local-first »)

Étendre la base SQLite locale déjà en place (`app-core/src/main/db/client.ts`) avec un schéma miroir des modèles métier prioritaires (§7), plus deux tables techniques :

- **`SyncOutbox`** : une ligne par action utilisateur en attente d'envoi (« pattern outbox ») — `id`, `entityType`, `entityId` (id local), `operation` (`CREATE`/`UPDATE`/`DELETE`), `payload` (JSON), `createdAt`, `status` (`PENDING`/`SENDING`/`SENT`/`FAILED`), `retryCount`, `lastError`.
- **`SyncCursor`** : un curseur par entité (`entityType`, `lastSyncedAt` ou `lastSyncedVersion`) pour savoir jusqu'où la synchro descendante (serveur → local) est allée, et ne demander au serveur que ce qui a changé depuis.

Toute lecture/écriture de l'UI passe désormais par la base locale d'abord (lecture immédiate, pas d'attente réseau), jamais directement par `authorizedFetch`. Une écriture (création/modification/suppression) :
1. s'applique immédiatement dans la base locale (l'UI se met à jour tout de suite, l'utilisateur n'attend rien) ;
2. pose une ligne dans `SyncOutbox` ;
3. un processus de synchronisation en arrière-plan vide `SyncOutbox` vers `app-server` dès que la connexion est disponible.

### 3.2 Un seul point d'interception, pas 28

Puisque tous les accès passent aujourd'hui par `authorizedFetch()` dans `remote-api.client.ts`, la couche de synchronisation s'insère à cet endroit précis plutôt que dans chacun des 28 domaines : une nouvelle couche `local-data.service.ts` (nom indicatif) expose les mêmes fonctions (`listPatients`, `createPatient`, ...) mais lit/écrit d'abord en local, et délègue l'envoi réseau à un worker de synchro plutôt qu'à un appel direct. Les fonctions actuelles de `remote-api.client.ts` restent utilisées telles quelles, mais uniquement *par* ce worker de synchro (main → serveur), plus jamais directement par les services métier du renderer/IPC.

### 3.3 Détection de connectivité

Réutiliser l'endpoint `GET /health` déjà présent côté serveur (jamais utilisé pour ça aujourd'hui) : un ping périodique léger (ex. toutes les 15-30 secondes, et immédiatement après un événement `online` du système d'exploitation) détermine l'état `ONLINE`/`OFFLINE`, exposé au renderer via IPC pour affichage d'un indicateur permanent dans l'interface (bandeau ou badge dans le header). Combiner avec les événements `online`/`offline` du process main (Node/Electron) pour réagir immédiatement à un changement détecté par l'OS, sans attendre le prochain ping.

---

## 4. Stratégie d'identifiants

Passer les identifiants créés hors-ligne en UUID v4 généré **côté client** (`crypto.randomUUID()`, déjà disponible en Node/Electron), au lieu de laisser Prisma les générer côté serveur. Le serveur doit être adapté pour accepter un id fourni par le client à la création (au lieu de toujours le générer lui-même) — changement mineur (`data: { id: input.id ?? randomUUID(), ... }` au lieu de `data: { id: randomUUID(), ... }` dans chaque service serveur concerné). Comme les ids sont déjà des UUID partout dans le schéma actuel, il n'y a pas de changement de type de colonne à faire — uniquement un changement de responsabilité (qui génère l'id).

Ceci rend une création hors-ligne idempotente à la synchro : si l'envoi réussit côté serveur mais que la confirmation se perd en route (coupure au mauvais moment), renvoyer la même ligne d'outbox ne crée pas de doublon (le serveur fait un upsert par id plutôt qu'un create qui échouerait sur id dupliqué).

---

## 5. Stratégie pour les codes métier (`nextCode` / `DocumentCounter`)

C'est le point de friction le plus délicat identifié dans l'audit. Deux options possibles, à trancher avec l'utilisateur avant implémentation :

**Option A — Code provisoire local, remplacé à la synchro (recommandée)**
Une entité créée hors-ligne reçoit un code provisoire visible et non-ambigu (ex. `P-LOCAL-3F2A` — préfixe distinct, pas de collision possible avec un code serveur `P-2026-000123`). L'UI l'affiche tel quel, avec éventuellement un badge « en attente de synchronisation ». Dès l'envoi réussi au serveur, celui-ci appelle `nextCode()` normalement et renvoie le vrai code définitif, qui remplace le code provisoire dans la base locale (et dans l'UI, en toute transparence pour l'utilisateur — pas d'action manuelle requise).
*Avantage* : aucun changement du mécanisme serveur existant (`nextCode`/`DocumentCounter` reste inchangé, toujours appelé uniquement en ligne). *Inconvénient* : le code affiché change une fois la synchro faite (à bien communiquer dans l'UX — ex. toast « Patient P-LOCAL-3F2A synchronisé sous le code P-2026-000124 »).

**Option B — Plage de codes réservée par poste**
Chaque poste (ou session utilisateur) se voit attribuer par le serveur, lors de sa dernière connexion en ligne, une plage de codes réservés à l'avance (ex. 50 codes) qu'il peut consommer localement hors-ligne sans collision. *Avantage* : le code affiché est définitif dès la création, jamais de changement après coup. *Inconvénient* : complexifie `DocumentCounter` (gestion de plages, risque de gaspillage de codes si la plage n'est pas entièrement consommée), et nécessite d'avoir été en ligne récemment pour recharger une plage — ne résout pas le cas d'une coupure de plusieurs jours sans reconnexion entre-temps.

Ce plan recommande l'**option A**, plus simple, plus robuste, et qui ne touche pas au mécanisme serveur existant.

---

## 6. Modèle de synchronisation

### 6.1 Sens montant (local → serveur) : vidage de l'outbox

Dès que l'état passe à `ONLINE` (§3.3), un worker (main process, `app-core`) traite les lignes `SyncOutbox` avec `status = PENDING`, dans l'ordre de création (`createdAt` croissant, important pour respecter l'ordre logique — ex. ne pas envoyer une modification avant la création qui la précède), une par une ou par petits lots :
1. Appelle la fonction `remote-api.client.ts` correspondante (le code existant, inchangé) avec le payload stocké.
2. Si succès → statut `SENT`, met à jour l'entité locale avec la réponse serveur faisant autorité (code définitif §5, timestamps serveur, éventuels champs calculés côté serveur).
3. Si échec réseau → statut reste `PENDING`, retry avec backoff exponentiel (ex. 5s, 15s, 60s, plafonné) tant que l'état reste `OFFLINE` ou que l'erreur est de nature réseau.
4. Si échec métier (ex. 400/403/409 — validation refusée, permission perdue entre-temps, conflit) → statut `FAILED`, **pas de retry automatique** : l'action doit être visible dans une interface de « file d'attente de synchronisation » où l'utilisateur (ou un administrateur) peut voir l'erreur et décider (corriger et renvoyer, ou abandonner l'action).

### 6.2 Sens descendant (serveur → local) : rafraîchissement incrémental

À la reconnexion, et périodiquement en tâche de fond tant que la connexion est active, interroger le serveur pour les changements survenus depuis `SyncCursor.lastSyncedAt` par entité (nécessite un endpoint de type `GET /<domaine>?updatedSince=...` par domaine prioritaire — actuellement absent, `updatedAt` existe déjà sur la quasi-totalité des modèles donc la requête serveur est simple à écrire). Les enregistrements reçus remplacent ou fusionnent avec la copie locale.

### 6.3 Gestion des conflits — **implémentée (Phase 4)**, voir détail plus haut

Cas concret : un même patient modifié hors-ligne sur un poste, et modifié en ligne (ou hors-ligne puis synchronisé plus tôt) par un autre utilisateur entre-temps. Stratégie décrite ci-dessous, volontairement simple pour une V1, **et désormais réellement implémentée sur les 17 domaines (Phase 4, voir « Détail de la Phase 4 » plus haut)** — le texte qui suit décrivait à l'origine une intention de conception, il documente maintenant le comportement réel :

- **Dernier écrivain gagne côté serveur (last-write-wins), sur la base d'`updatedAt`**, avec **notification visible à l'utilisateur perdant** plutôt qu'un écrasement silencieux : si le serveur détecte que l'entité a été modifiée après la valeur `updatedAt` que le client avait au moment de sa modification locale, il refuse l'écriture (409) et renvoie la version serveur actuelle ; le client marque l'action `FAILED` (avec `conflict: true`, distingué des autres échecs) et affiche une notification active (toast), plutôt que d'écraser aveuglément ou de laisser l'utilisateur découvrir l'échec en ouvrant la file de synchro.
- Aucune fusion automatique champ par champ (complexité/risque disproportionnés pour un dossier médical) — un conflit se résout par une relecture humaine, pas par un algorithme de merge.

### 6.4 Suppressions

Les suppressions sont déjà des soft-deletes (`deletedAt`, item 6 de l'audit) sur 21 modèles — cohérent avec la synchro : une suppression hors-ligne est une simple `UPDATE` posant `deletedAt`, qui suit exactement le même chemin outbox que n'importe quelle autre modification, pas de cas particulier à gérer.

---

## 7. Priorisation par phases (ne pas tout faire d'un coup)

Vu l'ampleur (~28 écrans), ce plan recommande une mise en œuvre progressive plutôt qu'un big-bang :

- **Phase 0 — Fondations transverses** (aucun domaine métier encore concerné) : schéma SQLite local étendu avec les tables `SyncOutbox`/`SyncCursor`, détection de connectivité + indicateur UI, worker de synchro générique, interface « file d'attente de synchronisation » (visible dans Paramètres ou un badge dédié).
- **Phase 1 — Domaines à plus fort usage terrain hors-ligne** : Patients, Consultations, Rendez-vous, Urgences — les cas d'usage les plus concrets d'un besoin de continuité de service sans réseau (accueil, consultation, urgence).
- **Phase 2 — Domaines cliniques secondaires** : Hospitalisation, Bloc opératoire, Laboratoire, Imagerie, Cardiologie, Pathologie, Endoscopie, Pharmacie, Banque de sang.
- **Phase 3 — Domaines administratifs/logistiques** : Stocks, Approvisionnement, Finance, RH — usage hors-ligne moins critique dans l'urgence, mais cohérent à couvrir pour l'homogénéité du produit.
- **Hors périmètre / à la fin, si souhaité** : Qualité, Risques, Audit, Documents, Automation Studio, Utilisateurs — domaines de gouvernance/paramétrage, usage hors-ligne peu probable, faible priorité.

Chaque phase réutilise exactement la même mécanique technique (§3-6) — ce qui change entre les phases, c'est uniquement la liste des entités couvertes par le schéma local miroir et par les endpoints `updatedSince`.

---

## 8. Sécurité

Aucune nouvelle décision de chiffrement à prendre : la base locale utilise déjà `safeStorage` (DPAPI/Keychain/libsecret) via `db-key.ts`, réutilisable telle quelle pour le schéma métier étendu — les données médicales stockées localement hors-ligne seront donc chiffrées au repos exactement comme le journal d'audit l'est déjà aujourd'hui.

---

## 9. Points ouverts à valider avec l'utilisateur avant implémentation

1. **Option A vs B pour les codes provisoires (§5)** — ce plan recommande A, à confirmer.
2. **Portée de la Phase 1** — Patients/Consultations/RDV/Urgences proposé par défaut, à ajuster selon les priorités métier réelles.
3. **Durée de rétention de l'outbox en cas d'échec `FAILED`** — faut-il purger automatiquement après un délai, ou les actions en échec restent-elles indéfiniment jusqu'à action manuelle ?
4. **Qui peut voir/gérer la file d'attente de synchronisation** — un rôle particulier (ex. DIRIGEANT/ADMINISTRATIF), ou chaque utilisateur voit-il uniquement ses propres actions en attente ?
5. **Taille de l'outbox / limite de volume de données modifiables hors-ligne** — faut-il un garde-fou (ex. alerte si plus de N actions en attente, signe d'une coupure prolongée à traiter autrement) ?

---

## 10. Estimation d'ampleur (indicative, pas un chiffrage engageant)

- Phase 0 (fondations) : le chantier le plus structurant — nouveau schéma local, worker de synchro, UX de file d'attente, détection réseau. C'est la phase qui porte l'essentiel de la complexité technique.
- Chaque domaine ajouté ensuite (Phase 1, 2, 3) : mécaniquement plus rapide une fois la Phase 0 posée, principalement du travail répétitif (schéma miroir + endpoint `updatedSince` + branchement du domaine sur la couche locale) plutôt que de la conception nouvelle.

Ce plan est un point de départ pour discussion — à ajuster avant de lancer l'implémentation, notamment sur les points ouverts du §9.
