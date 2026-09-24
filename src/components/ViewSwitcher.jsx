import { ROUTES } from '../lib/routes'

const VIEWS = [
  { name: 'list', label: 'Toutes les anomalies', href: ROUTES.list },
  { name: 'jobs', label: 'Par job', href: ROUTES.jobs },
  { name: 'responsibles', label: 'Par responsable', href: ROUTES.responsibles },
]

export default function ViewSwitcher({ current, onNavigate }) {
  return (
    <nav className="tabs" aria-label="Mode d'affichage">
      {VIEWS.map((view) => (
        <a
          key={view.name}
          href={view.href || '#'}
          aria-current={current === view.name ? 'page' : undefined}
          className={`tab${current === view.name ? ' is-active' : ''}`}
          onClick={(event) => {
            event.preventDefault()
            onNavigate(view.href)
          }}
        >
          {view.label}
        </a>
      ))}
    </nav>
  )
}
