# Maquette du Core — Prompt pour Stitch

Ce document contient tout ce qu'il faut pour générer la maquette du Core Pandora One avec
[Stitch](https://stitch.withgoogle.com) (l'outil de design UI par IA de Google) : propositions de
palettes de couleurs, brief de style, et le prompt prêt à copier-coller.

> **✅ Choix validé** : mise en page du dashboard = variante générée par Stitch ("option 3"),
> couleurs = **Option B — Charbon & Émeraude**. La section 4 est mise à jour avec cette palette :
> ce sont des prompts de **continuation**, à coller dans la même conversation/projet Stitch que le
> dashboard déjà validé (pour qu'il hérite automatiquement du même style), palette réaffirmée en
> toutes lettres au cas où tu repartes d'une session neuve.

## 1. Palettes de couleurs proposées

L'app codée actuellement utilise l'**Option A**. Après comparaison sur Stitch, l'**Option B** a
été retenue pour la suite de la maquette (voir section 4).

### Option A — Navy & Or (actuellement implémentée)

Sobre, "trust" bancaire/corporate, rappelle l'accent doré du document de cahier des charges
Pandora Afrika.

| Rôle | Couleur | Hex |
|---|---|---|
| Fond sidebar / surfaces sombres | Navy 900 | `#0F172A` |
| Navy 800 (hover sidebar) | Navy 800 | `#1E293B` |
| Accent principal (CTA, logo, focus) | Or 500 | `#D99E2B` |
| Accent hover/actif | Or 600 | `#B8791A` |
| Fond de page | Gris très clair | `#F8FAFC` |
| Surfaces (cards) | Blanc | `#FFFFFF` |
| Texte principal | Slate 900 | `#0F172A` |
| Texte secondaire | Slate 500 | `#64748B` |
| Bordures | Slate 200 | `#E2E8F0` |

### Option B — Charbon & Émeraude

Plus "croissance / finance africaine", le vert évoque directement l'argent et la santé
financière (cohérent avec le Business Health Score) sans copier le bleu SaaS générique.

| Rôle | Couleur | Hex |
|---|---|---|
| Fond sidebar | Charbon 900 | `#111827` |
| Charbon 800 (hover) | Charbon 800 | `#1F2937` |
| Accent principal | Émeraude 500 | `#10B981` |
| Accent hover/actif | Émeraude 600 | `#059669` |
| Fond de page | Gris très clair | `#F9FAFB` |
| Surfaces (cards) | Blanc | `#FFFFFF` |
| Texte principal | Gris 900 | `#111827` |
| Texte secondaire | Gris 500 | `#6B7280` |
| Bordures | Gris 200 | `#E5E7EB` |

### Option C — Ardoise & Ambre

Plus chaleureux/humain, l'ambre est moins "luxe" que l'or (Option A) et plus proche d'un signal
d'alerte/action — utile si on veut réserver l'or/jaune uniquement aux alertes "Attention" du
Control Tower et pas au branding.

| Rôle | Couleur | Hex |
|---|---|---|
| Fond sidebar | Ardoise 900 | `#1C1917` |
| Ardoise 800 (hover) | Ardoise 800 | `#292524` |
| Accent principal | Ambre 500 | `#F59E0B` |
| Accent hover/actif | Ambre 600 | `#D97706` |
| Fond de page | Beige très clair | `#FAFAF9` |
| Surfaces (cards) | Blanc | `#FFFFFF` |
| Texte principal | Stone 900 | `#1C1917` |
| Texte secondaire | Stone 500 | `#78716C` |
| Bordures | Stone 200 | `#E7E5E4` |

### Couleurs sémantiques (communes aux 3 options)

Utilisées pour le Control Tower et le Centre d'alertes (§3.5 et §3.6 du cahier des charges) —
ne changent pas selon la palette choisie, elles doivent rester universellement reconnaissables :

| Statut | Couleur | Hex |
|---|---|---|
| Stable / OK | Vert | `#22C55E` |
| Croissance / info | Bleu | `#3B82F6` |
| Attention / prévention | Ambre | `#F59E0B` |
| Risque / critique | Rouge | `#EF4444` |
| Opportunité | Violet | `#8B5CF6` |

## 2. Brief de style (à réutiliser dans le prompt)

- **Typographie** : police système uniquement (pas de police distante à charger — cohérent avec
  l'esprit offline-first du produit), style humaniste sans-serif type Inter/SF/Segoe UI.
- **Densité** : dashboard dense mais aéré — cards avec coins arrondis (8-12px), ombres légères,
  jamais de gris sur gris sans contraste.
- **Composants déjà codés à respecter visuellement** : sidebar fixe à gauche (~240px) avec logo
  en haut, icônes de navigation, item actif surligné ; header horizontal avec nom d'entreprise à
  gauche et profil utilisateur (avatar initiales + nom + rôle) à droite.
- **Plateforme** : application desktop (Electron), pas un site web — pas de header marketing, pas
  de footer, l'app occupe tout l'écran.

## 3. Prompt Stitch — Tableau de bord dirigeant (écran principal du Core)

```
Design a professional desktop SaaS dashboard for "Pandora One", a business management platform
for African SMB entrepreneurs (retail, health clinics, restaurants). This is the main "Core"
dashboard screen — the one the business owner sees every morning.

STYLE: Clean, modern, trustworthy corporate SaaS design (think Linear, Stripe Dashboard, Notion).
Dense but breathable, rounded cards (8-12px radius), soft shadows, generous whitespace inside
cards. System sans-serif font (Inter-style). Desktop app layout, no marketing header/footer —
the interface fills the whole window.

COLOR PALETTE:
- Sidebar background: dark navy #0F172A, hover state #1E293B
- Primary accent (logo, active nav item, primary buttons, focus rings): gold #D99E2B, hover
  #B8791A
- Page background: very light gray #F8FAFC
- Card surfaces: white #FFFFFF with 1px border #E2E8F0
- Primary text: #0F172A, secondary/muted text: #64748B
- Status colors (use consistently across all cards): green #22C55E (stable/good), blue #3B82F6
  (growth/info), amber #F59E0B (attention/warning), red #EF4444 (critical/risk), purple #8B5CF6
  (opportunity)

LAYOUT:
- Left sidebar (~240px, dark navy background): logo "P" in a gold rounded square + "Pandora One"
  wordmark at top. Below it, a vertical nav list with icons: Tableau de bord (active/highlighted),
  Finance, Ventes, Stocks, RH, Paramètres. Small "Secteur : Retail" label pinned at the bottom.
- Top header (white, full width of remaining space): company name "Entreprise Démo" (bold) with
  small subtitle "Tableau de bord dirigeant" underneath. On the right: a rounded pill with a
  circular avatar (initials "AD"), the user's name "Amina Dirigeante" and role "Dirigeant" below
  it in smaller gray text, plus a logout icon button.
- Main content area (light gray background, padded), organized as a grid of cards:

  1. Large "Business Health Score" card at top-left: a big number "84/100" in bold, a small
     upward trend arrow with "+3 points cette semaine" in green, and one sentence underneath in
     gray text: "Porté par la croissance des ventes, freiné par un stock de produit X en
     tension." Include a subtle circular progress ring or gauge around the score number.

  2. Three small KPI cards in a row next to/below it: "Chiffre d'affaires" with a value and a
     small trend sparkline, "Trésorerie" with a value, "Alertes actives" with a count badge.

  3. A "Control Tower" section: a horizontal row of 6 compact status cards, one per domain —
     Finance (green, "Stable"), Ventes (blue, "Croissance"), Stocks (amber, "Attention"),
     Ressources humaines (green, "Stable"), Clients (amber, "Risque"), Opérations (red,
     "Critique"). Each card has the domain name, a colored status dot/badge, and a one-line
     description underneath (e.g. "Un processus clé est bloqué ou en retard significatif" for
     Opérations).

  4. A "Centre d'alertes" card/list below, showing 3-4 prioritized alert rows, each with a
     colored severity dot (red/amber/purple for opportunity), a short title (e.g. "Stock de
     Produit X proche du seuil critique", "Client habituel inactif depuis 15 jours",
     "Opportunité : pic de demande détecté sur la région Nord"), and a small "Voir" action link
     on the right.

TONE: The interface should feel calm and in-control, never alarming or cluttered — this product's
whole philosophy is turning raw data into a handful of clear, prioritized decisions, not
overwhelming the user with numbers.

Generate this as a high-fidelity desktop web app screen.
```

## 4. Prompts de continuation — reste des écrans du Core (palette Option B validée)

**À faire avant tout** : colle d'abord ce court message dans la **même conversation Stitch** que
celle où tu as généré et choisi le dashboard ("option 3"), pour que tout hérite automatiquement du
même style :

```text
Great, I'm keeping this exact layout and style. From now on, use this permanent color palette on
every screen: sidebar background charcoal #111827 (hover #1F2937), primary accent emerald #10B981
(hover #059669), page background #F9FAFB, white cards with #E5E7EB borders, primary text #111827,
secondary text #6B7280. Keep the same sidebar navigation, header, card shapes and typography as
the dashboard we just approved. Now generate the following additional screens for the same app,
one by one:
```

Puis enchaîne avec chacun des prompts ci-dessous (un par un, dans la foulée) :

### Control Tower (vue détaillée, drill-down)

```text
Design the "Control Tower" detail screen, same design system as before (charcoal #111827 sidebar,
emerald #10B981 accent). A full-width table/grid of business domains (Finance, Ventes, Stocks,
Ressources humaines, Clients, Opérations), each row showing a colored status badge (green/blue/
amber/red), a one-line explanation, and a chevron to drill down further into department → process
→ specific event → recommended action. Include breadcrumb-style navigation at the top showing the
drill-down path (e.g. "Entreprise > Stocks > Produit X > Rupture prévue").
```

### Centre d'alertes (vue complète)

```text
Design a dedicated "Centre d'alertes" screen, same design system as before. A vertical list of
alert cards grouped by priority level — 🔴 Critique, 🟠 Élevé, 🟡 Prévention, 🟣 Opportunité (use
red/amber/amber-light/purple accents respectively, keeping the emerald accent only for primary
actions). Each alert card shows a title, a short explanation of why it's happening, and a primary
"Voir la recommandation" button plus a secondary "Ignorer" link. Include a filter bar at the top
(by domain: Finance, Ventes, Stocks, RH, Clients, Opérations).
```

### Comptabilité & Finance

```text
Design the "Comptabilité & Finance" screen, same design system as before. Top row: 3 summary cards
— "Chiffre d'affaires" (with monthly trend), "Trésorerie actuelle", "Factures impayées" (count +
total amount, in red if overdue). Below: a table of recent transactions with columns Date,
Description, Client/Fournisseur, Montant, Statut (badge: Payé/En attente/En retard). A prominent
emerald "Nouvelle facture" button top-right.
```

### Utilisateurs & Rôles

```text
Design the "Utilisateurs & Rôles" settings screen, same design system as before. A table listing
team members: avatar with initials, name, email, role badge (Dirigeant/Manager/Employé), status
(Actif/Invité en attente), and an actions menu (⋯) per row. An emerald "Inviter un utilisateur"
button top-right opens conceptually to a simple modal with fields Email + Rôle (dropdown).
```

### Mémoire d'entreprise (assistant conversationnel)

```text
Design the "Mémoire d'entreprise" screen, same design system as before. A chat-style interface:
message history on the left/center (user question in a light bubble, AI answer in a white card
with sourced references — e.g. dates, involved people, linked documents), and a text input at the
bottom with a send button. Include one example exchange: user asks "Pourquoi avons-nous arrêté de
travailler avec ce fournisseur ?" and the AI answers with a sourced explanation referencing dates
and people, plus small citation chips below the answer.
```

### Écran de connexion (restylé avec la palette retenue)

```text
Design a split-screen login page for "Pandora One", using the same charcoal/emerald palette
(#111827 / #10B981) as the rest of the app. Left panel (42% width, charcoal #111827 background
with a subtle radial emerald glow): logo "P" in an emerald rounded square + "Pandora One"
wordmark, a large headline "Le système nerveux numérique de votre entreprise.", a short
description, and a row of small pill badges listing: Observer, Comprendre, Prévoir, Alerter,
Recommander, Automatiser, Exécuter, Vérifier, Apprendre. Right panel (white/light gray
background): centered login form with email and password fields (icon-prefixed inputs), a
charcoal "Se connecter" button with an arrow icon, and a small helper card below listing demo
credentials.
```

## 5. Comment utiliser ce document (état actuel : étape 5)

1. ~~Va sur stitch.withgoogle.com, crée un nouveau projet.~~ ✅ fait
2. ~~Génère le tableau de bord principal.~~ ✅ fait
3. ~~Compare les palettes, tranche.~~ ✅ fait — Option B (Charbon & Émeraude) retenue
4. ~~Choisis la variante de mise en page.~~ ✅ fait — "option 3"
5. **→ Étape actuelle** : dans la **même conversation Stitch**, colle le message de verrouillage
   de style (début de la section 4), puis enchaîne les 6 prompts d'écrans un par un.
6. Une fois tous les écrans générés et validés visuellement, je reprends les décisions (palette,
   composants, mise en page de chaque carte) et je les code dans `app-core` à la suite de ce qui
   existe déjà (`LoginScreen`, `AppShell`) — un écran/module à la fois.
