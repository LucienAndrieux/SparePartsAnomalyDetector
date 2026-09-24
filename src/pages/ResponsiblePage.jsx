import { useMemo } from 'react'
import GroupDetail from '../components/GroupDetail'
import Stat from '../components/Stat'
import { UNASSIGNED, getResponsibleKey, getResponsibleLabel, groupAnomaliesByResponsible } from '../lib/anomalies'
import { ROUTES } from '../lib/routes'

export default function ResponsiblePage({ responsibleKey, anomalies, filters, onFiltersChange, tableProps, notice, onNavigate }) {
  const group = useMemo(
    () =>
      groupAnomaliesByResponsible(anomalies.filter((anomaly) => getResponsibleKey(anomaly) === responsibleKey))[0] ??
      null,
    [anomalies, responsibleKey],
  )
  // On est déjà sur la page du responsable : le filtre global par responsable ne s'applique pas.
  const pageFilters = useMemo(() => ({ ...filters, responsible: 'all' }), [filters])
  const label = getResponsibleLabel(responsibleKey)

  return (
    <GroupDetail
      group={group}
      back={{ href: ROUTES.responsibles, label: 'Tous les responsables' }}
      title={responsibleKey === UNASSIGNED ? label : <>Responsable {label}</>}
      subtitle={
        responsibleKey === UNASSIGNED
          ? 'Anomalies dont la commande n’a pas de responsable renseigné.'
          : `Anomalies des commandes suivies par ${label}.`
      }
      notFoundText={`Aucune anomalie n’est attribuée à ${label}.`}
      extraStat={group && <Stat label="Jobs concernés" value={group.jobCount} />}
      filters={pageFilters}
      filterBarProps={{ filters: pageFilters, onChange: onFiltersChange }}
      tableProps={{ ...tableProps, showResponsible: false }}
      notice={notice}
      onNavigate={onNavigate}
    />
  )
}
