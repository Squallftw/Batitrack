# Batitrack — Security hardening

Ce document décrit les mesures de sécurité appliquées à la version courante,
adaptée à une phase de test client. Une checklist *production* est en fin de
fichier — à appliquer avant tout déploiement réel.

---

## 1. Authentification

- **Email + mot de passe** via Supabase Auth, flow PKCE.
- **Mot de passe** : minimum 8 caractères, au moins une lettre et un chiffre.
  Maximum 128 caractères pour limiter les abus.
- **Email** : validation regex + cap à 254 caractères (RFC 5321).
- **Confirmation email** : activée par défaut côté Supabase (recommandé).
  Désactivable pendant les tests pour fluidifier les essais.
- **Réinitialisation** : lien envoyé par email, n'expose jamais si l'email
  existe ou non.
- **Session** : stockée en `localStorage` sous `batitrack.auth`, refresh
  automatique des tokens via le SDK.
- **Déconnexion forcée** : 8 heures d'inactivité → `signOut()` automatique.

> Côté Supabase, activez en plus dans le dashboard :
> - **Rate limiting** sur `/auth` (déjà activé par défaut, vérifiez les seuils).
> - **CAPTCHA** (hCaptcha / Cloudflare Turnstile) sur l'inscription si du trafic
>   public est attendu — non activé ici car testing.

---

## 2. Row-Level Security

Toutes les tables exposées via PostgREST ont **RLS activée** et leurs policies
contraignent `auth.uid() = user_id`. Voir `supabase/schema.sql`.

| Table        | SELECT  | INSERT  | UPDATE  | DELETE  |
|--------------|---------|---------|---------|---------|
| `user_state` | ✅ self | ✅ self | ✅ self | ✅ self |
| `audit_log`  | ✅ self | ✅ self | ❌      | ❌      |

L'audit log est append-only : aucune policy d'UPDATE/DELETE, donc même un
client compromis ne peut pas réécrire l'historique. Les administrateurs
peuvent encore tout voir/modifier via le dashboard Supabase (service_role).

---

## 3. Surface réseau

### Content Security Policy

Dans `Batitrack.html` :

```
default-src 'self';
script-src  'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdn.tailwindcss.com https://cdn.jsdelivr.net;
style-src   'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net;
font-src    'self' https://fonts.gstatic.com data:;
img-src     'self' data: blob: https://*.supabase.co;
connect-src 'self' https://*.supabase.co wss://*.supabase.co;
frame-ancestors 'none';
base-uri    'self';
form-action 'self';
object-src  'none';
```

- `frame-ancestors 'none'` empêche le clickjacking (l'app ne peut être
  intégrée dans aucun iframe externe).
- `connect-src` limite les requêtes XHR/fetch à votre instance Supabase
  (HTTP + WebSocket pour realtime).
- `object-src 'none'` neutralise `<embed>` / `<object>` / `<applet>`.
- `'unsafe-eval'` est requis par le compilateur Babel en navigateur. À retirer
  lorsque vous précompilerez le JSX (voir section production).
- `'unsafe-inline'` est nécessaire pour les styles Tailwind dynamiques et les
  scripts inline générés par Babel.

### Headers complémentaires (méta)

- `X-Content-Type-Options: nosniff` — empêche le MIME sniffing.
- `referrer-policy: strict-origin-when-cross-origin`.
- `noindex,nofollow` — l'app n'est pas indexée par les moteurs.

> **Important** : si vous hébergez sur GitHub Pages, ces meta-tags sont la
> seule option car GHP ne permet pas de headers HTTP custom. Pour une vraie
> prod, déployez derrière un proxy (Cloudflare Pages, Vercel, Netlify) et
> définissez les headers HTTP côté serveur. Ajoutez en plus :
> ```
> Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
> X-Frame-Options: DENY
> Permissions-Policy: camera=(), microphone=(), geolocation=()
> ```

### Subresource Integrity

