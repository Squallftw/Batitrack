# Batitrack

Suivi des coûts main d'œuvre · construction Maroc.
React (in-browser) + Supabase (auth + database) — déployable sur GitHub Pages.

---

## Démarrage rapide

### 1. Préparer Supabase

1. Aller dans votre projet Supabase ([yaarnpduwcsmrxmrhrvw](https://yaarnpduwcsmrxmrhrvw.supabase.co)).
2. Ouvrir **SQL Editor → New query**.
3. Copier-coller le contenu de [`supabase/schema.sql`](supabase/schema.sql) et exécuter.
4. Dans **Authentication → Providers**, activer **Email**.
   - Recommandé : laisser *Confirm email* activé pour la production.
   - Pour des tests rapides, vous pouvez le désactiver temporairement.
5. Dans **Authentication → URL Configuration**, ajouter votre URL GitHub Pages dans *Site URL* et *Redirect URLs*
   (par exemple `https://squallftw.github.io/Batitrack/`).

### 2. Déployer sur GitHub Pages

```bash
git clone https://github.com/Squallftw/Batitrack.git
cd Batitrack
# Copier les fichiers de ce paquet à la racine du repo
git add .
git commit -m "Initial Batitrack deploy"
git push
```

Puis dans **Settings → Pages** du repo : choisir `main` / `/ (root)` comme source.
L'app sera disponible à `https://squallftw.github.io/Batitrack/Batitrack.html`.

### 3. Lancer en local

Comme l'app utilise `fetch()` pour charger les modules JSX, il faut un serveur HTTP
(impossible d'ouvrir le fichier en `file://`).

```bash
# Python 3
python3 -m http.server 8000
# ou Node
npx serve .
```

Ouvrir `http://localhost:8000/Batitrack.html`.

---

## Architecture

```
Batitrack.html         ← shell, CSP, charge React/Babel/Supabase + bootstrap
src/
  supa.jsx             ← client Supabase, helpers auth, persistence debounce
  auth-screen.jsx      ← écran Connexion / Inscription / Reset
  bootstrap.jsx        ← séquence de démarrage (auth → load user state → load app)
  data.jsx             ← seeds (démo) + branchement user_data
  consommables-data.jsx
  planning.jsx
  app.jsx              ← composant racine + persistence orchestration
  ... (autres modules React)
supabase/
  schema.sql           ← tables, RLS, triggers, grants
SECURITY.md            ← détails du durcissement
```

### Flux d'authentification

1. Au chargement, `bootstrap.jsx` interroge Supabase pour une session active.
2. Pas de session → l'écran **Connexion / Inscription** est rendu.
3. Login réussi → un splash s'affiche pendant qu'on charge la ligne `user_state`
   correspondante (créée automatiquement à l'inscription par un trigger Postgres).
4. Les données utilisateur sont injectées dans `window.__BATI_USER_DATA`,
   puis chaque module React est chargé dynamiquement et lit cet objet.
5. À chaque mutation, l'application met à jour son blob JSONB local et le
   sauvegarde dans Supabase (debounce 1,2 s, force à 8 s, save sur `pagehide`).

### Pourquoi un seul blob JSONB ?

Plutôt qu'une table par entité (chantiers, ouvriers, pointage, etc.) on stocke
toute la donnée d'un utilisateur dans une ligne JSONB unique :

- Une seule policy RLS à valider, donc peu de surface d'attaque.
- Chaque utilisateur est complètement isolé.
- Refactor minimal du code React existant (pas de migration éclatée).
- Suffisant pour le testing client. Une refonte relationnelle pourra suivre
  une fois le périmètre stabilisé.

Limite serveur : 4 MiB par utilisateur (modifiable dans le schema).

---

## Données pour nouveaux utilisateurs

Chaque inscription crée une ligne `user_state` avec `data = '{}'` (vide).
Toutes les listes — chantiers, ouvriers, matériels, consommables, planning —
démarrent vides. L'utilisateur les remplit lui-même via l'UI.

Pour visualiser l'app avec des données de démo, on peut activer un mode démo
en ajoutant `?demo=1` à l'URL (à implémenter côté UI si besoin) ou en posant
manuellement `window.__BATI_DEMO_MODE = true` avant le chargement.

---

## Sécurité

Voir [`SECURITY.md`](SECURITY.md) pour le détail du durcissement.
En résumé pour la phase de test :

- **RLS** active sur toutes les tables, isole chaque utilisateur.
- **CSP stricte** sur le HTML — seuls les CDN listés peuvent injecter du JS.
- **SRI** sur les scripts React et Babel (vérifie l'intégrité du CDN).
- **Validation** côté client (email, password ≥ 8 chars, longueurs bornées) +
  contraintes côté serveur.
- **Audit log** append-only (insert seulement, jamais update/delete).
- **Session** stockée en `localStorage`, refresh auto, déconnexion forcée
  après 8 h d'inactivité.
- **Clé publique** Supabase exposée dans le code — c'est la pratique
  recommandée, la sécurité repose entièrement sur les policies RLS.
- ⚠ **Ne JAMAIS** publier la clé `service_role` côté client.

---

## Désinscription

Supabase ne supprime pas automatiquement les comptes. Pour supprimer un
utilisateur de test, aller dans **Authentication → Users** et supprimer.
Le trigger `on delete cascade` retire automatiquement sa ligne `user_state`
et son `audit_log`.

---

## Mises à jour & versions

`schema_ver` est stocké dans chaque ligne `user_state`. Si vous changez le
schéma JSON de l'app, incrémentez cette valeur dans le code et ajoutez une
migration côté front pour mettre à jour les anciennes données au chargement.

---

## Licence

Privée — usage interne BTP Atlas Construction et clients en évaluation.
