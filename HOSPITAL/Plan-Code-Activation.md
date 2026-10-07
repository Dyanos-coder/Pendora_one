# Code d'activation des postes (au lieu des accès à la base)

> Demande du 2026-10-02 : quand on ajoute un hôpital sur le site Pandora, le site génère une chaîne de
> caractères. Dans l'application Pandora Health, on saisit **seulement cette chaîne** ; l'application
> contacte le site, récupère les accès à la base et les enregistre. Gérer aussi le cas où la chaîne ne
> correspond plus à une base qui fonctionne.
>
> **Fait le 2026-10-02**, avec les recommandations de la §7 (code par hôpital réaffichable par les
> admins, saisie manuelle de secours derrière Ultra Admin, code invisible aux prospecteurs, sans
> expiration ni limite de postes). Vérifié de bout en bout (site local + application, profil de test
> et base locale) : code faux refusé, activation par l'assistant (code tapé en minuscules avec des
> espaces accepté), poste listé sur le site, mot de passe enregistré devenu faux → accès à jour
> récupérés seuls, site injoignable → accès conservés, révocation → code redemandé au lancement
> suivant, ancien code refusé après régénération, poste configuré à la main inscrit automatiquement.
>
> **Modifié le 2026-10-02 à la demande** : le poste garde son code et le site le **vérifie à chaque
> lancement** ; sans code, avec un code régénéré ou un poste révoqué, l'application **redemande le code**
> (régénérer le code oblige donc tous les postes à saisir le nouveau). La section Ultra Admin est
> supprimée : Paramètres › Établissement affiche le **code** du poste (plus jamais les accès à la
> base), la clé de l'assistant IA et les modules installés (dirigeant et administratif). La saisie manuelle des accès et
> l'inscription automatique des anciens postes sont retirées : un poste sans code le demande au
> lancement. Site injoignable au lancement → le poste continue avec ses accès enregistrés.
>
> **Mise en ligne** : (1) appliquer la migration du site sur sa base Hostinger
> (`npx prisma migrate deploy` dans `pandora-web`), (2) pousser le site, (3) générer le code des
> hôpitaux déjà enregistrés (bouton « Générer le code » sur leur fiche), (4) publier l'application.

---

## 1. Aujourd'hui / demain

**Aujourd'hui** : au premier lancement, quelqu'un tape sur chaque poste l'hôte, le nom de la base,
l'utilisateur et le **mot de passe** de la base. Si la base ne répond plus alors qu'Internet marche,
l'application redemande ces accès.

**Demain** :

```
 Site Pandora (admin)                    Poste de l'hôpital
 ────────────────────                    ──────────────────
 Ajoute l'hôpital (accès à la base)
 → le site génère le code :
   PND-7KQ2-M9XA-4TFR-H3WC-8LDN  ─────►  1er lancement : « Code d'activation » [ PND-…  ]
                                          │
                                          ▼  HTTPS
                                 ◄────── POST /api/public/activate { code, nom du poste }
 vérifie le code, teste la base,
 enregistre le poste, renvoie :
 accès à la base + jeton du poste ─────►  enregistre le tout chiffré (coffre Windows)
                                          → migrations → écran de connexion habituel
```

Plus personne ne voit ni ne tape le mot de passe de la base.

## 2. Mon avis : oui, c'est mieux, avec une nuance importante

**Ce que ça apporte vraiment :**

1. **Le personnel de l'hôpital ne connaît plus le mot de passe de la base.** Il ne peut donc plus s'y
   connecter avec un outil (phpMyAdmin, HeidiSQL…) pour lire ou modifier des données en dehors de
   l'application. C'est le gain principal.
2. **Changer le mot de passe devient facile.** Pandora le change chez l'hébergeur puis sur le site, et
   tous les postes récupèrent le nouveau tout seuls. Aujourd'hui, il faudrait repasser sur chaque poste.
3. **On voit et on contrôle les postes.** Le site sait quels postes sont activés pour chaque hôpital
   (nom, version, dernière connexion), et un poste perdu ou volé peut être **révoqué**.
4. **Installation plus simple et sans erreur de saisie** : un seul code au lieu de cinq champs.

