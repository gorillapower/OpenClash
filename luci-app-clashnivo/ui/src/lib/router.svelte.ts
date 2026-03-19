export type Route = '/' | '/sources' | '/compose' | '/system'

const VALID_ROUTES: readonly Route[] = ['/', '/sources', '/compose', '/system']
const LEGACY_ROUTE_ALIASES: Record<string, Route> = {
  '/profiles': '/sources',
  '/settings': '/compose'
}

function parseHash(): Route {
  const path = window.location.hash.replace(/^#/, '') || '/'
  const normalizedPath = LEGACY_ROUTE_ALIASES[path] ?? path
  return VALID_ROUTES.includes(normalizedPath as Route) ? (normalizedPath as Route) : '/'
}

let current = $state<Route>(parseHash())

window.addEventListener('hashchange', () => {
  current = parseHash()
})

export const router = {
  get current(): Route {
    return current
  },
  navigate(path: Route): void {
    window.location.hash = path
  }
}
