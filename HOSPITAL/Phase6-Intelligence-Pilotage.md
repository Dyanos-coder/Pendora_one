# Pandora Health — Plan Phase 6 : Intelligence & Pilotage

*Suite de [Proposition-Architecture-Backend.md](Proposition-Architecture-Backend.md) §6. Ce document détaille comment j'aborde concrètement les 4 derniers écrans, une fois les Phases 1 à 5 terminées et vérifiées.*

## 1. Périmètre exact

Le §6 du document d'architecture parle de « Centre de Commandement » et « Tableaux de bord » comme deux entrées séparées, mais en relisant la navigation réelle (`AppShell.tsx`), le périmètre concret correspond à **4 écrans** :

| Écran (nav) | Fichier | État actuel |
|---|---|---|
| Tableau de bord (item racine, hors groupe) | `dashboard/DashboardPage.tsx` | KPI + « Vue d'ensemble 360° » + actions prioritaires, tout en dur — c'est le Centre de Commandement du doc original |
| Rapports & Analyse | `analytics/AnalyticsPage.tsx` + `mock-data.ts` | Catégories de rapports, tendances 5 mois, rapports « récents » — tout en dur |
| Automation Studio | `automation-studio/AutomationStudioPage.tsx` + `mock-data.ts` + `types.ts` | Règles + journal d'exécution — tout en dur, aucun moteur |
| IA & Prédictions | `ai-predictions/AIPredictionsPage.tsx` + `AiChatPanel.tsx` + `mock-data.ts` | Panneau de chat **déjà branché sur un vrai LLM** (voir §2) + liste de « prédictions » en dur à côté |

« Tableaux de bord » (navigation pure, sans données propres) n'a pas d'écran dédié dans le nav actuel — je ne crée rien pour cette ligne.

## 2. Découverte importante : l'assistant IA est déjà réel

`app-server/src/services/ai-assistant.service.ts` utilise déjà **Gemini** (`@google/genai`, modèle `gemini-flash-latest`) avec du *function calling* réel : le modèle appelle des outils qui interrogent Prisma, jamais de réponse inventée. Le code le dit lui-même en commentaire :

> « Le jeu d'outils s'enrichit module par module : pour l'instant seuls Company/User/AuditLog ont un vrai schéma... Ajouter un outil ici dès qu'un nouveau domaine obtient ses propres tables. »

Aujourd'hui il n'y a que **3 outils** (`get_company_info`, `list_staff_accounts`, `get_recent_activity`), alors que 20+ domaines ont maintenant un vrai backend (Phases 1 à 5). C'est le principal chantier de la Phase 6, pas un nouveau modèle de données : **enrichir massivement ce jeu d'outils** pour que l'assistant puisse répondre à de vraies questions sur tout l'hôpital ("combien de lits sont occupés ?", "quels médicaments sont en rupture ?", "quels risques sont critiques ?").

Ça change la lecture de « IA & Prédictions » : plutôt que d'inventer un pipeline de machine learning (ce que le cahier des charges appelait « le plus complexe, nécessite un vrai pipeline de calcul »), l'approche honnête est de s'appuyer sur ce qui existe déjà — un LLM avec accès en lecture aux vraies données — et de remplacer les fausses « prédictions » à pourcentage de confiance inventé par des **alertes calculées** (règles déterministes sur les données réelles, pas du ML). Détail en §3.4.

## 3. Écran par écran

### 3.1 Tableau de bord (Centre de Commandement) — le plus simple, à faire en premier

Aucune nouvelle table : pur travail d'agrégation cross-module, comme prévu dans le document d'architecture. Tous les domaines source existent déjà (Phases 1 à 5).

**KPI row** (remplace les 4 valeurs en dur) :
- Patients aujourd'hui → `Appointment` du jour + `EmergencyVisit` du jour (comptage réel, sans doublon)
- Consultations → `Consultation` du jour (réel)
- Chiffre d'affaires → somme `FinanceTransaction` type `RECETTE` du jour (réel — sera un petit nombre vu la taille du jeu de seed, assumé comme pour Finances en Phase 3)
- Lits occupés → `hospitalizations.occupancy()` déjà existant (endpoint déjà utilisé par `HospitalizationPage`)

**Vue d'ensemble 360° (tuiles Urgences/Bloc/Hospitalisation/Labo/Pharmacie)** : chaque tuile = un vrai comptage sur le domaine correspondant (`EmergencyVisit` en attente, `Surgery` du jour, occupation lits, `LabRequest` résultats en attente, `Medication` en rupture).

**Actions prioritaires** : recomposé comme une liste réelle plutôt que 4 lignes fixes — urgences non prises en charge, résultats/documents en attente de validation (labo + imagerie + pathologie + endoscopie statut `EN_ATTENTE`), factures `RECETTE` du jour non `PAYE`, ruptures de stock (pharmacie + dépôts).

**Accès rapides / Modules** : déjà de la navigation pure (pas de données), ne change pas.

