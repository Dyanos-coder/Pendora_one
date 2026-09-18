# Pandora Health — Proposition d'architecture backend

*Suite de [Architecture-App-PC-Multitenant.md](../Architecture-App-PC-Multitenant.md) — ce document couvre spécifiquement le backend du module Santé (`HOSPITAL/app-server` + `HOSPITAL/app-core`), une fois les 28 écrans du frontend construits sur données mock.*

## 1. État des lieux

### Ce qui existe déjà côté backend (`HOSPITAL/app-server`)

- **Schéma Prisma (MySQL)** : `Company` (une seule ligne, l'établissement), `User` (comptes de connexion, rôle `DIRIGEANT`/`EMPLOYE`), `AuditLog` (journal append-only).
- **Routes** : `/health`, `/auth/login`.
- **Flux d'auth** : `app-core` (renderer) → IPC → `main/services/auth.service.ts` → `remote-api.client.ts` (fetch HTTP) → `app-server` → Prisma → MySQL. Le token JWT ne quitte jamais le process `main` (voir `session.store.ts`).
- Tout le reste (Patients, Rendez-vous, Consultations, Pharmacie, Finances, RH, etc.) **n'existe qu'en mock côté renderer** (`features/*/mock-data.ts`), sans schéma ni route.

C'est exactement le pattern déjà rodé sur `app-core` (Pandora One Core) pour Finance/Ventes/Stocks avant le passage au backend distant — on a juste le socle, pas encore les 25 modules métier.

### Ce que le frontend attend (28 écrans, 25 avec données propres)

J'ai relu les `types.ts` des 28 modules construits. Verdict : la grande majorité des écrans partagent une même forme (liste filtrable par onglets/statut + fiche détail + KPI + graphiques), et **presque tout référence un `patientId`** — `Patient` est le pivot du système, comme prévu dans le cahier des charges.

## 2. Le point le plus important : `Patient` n'est pas une seule table

Le type `Patient` actuel (`features/patients/types.ts`) mélange deux choses différentes :

1. **Des données propres au patient** : identité, contact, assurance, antécédents, allergies, groupe sanguin, statut. → une vraie table `Patient`.
2. **Des vues agrégées d'autres domaines** : `consultations[]`, `results[]`, `vitals[]`, `prescriptions[]`, `documents[]`, `upcomingAppointments[]`, `timeline[]`. → ce ne sont **pas des colonnes de `Patient`**, ce sont des requêtes filtrées par `patientId` sur les tables `Consultation`, `ExamResult`, `VitalSign`, `Prescription`, `PatientDocument`, `Appointment`.

Autrement dit : la page "Dossier patient" n'a pas besoin d'une grosse table `Patient` avec des colonnes JSON — elle a besoin d'un **endpoint d'agrégation** (`GET /patients/:id/dossier`) qui va chercher dans 6-7 tables et assemble la réponse. C'est plus de travail au départ mais ça évite la duplication qu'on voit déjà dans le mock (ex: un rendez-vous confirmé apparaît à la fois dans `Appointment` et dans `Patient.upcomingAppointments`).

## 3. Modèle de données proposé, par domaine

| Domaine (écran) | Entité(s) Prisma proposées | Référence `Patient` | Référence `Employee` |
|---|---|---|---|
| Patients | `Patient` | — | — |
| Rendez-vous | `Appointment` | `patientId` | `doctorId` |
| Consultations | `Consultation` | `patientId` | `doctorId` |
| Hospitalisation | `Hospitalization`, `Bed` (chambre/lit) | `patientId` | `doctorId` |
| Urgences | `EmergencyVisit` | `patientId` | `doctorId` |
| Bloc opératoire | `Surgery` | `patientId` | `surgeonId`, `anesthetistId` |
| Laboratoire | `LabRequest`, `LabResult` | `patientId` | `technicianId`, `requestingDoctorId` |
| Imagerie | `ImagingRequest` | `patientId` | `requestingDoctorId` |
| Cardiologie | `CardioExam` | `patientId` | `doctorId` |
| Anatomopathologie | `PathologyRequest` | `patientId` | `requestingDoctorId` |
| Endoscopie | `EndoscopyProcedure` | `patientId` | `endoscopistId` |
| Pharmacie | `Medication`, `MedicationStock`, `Dispensation` | `patientId` (dispensation) | — |
| Stocks & Dépôts | `Depot`, `DepotItem`, `StockMovement` | — | — |
| Banque de sang | `BloodPouch`, `Donation` | `patientId` (receveur) | — |
| Finances | `FinanceTransaction`, `Account` | optionnel (recette liée à un patient) | — |
| Approvisionnement | `ProcurementRequest`, `Supplier` | — | — |
| Ressources Humaines | `Employee`, `Contract`, `AttendanceDay` | — | — |
| Qualité & Accréditation | `QualityIndicator`, `Certification`, `QualityAction` | — | — |
| Gestion des risques | `Risk` | — | responsable = `Employee` |
| Audit & Conformité | `ComplianceAudit` *(renommé pour ne pas confondre avec `AuditLog`)* | — | — |
| Documents & Protocoles | `ProtocolDocument` | — | — |
| Automation Studio | `AutomationRule`, `AutomationLog` | — | — |
| Centre de Commandement | *(aucune — agrégation pure des tables ci-dessus)* | — | — |
| Tableaux de bord | *(aucune — navigation pure)* | — | — |
| IA & Prédictions | `Prediction` *(alimentée par un job, pas par CRUD utilisateur)* | — | — |
| Rapports & Analyse | *(aucune — génère des exports depuis les autres tables)* | — | — |
| Paramètres | *(réutilise `Company`, `User` existants)* | — | — |

**Décision structurante proposée** : créer une table `Employee` unique pour *tout le personnel* (médecins, techniciens, anesthésistes...), et y faire référence par `employeeId` partout où le mock actuel a un champ texte libre (`doctor: string`, `technician: string`, `surgeon: string`...). C'est plus de travail de saisie au départ, mais ça évite d'avoir "Dr. Martin Adjovi" tapé en dur à 15 endroits différents, et ça permet plus tard des vues du type "charge de travail du Dr. X" sans parsing de texte.

## 4. Pattern technique à suivre (déjà utilisé pour `auth`)

Pour chaque domaine, le circuit est toujours le même :

```
Prisma model (app-server/prisma/schema.prisma)
  → migration (`npx prisma migrate dev`)
  → service (app-server/src/services/<domaine>.service.ts)
  → route Express (app-server/src/routes/<domaine>.routes.ts)
  → montée dans src/index.ts (app.use('/patients', patientsRouter))
  → type partagé (app-core/src/shared/<domaine>-types.ts)
  → appel HTTP (app-core/src/main/services/remote-api.client.ts)
  → service main (app-core/src/main/services/<domaine>.service.ts)
  → handler IPC (app-core/src/main/ipc/<domaine>.ipc.ts) + enregistré dans main/index.ts
  → exposition preload (app-core/src/preload/index.ts)
  → la page renderer remplace son import de mock-data.ts par window.api.<domaine>.list()
```

C'est mécanique une fois le premier domaine fait — je propose de faire **Patients** en entier (schéma + les 8 endpoints qu'utilise le dossier patient) comme référence, puis de dupliquer le pattern pour les autres.

