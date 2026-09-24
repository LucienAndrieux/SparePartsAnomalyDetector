import AnomalyRow from './AnomalyRow'

export default function AnomalyTable({ anomalies, sortDirection, onToggleSort, onResolve }) {
  if (anomalies.length === 0) {
    return <p className="state-message">Aucune anomalie ne correspond aux filtres sélectionnés.</p>
  }

  const sortLabel = sortDirection === 'desc' ? 'plus récentes d’abord' : 'plus anciennes d’abord'

  return (
    <div className="table-wrapper">
      <table className="anomaly-table">
        <thead>
          <tr>
            <th scope="col">Job</th>
            <th scope="col">Type</th>
            <th scope="col">Champ</th>
            <th scope="col">Description</th>
            <th scope="col" aria-sort={sortDirection === 'desc' ? 'descending' : 'ascending'}>
              <button type="button" className="sort-button" onClick={onToggleSort} title={`Tri : ${sortLabel}`}>
                Détectée le
                <span aria-hidden="true">{sortDirection === 'desc' ? '↓' : '↑'}</span>
              </button>
            </th>
            <th scope="col">Statut</th>
            <th scope="col">
              <span className="visually-hidden">Action</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {anomalies.map((anomaly) => (
            <AnomalyRow key={anomaly.id} anomaly={anomaly} onResolve={onResolve} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
