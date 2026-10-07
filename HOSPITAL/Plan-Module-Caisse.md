# Plan : Module Caisse et Comptabilité

*Rédigé le : 2026-09-29. Source : `Pandora_Health_Module_Caisse_Version_Modifiee_2.pdf`.*
*Document à relire et corriger avant tout début de travaux. Les points à trancher sont regroupés au §4.*

---

## 0. État (2026-09-29) : livraisons 1 à 3 faites, QR code reporté

**Choix retenus** : les recommandations du §4. Le QR code et la page de vérification (étape 9, §4-A) sont mis de côté pour l'instant ; le reçu est imprimé sans QR.

**Fait**
- **Menu** : rubrique Finance (Caisse, puis Comptabilité, ex-« Finances ») ; menu filtré selon le rôle. Un caissier arrive directement sur Caisse.
- **Rôle** : CAISSIER, avec le domaine de droits `cashier`. La matrice des droits est maintenant partagée dans `src/shared/permissions.ts`.
- **Données** : migration `20260929100000_cashier_module` (caisses, sessions, catalogue, reçus, lignes). Caisse est activé automatiquement là où Comptabilité l'est.
- **Écrans** :
  - cartes des caisses, ouverture avec fond de caisse, encaissement en 3 clics ;
  - création rapide de patient, examens prescrits non payés ;
  - reçu imprimé sur l'imprimante du poste ;
  - journal (réimpression, annulation, remboursement) ;
  - clôture avec écart et rapport imprimé ;
  - paramètres de la caisse : caisses, catalogue, imprimante.
- **Comptabilité** : chaque reçu crée une recette. Une annulation la passe à « Annulé », ce qui l'exclut des totaux. Un remboursement crée une sortie. Nouvel onglet « Caisses » avec journal, sessions et export Excel.
- **Pages d'examens** : badge « Payé / Non payé ».
- **Paramètres › Établissement** : upload du logo, n° d'identification et mention de bas de reçu.

**Vérifié**
- Typecheck, lint et build : OK.
- Test complet sur la base locale de développement, dont les données ont été supprimées ensuite :
  - numérotation `R-AAAA-000001` et n° de passage par service ;
  - reçu à deux services refusé ;
  - recette créée en Comptabilité, puis annulée ;
  - remboursement créant une sortie ;
  - clôture avec écart.
- Rendu du ticket 80 mm vérifié en PDF.
- **Reste** : un essai dans l'interface, et sur une vraie imprimante thermique.

---

## 1. Ce qui est demandé, en résumé

- La page **Finances** est renommée **Comptabilité**.
- Une nouvelle **rubrique « Finance »** apparaît dans le menu, avec deux pages : **Caisse** (nouvelle) au-dessus de **Comptabilité**.
- **Caisse** : nombre de caisses illimité (Caisse 1, 2, 3…). Chaque caisse encaisse les patients et imprime un reçu (PAYÉ + QR code de vérification).
- **Toutes les informations des caisses remontent automatiquement dans Comptabilité.**
- Un nouveau profil **Caissier** ne voit que Caisse et Patients (en lecture), et arrive directement sur Caisse à la connexion.

Menu après modification :

```
Finance
  ├─ Caisse          ← nouveau
  └─ Comptabilité    ← ex « Finances », contenu inchangé + nouvel onglet « Caisses »
Administration
  ├─ Approvisionnement
  └─ Ressources Humaines
```

---

## 2. Plan étape par étape

### Étape 1 : Renommage et nouvelle rubrique (petit, visible tout de suite)

1. « Finances » devient « Comptabilité » partout où il s'affiche :
   - menu ;
   - titre de la page ;
   - Paramètres › Modules ;
   - tableau de bord (raccourci « Paiement ») ;
   - exports Excel.
2. Nouvelle rubrique **Finance** dans le menu, contenant Caisse puis Comptabilité. Administration garde Approvisionnement et RH.
3. L'identifiant interne `finance` reste inchangé : seul le libellé change. On évite ainsi une migration inutile sur les droits, les modules enregistrés par établissement et les préférences d'affichage.
4. **Modules enregistrés :** les établissements qui ont déjà enregistré leur liste de modules ne verraient pas « Caisse » (absent de leur liste). Règle proposée : **Caisse est activé automatiquement là où Comptabilité l'est.**

### Étape 2 : Rôle Caissier et droits

