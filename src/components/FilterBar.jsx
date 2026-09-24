import { ANOMALY_TYPES, STATUS_LABELS, getAnomalyTypeLabel, getResponsibleLabel } from '../lib/anomalies'

/** Pastille « Libellé | menu déroulant » ; le select natif garde l'accessibilité clavier. */
function FilterPill({ label, value, allLabel, options, onChange }) {
  return (
    <label className={`filter-pill${value !== 'all' ? ' is-set' : ''}`}>
      <span className="filter-pill-label">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="all">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <svg className="filter-pill-chevron" viewBox="0 0 12 12" aria-hidden="true">
        <path d="m3 4.5 3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </label>
  )
}

/** Libellé suivi d'un bouton par valeur, toutes visibles d'un coup. */
function SegmentedFilter({ label, value, allLabel, options, onChange }) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      <span className="segmented-label">{label}</span>
      {[{ value: 'all', label: allLabel }, ...options].map((option) => (
        <button
          key={option.value}
          type="button"
          className={`segment${value === option.value ? ' is-active' : ''}`}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

/**
 * Filtres statut / type, et responsable si `responsibleOptions` est fourni.
 * `variant` : 'pills' (menus déroulants) ou 'segments' (boutons).
 * `statusOptions` / `typeOptions` restreignent les choix (par défaut : tous).
 * `onChange` reçoit un objet partiel, ex. { status: 'resolved' }.
 */
export default function FilterBar({
  filters,
  onChange,
  variant = 'pills',
  statusOptions = Object.keys(STATUS_LABELS),
  typeOptions = Object.keys(ANOMALY_TYPES),
  responsibleOptions,
  resultCount,
  resultLabel,
}) {
  const definitions = [
    { key: 'status', label: 'Statut', allLabel: 'Toutes', values: statusOptions, getLabel: (value) => STATUS_LABELS[value] },
    { key: 'type', label: 'Type', allLabel: 'Tous', values: typeOptions, getLabel: getAnomalyTypeLabel },
    responsibleOptions && {
      key: 'responsible',
      label: 'Responsable',
      allLabel: 'Tous',
      values: responsibleOptions,
      getLabel: getResponsibleLabel,
    },
  ].filter(Boolean)

  const Filter = variant === 'segments' ? SegmentedFilter : FilterPill
  const hasFilters = definitions.some(({ key }) => (filters[key] ?? 'all') !== 'all')

  return (
    <div className={`filter-bar${variant === 'segments' ? ' filter-bar-segments' : ''}`}>
      {definitions.map(({ key, label, allLabel, values, getLabel }) => {
        const value = filters[key] ?? 'all'
        // La valeur choisie reste affichée même si elle n'est plus disponible (ex. dernière anomalie résolue).
        const shown = value === 'all' || values.includes(value) ? values : [...values, value]
        return (
          <Filter
            key={key}
            label={label}
            value={value}
            allLabel={allLabel}
            options={shown.map((optionValue) => ({ value: optionValue, label: getLabel(optionValue) }))}
            onChange={(next) => onChange({ [key]: next })}
          />
        )
      })}

      {hasFilters && (
        <button
          type="button"
          className="link-button"
          onClick={() => onChange(Object.fromEntries(definitions.map(({ key }) => [key, 'all'])))}
        >
          Réinitialiser
        </button>
      )}

      <span className="result-count">{resultLabel(resultCount)}</span>
    </div>
  )
}