Les scripts CDN versionnés ont un hash SRI :
- `react@18.3.1` ✅
- `react-dom@18.3.1` ✅
- `@babel/standalone@7.29.0` ✅
- `@supabase/supabase-js@2.45.4` ❓ (le bundle UMD officiel publie un hash
  par version — ajoutez-le quand la version est figée pour la prod).

`cdn.tailwindcss.com` est un script *runtime* qui ne supporte pas SRI ; il
est restreint par la CSP. À remplacer par un build Tailwind statique en prod.

---

## 4. Validation & contraintes côté serveur

- `octet_length(data) < 4 MiB` sur `user_state.data` — bloque l'envoi de blobs
  démesurés depuis un client compromis.
- `char_length(action) <= 64`, `entity <= 64`, `label <= 512` sur `audit_log`.
- `revoke all from anon` — le rôle anonyme ne peut RIEN faire.
- `grant ... to authenticated` — seuls les comptes authentifiés ont accès.

Côté client :
- Tous les inputs ont `maxLength` HTML.
- L'email est trimmé avant envoi.
- Les nouveaux objets reçoivent des IDs aléatoires (collisions invraisemblables).

---

## 5. Audit & logs

- `audit_log` append-only stocke les mutations significatives. À utiliser
  pour les actions sensibles (création de paiement, clôture de quinzaine,
  changement de tarif).
- Côté front, un journal d'audit *local* (state React) capture les éditions
  rétroactives ; il est persisté dans le blob et donc dans Supabase.
- Les `console.error` côté front ne contiennent jamais le mot de passe ni
  les jetons.

---

## 6. Données personnelles

L'app stocke :
- email utilisateur (compte Supabase),
- noms / téléphones / CIN des ouvriers (entré par l'utilisateur lui-même),
- coordonnées des clients & fournisseurs (idem).

Ces données restent strictement dans la ligne `user_state` de l'utilisateur
qui les a saisies, isolée par RLS. Aucun partage inter-utilisateurs.

> **RGPD / loi 09-08** : pour une vraie prod, ajouter dans le UI :
> - une page de politique de confidentialité,
> - un export JSON ("Télécharger mes données"),
> - une suppression de compte ("Supprimer mon compte" → `delete from auth.users`).

---

## 7. Bonnes pratiques opérationnelles

- ⚠ **Clé `service_role`** : ne JAMAIS la mettre dans le code client.
  Elle est utilisable uniquement depuis un serveur (Edge Function, backend).
- ⚠ La clé `publishable` (`sb_publishable_…`) est destinée à être publique ;
  elle est dans le code à dessein. La sécurité repose sur RLS.
- Activez **2FA** sur votre compte Supabase admin.
- Faites des **backups** réguliers (Settings → Database → Backups).
- Si vous suspectez une compromission, faites tourner les clés via le
  dashboard et redéployez.

---

## 8. Checklist avant production

- [ ] Précompiler le JSX (esbuild / vite) → retirer `'unsafe-eval'`.
- [ ] Remplacer le runtime Tailwind par un build CSS statique.
- [ ] Activer la confirmation email + un provider SMTP fiable.
- [ ] Ajouter CAPTCHA sur signup et reset.
- [ ] Politiser : *Site URL* et *Redirect URLs* précis (pas de wildcard).
- [ ] Headers HTTP (HSTS, X-Frame-Options, Permissions-Policy) via proxy.
- [ ] Précompiler les fichiers .jsx en .js et virer Babel du HTML.
- [ ] Audit log : envoyer aussi les évènements critiques côté serveur via une
      Edge Function (`audit_log` insert).
- [ ] Tests d'intrusion sur les policies RLS (`SELECT` cross-tenant doit échouer).
- [ ] Renouveler les clés Supabase périodiquement.
- [ ] Activer la **Vault** Supabase pour stocker tout secret métier.

---

*Document mis à jour : version 1.0 — testing client.*