1. Nouveau rôle **CAISSIER** dans la liste des rôles (création de compte dans Paramètres › Utilisateurs & rôles).
2. Nouveau domaine de droits **`cashier`** (Caisse) :

   | Rôle | Caisse | Comptabilité | Patients |
   | --- | --- | --- | --- |
   | DIRIGEANT | total (créer des caisses, annuler, rembourser) | total | total |
   | CAISSIER | encaisser | aucun | lecture + création rapide (voir §4-D) |
   | ADMINISTRATIF | lecture (journaux) | écriture (inchangé) | inchangé |
   | Autres rôles | aucun | inchangé | inchangé |

3. **Menu filtré selon le rôle**, pour tous les rôles. Aujourd'hui, un rôle voit tout le menu et reçoit une erreur 403 au clic. Désormais, les modules sans droit d'accès sont masqués. Cela règle aussi le point 6 de la liste « ce qu'il reste ».
4. Page d'arrivée selon le rôle : un caissier atterrit sur **Caisse**, les autres rôles sur le tableau de bord.

### Étape 3 : Données (base MariaDB, migration automatique au lancement)

| Nouvelle table | Contenu |
| --- | --- |
| **Caisse** (`cash_register`) | nom, emplacement (accueil, urgences, pharmacie, bloc…), active/désactivée, caissiers autorisés |
| **Session de caisse** (`cash_session`) | caisse, caissier, ouverture (heure + fond de caisse), fermeture (heure + montant compté par mode de paiement, écart) |
| **Catalogue de tarifs** (`tariff_item`) | libellé (« Consultation générale »), service (Consultation, Laboratoire, Imagerie, Pharmacie, Bloc…), prix, couleur de tuile, ordre, actif |
| **Reçu** (`receipt`) | numéro unique `R-000123`, jeton de vérification secret (pour le QR), caisse, session, caissier, patient, service, lignes, montant, mode de paiement, n° de passage, statut **PAYÉ / ANNULÉ / REMBOURSÉ**, et qui / quand / pourquoi en cas d'annulation ou de remboursement |
| **Ligne de reçu** (`receipt_line`) | élément du catalogue ou examen prescrit, libellé, prix (figé au moment de la vente) |

Ajouts sur des tables existantes :
- **Établissement** : n° d'identification et mention de bas de reçu. Le nom, le logo, l'adresse et le téléphone existent déjà. Tout se saisit dans Paramètres › Établissement.
- **Comptabilité** : chaque transaction garde un lien vers le reçu qui l'a créée, et un nouveau statut **Annulée**.
- **Numéro de passage** : un compteur **par service et par jour**, remis à 1 chaque matin. Il réutilise le mécanisme de numérotation existant.

### Étape 4 : Gestion des caisses (écran d'accueil du module)

1. **Une carte par caisse** avec :
   - le statut ouverte / fermée ;
   - le caissier en poste ;
   - le total du jour ;
   - le bouton **Ouvrir**.
2. **Ouvrir une caisse** : saisie du fond de caisse, ce qui démarre une session. Une caisse ne peut être ouverte que par un caissier autorisé, et par un seul caissier à la fois.
3. **« + Nouvelle caisse »**, modification, activation / désactivation et choix des caissiers autorisés : **réservés au DIRIGEANT**.
4. **Réglages du module** (DIRIGEANT), séparés de l'écran d'encaissement :
   - catalogue de tarifs : ajout, modification, prix, ordre, désactivation ;
   - format du reçu et imprimante.

### Étape 5 : Écran d'encaissement (un seul écran, 2 à 3 clics)

```
┌──────────────────────┬─────────────────────────────────┬──────────────────────┐
│ 1. PATIENT           │ 2. SERVICE À PAYER              │ 3. PAIEMENT          │
│ Recherche nom / code │ Tuiles du catalogue, par service│ Récapitulatif        │
│ / téléphone          │ [Consultation générale 5 000]   │ Total : 5 000 FCFA   │
│ [+ Nouveau patient]  │ [Consultation spécialiste ...]  │ Mode : [Espèces]     │
│  (création rapide)   │ ─ Examens prescrits non payés ─ │        [Mobile Money]│
│                      │ [NFS — Labo 3 500]              │        [Carte] ...   │
│                      │                                 │ [ ENCAISSER ]        │
└──────────────────────┴─────────────────────────────────┴──────────────────────┘
```

