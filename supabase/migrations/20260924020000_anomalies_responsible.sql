-- Responsable de la commande (initiales, ex. « KWE »), extrait de la clé « Resp. »
-- de _actual. À terme, n8n doit renseigner cette colonne directement à l'insertion.
-- Un job peut avoir plusieurs responsables (une ligne de commande = un responsable).

alter table public.anomalies add column if not exists responsible text;

-- Reprise de l'existant (idempotent : ne touche que les lignes non renseignées).
update public.anomalies
set responsible = nullif(trim(substring(_actual from 'Resp\.:\s*([^|]*)')), '')
where responsible is null
  and _actual is not null;

grant select (responsible) on table public.anomalies to anon, authenticated;
