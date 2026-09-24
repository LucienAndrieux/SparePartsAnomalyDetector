import { ANOMALY_TYPES, STATUS_FILTERS, getResponsibleLabel } from '../lib/anomalies'

function FilterPill({ label, value, onChange, children }) {
  return (
    <label className={`filter-pill${value !== 'all' ? ' is-set' : ''}`}>
      <span className="filter-pill-label">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
      <svg className="filter-pill-chevron" viewBox="0 0 12 12" aria-hidden="true">
        <path d="m3 4.5 3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </label>
  )
}

/**
 * Filtres statut / type, et responsable si `responsibleOptions` est fourni.
 * `onChange` reçoit un objet partiel, ex. { status: 'resolved' }.
 */
export default function FilterBar({ filters, onChange, responsibleOptions, resultCount, resultLabel }) {
  const { status, type, responsible = 'all' } = filters
  const hasFilters = status !== 'all' || type !== 'all' || (responsibleOptions && responsible !== 'all')

  return (
    <div className="filter-bar">
      <FilterPill label="Statut" value={status} onChange={(value) => onChange({ status: value })}>
        {STATUS_FILTERS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </FilterPill>

      <FilterPill label="Type" value={type} onChange={(value) => onChange({ type: value })}>
        <option value="all">Tous</option>
        {Object.entries(ANOMALY_TYPES).map(([value, { label }]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </FilterPill>

      {responsibleOptions && (
        <FilterPill label="Responsable" value={responsible} onChange={(value) => onChange({ responsible: value })}>
          <option value="all">Tous</option>
          {responsibleOptions.map((key) => (
            <option key={key} value={key}>
              {getResponsibleLabel(key)}
            </option>
          ))}
        </FilterPill>
      )}

      {hasFilters && (
        <button
          type="button"
          className="link-button"
          onClick={() => onChange({ status: 'all', type: 'all', responsible: 'all' })}
        >
          Réinitialiser
        </button>
      )}

      <span className="result-count">{resultLabel(resultCount)}</span>
    </div>
  )
}
