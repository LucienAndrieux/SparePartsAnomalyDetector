export default function ResolutionMeter({ resolved, total }) {
  const ratio = total > 0 ? resolved / total : 0
  const label = `${resolved}/${total} résolue${resolved > 1 ? 's' : ''}`

  return (
    <div className="meter" title={label}>
      <div className="meter-track" aria-hidden="true">
        {ratio > 0 && <span className="meter-fill" style={{ width: `${ratio * 100}%` }} />}
      </div>
      <span className="meter-label">{label}</span>
    </div>
  )
}
