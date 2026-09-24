import { useMemo } from 'react'
import AnomalyTable from '../components/AnomalyTable'
import { ResponsibleTag } from '../components/Badges'
import FilterBar from '../components/FilterBar'
import GroupTable from '../components/GroupTable'
import KpiBar from '../components/KpiBar'
import ViewSwitcher from '../components/ViewSwitcher'
import {
  countLabel,
  filterAndSortAnomalies,
  getResponsibleLabel,
  groupAnomaliesByJob,
  groupAnomaliesByResponsible,
} from '../lib/anomalies'
import { jobHref, responsibleHref } from '../lib/routes'

function JobGroups({ groups }) {
  return (
    <GroupTable
      groups={groups}
      titleHeader="Job"
      renderTitle={(group) => (
        <span className="group-title">
          Job <span className="mono">{group.jobId}</span>
        </span>
      )}
      hrefFor={(group) => jobHref(group.jobId)}
      extraColumns={[
        {
          header: 'Responsable',
          render: (group) => (
            <div className="stat-tags">
              {group.responsibles.map((key) => (
                <ResponsibleTag key={key} responsibleKey={key} />
              ))}
            </div>
          ),
        },
      ]}
      emptyMessage="Aucun job ne correspond aux filtres sélectionnés."
    />
  )
}

function ResponsibleGroups({ groups }) {
  return (
    <GroupTable
      groups={groups}
      titleHeader="Responsable"
      renderTitle={(group) => <span className="group-title">{getResponsibleLabel(group.responsible)}</span>}
      hrefFor={(group) => responsibleHref(group.responsible)}
      extraColumns={[{ header: 'Jobs concernés', render: (group) => group.jobCount }]}
      emptyMessage="Aucun responsable ne correspond aux filtres sélectionnés."
    />
  )
}

/** Vue d'ensemble : indicateurs clés, puis anomalies à plat, par job ou par responsable (`view`). */
export default function OverviewPage({
  view,
  anomalies,
  responsibleOptions,
  filters,
  onFiltersChange,
  tableProps,
  notice,
  onNavigate,
}) {
  const visibleAnomalies = useMemo(() => filterAndSortAnomalies(anomalies, filters), [anomalies, filters])

  let content
  let groupSummary = '' // ex. « 3 jobs · » devant le nombre d'anomalies

  if (view === 'jobs') {
    const groups = groupAnomaliesByJob(visibleAnomalies)
    groupSummary = `${countLabel(groups.length, 'job')} · `
    content = <JobGroups groups={groups} />
  } else if (view === 'responsibles') {
    const groups = groupAnomaliesByResponsible(visibleAnomalies)
    groupSummary = `${countLabel(groups.length, 'responsable')} · `
    content = <ResponsibleGroups groups={groups} />
  } else {
    content = (
      <>
        {notice}
        <AnomalyTable anomalies={visibleAnomalies} sortDirection={filters.sortDirection} {...tableProps} />
      </>
    )
  }

  const resultLabel = (count) => groupSummary + countLabel(count, 'anomalie')

  return (
    <>
      <KpiBar anomalies={anomalies} />

      <section className="section" aria-labelledby="details-title">
        <h2 id="details-title" className="section-title">
          Détail
        </h2>

        <ViewSwitcher current={view} onNavigate={onNavigate} />

        <FilterBar
          filters={filters}
          onChange={onFiltersChange}
          responsibleOptions={responsibleOptions}
          resultCount={visibleAnomalies.length}
          resultLabel={resultLabel}
        />

        {content}
      </section>
    </>
  )
}