## 5. Décisions à trancher avant de commencer

1. **Local (SQLite offline-first) ou tout en distant (MySQL via `app-server`) ?**
   Le cahier des charges d'origine (`Architecture-App-PC-Multitenant.md`) prévoit un mode hors-ligne avec base locale chiffrée. Mais `app-core` actuel (Core) fait déjà tout passer par `app-server` en HTTP, sans cache local pour les données métier (seul l'audit log est en SQLite local). **Je propose de garder ce même choix pour Pandora Health dans un premier temps** (tout en distant, pas d'offline-first pour l'instant) et de traiter le mode hors-ligne comme un chantier séparé plus tard — sauf si c'est un critère bloquant pour toi dès maintenant (un hôpital avec une connexion instable, ça peut être important).
2. **`Employee` comme référence partout (proposé ci-dessus) — es-tu d'accord, ou on garde des champs texte libre pour aller plus vite au début ?**
3. **Génération des codes** (`P-2025-0001245`, `DOS-2025-015678`, `LAB-2025-00568`...) : format propre à chaque module → je propose un compteur par établissement et par type de document en base plutôt que de dériver l'ID.
4. **Documents & Protocoles / documents patients** : stockage des fichiers en base (`Bytes` comme `Company.logo`) ou sur disque avec juste le chemin en base ? Pour des PDF/CV/contrats potentiellement nombreux, un stockage disque + chemin est plus sain à long terme.
5. **Rôles** : le système n'a que `DIRIGEANT`/`EMPLOYE` aujourd'hui. Un hôpital a clairement besoin de plus de granularité (médecin, infirmier, pharmacien, technicien labo, RH, comptable...) pour le RBAC déjà prévu au cahier des charges. À startupper tôt si on veut du RBAC réel avant d'avoir trop d'écrans qui dépendent du rôle actuel.

## 6. Plan de développement proposé, par phases

**Phase 1 — Le pivot patient (base de tout le reste)**
`Patient` + `Employee` + endpoints du dossier patient. Sans ça, aucun autre module ne peut vraiment se brancher.

**Phase 2 — Soins & Patients + Examens (le cœur clinique)**
Rendez-vous, Consultations, Hospitalisation, Urgences, Bloc opératoire, puis Laboratoire, Imagerie, Cardiologie, Anatomopathologie, Endoscopie. Ce sont les 10 écrans qui utilisent le plus intensément le pivot `Patient`/`Employee`.

**Phase 3 — Médicaments, Stocks, Finances, Achats**
Pharmacie, Stocks & Dépôts, Banque de sang, Finances, Approvisionnement. Le lien Pharmacie → Approvisionnement (déjà simulé dans le mock) devient un vrai flux : un besoin créé en Pharmacie crée une ligne dans `ProcurementRequest`.

**Phase 4 — RH**
`Employee` s'enrichit (contrats, présences) une fois que Phase 1 a posé la base.

**Phase 5 — Gouvernance (Qualité, Risques, Audit, Documents)**
Modules inventés sans maquette, moins urgents opérationnellement — bons candidats pour plus tard.

**Phase 6 — Intelligence & Pilotage**
Centre de Commandement (agrégation pure, faisable dès que Phase 2-3 existent, sans nouvelle table), Tableaux de bord (navigation), puis Automation Studio (vrai moteur de règles) et IA & Prédictions (le plus complexe — nécessite un vrai pipeline de calcul, à traiter en dernier).

## 7. Prochaine étape proposée

Je propose de commencer par la **Phase 1** : schéma `Patient` + `Employee`, migration, puis les endpoints du dossier patient (`/patients`, `/patients/:id/dossier`), et de brancher `PatientsPage` + `PatientDetailPage` dessus pour valider tout le circuit de bout en bout — avant de dupliquer le pattern sur les 24 autres modules.

Dis-moi ce que tu penses des décisions de la section 5, et si le découpage en phases te convient, ou si tu veux prioriser différemment (par exemple, commencer par Rendez-vous/Consultations si c'est ce qui sera utilisé en premier par les utilisateurs réels).
