-- Rôle `authenticated` (utilisateurs Supabase Auth) : même accès en lecture que `anon`.
-- Le dashboard lit toujours avec un client anonyme, même connecté ; ces droits
-- restent cohérents si un client connecté interroge la table.
-- Toujours aucune écriture directe : la résolution passe par l'API du serveur
-- (POST /api/resolve-anomaly), qui vérifie la session Supabase de l'utilisateur.

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
