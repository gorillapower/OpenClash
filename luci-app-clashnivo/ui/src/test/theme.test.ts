import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/svelte'

// Static imports used for Nav component tests (shared module instance)
import Nav from '$lib/components/Nav.svelte'
import { theme } from '$lib/theme.svelte'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockMatchMedia(matches: boolean) {
  const listeners: Array<(e: { matches: boolean }) => void> = []
  const mql = {
    matches,
    addEventListener: vi.fn((_event: string, cb: (e: { matches: boolean }) => void) => {
      listeners.push(cb)
    }),
    removeEventListener: vi.fn(),
    _trigger: (newMatches: boolean) => listeners.forEach((cb) => cb({ matches: newMatches }))
  }
  Object.defineProperty(window, 'matchMedia', { writable: true, value: vi.fn().mockReturnValue(mql) })
  return mql
}

function restoreDefaultMatchMedia() {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }))
  })
}

// ---------------------------------------------------------------------------
// Theme store tests — each test gets a fresh module instance via resetModules
// ---------------------------------------------------------------------------

describe('theme store', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
    vi.resetModules()
  })

  afterEach(() => {
    restoreDefaultMatchMedia()
  })

  it('defaults to system preference (light) when no localStorage entry', async () => {
    mockMatchMedia(false)
    const { theme: t } = await import('$lib/theme.svelte')
    expect(t.current).toBe('system')
    expect(t.isDark).toBe(false)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('defaults to system preference (dark) when system is dark', async () => {
    mockMatchMedia(true)
    const { theme: t } = await import('$lib/theme.svelte')
    expect(t.current).toBe('system')
    expect(t.isDark).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('reads persisted "dark" preference from localStorage on init', async () => {
    localStorage.setItem('clash-nivo-theme', 'dark')
    mockMatchMedia(false) // system is light but stored preference wins
    const { theme: t } = await import('$lib/theme.svelte')
    expect(t.current).toBe('dark')
    expect(t.isDark).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('reads persisted "light" preference from localStorage on init', async () => {
    localStorage.setItem('clash-nivo-theme', 'light')
    mockMatchMedia(true) // system is dark but stored preference wins
    const { theme: t } = await import('$lib/theme.svelte')
    expect(t.current).toBe('light')
    expect(t.isDark).toBe(false)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('toggle switches from light to dark and writes localStorage', async () => {
    mockMatchMedia(false)
    const { theme: t } = await import('$lib/theme.svelte')
    expect(t.isDark).toBe(false)

    t.toggle()

    expect(t.isDark).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('clash-nivo-theme')).toBe('dark')
  })

  it('toggle switches from dark to light and writes localStorage', async () => {
    localStorage.setItem('clash-nivo-theme', 'dark')
    mockMatchMedia(false)
    const { theme: t } = await import('$lib/theme.svelte')
    expect(t.isDark).toBe(true)

    t.toggle()

    expect(t.isDark).toBe(false)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(localStorage.getItem('clash-nivo-theme')).toBe('light')
  })

  it('toggle from system-dark produces explicit light and persists it', async () => {
    mockMatchMedia(true)
    const { theme: t } = await import('$lib/theme.svelte')
    expect(t.current).toBe('system')
    expect(t.isDark).toBe(true)

    t.toggle()

    expect(t.current).toBe('light')
    expect(t.isDark).toBe(false)
    expect(localStorage.getItem('clash-nivo-theme')).toBe('light')
  })

  it('set() overrides to a specific theme', async () => {
    mockMatchMedia(false)
    const { theme: t } = await import('$lib/theme.svelte')

    t.set('dark')
    expect(t.current).toBe('dark')
    expect(t.isDark).toBe(true)
    expect(localStorage.getItem('clash-nivo-theme')).toBe('dark')

    t.set('system')
    expect(t.current).toBe('system')
    expect(t.isDark).toBe(false) // system is light
  })
})

// ---------------------------------------------------------------------------
// Nav toggle button tests — use the shared static module instance for Nav
// ---------------------------------------------------------------------------

describe('Nav theme toggle button', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
    // Start in light mode
    theme.set('light')
  })

  afterEach(() => {
    theme.set('light')
  })

  it('renders moon icon in light mode', () => {
    render(Nav)
    expect(screen.getByTestId('moon-icon')).toBeInTheDocument()
    expect(screen.queryByTestId('sun-icon')).not.toBeInTheDocument()
  })

  it('renders sun icon in dark mode', () => {
    theme.set('dark')
    render(Nav)
    expect(screen.getByTestId('sun-icon')).toBeInTheDocument()
    expect(screen.queryByTestId('moon-icon')).not.toBeInTheDocument()
  })

  it('toggle button has accessible label in light mode', () => {
    render(Nav)
    expect(screen.getByRole('button', { name: /switch to dark mode/i })).toBeInTheDocument()
  })

  it('toggle button has accessible label in dark mode', () => {
    theme.set('dark')
    render(Nav)
    expect(screen.getByRole('button', { name: /switch to light mode/i })).toBeInTheDocument()
  })

  it('clicking toggle switches html class to dark', async () => {
    render(Nav)
    const btn = screen.getByTestId('theme-toggle')

    expect(document.documentElement.classList.contains('dark')).toBe(false)
    await fireEvent.click(btn)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})
