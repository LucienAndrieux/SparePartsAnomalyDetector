# Spare Parts Anomaly Detector

Dashboard de suivi des anomalies détectées sur des commandes de pièces détachées : champs obligatoires vides, dates incohérentes…

## Architecture

```
Google Sheets ──► n8n + LLM (Groq) ──► Supabase ──► Dashboard (React + Express)
 commandes        contrôle des lignes,   table        consultation publique,
                  détection et           anomalies    résolution réservée
                  description des                     aux comptes connectés
                  anomalies
```

- **Google Sheets** contient les commandes de pièces détachées.
- **n8n** parcourt les commandes, s'appuie sur un LLM hébergé chez **Groq** pour détecter et décrire les anomalies, puis les enregistre dans **Supabase** (table `anomalies`).
- **Le dashboard** est un frontend React (Vite) servi par un petit serveur **Express**, qui expose aussi l'API d'écriture. En production, il tourne comme service Windows (NSSM) derrière **Caddy**, qui gère le HTTPS.

### Sécurité

```
Navigateur ──lecture (clé anon)─────────────────────────► Supabase
    │                                                         ▲
    └──POST /api/resolve-anomaly + jeton de session──► Express ┘
                                             (vérifie le jeton,
                                              écrit avec la clé service_role)
```

- **Lecture** : le navigateur utilise uniquement la clé anon. Les rôles `anon` et `authenticated` n'ont que le droit `SELECT`, et seulement sur les colonnes métier. Les colonnes techniques de n8n (`_row_number`, `_actual`) sont exclues par des `GRANT` au niveau des colonnes.
- **Écriture** : seul le serveur Express écrit, avec la clé `service_role`. Elle est lue dans `process.env` sans préfixe `VITE_`, donc elle n'est jamais incluse dans le bundle client.
- **Résolution réservée aux comptes connectés** : l'utilisateur se connecte par email et mot de passe (Supabase Auth). `POST /api/resolve-anomaly` exige son jeton de session (`Authorization: Bearer …`), que le serveur vérifie auprès de Supabase Auth avant d'écrire. Chaque résolution est journalisée avec l'email de son auteur. Une IP est bloquée 15 minutes après 5 jetons invalides.
- **Lecture toujours anonyme** : même connecté, le dashboard lit avec un client distinct, sans session. La session ne sert qu'à autoriser les écritures.
- **Réseau** : le serveur n'écoute que sur `127.0.0.1`. Seul Caddy, sur la même machine, peut le joindre.

## Fonctionnalités

- **Indicateurs clés** : total, non résolues, taux de résolution sous 48h, répartition par type.
- **Trois vues** : toutes les anomalies, **par job** et **par responsable**. Chaque job et chaque responsable a sa propre page, et les URL (`#jobs/7617`, `#responsibles/KWE`) sont partageables.
- **Filtres** par statut, type et responsable ; tri par date de détection.
- **Résolution** : mise à jour optimiste, annulée si le serveur renvoie une erreur.
- Affichage responsive : sur mobile, les tables deviennent des listes de cartes.

## Stack

React 19 · Vite · Express 5 · Supabase (`@supabase/supabase-js`) · Vitest · CSS sans framework.

## Démarrage en local

### 1. Base de données

Appliquer dans l'ordre les migrations de [`supabase/migrations/`](supabase/migrations/), via le SQL Editor Supabase ou `supabase db push`.

### 2. Comptes utilisateurs

Dans le dashboard Supabase :

1. *Authentication → Sign In / Providers* : laisser **Email** activé et **désactiver « Allow new users to sign up »**. Sinon, n'importe qui peut créer un compte et résoudre des anomalies.
2. *Authentication → Users → Add user → Create new user* : créer chaque compte habilité, en cochant **Auto Confirm User**.

### 3. Variables d'environnement

```bash
cp .env.example .env
```

| Variable | Utilisée par | Publique |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | frontend (build) et serveur | oui |
| `VITE_SUPABASE_ANON_KEY` | frontend (build) | oui (lecture seule) |
| `SUPABASE_SERVICE_ROLE_KEY` | serveur | **non** |
| `PORT` | serveur (défaut `3000`) | — |

