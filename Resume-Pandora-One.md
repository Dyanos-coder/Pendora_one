# Résumé — Pandora One (Cahier des charges v2.0, juillet 2026)

*Document source : « PANDORA ONE — Le système nerveux numérique de l'entreprise », Pandora Afrika, 26 pages, confidentiel.*

## 1. Vision

Pandora One est présenté comme un **système d'exploitation intelligent pour entreprises**, pensé spécifiquement pour le contexte africain, avec trois objectifs simultanés : centraliser les opérations, automatiser les tâches répétitives, et permettre au dirigeant de piloter son activité depuis un téléphone, même avec une connexion internet instable.

**Constat de départ** : les logiciels de gestion existants (conçus pour l'Europe/Amérique du Nord) imposent trois compromis inacceptables — dépendance à une connexion stable, ignorance des moyens de paiement locaux (Mobile Money), logique pensée pour l'email alors que l'entreprise se pilote via WhatsApp.

**Métaphore centrale** : Pandora One doit fonctionner comme un **système nerveux numérique** — chaque événement métier (vente, dépense, rupture de stock, réclamation…) est observé, compris, mis en relation, puis déclenche une prévision, une alerte, une recommandation, voire une action automatisée.

Boucle conceptuelle en 9 étapes :
> Observer → Comprendre → Prévoir → Alerter → Recommander → Automatiser → Exécuter → Vérifier → Apprendre

Tous les modules (comptabilité, stock, RH, ventes, WhatsApp…) ne sont que des points d'entrée vers cette **même intelligence centrale**.

## 2. Architecture (6 strates)

| Couche | Rôle |
|---|---|
| **Core** | Socle commun à tous les clients : utilisateurs/rôles, comptabilité de base, dashboard, mobile, mode hors-ligne |
| **Data Hub** | Point de convergence de toutes les données (saisie manuelle, caisse, WhatsApp, Mobile Money, imports) en un modèle unique |
| **Business Intelligence Engine** | Transforme les données brutes en compréhension (tendances, corrélations, segmentation) |
| **AI Copilot** | Interface conversationnelle pour dialoguer avec l'entreprise en langage naturel |
| **Predictive Engine** | Projette les tendances (trésorerie à 30j, risque de rupture, perte de client) |
| **Automation Engine** | Transforme une recommandation en action, avec autonomie configurable |
| **Risk Engine** | Surveille en continu risques et opportunités (alimente le Risk Radar) |
| **Modules sectoriels** | Extensions à la carte par métier, héritant automatiquement de toute l'intelligence du Core |
| **API / écosystème** | Intégrations tierces (banques, comptabilité, logistique) |

## 3. Fonctionnalités du Core

- **Comptabilité & Finance** : facturation/devis automatisés, suivi dépenses/recettes en temps réel, rapports auto, relances impayés. *Règle* : transaction horodatée, non modifiable après validation (seule une contre-écriture est permise).
- **Utilisateurs & Rôles** : accès personnalisé par employé ; un utilisateur ne peut jamais s'auto-attribuer un rôle supérieur.
- **Tableau de bord dirigeant** : CA, trésorerie, alertes du jour, en un coup d'œil.
- **Business Health Score** : note globale unique (ex. 84/100), toujours explicable facteur par facteur — jamais une boîte noire.
- **Control Tower (centre de commandement)** : vue panoramique par domaine (Finance, Ventes, Stocks, RH, Clients, Opérations) avec code couleur, permettant de descendre du niveau entreprise jusqu'à l'événement précis et l'action recommandée.
- **Centre d'alertes** : synthèse quotidienne hiérarchisée (impact/probabilité/urgence), pas de flux de micro-notifications.
- **Mémoire d'entreprise** : historique interrogeable en langage naturel, réponses toujours sourcées.
- **Audit & traçabilité** : journal immuable de toute action (humaine ou automatisée), non modifiable même par un admin.

## 4. Les 9 piliers d'intelligence (détail)

1. **Observer** — surveillance continue de tous les flux, y compris les données hors-ligne dès synchronisation.
2. **Comprendre** — recherche des causes via le **Pandora Business Digital Twin** (représentation numérique dynamique reliant finance, ventes, stocks, clients, RH, fournisseurs).
3. **Prévoir** — anticipation des risques + **What-If Simulator** (comparaison d'au moins 3 scénarios, avec niveau de confiance affiché, jamais de certitude absolue).
4. **Alerter** — hiérarchisation Impact × Probabilité × Urgence via le **Risk Radar** ; 5 priorités du jour, pas 50 notifications.
5. **Recommander** — jamais un problème signalé sans solution(s) proposée(s) + recommandation explicite, avec dialogue possible via l'AI Copilot.
6. **Automatiser** — transformation des tâches répétitives en workflows structurés avec validation humaine paramétrable.
7. **Exécuter** — passage à l'action réelle (message, commande, facture, paiement…), encadré par les niveaux d'autonomie (voir §7.6).
8. **Vérifier** — aucune action n'est « terminée » sans preuve mesurée du résultat.
9. **Apprendre** — apprentissage continu à partir de l'historique, strictement cloisonné par entreprise cliente (pas de fuite de données entre clients).

**Self-Healing Operations** : détection et résolution automatique de certains incidents techniques (ex. échec de synchronisation → réessai → bascule alternative → alerte → trace complète).

## 5. Modules sectoriels

Activables à la carte, chacun hérite automatiquement de l'intelligence du Core :

| Module | Contenu |
|---|---|
| RH | Présence, congés, contrats, paie automatisée |
| Commerce/Retail | Caisse, codes-barres, stock multi-boutiques |
| Restauration | Commandes, tables, menu, cuisine |
| Services & Agences | Gestion de projets, facturation au temps passé |
| Industrie/Production | Matières premières, chaîne de production, qualité |
| **Santé/Clinique** | **Secteur prioritaire — spécification exhaustive (23 briques, voir ci-dessous)** |
| Transport/Logistique | Véhicules, livraisons, carburant |

### 5.9 Module Santé — zoom (secteur traité en priorité, 23 briques)

Couvre l'intégralité du parcours d'un établissement de santé (clinique, hôpital, pharmacie) :

1. Dossier patient électronique unique (identité, historique, constantes vitales, documents, accès journalisé)
2. Rendez-vous & planification (agenda multi-ressources, prise via WhatsApp, rappels auto, pas de double-réservation)
3. Consultations & actes médicaux (fiches structurées, non modifiables après validation → addendum daté)
4. Prescriptions & ordonnances électroniques (alertes interactions/allergies, envoi direct pharmacie)
5. Pharmacie & stocks de médicaments (traçabilité par lot/péremption, blocage auto des lots périmés, gestion des stupéfiants)
6. Laboratoire & analyses (statut échantillon, alerte immédiate si résultat critique)
7. Imagerie médicale (prescription, stockage comptes rendus/images)
8. Hospitalisation & gestion des lits (cartographie temps réel, feuille de surveillance, facturation auto ; sortie bloquée si solde non soldé)
9. Bloc opératoire (planning, check-list pré-op, compte rendu, facturation)
10. Urgences & triage (grille de gravité, traçabilité des délais)
11. Maternité & suivi de grossesse (suivi prénatal, partogramme, suivi postnatal + vaccinal)
12. Vaccination & campagnes de santé (calendrier auto, rappels WhatsApp/SMS)
13. Facturation médicale, assurance & tiers payant (rapprochement auto, aucun acte « orphelin »)
14. RH santé — personnel médical, gardes & paiement (planning gardes, paie avec primes/heures sup via Mobile Money, alerte habilitations expirées)
15. Fournisseurs pharmaceutiques & réappro intelligent (dont chaîne du froid pour vaccins)
16. Équipements biomédicaux & maintenance préventive
17. Hygiène, stérilisation & assurance qualité (traçabilité par lot, suivi infections nosocomiales)
18. Alertes cliniques intelligentes (interactions, constantes anormales, rappel patients chroniques) — s'appuie sur le Predictive Engine et le Risk Engine du Core
19. Télémédecine & santé conversationnelle WhatsApp (téléconsultation, pré-qualification des symptômes par IA)
20. Portail patient (résultats, RDV, facturation en autonomie)
21. Confidentialité, consentement & conformité (accès limité aux professionnels concernés, consentement tracé, secret médical non négociable)
22. Statistiques épidémiologiques & reporting santé publique
23. Interopérabilité multi-établissements (dossier partagé entre cliniques du réseau, avec consentement patient)

## 6. Mode hors-ligne, mobile & résilience

- **Offline-first** : contrainte de conception dès le départ (pas une option ajoutée après coup) — ventes, stock, facturation restent utilisables sans connexion.
- **Serveur local** optionnel chez le client, synchronisable avec le cloud.
- **Synchronisation intelligente** en file d'attente, avec reprise automatique en cas d'échec.
- **Application mobile** pensée pour Android d'entrée de gamme, données en cache, accès filtré par rôle.
- **Résolution des conflits** : règle « premier synchronisé, premier servi » + alerte pour arbitrage manuel.
- **Objectif final** : aucune coupure technique/réseau ne doit jamais arrêter l'activité réelle sur le terrain.

## 7. Paiements, salaires & finance automatisée

- **Paie automatisée** en un clic via Mobile Money, bulletin généré automatiquement.
- **Mobile Money** via agrégateur unique (CinetPay, Flutterwave, PawaPay…) couvrant MTN MoMo, Orange Money, Airtel Money, Moov Money.
- **Réconciliation automatique** des paiements reçus, bascule en mode manuel pour les cas ambigus.
- **Facturation** : devis → facture en un clic, numérotation séquentielle non modifiable, relances auto.
- **Trésorerie prédictive** à 30 jours (encaissements, dépenses récurrentes, salaires programmés).
- **Fonction auto-réabonnement** (note manuscrite p.26) : dans le module paie, l'IA calcule le solde disponible + frais de transaction + frais de réabonnement, et demande au dirigeant de recharger ; une fois le rechargement effectué, les transactions (salaires et réabonnement) s'exécutent automatiquement.

### Niveaux d'autonomie (§7.6) — contrôle central du produit

| Niveau | Comportement | Exemple |
|---|---|---|
| 0 | Observe uniquement | Suivi des ventes en arrière-plan |
| 1 | Analyse et explique | Rapport sur baisse de marge |
| 2 | Recommande une action | Suggestion de réapprovisionnement |
| 3 | Prépare l'action, attend validation | Bon de commande prêt à envoyer |
| 4 | Exécute après validation explicite | Virement salaire validé par le dirigeant |
| 5 | Exécute automatiquement (action pré-autorisée) | Commande de fournitures < 100 000 FCFA |

Le seuil est défini **action par action**, jamais globalement (ex. commande < 100 000 FCFA en niveau 5, mais un transfert de 5 000 000 FCFA reste toujours soumis à validation humaine).

## 8. Service client & commerce conversationnel

- **WhatsApp IA** : assistant nourri du catalogue/prix/FAQ de l'entreprise, conversations illimitées en parallèle.
- **AI Sales Agent** : qualifie le besoin, propose le produit, gère les objections, vérifie stock/prix en temps réel, pousse vers la commande.
- **Support multilingue** (français, anglais, langues locales).
- **Escalade humaine** automatique avec contexte résumé si la demande est complexe/sensible.
- **Voice AI** (extension future) et **CRM conversationnel** (historique unifié achats/conversations/réclamations).

## 9. Les 12 piliers d'innovation (différenciateurs)

Business Health Score, Predictive Intelligence, Risk Radar, AI Copilot, Agentic Automation, Digital Twin, What-If Simulator, Autonomous Payroll, WhatsApp AI Sales Agent, Offline-First, Enterprise Memory, Modular Infinite Growth.

## 10. Feuille de route

| Phase | Contenu |
|---|---|
| **MVP** | Core + Comptabilité + Stock + Tableau de bord mobile (lecture seule) |
| **V1** | Facturation complète + CRM + 1er module sectoriel + Offline-first |
| **V2** | RH + Ventes avancées + Automation Engine (niveaux 0-3) + modules sectoriels additionnels |
| **V3** | Paie automatisée Mobile Money + WhatsApp AI Sales Agent + Automation Engine (niveaux 4-5) |
| **Pandora Intelligence** | Digital Twin, AI Copilot, Predictive Engine, Risk Radar, What-If Simulator, Enterprise Memory, Control Tower complète |

## 11. Stack technique recommandée

| Composant | Recommandation |
|---|---|
| Backend | Odoo Community personnalisé, ou sur-mesure Node.js / PostgreSQL |
| Mobile | Flutter (base de code unique Android/iOS, bonne gestion hors-ligne) |
| Synchronisation | File d'attente d'actions hors-ligne, envoi au retour réseau |
| Paiement | Agrégateur Mobile Money (CinetPay / Flutterwave / PawaPay) |
| Messagerie IA | API WhatsApp Business (Meta Cloud API) + LLM branché sur la base de connaissance de chaque entreprise |
| Intelligence & prévision | Entrepôt de données + modèles de prévision alimentant Predictive Engine et Risk Engine |

---

## À noter / points d'attention

- Le **sommaire (page 2)** et le **chapitre 10** semblent absents ou vides dans le document fourni (la numérotation passe directement du chapitre 9 au chapitre 11).
- Le module **Santé** est explicitement traité comme le secteur prioritaire et le plus détaillé (23 sous-briques), bien plus développé que les autres modules sectoriels qui restent au stade de simple ligne de tableau (§5.1 à 5.7).
- La note manuscrite en fin de document (p.26, fonction « auto-réabonnement ») semble être un ajout informel non encore intégré proprement à la section paie/Mobile Money — à clarifier et formaliser si le document doit servir de spec finale.
