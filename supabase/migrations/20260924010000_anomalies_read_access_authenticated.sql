-- Une fois connecté (Supabase Auth), le client envoie le JWT de l'utilisateur :
-- les requêtes s'exécutent alors sous le rôle `authenticated`, plus `anon`.
-- Même accès en lecture, mêmes colonnes. Toujours aucune écriture directe :
-- la résolution passe par la fonction Netlify, qui vérifie le JWT.

revoke select on table public.anomalies from authenticated;

-- Défense en profondeur : RLS bloque déjà les écritures (aucune policy),
-- on retire aussi les privilèges d'écriture éventuellement hérités.
revoke insert, update, delete, truncate on table public.anomalies from anon, authenticated;

grant select (
  id,
  job_id,
  client,
  item,
  supplier,
  anomaly_type,
  field_name,
  description,
  detected_at,
  resolved,
  resolved_at
) on table public.anomalies to authenticated;

drop policy if exists "anomalies_select_authenticated" on public.anomalies;
create policy "anomalies_select_authenticated"
  on public.anomalies
  for select
  to authenticated
  using (true);
