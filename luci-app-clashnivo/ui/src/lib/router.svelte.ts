export type Route = '/' | '/sources' | '/compose' | '/system'

const VALID_ROUTES: readonly Route[] = ['/', '/sources', '/compose', '/system']

function parseHash(): Route {
  const path = window.location.hash.replace(/^#/, '').split('?')[0] || '/'
  return VALID_ROUTES.includes(path as Route) ? (path as Route) : '/'
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
