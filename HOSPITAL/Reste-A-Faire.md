# Pandora Health — Ce qu'il reste à faire

Complément de `Audit-Fonctionnalites-Manquantes.md` : ce document ne liste **que ce qui n'est pas encore fait**. Les items 1 à 16 (Sécurité + Fonctionnalités cœur + les 5 modules à concevoir : RH, Approvisionnement, Finance, Banque de sang, Stocks) sont terminés et vérifiés, de même que le mode hors-ligne avec synchronisation (item 25, plan complet dans `Plan-Mode-Hors-Ligne-Synchronisation.md`) — voir le détail dans ces deux fichiers.

Nouveau (hors numérotation de l'audit initial) : **configuration par poste/hôpital** — URL du backend + modules affichés choisis au premier lancement (ou modifiables ensuite depuis Paramètres), compte DIRIGEANT créé automatiquement au premier démarrage d'un serveur vide. Voir `Plan-Installeur-Configurable.md` pour le détail complet.

*Dernière mise à jour : 2026-09-21*

---

## Résidus volontairement laissés de côté (items déjà faits, mais partiellement)

- **Paramètres** (item 7) : « Utilisateurs & rôles » (création directe d'un compte, plus de vocabulaire « inviter » — aucun envoi d'email n'a jamais existé, l'admin fixe déjà le mot de passe directement), « Sécurité → Changer le mot de passe », **« Établissement », « Notifications » et « Sauvegardes » sont maintenant réels** (voir item 21 ci-dessous). « Modules activés » reflète l'état réel (tout est implémenté) plutôt que des valeurs inventées — reste un affichage informatif, rien dans l'app ne teste réellement cette valeur. Reste différé : Apparence → mode sombre (explicitement « bientôt », chantier à part entière).
- **Dossier patient → Documents** (item 8) : **fait**. Nouveau modèle `PatientDocument` (même mécanisme BLOB que `EmployeeDocument`), upload/téléchargement/suppression réels via `/patients/:id/documents`, en ligne uniquement (comme le reste du dossier agrégé).
- **Imprimer** (item 9) : deux flows réels désormais — Dossier patient (PDF via pdfkit) et tous les autres boutons « Imprimer » (listes/tableaux, Laboratoire, Imagerie, Cardiologie, Pathologie, Endoscopie, Urgences, Hospitalisation, Bloc opératoire, Finance, Stocks, Approvisionnement, RH) câblés sur `window.print()` — impression simple de la vue courante, pas un document PDF mis en forme. Restent décoratifs (volontairement) : les boutons « Imprimer étiquettes » (Pharmacie, Stocks, Banque de sang, Laboratoire, Anatomopathologie) — nécessiteraient un vrai gabarit d'étiquette, hors périmètre d'un `window.print()` de page entière.
- **Export** (item 10) : les boutons « Exporter »/« Export » génériques (Banque de sang, RH, Finance) sont maintenant câblés sur le même export Excel que le bouton « Export Excel » de chaque page. Consultations et Urgences l'étaient déjà.
- **Mode hors-ligne** (item 25) : les 17 domaines couverts (voir `Plan-Mode-Hors-Ligne-Synchronisation.md`) le sont sur leur entité principale uniquement — le dossier patient agrégé et les sous-onglets CRUD des items 12-15 (mouvements de stock, commandes/réceptions, factures/paiements/budgets, présences/contrats/paie/documents RH, dons/transfusions/analyses de sang) restent en ligne uniquement.

---

## Qualité et robustesse

- [ ] 17. Ajouter des tests (au minimum intégration backend + e2e de fumée sur les parcours critiques)
- [ ] 18. Factoriser la validation d'entrée avec `zod` (remplace la validation manuelle dupliquée route par route)
- [ ] 19. Ajouter un logging structuré (`pino` ou `winston`)
- [x] 20. Pipeline CI (lint + typecheck + build) — **fait**. `.github/workflows/hospital-ci.yml` (racine du dépôt), deux jobs (`app-server`, `app-core`), déclenché sur push/PR touchant `HOSPITAL/`. A aussi révélé que `npm run lint` (app-core) était cassé depuis le début (aucune config ESLint présente) : `.eslintrc.cjs` créé (`@electron-toolkit/eslint-config-ts` + React + React Hooks, déjà des dépendances présentes mais jamais câblées), `eslint-plugin-react-hooks` installé (version stable 4.x — la 7.x installée par défaut apporte des règles expérimentales liées au React Compiler bien trop strictes pour ce code), 461 erreurs réelles résolues (quasi toutes la même règle trop stricte sur les fonctions inline, désactivée car déjà couverte par `tsc`), 2 apostrophes JSX non échappées corrigées. 6 avertissements `react-hooks/exhaustive-deps` restants (non bloquants, à trier).
- [x] 21. Sauvegarde/restauration DB — **fait**. `app-server/src/services/backup.service.ts` : export/import génériques par introspection de `information_schema` (63 tables aujourd'hui, aucune liste écrite à la main — le client Prisma 7 n'expose plus le DMMF à l'exécution comme avant), sans dépendre de `mysqldump` (accès shell non garanti côté hébergement). Le fichier de sauvegarde est téléchargé et conservé sur le poste de l'utilisateur (Documents/Pandora Health/Sauvegardes), jamais sur le serveur — cohérent avec la contrainte de disque non persistant déjà connue (voir `documents.service.ts`). Sauvegarde automatique tentée à chaque ouverture de session (au plus une par jour), réservée au DIRIGEANT (RBAC `settings: 'full'`). Restauration testée en conditions réelles sur la base de dev (export → mutation → restauration → donnée revenue à l'état d'origine, reste de la base intact).
- [x] 22. Mettre à jour `app-core/README.md` — **fait**, décrit maintenant l'état réel (17 domaines, hors-ligne, RBAC, scripts, CI).

## Transverse

- [ ] 23. Câbler la recherche globale du header (actuellement décorative)
- [ ] 24. Évaluer le besoin de notifications temps réel (websockets) pour Automation Studio