- **Parcours type en 3 clics :** patient → tuile → **Encaisser**. Le mode « Espèces » est sélectionné par défaut, et le reçu s'imprime aussitôt.
- **Création rapide de patient :** nom, prénom, sexe, date de naissance (ou âge), téléphone. Le dossier se complète plus tard dans Patients.
- **Examens prescrits :** les demandes de laboratoire, d'imagerie, de cardiologie, d'anatomopathologie et d'endoscopie du patient, **non encore payées**, s'affichent comme tuiles, avec leur prix pris dans le catalogue. Une fois encaissée, la demande est marquée « payée ». Chaque service concerné voit alors qui a payé (voir §4-E).
- **Rapidité :** le catalogue et les caisses sont chargés une fois à l'ouverture. L'encaissement est un seul appel et l'impression est locale. Rien ne doit faire attendre le caissier.
- **Journal de la session**, sur le côté : les reçus du jour, avec **Réimprimer** et **Annuler** (motif obligatoire).

### Étape 6 : Le reçu

- **En-tête :** logo, nom, adresse, téléphone et n° d'identification de l'établissement. **Le nom du logiciel n'apparaît pas.**
- **Contenu :**
  - **PAYÉ** en gros ;
  - n° du reçu ;
  - date et heure ;
  - caisse et caissier ;
  - patient ;
  - service et lignes ;
  - montant et mode de paiement ;
  - **n° de passage** (en gros) ;
  - QR code, avec le n° du reçu imprimé en clair à côté ;
  - mention de bas de reçu.
- **Exemplaires :** l'original est imprimé pour le patient ; la trace reste dans le journal de la caisse, réimprimable avec la mention « DUPLICATA ».
- **Impression :**
  - mise en page générée par l'application, envoyée directement à l'imprimante choisie pour ce poste (mémorisée), sans boîte de dialogue à chaque reçu ;
  - format ticket thermique 80 mm ou A6 (voir §4-B) ;
  - repli en PDF si aucune imprimante n'est configurée.
- **Reçu annulé ou remboursé :** réimpression possible avec la mention **ANNULÉ** en rouge.

### Étape 7 : Annulation, remboursement, clôture

- **Annulation :** motif obligatoire, tracée (qui, quand, pourquoi). Le reçu passe à ANNULÉ et la transaction liée en Comptabilité passe à « Annulée ». Qui peut annuler : voir §4-F.
- **Remboursement** (après que le service a été rendu, ou en cas de litige) : **DIRIGEANT uniquement**. Il crée une sortie « Remboursement caisse » en Comptabilité.
- **Clôture de caisse (fin de service) :**
  - le caissier saisit le montant compté par mode de paiement ;
  - l'app calcule l'attendu (fond de caisse + encaissements − remboursements) et l'**écart** ;
  - le **rapport de clôture** s'imprime : totaux par mode et par service, nombre de reçus, annulations, écart ;
  - la caisse repasse à « fermée ».

### Étape 8 : Remontée vers la Comptabilité

- **Chaque encaissement crée automatiquement une recette** dans Comptabilité : date, montant, mode de paiement, service en catégorie, patient en tiers, référence = n° de reçu. Aucune double saisie.
- **Nouvel onglet « Caisses »** dans Comptabilité :
  - journal de tous les reçus, filtrable par caisse, jour, caissier, service et mode ;
  - historique des sessions et clôtures, avec les écarts ;
  - totaux du jour et du mois, par caisse et par mode ;
  - export Excel.
- **Tableau de bord :** les recettes du jour incluent les caisses, puisque ce sont des transactions de Comptabilité comme les autres.

### Étape 9 : Vérification par QR code

- **Contenu du QR :** un lien avec un jeton secret, impossible à deviner, propre à chaque reçu.
- **Page ouverte par le lien :**
  - **PAYÉ** en vert, ou **INVALIDE / ANNULÉ** en rouge ;
  - établissement, service, date, montant, n° du reçu ;
  - patient en version courte (« KOUASSI A. ») ;
  - **aucune donnée médicale**.
- **Dans l'application :** un bouton **« Vérifier un reçu »**, pour le personnel des services, par saisie du n° ou scan avec une douchette. C'est la vérification complète, avec connexion.
- **⚠️ Point d'architecture à trancher (§4-A).** Depuis que le serveur est intégré à l'application, il n'écoute que sur le poste lui-même. Un téléphone ne peut donc rien joindre. Il faut choisir comment la page de vérification est rendue accessible.

