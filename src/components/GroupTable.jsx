import { formatDateTime } from '../lib/anomalies'
import ResolutionMeter from './ResolutionMeter'

/**
 * Tableau de groupes d'anomalies (jobs, responsables…), trié par urgence.
 * Chaque ligne est entièrement cliquable et mène à la page du groupe.
 * `extraColumns` : colonnes propres au type de groupe, insérées avant la date.
 */
export default function GroupTable({ groups, titleHeader, renderTitle, hrefFor, extraColumns = [], emptyMessage }) {
  if (groups.length === 0) {
    return <p className="state-message">{emptyMessage}</p>
  }

  return (
    <div className="table-wrapper">
      <table className="data-table group-table">
        <thead>
          <tr>
            <th scope="col">{titleHeader}</th>
            <th scope="col">Non résolues</th>
            <th scope="col">Progression</th>
            {extraColumns.map((column) => (
              <th key={column.header} scope="col">
                {column.header}
              </th>
            ))}
            <th scope="col">Dernière détection</th>
            <th scope="col">
              <span className="visually-hidden">Ouvrir</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <tr key={group.key} className="row-link">
              <td data-label={titleHeader}>
                {/* Le lien couvre toute la ligne (voir .row-link en CSS) */}
                <a className="row-link-anchor" href={hrefFor(group)}>
                  {renderTitle(group)}
                </a>
              </td>
              <td data-label="Non résolues">
                {group.unresolved > 0 ? (
                  <span className="count-strong">{group.unresolved}</span>
                ) : (
                  <span className="group-done">Tout est résolu</span>
                )}
              </td>
              <td data-label="Progression">
                <ResolutionMeter resolved={group.total - group.unresolved} total={group.total} />
              </td>
              {extraColumns.map((column) => (
                <td key={column.header} data-label={column.header}>
                  {column.render(group)}
                </td>
              ))}
              <td data-label="Dernière détection" className="nowrap cell-muted">
                <time dateTime={group.latestDetectedAt}>{formatDateTime(group.latestDetectedAt)}</time>
              </td>
              <td className="cell-chevron" aria-hidden="true">
                <svg viewBox="0 0 12 12">
                  <path d="m4.5 3 3 3-3 3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