**Implémentation** : un seul nouvel endpoint `GET /dashboard/summary` côté `app-server` qui interroge les services de domaine déjà existants et retourne un objet agrégé — pas de nouveau modèle Prisma, pas de nouvelle table. Pattern habituel ensuite (types partagés → `remote-api.client` → IPC → preload → page).

### 3.2 Rapports & Analyse — partiellement réel, un chantier volontairement borné

Deux familles de choses dans le mock actuel :

- **Ce qui devient réel sans gros chantier** : `REPORT_CATEGORIES` (nombre de rapports par catégorie) et `DEPARTMENT_COMPARISON` (consultations par service) sont des agrégations directes sur des données déjà réelles (`Consultation.service`, etc.) — même traitement que Phase 5.
- **Ce qui ne peut pas devenir honnête sans historique** : `PATIENT_VOLUME_TREND` et `REVENUE_TREND` sont des séries sur 5 mois — le jeu de données actuel n'a pas cette profondeur temporelle. Comme pour Finances/Procurement en Phase 3, ces graphiques sont **supprimés**, pas fabriqués.
- **`RECENT_REPORTS` (génération de rapports)** : je propose de le rendre réel mais **borné à l'export CSV/JSON**, pas à la génération de PDF stylé (mise en page PDF = gros chantier hors sujet ici). Un bouton « Générer un rapport » crée une ligne dans une nouvelle table `GeneratedReport` (catégorie, date, contenu exporté en JSON/CSV stocké en `Bytes` comme `Company.logo`) et le fichier est téléchargeable depuis Electron (`shell.openPath` ou dialogue d'enregistrement). Si ce niveau ne t'intéresse pas, on peut aussi laisser cet onglet en placeholder honnête (« à spécifier ») comme fait pour d'autres sous-onglets non prioritaires dans les phases précédentes — **à trancher avec toi avant de coder** (voir §5).

### 3.3 Automation Studio — CRUD réel + vrai scheduler, actions simulées explicitement

Le plus gros nouveau modèle de données de la phase :

```prisma
enum AutomationCategory { RENDEZ_VOUS STOCKS LABORATOIRE FINANCES RH SOINS_PATIENTS }

model AutomationRule {
  id        String   @id @default(uuid())
  name      String
  trigger   String   // description lisible de la condition (pas de DSL — voir plus bas)
  action    String   // description lisible de l'action
  category  AutomationCategory
  active    Boolean  @default(true)
  logs      AutomationLog[]
}

model AutomationLog {
  id        String   @id @default(uuid())
  ruleId    String
  rule      AutomationRule @relation(fields: [ruleId], references: [id])
  runAt     DateTime @default(now())
  success   Boolean
  detail    String
}
```

**Ce qui est réel** : les 7 règles du mock deviennent des lignes réelles, avec une vraie condition évaluable en code (pas un DSL générique à interpréter — ce serait sur-ingénierer pour 7 règles). Chaque règle a une fonction TypeScript associée côté service (`evaluateStockRupture()`, `evaluateOverdueInvoice()`, etc.) qui interroge les vraies tables (`Medication.available = 0`, `FinanceTransaction.status = EN_RETARD` depuis 30j, `QualityCertification`/`Employee.contractEndDate` < 30j...).

**Le scheduler** : `app-server` tourne déjà en process continu (`npm run dev`) — un vrai `setInterval` côté serveur (ex. toutes les 15 min) qui évalue les règles actives et écrit dans `AutomationLog` est réaliste, pas de la sur-ingénierie. C'est un vrai moteur, pas une simulation d'UI.

**Ce qui reste simulé, explicitement** : l'*action* elle-même (« envoyer un SMS », « notifier ») n'a pas de vraie intégration externe (pas de compte Twilio, pas de serveur mail configuré dans ce projet) — le detail du log dira honnêtement `[simulation] SMS qui serait envoyé à {patient}` plutôt que de prétendre à un envoi réel. Deux règles ont une action qui *peut* être réelle sans intégration externe : « Alerte rupture de stock » et « Alerte péremption » peuvent écrire une vraie ligne consultable (ces alertes existent déjà comme calculs affichés dans Pharmacie/Stocks — pas de duplication nécessaire, le log suffit).

**KPI et graphique** : règles actives/total (réel), exécutions du jour (réel, `AutomationLog` du jour), taux de réussite (réel). Le `EXECUTIONS_TREND` (courbe horaire 08h-18h) est supprimé — pas de vraie granularité horaire tant que le scheduler ne tourne pas depuis assez longtemps ; je peux le remplacer par un histogramme des exécutions par règle sur la journée, qui lui est réel dès la première exécution.

### 3.4 IA & Prédictions — recadrage honnête, pas de ML inventé

**Le chat (`AiChatPanel.tsx`)** : ne change pas de mécanique, juste son jeu d'outils. Voir §2 — c'est le vrai cœur du travail de cette section.

