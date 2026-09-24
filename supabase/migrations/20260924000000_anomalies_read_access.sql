-- Accès en lecture seule pour le dashboard (clé anon), limité aux colonnes
-- utiles au frontend : les colonnes techniques internes à n8n
-- (_row_number, _actual) sont exclues au niveau de la base, pas seulement
-- côté code frontend (voir src/lib/anomalyColumns.js).
-- Les écritures passent exclusivement par la fonction Netlify resolve-anomaly.

revoke select on table public.anomalies from anon;

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
) on table public.anomalies to anon;

alter table public.anomalies enable row level security;

drop policy if exists "anomalies_select_anon" on public.anomalies;
create policy "anomalies_select_anon"
  on public.anomalies
  for select
  to anon
  using (true);
