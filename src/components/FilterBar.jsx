import { ANOMALY_TYPES, STATUS_FILTERS } from '../lib/anomalies'

export default function FilterBar({ status, type, onStatusChange, onTypeChange, resultCount }) {
  return (
    <div className="filter-bar">
      <div className="segmented" role="group" aria-label="Filtrer par statut">
        {STATUS_FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={status === option.value ? 'is-active' : undefined}
            aria-pressed={status === option.value}
            onClick={() => onStatusChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <label className="select-field">
        <span>Type</span>
        <select value={type} onChange={(event) => onTypeChange(event.target.value)}>
          <option value="all">Tous les types</option>
          {Object.entries(ANOMALY_TYPES).map(([value, { label }]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <span className="result-count">
        {resultCount} résultat{resultCount > 1 ? 's' : ''}
      </span>
    </div>
  )
}
