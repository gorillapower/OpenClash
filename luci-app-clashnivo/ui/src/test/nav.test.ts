import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/svelte'
import Nav from '$lib/components/Nav.svelte'
import App from '../App.svelte'

function setHash(path: string) {
  window.location.hash = path
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}

describe('Nav component', () => {
  beforeEach(() => setHash('#/'))

  it('renders 4 nav links', () => {
    render(Nav)
    expect(screen.getByRole('link', { name: 'Status' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sources' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Compose' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'System' })).toBeInTheDocument()
  })

  it('renders the Dashboard link with target="_blank"', () => {
    render(Nav)
    const link = screen.getByRole('link', { name: /open dashboard/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('marks the active link with aria-current="page"', () => {
    render(Nav)
    expect(screen.getByRole('link', { name: 'Status' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Sources' })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('link', { name: 'Compose' })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('link', { name: 'System' })).not.toHaveAttribute('aria-current')
  })
})

describe('Route rendering', () => {
  it('shows Status page at #/', () => {
    setHash('#/')
    render(App)
    expect(screen.getByRole('heading', { name: 'Status' })).toBeInTheDocument()
  })

  it('shows Sources page at #/sources', () => {
    setHash('#/sources')
    const { unmount } = render(App)
    expect(screen.getByRole('heading', { name: 'Sources' })).toBeInTheDocument()
    unmount()
  })

  it('shows Compose page at #/compose', () => {
    setHash('#/compose')
    const { unmount } = render(App)
    expect(screen.getByRole('heading', { name: 'Compose' })).toBeInTheDocument()
    unmount()
  })

  it('shows System page at #/system', () => {
    setHash('#/system')
    const { unmount } = render(App)
    expect(screen.getByRole('heading', { name: 'System' })).toBeInTheDocument()
    unmount()
  })

  it('falls back to Status for unknown routes', () => {
    setHash('#/unknown')
    render(App)
    expect(screen.getByRole('heading', { name: 'Status' })).toBeInTheDocument()
  })

  it('maps legacy profile and settings routes to reset destinations', () => {
    setHash('#/profiles')
    const firstRender = render(App)
    expect(screen.getByRole('heading', { name: 'Sources' })).toBeInTheDocument()
    firstRender.unmount()

    setHash('#/settings')
    render(App)
    expect(screen.getByRole('heading', { name: 'Compose' })).toBeInTheDocument()
  })
})