**La nuance :** l'application se connecte **directement** à la base, donc le mot de passe finit
quand même sur chaque poste, chiffré par le coffre de Windows. Une personne qui maîtrise
l'informatique et qui a les droits administrateur sur le poste pourrait, avec des efforts, le
retrouver. Ce système protège très bien contre les **utilisateurs ordinaires** et les **erreurs**,
pas contre un **expert déterminé**. La seule protection complète serait que les postes ne parlent
plus jamais directement à la base (tout passerait par un serveur Pandora). C'est l'architecture
qu'on vient de quitter avec le backend embarqué, et elle coûterait un hébergement. Je ne le
recommande pas maintenant.

**Une précision sur la « chaîne cryptée » :** il ne faut **pas** que le code contienne les accès
chiffrés. L'application devrait alors embarquer la clé pour les déchiffrer, et n'importe qui pourrait
l'extraire du programme et lire les accès de tous les hôpitaux. Le code doit être une **clé
aléatoire** (impossible à deviner) qui ne contient rien. Les accès restent sur le site, qui ne les
donne qu'à un poste présentant un code valide. C'est aussi ce qui permet de révoquer un code.

## 3. Sécurité du code

- **Format** : `PND-` suivi de 25 caractères aléatoires, sans caractères ambigus (pas de 0/O, 1/I),
  regroupés par 5. Impossible à deviner : environ 125 bits de hasard.
- **Stockage sur le site** : seulement une empreinte (hash) du code, plus une version chiffrée si les
  admins doivent pouvoir le réafficher (décision B).
- **Un code par hôpital, réutilisable** pour installer tous ses postes, **régénérable** : régénérer
  rend l'ancien code inutilisable, sans déconnecter les postes déjà activés.
- **Chaque poste reçoit son propre jeton** à l'activation. C'est ce jeton, pas le code, qui sert
  ensuite à récupérer les nouveaux accès. Révoquer un poste n'affecte que ce poste.
- **Anti force brute** : 10 essais ratés par adresse IP et par heure, puis attente. Chaque activation
  est inscrite dans le journal du site.
- **Transport** : HTTPS uniquement (Vercel). Pas de code ni d'accès dans les journaux.

## 4. Gérer « le code ne correspond plus à une base qui fonctionne »

| Situation | Ce que fait l'application | Ce que voit l'utilisateur |
| --- | --- | --- |
| Code inconnu, régénéré ou faux | Le site répond « code invalide » | « Code d'activation invalide ou remplacé. Demandez le nouveau code à Pandora. » |
| Code bon, mais la base ne répond pas | Le site teste la base **avant** de répondre et refuse | « La base de données de votre établissement ne répond pas. Pandora a été prévenu. » Le site marque l'hôpital « base injoignable ». |
| Poste déjà activé, base injoignable alors qu'Internet marche | L'application demande d'abord au site les **accès à jour** (avec le jeton du poste). Si ce sont de nouveaux accès qui marchent, elle les enregistre et repart toute seule | Rien, si ça marche. Sinon, écran « Base indisponible » : **Réessayer**, **Continuer hors connexion**, **Saisir un nouveau code** |
| Le mot de passe de la base a changé chez l'hébergeur | Pandora met à jour l'hôpital sur le site, puis les postes récupèrent le nouveau mot de passe au prochain échec | Rien (au pire quelques secondes de « hors connexion ») |
| Poste révoqué ou hôpital supprimé sur le site | Le site répond « poste révoqué » | Écran d'activation : « Ce poste n'est plus autorisé. Saisissez un code d'activation. » Les données locales ne sont pas effacées. |
| Site Pandora injoignable (panne, pas d'Internet) | Jamais confondu avec un code invalide : l'application garde ses accès et continue (en ligne si la base répond, sinon hors connexion) | Le message habituel « hors connexion » si besoin |
| L'hôpital change de base (nouvel hébergeur) | Pandora modifie l'hôpital sur le site, puis les postes récupèrent les nouveaux accès. Si c'est une **autre** base (autre utilisateur), l'application demande de se reconnecter, comme aujourd'hui | Retour à l'écran de connexion |

Règle importante : l'application **n'efface jamais** ses accès sur une simple erreur réseau. Seule une
réponse explicite du site (« code invalide », « poste révoqué ») déclenche l'écran d'activation.

## 5. Ce qui change, étape par étape

### Site Pandora (`pandora-web`)

1. **Base du site** : sur `Hospital`, ajouter le code d'activation (empreinte, plus la version
   chiffrée selon B) et sa date de génération. Nouveau modèle `Device` (poste) : hôpital, nom du poste,
   empreinte du jeton, version de l'application, date d'activation, dernière connexion, date de
   révocation.
