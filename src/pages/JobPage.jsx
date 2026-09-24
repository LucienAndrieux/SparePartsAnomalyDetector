import { useMemo } from 'react'
import { ResponsibleTag } from '../components/Badges'
import GroupDetail from '../components/GroupDetail'
import Stat from '../components/Stat'
import { groupAnomaliesByJob } from '../lib/anomalies'
import { ROUTES } from '../lib/routes'

export default function JobPage({ jobId, anomalies, responsibleOptions, filters, onFiltersChange, tableProps, notice, onNavigate }) {
  const job = useMemo(
    () => groupAnomaliesByJob(anomalies.filter((anomaly) => anomaly.job_id === jobId))[0] ?? null,
    [anomalies, jobId],
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
                <ResponsibleTag key={key} responsible={key} />
              ))}
            </div>
          </Stat>
        )
      }
      filters={filters}
      filterBarProps={{ filters, onChange: onFiltersChange, responsibleOptions }}
      tableProps={{ ...tableProps, showJob: false }}
      notice={notice}
      onNavigate={onNavigate}
    />
  )
}
