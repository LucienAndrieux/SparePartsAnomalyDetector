/**
 * Colonnes de `anomalies` exposées à l'application.
 * Doit rester aligné avec les GRANT de la table dans Supabase : les colonnes
 * techniques de n8n (_row_number, _actual) n'y figurent volontairement pas.
 * Partagé entre le frontend et le serveur Express (server/resolveAnomaly.js).
 */
export const ANOMALY_COLUMNS = [
  'id',
  'job_id',
  'client',
  'item',
  'supplier',
  'responsible',
  'anomaly_type',
  'field_name',
  'description',
  'detected_at',
  'resolved',
  'resolved_at',
].join(',')
