# Spare Parts Anomaly Detector

Dashboard de suivi des anomalies détectées sur des commandes de pièces détachées.

Un workflow **n8n** contrôle les commandes (champs obligatoires vides, dates incohérentes…) et enregistre chaque anomalie dans **Supabase**. Ce dashboard React permet de les consulter, de suivre les indicateurs de traitement et de marquer une anomalie comme résolue.

## Fonctionnalités

- **Indicateurs clés** : nombre total d'anomalies, nombre de non résolues, taux de résolution sous 48h, répartition par type.
- **Table des anomalies** : filtres par statut et par type, tri par date de détection.
- **Consultation publique** : le dashboard est lisible sans compte.
- **Résolution réservée** : après connexion par email et mot de passe (Supabase Auth), un bouton « Marquer comme résolu » apparaît. La mise à jour est optimiste et annulée si le serveur renvoie une erreur.
- **Robustesse** : états de chargement et d'erreur, affichage responsive (la table devient une liste de cartes sur mobile).

## Architecture

```
n8n ──(écrit)──► Supabase: table anomalies
                     ▲                ▲
      lecture (clé anon + RLS)   écriture (clé service_role)
                     │                │
        React (navigateur) ──POST + JWT──► Netlify Function resolve-anomaly
```

Le navigateur ne peut jamais modifier la base :

- Le frontend utilise la **clé anon**, plus le JWT de l'utilisateur une fois connecté. Les rôles `anon` et `authenticated` n'ont que la lecture (`GRANT SELECT` et une policy RLS en `SELECT`).
- Seules les colonnes métier sont lisibles : les colonnes techniques de n8n (`_row_number`, `_actual`) sont exclues par des `GRANT` au niveau des colonnes.
- L'écriture passe par une **fonction serverless**. Elle exige le JWT d'un utilisateur connecté, le vérifie auprès de Supabase Auth, valide l'entrée, puis utilise la clé `service_role`. Cette clé est lue depuis `process.env` sans préfixe `VITE_`, donc elle n'est jamais incluse dans le bundle client.

## Stack

React 19 · Vite · Supabase (`@supabase/supabase-js`) · Netlify Functions · Vitest · CSS sans framework.

## Démarrage

### 1. Base de données

Appliquer dans l'ordre les migrations de [`supabase/migrations/`](supabase/migrations/), via le SQL Editor Supabase ou `supabase db push`. Elles donnent un accès en lecture seule à `anon` (visiteurs) et à `authenticated` (utilisateurs connectés).

### 2. Authentification

Dans le dashboard Supabase :

1. *Authentication → Sign In / Providers* : laisser **Email** activé et **désactiver « Allow new users to sign up »**. Sinon, n'importe qui peut créer un compte et résoudre des anomalies.
2. *Authentication → Users → Add user* : créer chaque compte habilité, avec l'option **Auto Confirm User**.

### 3. Variables d'environnement

```bash
cp .env.example .env.local
```

| Variable | Utilisée par | Exposée au navigateur |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | frontend et fonction | oui |
| `VITE_SUPABASE_ANON_KEY` | frontend | oui (lecture seule) |
| `SUPABASE_SERVICE_ROLE_KEY` | fonction serverless | **non** |

### 4. Lancer

```bash
npm install
npm run dev        # → http://localhost:8888
```

`npm run dev` démarre **Netlify Dev**, seul point d'entrée en local. Il sert le frontend et les fonctions serverless sur le port 8888. Vite tourne derrière sur le port 5173, qu'il n'est pas nécessaire d'ouvrir.

## Scripts

| Commande | Rôle |
| --- | --- |
| `npm run dev` | Frontend et fonctions en local (port 8888) |
| `npm test` | Tests unitaires (Vitest) |
| `npm run lint` | ESLint |
| `npm run build` | Build de production dans `dist/` |

## Structure

```
src/
├── lib/
│   ├── supabaseClient.js      Client Supabase en lecture seule
│   ├── anomalies.js           Logique métier pure : KPIs, filtres, tri, formatage
│   └── anomalyColumns.js      Colonnes exposées (partagé avec la fonction serverless)
├── hooks/
│   ├── useAnomalies.js        Chargement, états, résolution optimiste
│   └── useAuth.js             Session Supabase Auth
└── components/
    ├── AuthControls.jsx
    ├── LoginForm.jsx
    ├── KpiBar.jsx
    ├── FilterBar.jsx
    ├── AnomalyTable.jsx
    └── AnomalyRow.jsx
netlify/
├── functions/resolve-anomaly.js   POST { id } + JWT → resolved = true, resolved_at = now
└── tests/                          Tests de la fonction (hors de functions/ : sinon, déployés comme endpoint)
supabase/migrations/                Droits d'accès de la table
```

## Déploiement (Netlify)

Le fichier `netlify.toml` définit le build et le dossier des fonctions. Il reste à déclarer `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` et `SUPABASE_SERVICE_ROLE_KEY` dans *Site settings → Environment variables*.

## Limites connues

- Tous les utilisateurs connectés ont les mêmes droits (pas de rôles). L'accès est contrôlé par la création manuelle des comptes.
- L'heure de `resolved_at` est celle du serveur de la fonction, pas `now()` côté Postgres.
