# Spare Parts Anomaly Detector

Dashboard de suivi des anomalies détectées sur des commandes de pièces détachées.

Un workflow **n8n** contrôle les commandes (champs obligatoires vides, dates incohérentes…) et enregistre chaque anomalie dans **Supabase**. Ce dashboard React permet de les consulter, de suivre les indicateurs de traitement et de marquer une anomalie comme résolue.

## Fonctionnalités

- **Indicateurs clés** : nombre total d'anomalies, nombre de non résolues, taux de résolution sous 48h, répartition par type.
- **Table des anomalies** : filtres par statut et par type, tri par date de détection.
- **Résolution** : bouton « Marquer comme résolu » avec mise à jour optimiste, annulée si le serveur renvoie une erreur.
- **Robustesse** : états de chargement et d'erreur, affichage responsive (la table devient une liste de cartes sur mobile).

## Architecture

```
n8n ──(écrit)──► Supabase: table anomalies
                     ▲                ▲
      lecture (clé anon + RLS)   écriture (clé service_role)
                     │                │
        React (navigateur) ──POST──► Netlify Function resolve-anomaly
```

Le navigateur ne peut jamais modifier la base :

- Le frontend utilise uniquement la **clé anon**. Supabase ne lui accorde que la lecture (`GRANT SELECT` et une policy RLS en `SELECT`).
- L'écriture passe par une **fonction serverless** qui valide l'entrée et utilise la clé `service_role`. Cette clé est lue depuis `process.env` sans préfixe `VITE_`, donc elle n'est jamais incluse dans le bundle client.

## Stack

React 19 · Vite · Supabase (`@supabase/supabase-js`) · Netlify Functions · Vitest · CSS sans framework.

## Démarrage

### 1. Base de données

Appliquer [`supabase/migrations/20260924000000_anomalies_read_access.sql`](supabase/migrations/20260924000000_anomalies_read_access.sql) (via le SQL Editor Supabase ou `supabase db push`). Cette migration donne au rôle `anon` un accès en lecture seule à la table `anomalies`.

### 2. Variables d'environnement

```bash
cp .env.example .env.local
```

| Variable | Utilisée par | Exposée au navigateur |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | frontend et fonction | oui |
| `VITE_SUPABASE_ANON_KEY` | frontend | oui (lecture seule) |
| `SUPABASE_SERVICE_ROLE_KEY` | fonction serverless | **non** |

### 3. Lancer

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
│   └── anomalies.js           Logique métier pure : KPIs, filtres, tri, formatage
├── hooks/useAnomalies.js      Chargement, états, résolution optimiste
└── components/
    ├── KpiBar.jsx
    ├── FilterBar.jsx
    ├── AnomalyTable.jsx
    └── AnomalyRow.jsx
netlify/
├── functions/resolve-anomaly.js   POST { id } → resolved = true, resolved_at = now
└── tests/                          Tests de la fonction (hors de functions/ : sinon, déployés comme endpoint)
supabase/migrations/                Droits d'accès de la table
```

## Déploiement (Netlify)

Le fichier `netlify.toml` définit le build et le dossier des fonctions. Il reste à déclarer `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` et `SUPABASE_SERVICE_ROLE_KEY` dans *Site settings → Environment variables*.

## Limites connues

- L'endpoint `resolve-anomaly` n'est pas authentifié : une fois le site en ligne, n'importe qui connaissant l'URL peut marquer une anomalie comme résolue.
- L'heure de `resolved_at` est celle du serveur de la fonction, pas `now()` côté Postgres.
