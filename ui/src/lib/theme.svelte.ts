const STORAGE_KEY = 'clash-nivo-theme'

export type Theme = 'light' | 'dark' | 'system'

function getSystemPreference(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getInitialTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  return 'system'
}

function resolveTheme(t: Theme): 'light' | 'dark' {
  return t === 'system' ? getSystemPreference() : t
}

function applyTheme(resolved: 'light' | 'dark') {
  document.documentElement.classList.toggle('dark', resolved === 'dark')
}

const _initialTheme = getInitialTheme()
let _theme = $state<Theme>(_initialTheme)

// Apply on init using the plain initial value (not the $state ref)
applyTheme(resolveTheme(_initialTheme))

// React to OS-level changes when in system mode
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (_theme === 'system') applyTheme(getSystemPreference())
})

export const theme = {
  get current(): Theme {
    return _theme
  },
  get isDark(): boolean {
    return resolveTheme(_theme) === 'dark'
  },
  toggle() {
    const next = resolveTheme(_theme) === 'dark' ? 'light' : 'dark'
    _theme = next
    localStorage.setItem(STORAGE_KEY, next)
    applyTheme(next)
  },
  set(value: Theme) {
    _theme = value
    localStorage.setItem(STORAGE_KEY, value)
    applyTheme(resolveTheme(value))
  }
}
