# Refonte graphique complète — Pandora Health

> Demande du 2026-10-04 : refonte graphique complète du front-end, avec un design professionnel,
> efficace et « super cool », qui suive le logo.
>
> Recommandations de la §9 retenues. **Étape 0 validée le 2026-10-04** (maquette
> « Néon clinique »). **Étape 1 faite** : vert et or du logo, neutres teintés vert, polices embarquées
> (Inter, Manrope, JetBrains Mono), mode Clair / Sombre / Automatique dans Paramètres › Apparence.
> Écran de connexion, activation et écrans bloquants de démarrage refaits (avancés de l'étape 3).
> **Étape 2 faite** : composants communs restylés (boutons, cartes, fenêtres, badges, en-têtes,
> graphiques) et bibliothèque `components/ui/` (champs, onglets, tableau, panneau latéral,
> notifications, indicateurs, chargements, écrans vides), recherche universelle **Ctrl+K**, page
> « Galerie des composants » (temporaire, via Ctrl+K).
> **Étape 3 faite** : barre latérale encre (élément actif lumineux, réductible en icônes, rappel
> d'abonnement en or), en-tête, tableau de bord (indicateurs, vue 360° et actions cliquables),
> fenêtre bloquante d'abonnement (encre et or), navigation de Paramètres avec icônes.
> **Étape 4 — lot A fait** (Patients, dossier patient, Rendez-vous, Consultations et leurs fenêtres de
> saisie) : script d'harmonisation réutilisable (indicateurs, tableaux, champs, libellés, titres,
> chargements, écrans vides, ancien violet → vert, ancien vert → turquoise, dégradés compatibles
> mode sombre) + retouches manuelles.
> **Lots B et C faits** (Caisse, Comptabilité ; Hospitalisation, Urgences, Bloc opératoire) : tableaux sur une
> ligne dans les zones qui défilent, couleurs des graphiques aux couleurs de la marque (gravité
> des urgences inchangée : code de tri médical).
> **Lot D fait** (Laboratoire, Imagerie, Cardiologie, Anatomopathologie, Endoscopie) : script complété
> par la conversion automatique des couleurs de graphiques.
> **Lot E fait** (Pharmacie, Stocks, Banque de sang, Approvisionnement) : script étendu aux tables de
> couleurs et aux nuances purple/indigo, repassé sur les lots A à D ; Ctrl+K classe d'abord les
> écrans dont le nom correspond.
> **Lot F fait** (RH, Qualité, Gestion des risques, Audit & Conformité, Documents & signature) : pastilles
> de filtre actives en vert marque (elles s'inversaient en mode sombre).
> **Lot G fait — étape 4 terminée** (IA & Prédictions, Rapports & Analyse, Automation Studio) : plus aucune
> ancienne couleur dans l'application (vérifié par recherche), graphique en barres qui ne déborde
> plus de sa carte. Connexion rapide en développement (champs vides = dernière connexion réussie,
> jamais dans l'application installée).
> **Étape 5 faite** (site Pandora) : même palette et mêmes polices (next/font), page d'accueil sur fond
> encre avec tracé ECG et aperçu de l'application à barre latérale encre, offres aux couleurs de la
> marque, connexion et inscription sur écran de marque (orbite, ECG), console à barre latérale encre,
> recettes en or.
> **Étape 6 faite — refonte terminée (2026-10-07)** : galerie temporaire retirée ; contrastes vérifiés par
> calcul (deux nuances corrigées : gris discret clair #83938a, vert des boutons en sombre #13853a) ;
> balayage des 27 écrans en clair et en sombre sans débordement ni erreur ; impression toujours claire.

---

## 1. Constat

**Le logo et l'application ne se ressemblent pas.**
- **Le logo** : un « P » **vert néon** lumineux, sur fond **noir profond**, avec une **orbite dorée**,
  un **tracé d'électrocardiogramme** et une **croix médicale**. Il évoque la technologie, la santé et
  quelque chose de haut de gamme.
- **L'application** : un accent **indigo/violet** (`accent-500 = #4f46e5`), hérité de l'ancienne
  maquette, avec des fonds gris clair génériques. Rien ne rappelle le logo, sauf le logo lui-même.
  Le site Pandora a la même identité indigo.

**Points techniques qui guident la méthode :**
- 139 fichiers d'écran, environ 31 000 lignes. Les couleurs sont écrites directement dans les classes
  (`text-gray-400` ×579, `border-gray-100` ×320, `bg-red-50` ×77…). Il n'y a presque pas de
  « jetons » (tokens) de couleur.
- Peu de composants communs : `Button`, `Card`, `Modal`, `StatusBadge`, `PageHeader`, deux
  graphiques. Les champs de saisie, tableaux, onglets et filtres sont refaits à la main dans chaque
  page, avec de petites différences d'une page à l'autre.
- Police système, aucune police embarquée.
- Le mode sombre est annoncé (« Sombre (bientôt) » dans Paramètres › Apparence) mais n'existe pas.
- Contraintes à respecter :
  - **hors connexion** : rien ne doit être chargé depuis Internet (polices et icônes comprises) ;
  - **impression** : les règles `@media print` existent déjà et doivent continuer de marcher ;
  - **usage médical** : la lisibilité passe avant les effets.

## 2. Direction artistique proposée : « Néon clinique »

L'idée : **un cockpit médical**. Une structure sombre, profonde et premium, comme le fond du logo, qui
encadre des **zones de travail claires et très lisibles**. Le **vert** sert à l'action, l'**or** aux
moments importants, et le **tracé ECG** est la signature visuelle.

| Zone | Rendu |
| --- | --- |
| Barre latérale, en-tête, écrans de connexion, d'activation et bloquants | **Noir-vert profond**, avec une lueur verte discrète sur l'élément actif |
| Contenu (listes, fiches, formulaires) | **Clair** en mode clair : fond très légèrement teinté vert-gris, cartes blanches. **Sombre** en mode sombre |
| Actions principales, liens, sélection | **Vert Pandora** |
| Éléments haut de gamme : abonnement, indicateurs clés, accomplissements | **Or** (l'orbite du logo), utilisé avec parcimonie |
| États (succès, alerte, danger, info) | Couleurs **distinctes de la marque** : voir §3.2 |

**Les éléments de signature tirés du logo :**
- **Le tracé ECG** :
  - indicateur de chargement (le pouls qui défile, à la place du simple rond qui tourne) ;
  - séparateur sous les titres de page ;
  - animation de l'écran de connexion ;
  - petites courbes dans les cartes d'indicateurs.
- **L'orbite dorée** :
  - anneau de progression (taux d'occupation, objectifs) ;
  - contour des éléments « premium » (abonnement) ;
  - halo derrière le logo à l'écran de connexion.
- **La lueur verte (glow)** : réservée à l'élément actif du menu, au champ en cours de saisie et au
  bouton principal au survol. Elle n'est **jamais** permanente sur le contenu.
- **La croix médicale** : écrans vides (« aucun patient »), icône d'application, filigrane très léger
  de l'écran de connexion.

**Ce qu'on évite :**
- le néon partout, qui fatigue l'œil et fait gadget pour un outil utilisé 8 h par jour ;
- le texte vert sur fond noir pour les données ;
- les dégradés criards.

Le « cool » vient de la **structure sombre, des micro-animations et des détails de signature**, pas du
fluo.

## 3. Système de design (tokens)

### 3.1 Palette de marque (proposée, ajustable en §9)

| Rôle | Nuances principales |
| --- | --- |
| **Encre** (structure sombre) | `950 #050907` · `900 #0a120d` · `800 #0f1b14` · `700 #17261d` · `600 #22352a` |
| **Vert Pandora** (primaire) | `50 #ecfdf1` · `100 #d3f9de` · `200 #a8f0c0` · `300 #6fe297` · `400 #34cc6b` · `500 #16b24f` · `600 #0d9140` · `700 #0d7235` · `800 #0f5a2d` · `900 #0e4a27` |
| **Or orbite** (accent) | `200 #fbe8b3` · `300 #f6d47c` · `400 #efbc48` · `500 #dea127` · `600 #b9811b` · `700 #8f6217` |
| **Neutres** (surfaces, textes, bordures) | gris légèrement teinté vert, du `50 #f6f8f7` au `900 #141a17` |

Les valeurs exactes seront vérifiées pour le contraste : texte normal **AA (4,5:1)** sur chaque
surface, en clair comme en sombre. Les nuances trop claires (vert-400 par exemple) ne servent jamais
au texte sur fond blanc.

### 3.2 Couleurs d'état : ne pas confondre avec la marque

Si le bouton principal est vert, un badge « Payé » vert ne se distingue plus d'un bouton. Je propose :

| État | Couleur | Remarque |
| --- | --- | --- |
| Succès | **turquoise / émeraude bleuté** (`#0f9f8a`) | toujours accompagné d'une icône ✓ |
| Alerte | **ambre** (`#d97706`) | distinct de l'or de marque, plus orangé et sans brillance |
| Danger / critique | **rouge** (`#dc2626`) | urgences, résultats critiques, impayés |
| Info | **bleu** (`#2563eb`) | |
| Neutre | gris teinté | |

Règle d'accessibilité : un état n'est **jamais** indiqué par la couleur seule. Il y a toujours aussi
une icône ou un libellé, ce qui est important pour les daltoniens et pour l'impression noir et blanc.

### 3.3 Tokens sémantiques

Les pages n'utiliseront plus `gray-400` ou `indigo-500` directement, mais des **rôles** :

```
surface        fond de l'application        surface-raised   cartes
surface-sunken zones en creux               surface-inverse  barre latérale (encre)
ink            texte principal              ink-muted        texte secondaire   ink-faint  indications
line           bordures                     line-strong      bordures marquées
primary-*      vert Pandora                 gold-*           or
success / warning / danger / info  (+ variantes -soft pour les fonds de badge)
focus          anneau de focus (vert + halo)
```

Chaque rôle a une valeur en **clair** et une en **sombre**. Le mode sombre devient donc un simple
changement de valeurs, sans retoucher les 139 écrans une deuxième fois.

### 3.4 Typographie (embarquée, fonctionne hors connexion)

- **Titres** : *Manrope* (ou *Plus Jakarta Sans*). Géométrique, moderne, s'accorde avec les courbes
  du « P ».
- **Texte et interfaces** : *Inter*. Très lisible en petit, chiffres tabulaires pour les tableaux et
  les montants.
- **Codes et identifiants** (n° de dossier, codes d'activation, n° de reçu) : *JetBrains Mono*.
- Embarquées via les paquets `@fontsource` : fichiers dans l'application, aucun appel à Google Fonts.
- Échelle typographique fixe, de 12 à 32 px, avec des interlignes adaptés à la saisie dense.

### 3.5 Formes, profondeur, mouvement

- **Arrondis** : 10 px pour les champs et boutons, 14 px pour les cartes, 20 px pour les modales, plein
  pour les pastilles.
- **Ombres** :
  - mode clair : douces et teintées vert-noir, sur 3 niveaux ;
  - mode sombre : bordures lumineuses à la place des ombres.
- **Grille d'espacement** de 4 px. Deux densités : **confortable** par défaut et **compacte** pour
  les tableaux longs. La densité compacte est un réglage de Paramètres › Apparence.
- **Animations** de 150 à 250 ms, uniquement pour comprendre ce qui se passe : ouverture de modale,
  apparition d'une ligne, changement d'onglet. Elles respectent le réglage Windows « réduire les
  animations ».

## 4. Bibliothèque de composants (`src/renderer/src/components/ui/`)

Tout est construit **une seule fois**, puis utilisé partout. C'est aussi ce qui rendra l'application
plus **efficace** et cohérente d'une page à l'autre.

| Famille | Composants |
| --- | --- |
| Actions | `Button` (principal, secondaire, fantôme, danger, or), `IconButton`, `ButtonGroup`, `SplitButton` |
| Saisie | `Input`, `Textarea`, `Select`, `Combobox` (recherche dans une liste : patients, médecins…), `DatePicker`, `NumberInput` / `MoneyInput` (FCFA), `Checkbox`, `Radio`, `Switch`, `FileDrop` (dépôt de résultats PDF), `Field` (libellé, aide, erreur) |
| Données | `DataTable` (tri, filtres, en-tête fixe, pagination, sélection, densité, export), `KeyValue` (fiches), `Timeline` (historique patient), `Stat` / `KpiCard` (avec mini-courbe ECG), `ProgressRing` (orbite), `Avatar`, `Tag` |
| Navigation | `Sidebar` (groupes repliables), `Topbar`, `Tabs`, `Breadcrumb`, `Stepper` (parcours en étapes), **`CommandPalette` (Ctrl+K)** |
| Retours | `Badge` d'état, `Toast`, `Alert` / bandeaux, `EmptyState`, `Skeleton` (chargement), `PulseLoader` (tracé ECG), `ConfirmDialog` |
| Conteneurs | `Card`, `Modal`, `Drawer` (panneau latéral pour voir ou éditer sans quitter la liste), `Popover`, `Tooltip`, `Section` |
| Graphiques | `LineChart`, `BarChart`, `DonutChart`, `Sparkline` aux couleurs du thème, lisibles en clair et en sombre |

**Plus d'efficacité au quotidien :**
- **Ctrl+K** : recherche universelle. Taper un nom de patient, un n° de dossier ou un écran
  (« caisse », « labo »), puis Entrée. C'est la fonctionnalité « super cool » la plus utile.
- **Raccourcis clavier** dans les listes (↑ ↓ Entrée, `N` pour nouveau) et dans la caisse.
- **Tiroir latéral** (`Drawer`) au lieu de changer de page pour consulter une fiche ou un résultat.
- **Squelettes de chargement** à la place des écrans vides qui tournent.
- **Barre de recherche de l'en-tête** reliée à la palette Ctrl+K (aujourd'hui elle ne fait rien).

## 5. Écrans transverses (refaits en premier)

1. **Connexion et activation** :
   - fond **encre** avec le logo au centre, son **orbite dorée en rotation lente** et un **tracé ECG**
     qui défile en bas ;
   - formulaire sur une carte en verre dépoli.
   C'est la première impression, l'écran « waouh ».
2. **Cadre de l'application (shell)** :
   - barre latérale **encre** repliable en mode icônes, élément actif avec barre verte lumineuse et
     groupes avec icônes ;
   - en-tête clair avec recherche Ctrl+K, état de connexion, notifications et profil ;
   - bandeaux (hors ligne, abonnement) au nouveau style.
3. **Tableau de bord** :
   - indicateurs en cartes avec mini-courbes ;
   - graphiques retravaillés ;
   - accès rapides ;
   - « à traiter aujourd'hui » mis en avant.
4. **Écrans bloquants** (abonnement expiré, base indisponible, mise à jour requise) : encre et or,
   messages clairs.
5. **Paramètres** : sections en cartes, Abonnement en or, **mode sombre enfin actif**.

## 6. Écrans métier (migration module par module)

Une fois les composants prêts, chaque module est migré : composants communs, tokens, en-tête de page
unifié, tableau unifié, formulaires en `Field`, états vides et chargements. Ordre proposé, du plus
utilisé au moins utilisé :

| Lot | Modules |
| --- | --- |
| A | Patients (liste, dossier patient avec chronologie), Rendez-vous (calendrier), Consultations |
| B | Caisse (gros boutons, lisible à distance, raccourcis), Comptabilité |
| C | Hospitalisation, Urgences (code couleur de gravité très lisible), Bloc opératoire |
| D | Laboratoire, Imagerie, Cardiologie, Anatomopathologie, Endoscopie (même gabarit « demande → résultat ») |
| E | Pharmacie, Stocks, Banque de sang, Approvisionnement |
| F | RH, Qualité, Risques, Audit, Documents et signature |
| G | IA & Prédictions, Rapports & Analyse, Automation Studio |

Les modules du lot D se ressemblent beaucoup. J'en profiterai pour leur donner **un même gabarit**,
ce qui réduit le code et améliore la cohérence.

## 7. Méthode technique (sans tout casser)

1. **Bascule immédiate de la marque** : dans `main.css`, `accent-*` passe de l'indigo au **vert
   Pandora**. Comme toutes les pages utilisent déjà `accent-*`, toute l'application change de couleur
   d'un coup, sans risque. C'est une première étape visible tout de suite.
2. **Tokens sémantiques et mode sombre** : variables CSS par rôle (§3.3), en clair et en sombre, avec
   le réglage dans Paramètres › Apparence (Clair / Sombre / Automatique selon Windows).
3. **Remplacement mécanique** des couleurs écrites en dur (`text-gray-900` → `text-ink`,
   `border-gray-100` → `border-line`…) par un script, vérifié écran par écran. Ce sont des milliers
   d'occurrences, impossibles à faire à la main sans erreur.
4. **Composants `ui/`** (§4), puis **écrans transverses** (§5), puis **lots métier** (§6).
5. **Contrôle visuel** : captures avant/après de chaque écran (le banc de test Playwright existe déjà),
   en clair et en sombre. L'impression est contrôlée sur les écrans qui ont un bouton « Imprimer ».
6. **Site Pandora (`pandora-web`)** : même palette, mêmes polices, même logo. La page d'accueil en
   **encre, vert et or** sera très spectaculaire. La console admin reprend les composants dans
   l'esprit de l'application.

Rien ne change dans la logique métier, les données, les droits ou le mode hors connexion : c'est
uniquement de l'affichage.

## 8. Étapes et durée estimée

| Étape | Contenu | Durée |
| --- | --- | --- |
| 0 | **Maquette de validation** : page de démonstration interactive avec palette, typographie, composants, écran de connexion et tableau de bord, en clair et en sombre. Tu valides ou corriges la direction avant toute modification du code | ½ jour |
| 1 | Bascule vert/or, tokens sémantiques, polices embarquées, mode sombre (base) | ½ jour |
| 2 | Bibliothèque de composants `ui/`, plus la palette Ctrl+K | 2 jours |
| 3 | Écrans transverses : connexion, activation, cadre, tableau de bord, écrans bloquants, paramètres | 1½ jour |
| 4 | Lots A à G | 4 à 5 jours |
| 5 | Site Pandora (accueil et console) | 1 jour |
| 6 | Passe finale : contraste, mode sombre, impression, captures, nettoyage | 1 jour |

**Total : environ 10 à 12 jours de travail.** Chaque étape est livrable seule : l'application reste
utilisable et publiable entre deux étapes.

## 9. Décisions à prendre (corrigez directement)

| # | Question | Ma recommandation | Votre choix |
| --- | --- | --- | --- |
| A | Mode par défaut | **Clair** (contenu clair, barre latérale encre), sombre disponible dans Apparence | |
| B | Intensité des effets néon (lueur, animations) | **Discrète** : réservée aux éléments actifs et aux écrans d'accueil | |
| C | Couleur « succès » distincte du vert de marque (§3.2) | **Oui** (turquoise), pour ne pas confondre états et actions | |
| D | Polices | **Manrope** (titres) + **Inter** (texte) + **JetBrains Mono** (codes) | |
| E | Palette Ctrl+K et raccourcis clavier | **Oui** | |
| F | Inclure le site Pandora dans la refonte | **Oui**, à l'étape 5 | |
| G | Densité compacte au choix (Apparence) | **Oui** | |
| H | Commencer par la maquette de validation (étape 0) | **Oui** | |

## 10. Outils que je peux utiliser

| Outil | Usage dans ce projet |
| --- | --- |
| **Page de démonstration (Artifact)**, avec la compétence *artifact-design* | Étape 0 : je publie une page web privée et interactive (palette, composants, écran de connexion, tableau de bord, bascule clair/sombre) que tu ouvres dans ton navigateur pour valider la direction. C'est le moyen le plus rapide de décider avant de toucher aux 139 écrans |
| Compétence ***dataviz*** | Refonte des graphiques (tableau de bord, rapports, laboratoire…) : couleurs de séries accessibles, cohérentes en clair et en sombre |
| Compétences ***paper-desktop : code-to-design / design-to-code*** | Si tu utilises Paper Desktop : je génère les maquettes des écrans à partir du code, tu les retouches visuellement, puis je les traduis en code. ⚠️ Paper Desktop **n'est pas joignable** en ce moment (connexion refusée) : lance-le si tu veux passer par là |
| Compétence ***run*** et banc de test Playwright | Lancer l'application et faire les captures avant/après de chaque écran |
| ***code-review*** / ***simplify*** | Relecture des grosses migrations (remplacement des couleurs, composants) |
