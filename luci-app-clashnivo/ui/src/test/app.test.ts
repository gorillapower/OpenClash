import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/svelte'
import App from '../App.svelte'

function setHash(path: string) {
  window.location.hash = path
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}

describe('App routing', () => {
  beforeEach(() => {
    setHash('#/')
  })

  it('shows Status page by default', () => {
    render(App)
    expect(screen.getByRole('heading', { name: 'Status' })).toBeInTheDocument()
  })

  it('renders the nav', () => {
    render(App)
    expect(screen.getByRole('navigation')).toBeInTheDocument()
  })
})
