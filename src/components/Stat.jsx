export default function Stat({ label, value, hint, size, children }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      {value !== undefined && <span className={`stat-value${size === 'sm' ? ' stat-value-sm' : ''}`}>{value}</span>}
      {hint && <span className="stat-hint">{hint}</span>}
      {children}
    </div>
  )
}
