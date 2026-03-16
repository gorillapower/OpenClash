export type Route = '/' | '/profiles' | '/settings' | '/system'

const VALID_ROUTES: readonly string[] = ['/', '/profiles', '/settings', '/system']

function parseHash(): Route {
  const path = window.location.hash.replace(/^#/, '') || '/'
  return VALID_ROUTES.includes(path) ? (path as Route) : '/'
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
