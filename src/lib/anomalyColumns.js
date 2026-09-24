/**
 * Colonnes de `anomalies` exposées à l'application.
 * Doit rester aligné avec les GRANT de supabase/migrations : les colonnes
 * techniques de n8n (_row_number, _actual) n'y figurent volontairement pas.
 * Partagé entre le frontend et la fonction serverless.
 */
export const ANOMALY_COLUMNS = [
  'id',
  'job_id',
  'client',
  'item',
  'supplier',
  'anomaly_type',
  'field_name',
  'description',
  'detected_at',
  'resolved',
  'resolved_at',
].join(',')
