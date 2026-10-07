# Audit — Fonctionnalités manquantes (Pandora Health)

Document de suivi de l'état réel du projet, en complément de `Proposition-Architecture-Backend.md` et `Phase6-Intelligence-Pilotage.md`. Rédigé après audit du code (`HOSPITAL/app-core` + `HOSPITAL/app-server`) à la suite de la finalisation du CRUD Create/Read/Update sur les 28 écrans.

*Dernière mise à jour : 2026-09-14*

---

## Checklist actionnable — à traiter un par un

Cases à cocher pour suivre l'avancement. Détail de chaque item dans les sections plus bas.

### Sécurité (risque le plus immédiat)

- [x] 1. Implémenter le RBAC serveur — middleware générique `requireAccess(domain, level)` appliqué sur les 25 fichiers de routes métier, en s'appuyant sur la matrice de permissions (§2). Vérifié en conditions réelles (DIRIGEANT accès total, MEDECIN bloqué sur Finance/RH/Automation, lecture seule sur Pharmacie, écriture autorisée sur Risques).
- [x] 2. Ajouter le rate limiting sur `/auth/login` (et idéalement globalement) — `express-rate-limit`. Limiteur strict (10/15 min/IP) sur `/auth/login` + garde-fou général (600/15 min/IP) sur le reste de l'API, `/health` exempté. Vérifié en direct (429 dès la 11ᵉ tentative).
- [x] 3. Restreindre CORS à l'origine réelle de l'app plutôt que tout accepter. Liste blanche via `ALLOWED_ORIGINS` (`.env`), vide en prod par défaut. Sans effet sur l'app desktop réelle (le process principal d'Electron ne passe pas par CORS). Vérifié en direct (origine autorisée → header renvoyé, origine non listée → bloquée).
- [x] 4. Ajouter `helmet` pour les headers de sécurité (CSP, X-Frame-Options...). Config par défaut (API JSON pure, pas de HTML servi). Vérifié en direct (en-têtes présents, login toujours fonctionnel).
- [x] 5. Réduire la durée de vie du JWT (30 jours → plus court) + envisager un refresh token. **Décision (validée avec l'utilisateur) : conserver 30 jours**, volontairement calé sur le cache de session hors-ligne d'`app-core` (reconnexion sans réseau, besoin métier réel pour du personnel hospitalier) — le raccourcir aurait cassé cette reconnexion hors-ligne. À la place : révocation à la demande via `User.sessionVersion` (comparé au JWT à chaque requête) + vraie route serveur `POST /auth/logout` (avant, la déconnexion n'effaçait que le cache local — le jeton restait valide 30 jours même après "déconnexion"). Vérifié en direct (token révoqué immédiatement après logout, nouveau login fonctionne normalement).

### Fonctionnalités cœur manquantes

- [x] 6. CRUD Delete (ou soft-delete) sur les 20 domaines métier. **→ fait** (item 6) : suppression douce partout (décision validée avec l'utilisateur), via un champ `deletedAt DateTime?` ajouté sur 21 modèles Prisma (`Employee`/RH réutilise son `isActive` existant plutôt qu'un second champ redondant). Toutes les requêtes `list*` filtrent `deletedAt: null` ; les récupérations par id vérifient `!record.deletedAt` après coup. Backend : une route `DELETE /:id` par domaine (+ `/quality/certifications/:id` et `/quality/actions/:id`), gardée par `requireAccess(domaine, 'full')` — seul DIRIGEANT a `'full'` sur (quasi) tous les domaines, donc suppression réservée au dirigeant par construction de la matrice de permissions (§2). Chaque suppression est tracée dans l'audit trail (`logAudit`). Frontend (app-core) : fonctions `deleteX` dans `remote-api.client.ts`, wrapper `remove`/`delete*` dans chaque `main/services/*.service.ts`, handler IPC `<domaine>:delete`, méthode exposée dans `preload/index.ts`, et un bouton « Supprimer » (icône corbeille) avec confirmation (nouveau composant réutilisable `ConfirmDialog.tsx`) sur les 21 pages métier concernées. Vérifié en direct : suppression via API (curl) confirmée soft (le `deletedAt` est posé en base, la ligne disparaît des listes, un rôle non-DIRIGEANT reçoit 403), et vérification bout-en-bout dans l'app Electron réelle via Playwright (suppression d'un patient de test avec capture d'écran de la boîte de confirmation et de la liste mise à jour, puis restauration des données de démo).
- [x] 7. Construire le backend + UI de Paramètres/Utilisateurs (comptes, rôles, changement de mot de passe) — actuellement 100% mock. **→ fait** (item 7) : nouveau domaine RBAC `users` (§2), réservé au DIRIGEANT (`none` pour tous les autres rôles) — seule exception : le changement de son propre mot de passe, ouvert à tous les rôles authentifiés, posé hors matrice RBAC. Backend : `users.service.ts` + `users.routes.ts` (`GET/POST /users`, `PATCH /users/:id` pour rôle/nom/`isActive`, `POST /users/:id/reset-password` pour une réinitialisation admin, `POST /users/me/change-password` en self-service) ; garde-fou serveur contre l'auto-suspension (un DIRIGEANT ne peut pas se désactiver lui-même) ; un changement de mot de passe (reset admin ou self-service) incrémente `sessionVersion`, ce qui révoque immédiatement toutes les sessions actives de ce compte (cohérent avec le mécanisme de révocation de l'item 5). Pas de suppression de compte : `isActive` sert déjà de suspension/réactivation (pas de second mécanisme redondant avec le soft-delete de l'item 6). Frontend (app-core) : plomberie complète (`remote-api.client.ts` → `users.service.ts` → IPC `users:*` → `preload`), section « Utilisateurs & rôles » de Paramètres raccordée aux vraies données avec création de compte (`UserFormModal`), changement de rôle en direct, activation/suspension (confirmation via `ConfirmDialog`), réinitialisation de mot de passe par un admin (`ResetPasswordModal`) — section masquée avec message explicite pour les rôles non-DIRIGEANT, cohérent avec le blocage serveur. Section « Sécurité » raccordée avec un vrai changement de mot de passe (`ChangePasswordModal`), qui déconnecte automatiquement l'utilisateur après succès (son jeton vient d'être révoqué) et le ramène à l'écran de connexion. Les autres sous-sections de Paramètres (Établissement, Notifications, Modules activés, Sauvegardes, Apparence) restent volontairement mockées — hors du périmètre explicite de cet item ("comptes, rôles, changement de mot de passe"). Vérifié en direct : via API (curl) — création, changement de rôle, suspension avec blocage du login (401 "compte suspendu"), 403 pour un rôle non-DIRIGEANT, garde-fou anti-auto-suspension, self-service change-password avec vérification du mot de passe actuel et révocation de session ; et bout-en-bout dans l'app Electron réelle via Playwright (création d'un compte, changement de rôle, suspension avec confirmation, et changement de mot de passe avec redéconnexion + reconnexion réussie avec le nouveau mot de passe), puis restauration des données de démo.
- [x] 8. Raccorder les 7 sous-sections mockées du Dossier patient à de vraies données (consultations, RDV à venir, vitals, prescriptions, résultats, documents, timeline). **→ fait** (item 8), 6/7 sous-sections. **Décision (validée avec l'utilisateur)** : ajouter deux nouveaux modèles Prisma (`Vitals`, `Prescription`, rattachés au patient) plutôt que se limiter aux données déjà en base — seule `documents` reste mockée, explicitement en attente de l'item 11 (upload de fichiers réel, aucune donnée à raccorder tant qu'il n'y a nulle part où stocker un vrai fichier). Backend : nouvelle route agrégée `GET /patients/:id/dossier` (un seul aller-retour pour consultations, RDV à venir, vitaux, ordonnances, résultats, chronologie plutôt que 6 appels séparés), plus `POST /patients/:id/vitals`, `POST /patients/:id/prescriptions`, `PATCH /patients/:id/prescriptions/:prescriptionId` (arrêter/reprendre un traitement). Consultations et RDV à venir réutilisent les `toDisplay()` déjà existants des domaines Consultations/Rendez-vous (nouvelles fonctions `listConsultationsByPatient`/`listUpcomingAppointmentsByPatient`, pas de duplication de logique). Résultats agrège Laboratoire/Imagerie/Cardiologie/Anatomopathologie/Endoscopie pour ce patient (les 5 domaines ont chacun leur propre enum de statut, condensés en 3 états uniformes : Disponible/En attente/Annulé — pas de valeur clinique fabriquée, seulement le statut réel de la demande). Chronologie agrège consultations terminées, examens disponibles, urgences, hospitalisations et chirurgies, triés par date. Frontend (app-core) : plomberie complète jusqu'à `window.api.patients.{dossier,addVitals,addPrescription,updatePrescription}`, `PatientDetailPage.tsx` entièrement raccordé (le type `Patient` local ne porte plus que l'identité + documents, les 6 autres vues viennent du dossier agrégé), avec deux nouveaux modales (`AddVitalsModal`, `AddPrescriptionModal`) et un bouton arrêter/reprendre par ordonnance. Vérifié en direct : agrégation multi-domaines confirmée par API (curl) sur un vrai patient du seed, création de constantes/ordonnance, validation (400 sur constantes vides), calcul correct des jours restants ; et bout-en-bout dans l'app Electron réelle via Playwright (ouverture du dossier d'un patient réel, ajout de constantes et d'une ordonnance visibles immédiatement, arrêt d'un traitement, chronologie et résultats affichant de vraies données croisées de 5 domaines), données de test nettoyées après vérification.
- [x] 9. Câbler les boutons "Imprimer" sur au moins un flow réel (`pdfkit` déjà installé, inutilisé). **→ fait** (item 9) : premier flow réel, sur le Dossier patient (~15 autres boutons « Imprimer » ailleurs restent décoratifs, §6, hors périmètre de cet item qui ne demandait qu'un seul flow réel). Backend : `GET /patients/:id/print` génère un vrai PDF via `pdfkit` (identité, groupe sanguin, allergies, antécédents, dernières consultations, ordonnances actives, constantes récentes — réutilise `getPatientDossier` de l'item 8), renvoyé en base64 comme pour Rapports & Analyse (`ApiReportContent`). Frontend (app-core) : contrairement au « Enregistrer sous » de Rapports & Analyse (téléchargement), le clic sur « Imprimer » écrit le PDF dans le dossier temporaire de l'OS et l'ouvre directement avec `shell.openPath` — l'intention d'un bouton Imprimer est d'ouvrir le document tout de suite (prêt pour Ctrl+P dans la visionneuse), pas de choisir où le classer. Vérifié en direct : PDF valide généré par API (curl), contenu vérifié via `pdftotext` (en-tête `%PDF-1.3`, texte réel du patient, accents correctement encodés en UTF-8) ; et bout-en-bout dans l'app Electron réelle via Playwright (clic sur Imprimer → fichier PDF réellement écrit dans le dossier temp avec le contenu du vrai patient, horodaté au moment du clic), fichier de test supprimé après vérification.
- [x] 10. Câbler les boutons "Export Excel" (nécessite d'ajouter une lib type `exceljs`, ou fallback CSV comme pour Rapports & Analyse). **→ fait** (item 10). **Décision (validée avec l'utilisateur)** : un vrai `.xlsx` (nouvelle dépendance `exceljs`) sur les 13 écrans concernés, plutôt qu'un seul flow (comme l'item 9) ou un fallback CSV partout. Infrastructure partagée : `xlsx-export.ts` (app-server, construit un classeur à partir de colonnes + lignes), `file-types.ts` (`ApiFileDocument`, type partagé réutilisé aussi par l'impression de l'item 9), `file-export.ts` (app-core, `saveGeneratedDocument` — propose un « Enregistrer sous » natif, même logique que `reports.service.ts::download`). Chaque domaine expose `GET /<domaine>/export`, réutilise sa fonction `list*()` existante (aucune requête Prisma dupliquée), avec des en-têtes en français et des dates formatées côté serveur. Implémenté sur Laboratoire moi-même comme référence, puis 4 agents en parallèle (dont un par erreur dans un worktree Git isolé, fusionné après coup) ont répliqué le pattern sur les 12 domaines restants : Banque de sang, RH, Hospitalisation, Finance, Imagerie, Bloc opératoire, Anatomopathologie, Consultations, Urgences, Cardiologie, Stocks, Approvisionnement. Stocks exporte les articles de dépôt (pas les dépôts eux-mêmes) ; Approvisionnement exporte les demandes (pas les fournisseurs) ; Bloc opératoire exporte les interventions (pas les salles). Quelques boutons « Exporter »/« Export » génériques distincts du bouton « Export Excel » littéral (Banque de sang, RH, Finance, Consultations, Urgences) restent volontairement décoratifs — hors périmètre de l'item. Vérifié en direct : les 12 routes `/export` testées par API (curl) renvoient un `.xlsx` valide (en-tête ZIP `PK\x03\x04`, contenu vérifié via `unzip`/`sharedStrings.xml` — données réelles, accents correctement encodés) ; et bout-en-bout dans l'app Electron réelle via Playwright sur plusieurs domaines représentatifs (dont un issu du worktree fusionné), confirmant que le clic atteint bien la boîte de dialogue native `Enregistrer sous` d'Electron (bouton en état de chargement pendant l'attente, fermeture propre de l'app malgré la boîte de dialogue ouverte).
- [x] 11. Ajouter l'upload de fichiers réel pour Documents & Protocoles (`multer` déjà installé, inutilisé). **→ fait** (item 11). **Décision (validée avec l'utilisateur)** : fichier stocké en BLOB dans MySQL (colonne `content` sur `ProtocolDocument`, plus `fileName`/`mimeType`/`fileSize`) plutôt que sur le disque du serveur — l'hébergement cible étant Render, dont le disque local est effacé à chaque redéploiement, alors que la base MySQL est persistante. Backend : `POST /documents/:id/file` (multer, stockage mémoire, limite 20 Mo) écrit le fichier en base ; `GET /documents/:id/file` le renvoie encodé en base64 (même format que l'impression/export des items 9-10, réutilise `ApiFileDocument`). Frontend (app-core) : sélection de fichier via une boîte de dialogue native (`dialog.showOpenDialog`, pas d'`<input type=file>` côté renderer — cohérent avec le sandboxing du renderer et le pattern déjà utilisé pour l'export), upload en `multipart/form-data` (`FormData`/`Blob` natifs de Node, aucune dépendance ajoutée côté client), et visualisation via `shell.openPath` sur un fichier temporaire (même logique que l'impression du dossier patient, item 9). Bouton « Voir » (déjà présent mais décoratif) activé seulement si un fichier existe ; nouveau bouton « Téléverser »/« Remplacer » par ligne. **Point important non résolu par cet item** : `ProtocolDocument` n'a pas de lien vers un patient (`patientId`) — c'est une bibliothèque de protocoles/documents institutionnels, pas des documents propres à un dossier patient. La sous-section « Documents » du Dossier patient (item 8) reste donc mockée : ce n'est pas seulement l'absence d'upload qui la bloquait, mais l'absence d'un modèle de document *rattaché à un patient* — un chantier distinct si souhaité plus tard. Vérifié en direct : upload/téléchargement testés par API (curl, contenu ré-encodé en UTF-8 vérifié caractère pour caractère, y compris les accents), RBAC vérifié (MEDECIN bloqué en écriture avec 403, lecture autorisée) ; et bout-en-bout dans l'app Electron réelle via Playwright (la boîte de dialogue native a été interceptée via `app.evaluate` pour retourner un vrai fichier de test sans bloquer l'automatisation — upload réel envoyé au serveur, bouton mis à jour avec le nom du fichier, fichier revisualisé identique à l'original), données de test nettoyées après vérification.

### Modules à concevoir (schéma Prisma + UI)

- [x] 12. RH — onglets Présences & Absences, Contrats, Performances, Formations, Paie, Documents (6/8 manquants). **→ fait** (item 12). **Décision (validée avec l'utilisateur)** : CRUD complet sur les 24 onglets « à spécifier » des items 12-16 (pas juste liste+création), même niveau de finition que les modules déjà faits. Backend : 6 nouveaux modèles Prisma (`EmployeeAttendance`, `EmployeeContract`, `EmployeePerformanceReview`, `EmployeeTraining`, `PayrollEntry`, `EmployeeDocument`), chacun un historique propre à un employé, distinct des champs agrégés déjà présents sur `Employee` (`presentDays`, `contractType`...) qui restent l'instantané affiché sur l'onglet Vue d'ensemble. `netPay` (Paie) n'est pas stocké — calculé à l'affichage (`baseSalary + bonuses - deductions`) pour ne jamais désynchroniser un total de ses composants. Documents employé réutilise le mécanisme BLOB de l'item 11 (upload via `multer`, stockage MySQL, visualisation via `shell.openPath`). Toutes les routes sont sous `/hr/*` (`/hr/attendance`, `/hr/contracts`, `/hr/performance-reviews`, `/hr/trainings`, `/hr/payroll`, `/hr/documents`), gardées par la même matrice RBAC que les employés RH. Frontend (app-core) : chaque onglet est un composant séparé (`features/hr/tabs/*Tab.tsx` + `*FormModal.tsx`) plutôt qu'un seul fichier géant, remplaçant le placeholder « à spécifier » dans `HrPage.tsx`. Vérifié en direct : les 6 sous-ressources testées par API (création réussie sur chacune, calcul correct du salaire net, upload/téléchargement d'un document avec contenu vérifié caractère pour caractère), RBAC vérifié (403 pour un rôle sans accès RH) ; et bout-en-bout dans l'app Electron réelle via Playwright (contrat, formation et fiche de paie créés et visibles immédiatement, document téléversé avec le nom de fichier reflété dans l'UI), données de test nettoyées après vérification.
- [x] 13. Approvisionnement — onglets Demandes d'achat, Commandes, Réceptions (3/5 manquants). **→ fait** (item 13), même niveau CRUD complet que l'item 12. **Décision d'implémentation** : « Demandes d'achat » ne réutilise pas de nouveau modèle — c'est un filtre côté client (`requests.filter(r => r.status !== 'À valider')`) sur les mêmes `ProcurementRequest` déjà chargés pour l'onglet « Besoins exprimés » (un besoin devient une demande d'achat une fois son statut passé au-delà de « À valider »), avec le même gestionnaire d'édition que l'onglet existant — pas de duplication de modèle pour une distinction qui n'est qu'un statut. Seuls « Commandes » et « Réceptions » sont de vraies nouvelles capacités : deux nouveaux modèles Prisma (`PurchaseOrder`, `GoodsReception`), tous deux rattachés en option à une `ProcurementRequest` et/ou un `Supplier`. `totalAmount` (Commandes) n'est pas stocké — calculé à l'affichage (`unitPrice * quantity`), même logique que `netPay` de l'item 12. Effet de bord utile : la création d'une réception à l'état « Conforme » fait automatiquement passer la commande liée au statut « Livrée » (évite une double saisie manuelle pour le cas courant), vérifié bout-en-bout. Backend : `procurement-orders.service.ts` et `procurement-receptions.service.ts`, routes `/procurement/orders` et `/procurement/receptions` (+ `/:id`), sous la même garde `requireAccess('procurement', ...)` déjà en place au niveau du routeur — aucun nouveau domaine RBAC nécessaire. Frontend (app-core) : `features/procurement/tabs/OrdersTab.tsx` + `OrderFormModal.tsx`, `ReceptionsTab.tsx` + `ReceptionFormModal.tsx`, même architecture par composant que l'item 12, remplaçant le placeholder « à spécifier » de `ProcurementPage.tsx`. Vérifié en direct : commande et réception créées par API (curl), total calculé correct (75 000 FCFA), passage automatique au statut « Livrée » confirmé par un second appel, RBAC vérifié (403 pour MEDECIN) ; et bout-en-bout dans l'app Electron réelle via Playwright (commande créée et visible avec son total à 20 000 FCFA, réception créée et visible, retour sur l'onglet Commandes confirmant le passage automatique au statut « Livrée »), données de test nettoyées après vérification.
- [x] 14. Finance — onglets Factures fournisseurs, Paiements reçus, Dépenses par service, Budgets, Comptes bancaires (5/6 manquants). **→ fait** (item 14), même niveau CRUD complet que les items 12-13. **Décisions d'implémentation** : `SupplierInvoice` réutilise `Supplier` (déjà utilisé par Approvisionnement, sélection dans un menu déroulant alimenté par `window.api.procurement.suppliers()`, pas de duplication de tiers fournisseur) et réutilise l'enum `TransactionStatus` déjà en place (PAYE/EN_ATTENTE/EN_RETARD) plutôt qu'un second enum redondant. `service` reste un champ texte libre sur `ServiceExpense`/`Budget` (comme partout ailleurs dans le schéma — `Employee.department`, `Patient.service`... — aucune table `Department` structurée n'existe dans ce projet, pas de raison d'en introduire une seule pour cet item). `Budget.consumedAmount`/`remainingAmount` ne sont pas stockés — calculés à l'affichage en sommant les `ServiceExpense` du même service sur la même année (`spentAt`), même logique que `PurchaseOrder.totalAmount` (item 13) : un budget affiche donc automatiquement sa consommation réelle sans double-saisie. `BankAccount.balance` reste, à l'inverse, un champ stocké mis à jour manuellement (comme les champs agrégés d'`Employee`, item 12) — volontairement pas de FK depuis `FinanceTransaction` (déjà fonctionnelle en production, `paymentMode` en texte libre) pour ne pas risquer une migration sur un modèle existant pour ce chantier ; un rapprochement bancaire structuré resterait un chantier séparé si souhaité. Backend : 5 nouveaux modèles Prisma (`SupplierInvoice`, `PaymentReceived`, `ServiceExpense`, `Budget`, `BankAccount`), un service dédié par sous-domaine, routes sous `/finance/*` (`/finance/supplier-invoices`, `/finance/payments`, `/finance/service-expenses`, `/finance/budgets`, `/finance/bank-accounts`), toutes sous la garde `requireAccess('finance', ...)` déjà en place au niveau du routeur — aucun nouveau domaine RBAC nécessaire. Frontend (app-core) : chaque onglet est un composant séparé (`features/finance/tabs/*Tab.tsx` + `*FormModal.tsx`), remplaçant le placeholder « à spécifier » dans `FinancePage.tsx` ; l'onglet Budgets affiche une barre de progression alloué/consommé. Vérifié en direct : les 5 sous-ressources testées par API (création réussie sur chacune, calcul correct du montant consommé d'un budget à partir d'une dépense liée), RBAC vérifié (403 pour MEDECIN, y compris en lecture puisque `finance` est `none` pour ce rôle) ; et bout-en-bout dans l'app Electron réelle via Playwright (facture, paiement, dépense, budget et compte bancaire créés et visibles sur leurs onglets respectifs, montant consommé du budget reflétant bien la dépense créée juste avant dans un autre onglet), données de test nettoyées après vérification.
- [x] 15. Banque de sang — onglets Dons, Demandes transfusionnelles, Transfusions, Analyses, Périmées/Retirées (5/6 manquants). **→ fait** (item 15), même niveau CRUD complet que les items 12-14. **Décisions d'implémentation** : « Périmées / Retirées » ne réutilise pas de nouveau modèle — c'est un filtre côté client sur `BloodPouch.status` (`PERIMEE` ou le nouveau statut `ECARTEE`, voir plus bas), même principe que « Demandes d'achat » à l'item 13. Les 4 autres onglets sont de vraies nouvelles capacités avec effets de bord métier reliés à `BloodPouch` (même esprit que réception → commande de l'item 13) : une analyse au résultat « Positif » écarte automatiquement la poche liée (nouveau statut `ECARTEE` ajouté à l'enum `BloodPouchStatus`) ; une analyse « Négatif » sur une poche encore en attente d'analyse la rend disponible ; une transfusion marque la poche liée « Transfusée » et, si elle répond à une demande, passe celle-ci au statut « Honorée ». Backend : 4 nouveaux modèles Prisma (`BloodDonation`, `TransfusionRequest`, `Transfusion`, `BloodAnalysis`), chacun avec son service dédié, routes sous `/blood-bank/*` (`/donations`, `/transfusion-requests`, `/transfusions`, `/analyses`), sous la garde `requireAccess('blood-bank', ...)` déjà en place — aucun nouveau domaine RBAC. Frontend (app-core) : composant séparé par onglet (`features/blood-bank/tabs/*Tab.tsx` + `*FormModal.tsx`), remplaçant le placeholder « à spécifier » ; l'onglet « Périmées / Retirées » reste un bloc inline dans `BloodBankPage.tsx` (comme pour l'item 13) réutilisant l'éditeur de poche existant. Vérifié en direct : les 4 sous-ressources testées par API (don lié à une poche, analyse négative faisant passer une poche « En attente d'analyse » à « Disponible », analyse positive l'écartant, transfusion marquant une poche « Transfusée » et honorant sa demande liée), RBAC vérifié (403 pour MEDECIN en écriture, lecture autorisée) ; et bout-en-bout dans l'app Electron réelle via Playwright (don, demande, analyse créés et visibles sur leurs onglets), données de test nettoyées après vérification. Un oubli d'affichage repéré et corrigé pendant la vérification Playwright : la colonne « Demandeur » manquait dans le tableau des demandes transfusionnelles (donnée bien enregistrée côté serveur, juste non affichée) — ajoutée.
- [x] 16. Stocks — onglets Mouvements, Transferts, Inventaires, Pertes/Retour, Analyse (5/6 manquants). **→ fait** (item 16), même niveau CRUD complet. **Décisions d'implémentation** : « Analyse » reste un onglet 100% lecture (agrégations sur mouvements/pertes déjà enregistrés + état courant des articles), sans modèle dédié. Les 4 autres onglets ont chacun un effet de bord direct sur `DepotItem.available`, pour que le stock affiché reste toujours la somme réelle des opérations plutôt qu'un nombre saisi à la main en parallèle : un mouvement l'incrémente/décrémente (entrée/sortie) ; un transfert débite l'article source et crédite (ou crée à la volée) l'article de même nom dans le dépôt de destination ; un comptage d'inventaire fige `expectedQuantity` en snapshot et, en cas d'écart, corrige `available` sur la quantité réellement comptée (le physique fait foi) ; une perte le décrémente, un retour le recrédite. Par cohérence, les mouvements/transferts/pertes ne permettent plus de modifier après coup l'article/le type/la quantité une fois créés (seuls les champs descriptifs restent éditables) — rejouer un delta déjà appliqué au stock aurait risqué de le désynchroniser. Backend : 4 nouveaux modèles Prisma (`StockMovement`, `StockTransfer`, `InventoryCount`, `StockLoss`) + un service d'agrégation en lecture seule pour l'Analyse, routes sous `/stocks/*` (`/movements`, `/transfers`, `/inventory-counts`, `/losses`, `/analysis`), sous la garde `requireAccess('stocks', ...)` déjà en place. Frontend (app-core) : composant séparé par onglet dans `features/stocks/tabs/`, remplaçant le placeholder « à spécifier » dans `StocksPage.tsx`. Vérifié en direct : les 4 sous-ressources testées par API avec vérification arithmétique de chaque effet de bord sur `available` (entrée/sortie, transfert créant l'article de destination, correction post-comptage, perte/retour), agrégation de l'onglet Analyse contrôlée, RBAC vérifié (403 pour MEDECIN) ; et bout-en-bout dans l'app Electron réelle via Playwright (mouvement et perte créés et visibles, onglet Analyse affichant les totaux), données de test nettoyées et stock restauré à sa valeur d'origine après vérification.

### Qualité et robustesse

- [ ] 17. Ajouter des tests (au minimum intégration backend + e2e de fumée sur les parcours critiques)
- [ ] 18. Factoriser la validation d'entrée avec `zod` (remplace la validation manuelle dupliquée route par route)
- [ ] 19. Ajouter un logging structuré (`pino` ou `winston`)
- [ ] 20. Mettre en place un pipeline CI (lint + typecheck + build)
- [ ] 21. Mettre en place un vrai mécanisme de sauvegarde/restauration DB
- [ ] 22. Mettre à jour `app-core/README.md` (décrit encore l'état pré-Phase 6)

### Transverse

- [ ] 23. Câbler la recherche globale du header (actuellement décorative)
- [ ] 24. Évaluer le besoin de notifications temps réel (websockets) pour Automation Studio

---

## 1. Résumé — priorisation

| Thème | Statut |
|---|---|
| CRUD Delete | ❌ Absent — 0/28 écrans, aucune couche (DB → IPC → UI) |
| Tests | ❌ Absent — 0 test dans tout le dépôt |
| CI/CD | ❌ Absent — aucun pipeline, aucun Docker |
| RBAC serveur | ✅ Implémenté et vérifié (item 1) |
| Rate limiting | ✅ Implémenté et vérifié (item 2) |
| Helmet | ✅ Implémenté (item 4) |
| Validation d'entrée structurée | ❌ Absente |
| Upload de fichiers réels | ✅ Implémenté et vérifié pour Documents & Protocoles (item 11, BLOB MySQL) |
| PDF / Impression | ✅ Un flow réel (Dossier patient, item 9) ; ~14 autres boutons restent décoratifs |
| Export Excel | ✅ Implémenté et vérifié sur 13 écrans, vrai `.xlsx` (item 10) |
| Paramètres / Utilisateurs | ✅ Comptes/rôles/mot de passe implémentés et vérifiés (item 7) ; le reste (Établissement, Notifications...) reste mock |
| Dossier patient | ✅ 6/7 sous-sections réelles (item 8) ; Documents reste mocké (attend l'item 11) |
| 5 modules avec onglets « à spécifier » | ⚠️ RH, Approvisionnement, Finance, Banque de sang, Stocks |
| Migrations DB | ✅ Correctement versionnées |
| Sauvegarde / restauration DB | ❌ Absente (bouton décoratif) |
| README `app-core` | ⚠️ Obsolète |

---

## 2. Rôles & permissions — proposition de matrice RBAC

**⚠️ Proposition à valider** — rien de ceci n'existe dans le code aujourd'hui. Le schéma Prisma définit 6 rôles (`app-server/prisma/schema.prisma`, `enum Role`) mais aucune restriction d'accès n'est appliquée ni côté serveur (le middleware `requireDirigeant` existe mais n'est utilisé nulle part), ni côté UI (le rôle n'est affiché qu'à titre décoratif dans l'en-tête). La matrice ci-dessous est une base de travail cohérente avec le fonctionnement réel d'un hôpital, à ajuster selon vos besoins avant implémentation de l'item 1.

**Légende** : — Aucun accès · **L** Lecture seule · **RW** Lecture + écriture (create/update) · **RWD** Total (+ suppression)

### Les 6 rôles

| Rôle | Profil type | Portée générale |
|---|---|---|
| **DIRIGEANT** | Directeur d'établissement, administrateur général | Accès total à tout le système — pilotage stratégique, finances, RH, gouvernance, gestion des utilisateurs |
| **MEDECIN** | Médecin, praticien | Accès clinique complet (patients, consultations, examens, actes) ; pas d'accès administratif/financier |
| **INFIRMIER** | Infirmier(ère) | Soins courants, suivi patients, triage urgences ; lecture des examens, pas de prescription |
| **TECHNICIEN** | Technicien de plateau technique (labo, imagerie, etc.) | Gestion des demandes/résultats d'examens sur son plateau ; accès patient minimal |
| **PHARMACIEN** | Pharmacien hospitalier | Gestion complète de la pharmacie et de ses stocks ; lecture dossier patient (allergies, traitements) |
| **ADMINISTRATIF** | Secrétariat, comptabilité, RH, achats | Gestion administrative, financière, RH, approvisionnement, conformité ; pas d'accès clinique |

### Matrice détaillée par module

| Module | DIRIGEANT | MEDECIN | INFIRMIER | TECHNICIEN | PHARMACIEN | ADMINISTRATIF |
|---|---|---|---|---|---|---|
| Tableau de bord | RWD | L | L | L | L | L |
| Patients | RWD | RW | RW | L | L | RW |
| Rendez-vous | RWD | RW | L | — | — | RW |
| Consultations | RWD | RW | L | — | L | L |
| Hospitalisation | RWD | RW | RW | — | — | L |
| Urgences | RWD | RW | RW | — | — | — |
| Bloc opératoire | RWD | RW | L | — | — | — |
| Laboratoire | RWD | RW | RW | RW | — | — |
| Imagerie médicale | RWD | RW | L | RW | — | — |
| Cardiologie | RWD | RW | L | RW | — | — |
| Anatomopathologie | RWD | RW | L | RW | — | — |
| Endoscopie | RWD | RW | L | RW | — | — |
| Pharmacie | RWD | L | L | — | RWD | — |
| Stocks & Dépôts | RWD | — | — | L | RW | L |
| Banque de sang | RWD | L | L | RW | — | — |
| Finances | RWD | — | — | — | — | RW |
| Approvisionnement | RWD | — | — | — | RW | RW |
| Ressources Humaines | RWD | — | — | — | — | RW |
| Paramètres (Utilisateurs) | RWD | — | — | — | — | L |
| Qualité & Accréditation | RWD | L | L | L | L | RW |
| Gestion des risques | RWD | RW | RW | RW | RW | RW |
| Audit & Conformité | RWD | L | — | — | — | RW |
| Documents & Protocoles | RWD | L | L | L | L | RW |
| IA & Prédictions | RWD | L | — | — | — | L |
| Rapports & Analyse | RWD | L | — | — | — | RW |
| Automation Studio | RWD | — | — | — | — | L |

**Notes de conception** :
- "Gestion des risques" est ouvert en écriture à tous les rôles de terrain (médecin, infirmier, technicien, pharmacien) : n'importe qui doit pouvoir déclarer un incident/risque qu'il constate — c'est une caractéristique voulue, pas un oubli de restriction.
- Le rôle TECHNICIEN est unique et générique dans le schéma actuel (pas de distinction technicien labo / imagerie / cardio) : il a donc accès en écriture à l'ensemble du plateau technique plutôt qu'à un seul module. À affiner si vous voulez des sous-rôles plus tard.
- ADMINISTRATIF a un accès L (lecture seule) sur Paramètres (Utilisateurs), pas RW : seul DIRIGEANT peut créer un compte, changer un rôle, suspendre ou réinitialiser un mot de passe ; un administratif peut seulement consulter la liste. Implémenté et vérifié (item 7).

### Implémentation technique réalisée (item 1 — fait)

1. Matrice ci-dessus encodée dans `app-server/src/config/permissions.ts` (`DOMAIN_PERMISSIONS`, niveaux `none`/`read`/`write`/`full`), un seul fichier source de vérité plutôt que dispersée dans 25 fichiers de routes.
2. Middleware générique `requireAccess(domain, minLevel)` dans `app-server/src/middleware/auth.middleware.ts`, qui remplace `requireDirigeant` (supprimé, mort).
3. Appliqué sur les 25 routers métier : `router.use(requireAccess(domain, 'read'))` en tête de fichier (bloque même les GET pour les rôles à `'none'`), puis `requireAccess(domain, 'write')` en plus sur chaque route POST/PATCH.
4. Vérifié en conditions réelles via `curl` (DIRIGEANT accès total, MEDECIN bloqué 403 sur Finance/RH/Automation, lecture seule sur Pharmacie — 200 en GET, 403 en POST —, écriture autorisée sur Risques).

**Reste à faire (hors item 1, pour plus tard)** : côté UI (`app-core`), utiliser `session.user.role` (déjà disponible, actuellement juste affiché) pour masquer les boutons d'action non autorisés et les entrées de navigation vers des modules à accès nul — actuellement un rôle restreint verrait toujours les boutons mais recevrait une erreur 403 au clic.

---

## 3. CRUD Delete — fait (item 6)

**Décision (validée avec l'utilisateur)** : suppression douce (soft delete) partout, plutôt que suppression dure ou une approche mixte — cohérent avec les enjeux de traçabilité/conformité sur des dossiers médicaux et financiers.

**Ce qui a été fait** :
- Un champ `deletedAt DateTime?` ajouté sur 21 modèles Prisma (Patient, Appointment, Consultation, Hospitalization, EmergencyVisit, Surgery, LabRequest, ImagingRequest, CardioExam, PathologyRequest, EndoscopyProcedure, Medication, DepotItem, ProcurementRequest, BloodPouch, FinanceTransaction, QualityIndicator, QualityCertification, QualityAction, Risk, Audit, ProtocolDocument). `Employee`/RH réutilise son champ `isActive` existant plutôt qu'un second champ redondant.
- Toutes les requêtes `list*` filtrent `deletedAt: null` ; les récupérations par id vérifient `!record.deletedAt` après coup (Prisma ne permet pas de combiner un filtre arbitraire avec un `where` sur clé unique dans `findUnique`).
- Une route `DELETE /:id` par domaine (+ `/quality/certifications/:id` et `/quality/actions/:id`), gardée par `requireAccess(domaine, 'full')` — seul DIRIGEANT a `'full'` sur (quasi) tous les modules, donc suppression réservée de fait au dirigeant, conformément à la matrice RBAC (§2).
- Chaque suppression est tracée dans le journal d'audit (`logAudit`, action `x.delete`).
- Côté `app-core` : `deleteX` dans `remote-api.client.ts`, wrapper `remove`/`delete*` dans chaque `main/services/*.service.ts`, handler IPC `<domaine>:delete`, méthode exposée dans `preload/index.ts`, et un bouton « Supprimer » avec confirmation (nouveau composant `ConfirmDialog.tsx`) sur les 21 pages métier.

Concerne les 20 domaines métier prévus initialement : patients, rendez-vous, consultations, hospitalisations, urgences, bloc opératoire, laboratoire, imagerie, cardiologie, pathologie, endoscopie, pharmacie, stocks, banque de sang, finance, approvisionnement, RH, qualité, risques, audit, documents.

---

## 4. Tests — absence totale

- Aucun fichier `*.test.ts(x)` / `*.spec.ts(x)` dans tout le dépôt.
- Aucune config Jest/Vitest/Playwright.
- Aucun script `test` ni dépendance de test dans les deux `package.json`.

**À faire** : au minimum, des tests d'intégration backend sur les services critiques (auth, calculs financiers, audit trail) et un test e2e de fumée sur les parcours de création/modification.

---

## 5. Sécurité et robustesse backend

**Ce qui existe** : `requireAuth` sur toutes les routes, hashage bcrypt des mots de passe, middleware d'erreurs centralisé, `express-async-errors`, journal d'audit métier (`AuditLog`), `.env.example` documenté.

**Ce qui manque** :
- ~~Rate limiting absent~~ **→ fait** (item 2) : `express-rate-limit`, config dans `app-server/src/config/rate-limit.ts`.
- **Validation d'entrée** manuelle et ad hoc (pas de `zod`/`joi`), dupliquée route par route plutôt que factorisée.
- **Logging structuré** absent — uniquement `console.log`/`console.error`, pas de niveaux, pas de rotation, pas de corrélation par requête.
- ~~CORS ouvert sans restriction~~ **→ fait** (item 3) : liste blanche `ALLOWED_ORIGINS`.
- ~~Headers de sécurité absents~~ **→ fait** (item 4) : `helmet` avec sa config par défaut.
- **CSRF** non traité explicitement (risque atténué par l'usage de Bearer token, mais non documenté).
- ~~RBAC serveur non appliqué~~ **→ fait** (item 1) : `requireAccess(domain, level)` remplace `requireDirigeant` (supprimé, mort) et est posé sur les 25 routers métier, avec la matrice §2 comme source de vérité dans `app-server/src/config/permissions.ts`.
- ~~Session longue sans révocation~~ **→ fait** (item 5) : JWT gardé à 30 jours (choix assumé, cohérent avec la reconnexion hors-ligne d'app-core), mais révocable à la demande via `sessionVersion` + vraie route `/auth/logout`.

---

## 6. Fonctionnalités transverses décoratives (boutons sans action)

- **Impression** : `pdfkit` désormais utilisé pour un premier flow réel — le bouton « Imprimer » du Dossier patient génère un vrai PDF (item 9, voir checklist). Les ~14 autres boutons « Imprimer » (Laboratoire, Imagerie, Cardiologie, Pathologie, Endoscopie, Urgences, Hospitalisation, Bloc opératoire, Finance, Stocks, Approvisionnement, RH...) restent décoratifs, sans `onClick` — l'item ne demandait qu'un seul flow réel.
- **Export Excel** : désormais réel sur les 13 écrans concernés (item 10 — Banque de sang, RH, Hospitalisation, Laboratoire, Finance, Imagerie, Bloc opératoire, Pathologie, Consultations, Urgences, Cardiologie, Stocks, Approvisionnement), vrai `.xlsx` via `exceljs`, même logique de boîte « Enregistrer sous » native que « Rapports & Analyse » (CSV). Quelques boutons « Exporter »/« Export » génériques distincts du bouton « Export Excel » littéral (ex. Banque de sang, RH, Finance) restent décoratifs — hors périmètre de l'item.
- **Upload de fichiers réels** : fait (item 11) — `ProtocolDocument` stocke désormais le fichier en BLOB (`content`, `fileName`, `mimeType`, `fileSize`), avec un vrai composant d'upload (boîte de dialogue native) et une visualisation via la visionneuse par défaut de l'OS.
- **Notifications temps réel** : aucune dépendance websocket (`socket.io`/`ws`) ; Automation Studio écrit dans un journal mais rien ne pousse d'alerte en direct vers l'UI.
- **Recherche globale** : la barre de recherche du header (« Rechercher un patient, dossier, acte, médicament... ») n'a ni état ni `onChange` — décorative.

---

## 7. Écran Paramètres / Utilisateurs — fait (item 7), partiellement

Les sous-sections « Utilisateurs & rôles » et « Sécurité → Changer le mot de passe » de `SettingsPage.tsx` sont désormais raccordées à `window.api` (voir résumé dans la checklist en tête de document). Les autres sous-sections (Établissement, Notifications, Modules activés, Sauvegardes, Apparence) restent mockées — hors périmètre explicite de cet item, non couvertes par un autre item du plan actuel.

**Ce qui a été fait** :
- Backend : domaine RBAC `users` (§2), `users.service.ts` + `users.routes.ts` — CRUD compte (sans delete, `isActive` sert de suspension), reset de mot de passe par un DIRIGEANT, changement de son propre mot de passe en self-service (hors matrice RBAC, ouvert à tous les rôles).
- Un changement de mot de passe (reset admin ou self-service) incrémente `sessionVersion` — révoque immédiatement toutes les sessions actives de ce compte, cohérent avec le mécanisme de révocation de l'item 5.
- Garde-fou serveur : un DIRIGEANT ne peut pas suspendre son propre compte.
- Frontend : `UserFormModal` (création), changement de rôle en direct, suspension/réactivation (confirmation via `ConfirmDialog`), `ResetPasswordModal` (admin), `ChangePasswordModal` (self-service, avec déconnexion + retour à l'écran de connexion après succès).
- ADMINISTRATIF a un accès lecture seule à la liste des comptes (§2) ; les autres rôles n'y voient rien.

**Ce qui n'a pas été fait** (hors périmètre de cet item) : Établissement, Notifications, Modules activés, Sauvegardes, Apparence restent des maquettes sans persistance.

---

## 8. Dossier patient — fait (item 8), 6/7 sous-sections

Dans `PatientDetailPage.tsx`, l'identité et les champs principaux étaient déjà réels (API) ; les 7 sous-sections restaient sur `mock-data.ts`. 6 sont maintenant raccordées à `GET /patients/:id/dossier` (voir résumé dans la checklist en tête de document) :

- Consultations récentes — réutilise `consultations.service.ts`
- Rendez-vous à venir — réutilise `appointments.service.ts`
- Constantes vitales — nouveau modèle `Vitals`, création via l'UI
- Ordonnances/prescriptions — nouveau modèle `Prescription`, création + arrêt/reprise via l'UI
- Résultats d'examens — agrégé depuis Laboratoire/Imagerie/Cardiologie/Anatomopathologie/Endoscopie
- Frise chronologique (timeline) — agrégée depuis consultations/examens/urgences/hospitalisations/chirurgies

**Reste mockée** : Documents patient. **Mise à jour après l'item 11** : l'upload de fichiers est désormais réel, mais uniquement sur `ProtocolDocument` (bibliothèque de protocoles institutionnels, sans `patientId`) — il ne débloque donc pas cette sous-section, contrairement à ce qui était anticipé plus haut. Un vrai modèle de « document rattaché à un patient » reste à faire si cette sous-section doit devenir réelle. Le type `Patient` local ne garde que `documents` comme champ encore mocké ; les 6 autres viennent de `ApiPatientDossier` (shared/patient-types.ts).

---

## 9. Modules avec onglets « à spécifier »

Texte placeholder honnête (`Module « ... » à spécifier.`), cohérent avec l'absence des modèles Prisma correspondants — pas un oubli de câblage, un vrai chantier de conception à faire. **Les 5 modules sont désormais tous faits** (RH item 12, Approvisionnement item 13, Finance item 14, Banque de sang item 15, Stocks item 16) :

| Écran | Onglets fonctionnels | Onglets placeholder |
|---|---|---|
| RH | ✅ 8/8 (item 12) | — |
| Approvisionnement | ✅ 5/5 (item 13) | — |
| Finance | ✅ 6/6 (item 14) | — |
| Banque de sang | ✅ 6/6 (item 15) | — |
| Stocks | ✅ 6/6 (item 16) | — |

---

## 10. CI/CD et déploiement — absence quasi totale

- Aucun pipeline CI (`.github/workflows` ou équivalent).
- Aucun `Dockerfile`, aucun `docker-compose.yml`.
- Build de production existe côté `app-core` (electron-builder, packaging desktop Win/Mac/Linux) mais côté `app-server` seulement `tsc` + `npm start` — pas de conteneurisation, pas de script de déploiement serveur.
- Aucune documentation de déploiement structurée (juste des commentaires épars dans `.env.example`).

---

## 11. Base de données

**Positif** : 18 migrations Prisma proprement versionnées et nommées, `seed.ts` cohérent avec le schéma actuel.

**Manque** : aucun mécanisme de sauvegarde/restauration réel — le bouton « Sauvegardes » dans Paramètres est décoratif et affiche une date codée en dur. Aucun script de dump/restore, aucune tâche planifiée.

---

## 12. Dette technique diverse

- **`app-core/README.md` obsolète** : décrit encore un état « frontend seul, mock-data uniquement » et cite les rôles `DIRIGEANT/EMPLOYE` remplacés depuis par les 6 rôles actuels.
- **Incohérence de casse de nommage** : au-delà de `HrPage.tsx` (déjà corrigé), la convention de casse des acronymes dans les noms de fichiers (`Hr` vs `HR` vs `AI`) n'est pas appliquée uniformément — pas bloquant, à harmoniser à l'occasion.

---

## Ce qui n'a PAS besoin d'être refait (déjà en place, vérifié)

- CRUD Create/Read/Update sur les 28 écrans, avec plomberie complète (backend → IPC → preload → UI).
- Assistant IA à 28 outils (`ai-assistant.service.ts`), au-delà du scope initial prévu.
- Automation Studio avec vrai scheduler (`setInterval`, 15 min).
- Export CSV réel + téléchargement natif sur Rapports & Analyse.
- Authentification JWT + bcrypt + audit trail métier.
- 18 migrations Prisma versionnées proprement.
