/**
 * Routage minimal par hash (pas de configuration serveur nécessaire) :
 *   ''                    → liste des anomalies
 *   '#jobs'               → liste des jobs
 *   '#jobs/<id>'          → détail d'un job
 *   '#responsibles'       → liste des responsables
 *   '#responsibles/<id>'  → détail d'un responsable
 */
export const ROUTES = {
  list: '',
  jobs: '#jobs',
  responsibles: '#responsibles',
}

// Section d'URL → noms de route (liste, détail)
const SECTIONS = {
  jobs: { list: 'jobs', detail: 'job' },
  responsibles: { list: 'responsibles', detail: 'responsible' },
}

export function jobHref(jobId) {
  return `${ROUTES.jobs}/${encodeURIComponent(jobId)}`
}

export function responsibleHref(key) {
  return `${ROUTES.responsibles}/${encodeURIComponent(key)}`
}

export function parseHash(hash) {
  const path = hash.replace(/^#\/?/, '')
  const [section, rawId, ...rest] = path.split('/')
  const names = Object.hasOwn(SECTIONS, section) ? SECTIONS[section] : null

  if (!names || rest.length > 0) return { name: 'list' }
  if (!rawId) return { name: names.list }

  try {
    return { name: names.detail, id: decodeURIComponent(rawId) }
  } catch {
    return { name: names.list }
  }
}