**Nouveaux outils à ajouter à `ai-assistant.service.ts`** (lecture seule, un outil par domaine déjà backé, réutilisant les fonctions `list*()` déjà écrites dans les services existants) :
patients, rendez-vous du jour, consultations, hospitalisation/occupation lits, urgences, bloc opératoire, laboratoire, imagerie, cardiologie, anatomopathologie, endoscopie, pharmacie, stocks & dépôts, banque de sang, finances, approvisionnement & fournisseurs, RH, qualité (indicateurs/certifications), risques, audits, documents. Soit une vingtaine d'outils supplémentaires — mécanique une fois le premier fait, sur le même modèle que `list_staff_accounts`.

**La liste de « prédictions » (`PREDICTIONS`, `PREDICTION_MODELS`, `MODEL_ACCURACY_TREND`)** : c'est ici que je recadre le plus fort par rapport au mock original, parce qu'aucune des 6 prédictions du mock n'est honnêtement calculable telle quelle avec les données actuelles :

| Prédiction du mock | Calculable en vrai ? | Décision proposée |
|---|---|---|
| Risque de réadmission élevé (87 % confiance) | Non — pas d'historique de réadmissions | Supprimée |
| Pic d'affluence urgences prévu | Non — pas de série temporelle horaire | Supprimée |
| Rupture de stock imminente | **Oui, en partie** — `Medication`/`DepotItem` en `RUPTURE` ou `STOCK_FAIBLE` existe déjà réellement | Recomposée en alerte réelle, sans « % de confiance » inventé ni délai ("sous 3 jours") qu'on ne peut pas calculer sans historique de conso |
| Retard de facturation prévisible | **Oui** — `FinanceTransaction` statut `EN_RETARD`/`EN_ATTENTE` existe déjà | Recomposée en alerte réelle |
| Anomalie de consommation détectée | Non — pas d'historique de conso pour comparer une hausse | Supprimée |
| Temps d'attente en hausse (Cardiologie) | Non — pas de série de délais dans le temps | Supprimée |

Autrement dit : l'écran devient une page qui affiche le **vrai chat IA enrichi** en avant, et un panneau « Alertes calculées » (2-3 alertes réelles, agrégées depuis Pharmacie/Stocks/Finances déjà vues ailleurs — pas dupliqué en table, recalculé à l'affichage comme pour le Dashboard). Le titre « Modèles de prédiction » (accuracy, dernier entraînement) disparaît entièrement : il n'y a pas de modèle entraîné, le présenter comme tel serait mentir à l'utilisateur final de l'hôpital. **Je pense que c'est le bon compromis, mais c'est le changement le plus visible par rapport au mock — à valider avec toi avant de coder** (voir §5).

## 4. Ordre d'exécution proposé

1. **Tableau de bord / Centre de Commandement** — le plus simple, aucune nouvelle table, valide vite tout le pattern d'agrégation cross-module qui sera réutilisé pour les 3 autres écrans.
2. **Automation Studio** — nouveau modèle mais isolé, pas de dépendance sur les autres écrans de la phase.
3. **Rapports & Analyse** — dépend de la décision §5.2 (export réel ou placeholder).
4. **IA & Prédictions** — en dernier, comme prévu dans le document d'architecture : le plus gros volume de code mécanique (une vingtaine d'outils), et bénéficie d'avoir déjà le pattern d'agrégation rodé par le Dashboard pour les « Alertes calculées ».

Vérification à chaque étape : typecheck (`app-server` + `app-core`), puis vérification visuelle live (Electron + Playwright) comme pour les phases précédentes.

## 5. Décisions à trancher avant de commencer

1. **Rapports & Analyse — export réel (CSV/JSON téléchargeable, nouvelle table `GeneratedReport`) ou onglet « à spécifier » pour l'instant ?** L'export réel demande de choisir un format et où stocker les fichiers (base en `Bytes` vs disque) — je recommande CSV/JSON en base pour rester cohérent avec `Company.logo`, mais c'est plus de travail que de laisser un placeholder honnête comme pour d'autres sous-onglets déjà « à spécifier » dans l'app.
2. **IA & Prédictions — es-tu d'accord avec le recadrage du §3.4 ?** Ça revient à supprimer 4 des 6 « prédictions » du mock et tout le panneau « Modèles de prédiction » plutôt que de les rendre plausibles avec des chiffres inventés. C'est le choix le plus visible de cette phase.
3. **Automation Studio — le scheduler réel (`setInterval` toutes les 15 min côté `app-server`) te convient, ou tu préfères une évaluation uniquement à la demande (bouton « Évaluer maintenant », pas de tâche de fond) ?** Le scheduler est plus proche d'un vrai moteur d'automatisation mais tourne en continu même quand personne ne regarde l'écran.
4. **Confirmation du périmètre** : je ne touche pas à « Paramètres » (déjà listé hors Phase 6 dans le document d'architecture, réutilise `Company`/`User` existants) sauf si tu veux l'inclure ici.

Dis-moi ce que tu penses de ces 4 points (ou valide tel quel avec « allonsy ») et je démarre dans l'ordre du §4.
