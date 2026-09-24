-- Accès en lecture seule pour le dashboard (clé anon).
-- Les écritures passent exclusivement par la fonction Netlify resolve-anomaly,
-- qui utilise la clé service_role côté serveur.

grant select on table public.anomalies to anon;

alter table public.anomalies enable row level security;

drop policy if exists "anomalies_select_anon" on public.anomalies;
create policy "anomalies_select_anon"
  on public.anomalies
  for select
  to anon
  using (true);