Les variables `VITE_*` sont intégrées au moment du build : il faut relancer `npm run build` après les avoir modifiées.

### 4. Lancer

```bash
npm install

# Développement du frontend (rechargement à chaud) → http://localhost:5173
npm run dev

# Version serveur, identique à la production → http://localhost:3000
npm run build && npm start
```

En développement, Vite relaie `/api` vers le serveur Express. Pour tester « Marquer comme résolu » avec `npm run dev`, lance aussi `npm start` dans un second terminal.

## Scripts

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Frontend Vite en développement (port 5173) |
| `npm run build` | Build de production dans `dist/` |
| `npm start` | Serveur Express : sert `dist/` et l'API (port 3000) |
| `npm test` | Tests (Vitest) : logique métier, routage, serveur |
| `npm run lint` | ESLint |

## Déploiement (VPS Windows Server)

1. Sur le serveur, dans le dossier du projet : `npm ci`, créer `.env`, puis `npm run build`.
2. Installer le service avec [NSSM](https://nssm.cc/). Le serveur charge `.env` par rapport à son propre fichier : le dossier de démarrage n'a pas d'importance.
   ```powershell
   nssm install SparePartsDashboard "C:\Program Files\nodejs\node.exe" "C:\apps\spare-parts\server\index.js"
   nssm set SparePartsDashboard AppStdout C:\apps\spare-parts\logs\server.log
   nssm set SparePartsDashboard AppStderr C:\apps\spare-parts\logs\server.log
   nssm start SparePartsDashboard
   ```
3. Configurer Caddy (`Caddyfile`). Caddy obtient et renouvelle le certificat HTTPS tout seul :
   ```
   dashboard.example.com {
       reverse_proxy 127.0.0.1:3000
   }
   ```
4. Pour une mise à jour : `git pull`, `npm ci`, `npm run build`, puis `nssm restart SparePartsDashboard`.

## Structure

```
server/
├── index.js                   Point d'entrée : .env, client Supabase, écoute sur 127.0.0.1
├── app.js                     Application Express : API + build statique + fallback SPA
├── resolveAnomaly.js          POST /api/resolve-anomaly
├── auth.js                    Lecture du jeton Bearer, limitation des échecs
└── tests/                     Tests du serveur (faux client Supabase)
src/
├── lib/
│   ├── supabaseClient.js      Clients Supabase : lecture (anon) et authentification
│   ├── anomalies.js           Logique métier pure : KPIs, filtres, regroupements, formatage
│   ├── anomalyColumns.js      Colonnes exposées (partagé avec le serveur)
│   └── routes.js              Routage par hash (#jobs/…, #responsibles/…)
├── hooks/
│   ├── useAnomalies.js        Chargement, états, résolution optimiste
│   ├── useAuth.js             Session Supabase Auth (email + mot de passe)
│   └── useHashRoute.js        Route courante et navigation
├── pages/
│   ├── JobPage.jsx            Détail d'un job
│   └── ResponsiblePage.jsx    Détail d'un responsable
└── components/
    ├── GroupTable.jsx         Liste de groupes (jobs, responsables)
    ├── GroupDetail.jsx        Page de détail générique d'un groupe
    ├── AnomalyTable.jsx / AnomalyRow.jsx
    ├── KpiBar.jsx, Stat.jsx, ResolutionMeter.jsx
    ├── FilterBar.jsx, ViewSwitcher.jsx
    ├── Badges.jsx, ResolveAction.jsx
    └── AuthControls.jsx, LoginForm.jsx
supabase/migrations/           Droits d'accès et colonnes de la table
```

## Limites connues

- Tous les comptes connectés ont les mêmes droits (pas de rôles) : l'accès se contrôle en créant ou supprimant des comptes dans Supabase.
- L'auteur d'une résolution est journalisé par le serveur, mais pas enregistré en base.
- La limitation des tentatives est en mémoire : elle repart de zéro au redémarrage du service.
- L'heure de `resolved_at` est celle du serveur Node, pas `now()` côté Postgres.