### Étape 10 : Vérifications

- Typecheck, lint et build.
- Test complet :
  1. création de 2 caisses ;
  2. ouverture ;
  3. patient nouveau et patient existant ;
  4. encaissement d'une consultation (n° de passage) et d'un examen prescrit ;
  5. impression ;
  6. scan du QR ;
  7. annulation ;
  8. clôture avec écart ;
  9. contrôle dans Comptabilité › Caisses ;
  10. connexion en tant que caissier : menu réduit, arrivée sur Caisse.

---

## 3. Découpage proposé en livraisons

| Livraison | Contenu | Intérêt |
| --- | --- | --- |
| **1** | Étapes 1 et 2 (renommage, rubrique Finance, rôle Caissier, menu filtré par rôle) | Visible immédiatement, sans risque |
| **2** | Étapes 3 à 6 (caisses, catalogue, encaissement, reçu imprimé avec QR) | La caisse est utilisable |
| **3** | Étapes 7 et 8 (annulation, clôture, onglet Caisses en Comptabilité) | Contrôle et comptabilité complets |
| **4** | Étape 9 (page de vérification QR, selon le choix §4-A) | Contrôle en plus du papier |

---

## 4. Points à trancher (ma recommandation en gras)

**A. Où se trouve la page de vérification du QR ?**
- A1. **Petite page web hébergée chez Hostinger** (PHP, ≈ 50 lignes), qui lit la base en lecture seule, uniquement à partir du jeton. Elle fonctionne partout, en wifi comme en 4G, même si le poste de caisse est éteint. Elle n'expose qu'une page qui affiche PAYÉ/ANNULÉ, pas le logiciel. *Nécessite un hébergement web, pas seulement MySQL.* **Recommandé.**
- A2. **Le poste de caisse publie la page sur le wifi de l'hôpital** (comme dans le cahier des charges). Rien sur Internet. En revanche, le lien contient l'adresse IP du poste : si le poste est éteint ou change d'adresse, le QR ne marche plus. Il faut une IP fixe par poste de caisse et une autorisation dans le pare-feu Windows.
- A3. **Pas de page web** : le QR ne sert qu'au bouton « Vérifier un reçu » dans l'application, via une douchette. C'est le plus simple, mais un téléphone seul ne peut pas vérifier.

**B. Format du reçu :** ticket thermique 80 mm, A6, ou les deux au choix par caisse ? **Les deux, réglable par caisse.** Quelle imprimante est prévue ?

**C. Modes de paiement :** **Espèces, Mobile Money (Orange / MTN / Moov / Wave, avec saisie du n° de transaction), Carte bancaire, Prise en charge (assurance / tiers payant).** Faut-il en ajouter ou en retirer ?

**D. Création de patient par le caissier :** le cahier dit « Patients en lecture », mais aussi « créé rapidement s'il est nouveau ». **Autoriser uniquement la création rapide (pas la modification).**

**E. Examens prescrits payés :** **les demandes d'examen affichent « Payé / Non payé » dans leur page (Laboratoire, Imagerie…), en information seulement, sans bloquer** leur réalisation. Faut-il au contraire bloquer un examen non payé ?

**F. Annulation d'un reçu :** **le caissier peut annuler un reçu de sa propre session, le jour même, avec un motif ; au-delà, ou pour un remboursement, DIRIGEANT uniquement.**

**G. Numéro de passage :** uniquement pour les consultations (comme dans le cahier), ou **pour tous les services (laboratoire, imagerie…), chacun avec sa propre numérotation par jour** ?

**H. Caisse hors connexion :** si Internet ou la base tombe, la caisse doit-elle continuer d'encaisser ?
- **V1 : caisse en ligne uniquement**, avec un message clair si la base est injoignable. Plus simple et plus sûr pour les numéros de reçu.
- Ensuite, si besoin : un mode hors connexion avec une numérotation propre à chaque caisse (`C2-000123`), synchronisée au retour du réseau.

**I. Prix modifiable à l'encaissement ?** **Non pour le caissier** (prix du catalogue uniquement, gage de contrôle). Une remise éventuelle serait réservée au DIRIGEANT, avec motif. Faut-il gérer les remises ?

**J. Nom de la rubrique :** « Finance » (singulier), comme demandé ? Et la rubrique se place-t-elle **avant** « Administration » dans le menu ?
