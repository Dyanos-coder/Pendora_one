# Plan : site général Pandora (Next.js)

*Rédigé le : 2026-09-29. Document à relire et corriger avant tout début de travaux. Les points à trancher sont regroupés au §9.*

---

## 0. Avancement

- **Étapes 1 à 3 faites (2026-09-29)** : projet `pandora-web/` (Next.js 16, Prisma, MySQL) ; connexion Admin / Prospecteur ; comptes ; hôpitaux (ajout manuel avec test de connexion, liste, fiche lue en direct dans la base de l'hôpital, version mobile à trois états) ; tableau de bord. Vérifié : typecheck, lint et build OK, parcours complet dans un navigateur (connexion, ajout, doublon et mauvais accès refusés, version mobile modifiée par un prospecteur, pages admin interdites au prospecteur). Voir `pandora-web/README.md`.
- **Étapes 4 et 5 faites côté site (2026-09-30)** : grille tarifaire modifiable (page Tarifs), abonnement signé Ed25519 écrit dans la base de l'hôpital (tables `subscription` et `pandora_link`, créées au besoin), premier mois offert, paiement manuel admin, paiement MoneyFusion (création, webhook revérifié, page `/callback`, « Vérifier » / « Appliquer maintenant »), page Paiements, statut d'abonnement dans la liste, la fiche et le tableau de bord. API signée HMAC pour l'application (`/api/public/subscription*`). Les prospecteurs ne voient aucun montant. Vérifié : typecheck, lint, build, parcours complet dans un navigateur sur une base de test (nettoyée).
- **Étape 6 faite côté application (2026-09-30)** : migration distante `20260930100000_pandora_subscription` (tables `subscription` et `pandora_link`, IF NOT EXISTS) ; copie locale `local_subscription` (SQLite) avec `maxSeenAt` ; `subscription.service.ts` (signature Ed25519 vérifiée avec la clé publique embarquée, identifiant = utilisateur de la base, heure de référence = serveur de base, contrôle au lancement, toutes les 15 min et au retour de la connexion) ; appels au site signés HMAC ; écran **Paramètres › Abonnement** (modules, durée, devis calculé par le site, paiement MoneyFusion ouvert dans le navigateur puis suivi, historique) ; bandeau à 7 jours de l'échéance ; **fenêtre impossible à fermer** si expiré / non activé / invalide / jamais vérifié hors connexion (le dirigeant paie, les autres voient « contactez votre dirigeant ») ; menu limité aux modules payés + gratuits. Contrôle bloquant uniquement dans l'application installée (en développement : `PANDORA_ENFORCE_SUBSCRIPTION=1`). Vérifié dans l'application avec le site local : blocage sans abonnement, bandeau et menu réduit, devis et prorata, paiement signé jusqu'au site, blocage à l'expiration, date modifiée à la main refusée.
- **Avant de publier cette version de l'application** : activer le premier mois (ou enregistrer un paiement) sur le site pour **chaque hôpital déjà installé**, sinon ils seront bloqués (« aucun abonnement »). Sur Vercel : `SUBSCRIPTION_PRIVATE_KEY`, `SITE_URL` = l'adresse publique du site (elle est écrite dans `pandora_link` et sert à l'application pour joindre le site), `MONEYFUSION_API_URL`.
- **Suivant** : étape 7 (QR code des reçus et page de vérification), étape 8 (mise en ligne).

---

## 1. Ce qui est demandé, en résumé

Un **site web Pandora**, séparé de l'application des hôpitaux, qui sert de **tour de contrôle** pour Pandora. Il permet de :

1. **voir tous les hôpitaux clients** : état, modules installés, activité, abonnement ;
2. **gérer les accès** avec deux types de comptes, **Admin** et **Prospecteur** ;
3. **encaisser les abonnements** des hôpitaux via **MoneyFusion**, pour 1 à 24 mois, avec les modules de leur choix. Une fois le paiement confirmé, l'abonnement est mis à jour automatiquement dans la base de l'hôpital, et recopié dans la base locale de chaque poste contre la fraude hors connexion ;
4. **vérifier les reçus de caisse** : la page ouverte quand on scanne le QR code d'un reçu (le QR laissé de côté plus tôt dans le module Caisse).

Le site a **sa propre base de données**. Elle contient en particulier la liste des hôpitaux avec les accès à la base de chacun, ce qui permet au site de s'y connecter.

```
                         ┌──────────────────────────────────────────┐
                         │  Site Pandora (Next.js)                  │
 Admin / Prospecteur ───►│  - pages : tableau de bord, hôpitaux…    │
 (navigateur)            │  - backend : API (routes Next.js)        │
                         │  - base Pandora : hôpitaux, comptes,     │
                         │    paiements, tarifs                     │
                         └───────┬───────────────┬──────────────────┘
                                 │ SQL           │ HTTPS
                ┌────────────────┼──────┐        ▼
                ▼                ▼      ▼    MoneyFusion
        ┌────────────┐  ┌────────────┐ ...   (paiement Mobile Money)
        │ Base       │  │ Base       │
        │ Hôpital A  │  │ Hôpital B  │   ◄── chaque hôpital garde SA base
        └─────▲──────┘  └─────▲──────┘
              │               │
        App de bureau    App de bureau
        (postes de A)    (postes de B)
```

## 2. Emplacement et technologies

- **Nouveau dossier** `HOSPITAL/pandora-web/`, à côté de `app-core/`.
- **Next.js** (App Router, TypeScript, Tailwind), avec le même style visuel que l'application.
- Le **« backend général de Pandora »** correspond aux **routes API de Next.js** (`/api/...`) : un seul projet à héberger, pas de serveur séparé.
- **Base de données du site** : MySQL/MariaDB (par exemple chez Hostinger, comme les hôpitaux), accès via Prisma.

## 3. La base de données du site

| Table | Contenu |
| --- | --- |
| **Hospital** | **id = nom d'utilisateur de la base de l'hôpital** (unique, comme demandé), nom de l'hôpital, hôte, port, nom de la base, utilisateur, **mot de passe chiffré**, version mobile (oui/non), date d'installation, notes |
| **Account** | comptes du site : e-mail, mot de passe (haché), nom, rôle **ADMIN** ou **PROSPECTEUR**, actif |
| **ModulePrice** | grille tarifaire (§6) : module, prix mensuel, module obligatoire ou non |
| **Payment** | un paiement d'abonnement : hôpital, modules choisis, montant, période couverte, **token MoneyFusion** (unique), statut (en attente / payé / annulé / échoué), date du traitement dans la base de l'hôpital, journal des notifications reçues |
| **AuditLog** | qui a fait quoi : ajout d'un hôpital, changement de la version mobile, etc. |

**Sécurité des accès aux bases des hôpitaux** :
- Le mot de passe de chaque base est **chiffré** (AES-256) avec une clé présente uniquement dans la configuration du serveur, jamais en base.
- Il n'est **jamais affiché aux prospecteurs**. Seul l'admin peut le saisir ou le modifier.
- Le site ne fait que **lire** dans la base de l'hôpital, sauf la mise à jour de l'abonnement (§6.3) et la lecture d'un reçu (§7).

## 4. Comptes et droits

| Action | Admin | Prospecteur |
| --- | --- | --- |
| Se connecter, voir le tableau de bord et la liste des hôpitaux | ✅ | ✅ |
| Voir la fiche d'un hôpital (modules, activité, abonnement) | ✅ | ✅ |
| Cocher / décocher **« version mobile installée »** | ✅ | ✅ |
| **Ajouter un hôpital** (saisie manuelle des accès à sa base) | ✅ | ❌ |
| Voir / modifier les accès à la base d'un hôpital | ✅ | ❌ |
| Gérer la grille tarifaire | ✅ | ❌ |
| Voir les paiements et les montants (FCFA) | ✅ | ❌ (statut et échéance d'abonnement seulement) |
| Gérer les comptes (créer un prospecteur…) | ✅ | ❌ |

Un **premier compte admin** est créé à l'installation du site. L'ajout d'un hôpital reste **manuel**, comme demandé : l'admin saisit l'id, le nom et les accès à la base, puis clique sur **« Tester la connexion »** avant d'enregistrer.

## 5. Le visuel des hôpitaux

**Tableau de bord** :
- nombre d'hôpitaux, abonnements à jour, en retard, expirés ;
- recettes d'abonnement du mois ;
- hôpitaux injoignables ;
- hôpitaux avec la version mobile.

**Liste des hôpitaux** : une carte ou une ligne par hôpital, avec :
- nom et id ;
- **statut de l'abonnement** (à jour / expire bientôt / expiré) ;
- modules installés ;
- version mobile oui/non ;
- **base joignable ou non** ;
- version de l'application (déduite des migrations appliquées dans sa base) ;
- date de la dernière activité.

**Fiche d'un hôpital**, lue en direct dans la base de l'hôpital, en lecture seule :
- **modules installés** (réglage « modules affichés » de l'établissement) ;
- **chiffres clés** : patients, utilisateurs, consultations et recettes de caisse du mois ;
- **abonnement** : modules payés, date de fin, historique des paiements ;
- informations de l'établissement : adresse, téléphone, logo.

Pour rester rapide avec beaucoup d'hôpitaux, le site garde en mémoire la dernière lecture de chaque base quelques minutes, et n'interroge chaque base qu'avec un délai court (une base lente ou coupée ne bloque pas le tableau de bord).

## 6. Abonnements

### 6.1 Règles

- **Premier mois inclus** à l'installation.
- **Échéance le 28 du mois.**
- **À chaque échéance, et à tout moment avant**, le dirigeant peut :
  - **renouveler à l'identique**, pour **1 mois ou plus** : de **1 à 24 mois**, soit jusqu'à 2 ans ;
  - **modifier son abonnement** : ajouter ou retirer des modules pour la période suivante.
- **Calcul automatique** : `montant = (somme des prix mensuels des modules choisis) × nombre de mois`. Le montant s'affiche au fur et à mesure du choix, et le site le **recalcule lui-même** avant de lancer le paiement.
- **Date de fin** : le 28 du mois, N mois après la fin de la période en cours. Exemple : abonnement jusqu'au 28 octobre + 3 mois payés = jusqu'au 28 janvier.
- **Seuls les modules payés sont accessibles** dans l'application. Un module non payé n'apparaît plus dans le menu.

### 6.2 Grille tarifaire (d'après `tarif.png`)

| Offre | Contenu (modules de l'application) | Tarif |
| --- | --- | --- |
| **Soins & Patients + Consultations** | Patients, Consultations | **10 000 F / mois** (le forfait) |
| **Gestion administrative** | Ressources humaines, Approvisionnement | **10 000 F / mois / module** |
| **Gestion des patients et services** | Rendez-vous, Hospitalisation, Urgences | **10 000 F / mois / module** |
| **Examens & plateau technique** | Laboratoire, Imagerie médicale, Cardiologie, Anatomopathologie, Endoscopie, Bloc opératoire (+ Pédiatrie, Gynécologie, Autres services, voir §9-A) | **10 000 F / mois / module** |
| **Médicaments & stocks** | Pharmacie, Stocks & Dépôts, Banque de sang | **10 000 F / mois / module** |
| **Intelligence & pilotage** *(« bientôt disponible »)* | IA & Prédictions, Rapports & Analyse, (Automation Studio ?) | **10 000 F / mois / module** |
| **Signature à distance** | Documents & signature électronique (documents, signature, suivi) | **10 000 F / mois** (le forfait) |
| **Gestion financière** | Comptabilité, Caisse | **20 000 F / mois** (le forfait) |

Exemple : Soins & Patients (10 000) + Laboratoire (10 000) + Pharmacie (10 000) + Gestion financière (20 000) = **50 000 F / mois**, soit **150 000 F pour 3 mois**.

Ces prix sont enregistrés dans la table **ModulePrice** du site, modifiable par l'admin sans toucher au code. Un changement de prix s'applique aux **prochains** paiements, jamais aux périodes déjà payées.

### 6.3 Déroulement d'un paiement

```
App de l'hôpital — Paramètres › Abonnement (dirigeant), ou fenêtre d'échéance (§6.5)
  │ 1. choisit les modules et la durée (1 à 24 mois) — montant calculé en direct
  │    saisit le n° de téléphone qui paie
  ▼
Site Pandora  POST /api/subscriptions/checkout
  │ 2. recalcule le montant À PARTIR DE LA GRILLE × durée (jamais le montant envoyé par l'app)
  │ 3. crée le paiement chez MoneyFusion (totalPrice, article = détail des modules,
  │    numeroSend, nomclient, personal_Info = [{ hospitalId, paymentId }],
  │    return_url, webhook_url)
  │ 4. enregistre Payment (token MoneyFusion, modules, durée, statut « en attente »)
  ▼
L'app ouvre la page de paiement MoneyFusion (url renvoyée) dans le navigateur
  │ 5. l'hôpital paie (Orange, MTN, Moov, Wave…)
  ▼
MoneyFusion ──► POST /api/moneyfusion/webhook  (payin.session.pending / completed / cancelled)
  │ 6. le site NE SE FIE PAS au contenu du webhook : il revérifie le paiement auprès de
  │    MoneyFusion (GET https://pay.moneyfusion.net/paiementNotif/{token})
  │ 7. si « paid » et pas encore traité (token déjà traité = ignoré, conformément aux
  │    notifications multiples de MoneyFusion) :
  │      → connexion à la base de l'hôpital avec ses accès
  │      → écriture du nouvel abonnement SIGNÉ (§6.4) : modules payés, date de fin
  │      → Payment marqué « payé et appliqué »
  ▼
return_url : page /callback du site « Paiement reçu » (ou « Paiement échoué »)
L'app surveille l'abonnement pendant le paiement : dès qu'il est à jour, elle l'enregistre
aussi en local et la fenêtre d'échéance disparaît.
```

Points de fiabilité :
- **Aucune double mise à jour** : le token MoneyFusion est unique, et un paiement déjà appliqué n'est jamais rejoué.
- **Base de l'hôpital injoignable au moment du paiement** : le paiement reste « payé, à appliquer ». Le site **réessaie automatiquement**, et l'admin a un bouton « Appliquer maintenant ».
- **Sécurité** : l'appel de l'app au site est signé avec un **secret propre à chaque hôpital**, stocké dans sa base et généré à l'ajout de l'hôpital. Un tiers ne peut donc pas lancer de paiement au nom d'un hôpital.

### 6.4 Protection contre la fraude

L'abonnement doit rester fiable **même hors connexion**, et même face à quelqu'un qui connaît les accès à la base de l'hôpital. Chaque hôpital détient en effet ces accès, puisqu'ils sont saisis sur ses postes.

1. **Abonnement signé par Pandora** :
   - Le site signe chaque abonnement (hôpital, modules, date de fin) avec une **clé privée** qu'il est le seul à posséder.
   - L'application contient la **clé publique** correspondante et **vérifie la signature** avant d'accepter l'abonnement.
   - Modifier la date de fin directement dans la base (par ex. `UPDATE subscription SET endDate = 2099`) rend donc l'abonnement **invalide**, ce qui revient à l'expirer.
2. **Copie dans la base locale** (SQLite chiffrée de chaque poste) :
   - À chaque lecture réussie, l'abonnement signé est **aussi enregistré localement**.
   - **Hors connexion**, l'app se fie à cette copie : pas de base distante, donc pas de contournement possible en coupant le réseau.
3. **Protection contre le recul de l'horloge** :
   - L'app mémorise en local la **date la plus récente qu'elle ait vue**.
   - Si l'horloge de Windows revient en arrière pour « rajeunir » l'abonnement, l'app se fie à cette date mémorisée, et non à l'horloge.
4. **Poste jamais connecté depuis l'expiration** : la copie locale expire à sa date, comme en ligne. La fenêtre d'échéance s'affiche donc aussi hors connexion.

### 6.5 Ce qui change dans l'application des hôpitaux (app-core)

- **Nouvelle table `subscription`** dans la base de chaque hôpital : modules payés, date de fin, dernier paiement, **signature Pandora**. Elle est écrite par le site Pandora, lue et vérifiée par l'app.
- **Même abonnement signé dans la base locale** de chaque poste, plus la date la plus récente vue (§6.4).
- **Nouvelle section Paramètres › Abonnement** (dirigeant) :
  - statut, modules payés et date de fin ;
  - **choix des modules et de la durée** (1 à 24 mois), montant calculé en direct ;
  - bouton **« Payer »** ;
  - historique des paiements.
- **Avant l'échéance** : bandeau d'information quelques jours avant le 28 (« Votre abonnement expire le 28/10 — Renouveler »).
- **Abonnement arrivé à échéance** : une **fenêtre de renouvellement s'affiche par-dessus toute l'application et ne peut pas être fermée**.
  - Ni la touche Échap, ni un clic à côté, ni le changement de page, ni le redémarrage de l'app ne la font partir.
  - Elle ne disparaît **qu'une fois le paiement confirmé** (abonnement à jour et signature valide).
  - Elle contient directement le choix de la durée, des modules et le bouton **« Payer »**, pour que le dirigeant puisse régulariser sans passer par ailleurs.
  - Les autres utilisateurs voient le même message, avec « Contactez votre dirigeant pour renouveler l'abonnement ».
- **Modules non payés** : masqués dans le menu (en plus du filtre par rôle déjà en place).

## 7. Page de vérification des reçus (QR code de la caisse)

Le module Caisse a laissé le QR code de côté, faute d'endroit accessible par un téléphone. **Le site Pandora règle ce problème** : il est en ligne et sait se connecter à la base de chaque hôpital.

- **Dans l'app** : chaque reçu reçoit un **code secret impossible à deviner**, et le reçu imprime un QR contenant le lien suivant :
  `https://<site-pandora>/r/<id-hôpital>/<code-secret>`
- **Sur le site**, la page `/r/...` est publique et lisible avec n'importe quel téléphone, sans application. Elle lit le reçu dans la base de l'hôpital et affiche :
  - **PAYÉ** en vert, ou **ANNULÉ / REMBOURSÉ / INVALIDE** en rouge ;
  - le nom de l'établissement, le service, la date, le montant et le n° du reçu ;
  - le patient en version courte (« KOUASSI A. ») ;
  - **aucune donnée médicale**.
- **Protection** : nombre de consultations limité par adresse IP, et aucun moyen de lister ou de deviner les reçus.

## 8. Plan de travail proposé

| Étape | Contenu |
| --- | --- |
| **1** | Création du projet `pandora-web` (Next.js, Tailwind, Prisma), base du site, connexion Admin / Prospecteur, premier admin |
| **2** | Hôpitaux : ajout manuel (avec test de connexion), liste, fiche, lecture en direct des bases (modules, chiffres, version, joignabilité), case « version mobile » |
| **3** | Tableau de bord général |
| **4** | Grille tarifaire (§6.2), table `subscription` signée côté app-core, clés de signature Pandora |
| **5** | Paiement MoneyFusion : création, webhook, vérification, mise à jour de la base de l'hôpital, pages de retour, nouvel essai automatique |
| **6** | App-core : Paramètres › Abonnement (modules, durée 1 à 24 mois), bandeau avant échéance, **fenêtre de renouvellement impossible à fermer**, copie locale et protection contre le recul de l'horloge, modules non payés masqués |
| **7** | QR code sur les reçus (app-core) et page de vérification `/r/...` sur le site |
| **8** | Mise en ligne du site (hébergement, nom de domaine, HTTPS) et tests de bout en bout avec un vrai paiement de faible montant |

## 9. Décisions retenues (2026-09-29)

| Point | Décision |
| --- | --- |
| **A. Grille** | Grille de `tarif.png` appliquée. Par défaut, faute de réponse : **Soins & Patients obligatoire** ; **Gouvernance & qualité incluse gratuitement** ; **Pédiatrie, Gynécologie, Autres services pas créés pour l'instant** (retirés de la grille jusqu'à leur création) ; **Intelligence & pilotage vendu au module** comme dans la grille (IA & Prédictions, Rapports & Analyse, Automation Studio). |
| **B. Premier paiement** | **B1** : premier mois complet inclus, première échéance le 28 du mois suivant. |
| **C. Modification en cours de période** | **C1** : module ajouté payé au prorata jusqu'au prochain 28. Pas de remise pour les longues durées. |
| **D. Hébergement** | Hébergement **sans IP fixe** (type Vercel) : chaque base d'hôpital doit autoriser les connexions distantes depuis toutes les IP (`%`). La protection repose donc sur des mots de passe de base forts. |
| **E. Nom de domaine** | Pas encore choisi : l'adresse du site sera un paramètre (`.env`), renseigné à l'hébergement. |
| **F. MoneyFusion** | URL d'API marchand dans le `.env` (`MONEYFUSION_API_URL`). **Pas de secret webhook** : MoneyFusion n'en fournit pas ; chaque notification est revérifiée auprès de MoneyFusion (`paiementNotif/{token}`) avant tout traitement. Page de retour après paiement : **`/callback`** (adresse enregistrée dans le tableau de bord MoneyFusion). |
| **G. Version mobile** | Un seul champ à trois états, coché par le prospecteur : **Non souhaitée / Souhaitée (à installer) / Installée**. |
| **H. Paiements** | Seul le **dirigeant** paie depuis l'application. L'**admin Pandora** peut aussi **enregistrer un paiement à la main** depuis le site (virement, espèces…), avec trace dans le journal. |
