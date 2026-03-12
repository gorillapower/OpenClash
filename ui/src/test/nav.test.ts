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
    expect(screen.getByRole('link', { name: 'Profiles' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Settings' })).toBeInTheDocument()
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
    expect(screen.getByRole('link', { name: 'Profiles' })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('link', { name: 'Settings' })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('link', { name: 'System' })).not.toHaveAttribute('aria-current')
  })
})

describe('Route rendering', () => {
  it('shows Status page at #/', () => {
    setHash('#/')
    render(App)
    expect(screen.getByRole('heading', { name: 'Status' })).toBeInTheDocument()
    screen.unmount?.()
  })

  it('shows Profiles page at #/profiles', () => {
    setHash('#/profiles')
    const { unmount } = render(App)
    expect(screen.getByRole('heading', { name: 'Profiles' })).toBeInTheDocument()
    unmount()
  })

  it('shows Settings page at #/settings', () => {
    setHash('#/settings')
    const { unmount } = render(App)
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
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
})