2. **Génération du code** à l'ajout d'un hôpital, avec un bouton **« Régénérer le code »** sur sa
   fiche. Le code s'affiche avec un bouton « Copier ».
3. **API publique** :
   - `POST /api/public/activate` `{ code, deviceName, appVersion }` : vérifie le code, teste la
     base, crée le poste, puis renvoie les accès à la base, le jeton du poste, le nom de l'hôpital et
     l'adresse du site.
   - `POST /api/public/device/credentials` (authentifié par le jeton du poste) : renvoie les accès
     à jour. Met aussi à jour « dernière connexion » et la version.
4. **Fiche hôpital** : une section « Postes » (liste, dernière connexion, version, bouton
   **Révoquer**). Admin seulement. Les prospecteurs voient le nombre de postes.
5. **Modifier les accès d'un hôpital** (déjà possible) : les postes les récupèrent automatiquement.

### Application (`app-core`)

6. **Assistant de premier lancement** : l'écran « Accès à la base » devient **« Code d'activation »**
   (un seul champ, plus « Coller »). La saisie manuelle reste possible derrière le mot de passe Ultra
   Admin, pour un technicien quand le site est en panne (décision C).
7. **Enregistrement** : jeton du poste et accès à la base, chiffrés par le coffre Windows (comme
   aujourd'hui).
8. **Écran « Base indisponible »** (remplace la demande des accès) : d'abord une récupération
   automatique des accès à jour sur le site, puis les choix Réessayer / Continuer hors connexion /
   Nouveau code.
9. **Paramètres › Établissement** : « Poste activé pour *Hôpital X* », sans hôte ni utilisateur
   visibles, plus le bouton « Changer de code d'activation ». Le formulaire d'accès actuel est retiré
   des paramètres (il reste seulement en Ultra Admin).
10. **Postes déjà installés** (migration sans intervention) : au premier lancement de la nouvelle
    version, un poste qui a déjà des accès s'enregistre lui-même auprès du site. Il s'authentifie avec
    le secret `pandora_link` déjà présent dans la base, et reçoit son jeton. Personne n'a à saisir de
    code sur les postes existants.

### Vérifications

11. Activation avec un bon code, un code faux, un code régénéré, et une base coupée. Poste révoqué.
    Mot de passe changé sur le site puis récupéré par le poste. Site injoignable : le poste continue
    sans perdre ses accès. Migration d'un poste existant. Tests faits avec un profil de test et la
    base locale, jamais ta base Hostinger.

**Durée estimée** : environ 1 jour pour le site et 1 jour et demi pour l'application, tests compris.

## 6. Ce que ça ne change pas

- L'abonnement (signature, périodes, copie locale) et le paiement MoneyFusion.
- Le mode hors connexion et la base locale de chaque poste.
- La connexion des utilisateurs (e-mail et mot de passe de chaque employé).

## 7. Décisions à prendre (corrigez directement)

| # | Question | Ma recommandation | Votre choix |
| --- | --- | --- | --- |
| A | Un code par hôpital (réutilisable pour tous ses postes) ou un code par poste ? | **Un code par hôpital**, régénérable | |
| B | Les admins peuvent-ils réafficher le code plus tard, ou seulement au moment de la génération ? | **Réaffichable par les admins** (stocké chiffré). Pratique pour installer un nouveau poste | |
| C | Garder une saisie manuelle des accès pour les techniciens (derrière Ultra Admin) ? | **Oui**, en secours si le site est en panne | |
| D | Les prospecteurs peuvent-ils voir et copier le code (s'ils installent chez les clients) ? | **Non par défaut**. À activer si ce sont eux qui installent | |
| E | Le code expire-t-il ? | **Non**, mais régénérable à tout moment | |
| F | Nombre maximum de postes par hôpital ? | **Pas de limite** pour l'instant, la liste des postes suffit | |
