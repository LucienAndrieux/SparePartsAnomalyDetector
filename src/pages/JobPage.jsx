import { useMemo, useState } from 'react'
import { ResponsibleTag } from '../components/Badges'
import GroupDetail from '../components/GroupDetail'
import Stat from '../components/Stat'
import { groupAnomaliesByJob, listFilterOptions } from '../lib/anomalies'
import { ROUTES } from '../lib/routes'

const DEFAULT_JOB_FILTERS = { status: 'all', type: 'all', responsible: 'all' }

/**
 * Détail d'un job. Ses filtres lui sont propres : ils partent de « Tous / Toutes »
 * à chaque ouverture (App remonte la page quand le job change) et ne proposent
 * que les valeurs présentes dans le job. Seul le sens de tri reste global.
 */
export default function JobPage({ jobId, anomalies, filters, tableProps, notice, onNavigate }) {
  const [jobFilters, setJobFilters] = useState(DEFAULT_JOB_FILTERS)

  const job = useMemo(
    () => groupAnomaliesByJob(anomalies.filter((anomaly) => anomaly.job_id === jobId))[0] ?? null,
    [anomalies, jobId],
  )
  const options = useMemo(() => listFilterOptions(job?.anomalies ?? []), [job])
  const pageFilters = useMemo(
    () => ({ ...jobFilters, sortDirection: filters.sortDirection }),
    [jobFilters, filters.sortDirection],
  )

  return (
    <GroupDetail
      group={job}
      back={{ href: ROUTES.jobs, label: 'Tous les jobs' }}
      title={
        <>
          Job <span className="mono-title">{jobId}</span>
        </>
      }
      subtitle={job?.context.length ? job.context.join(' · ') : 'Détail des anomalies détectées sur ce job.'}
      notFoundText={`Aucune anomalie n’est enregistrée pour le job ${jobId}.`}
      extraStat={
        job && (
          <Stat label={job.responsibles.length > 1 ? 'Responsables' : 'Responsable'}>
            <div className="stat-tags">
              {job.responsibles.map((key) => (
                <ResponsibleTag key={key} responsibleKey={key} />
              ))}
            </div>
          </Stat>
        )
      }
      filters={pageFilters}
      filterBarProps={{
        variant: 'segments',
        filters: pageFilters,
        onChange: (changes) => setJobFilters((current) => ({ ...current, ...changes })),
        statusOptions: options.statuses,
        typeOptions: options.types,
        responsibleOptions: options.responsibles,
      }}
      tableProps={{ ...tableProps, showJob: false }}
      notice={notice}
      onNavigate={onNavigate}
    />
  )
}
