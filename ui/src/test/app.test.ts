import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/svelte'
import App from '../App.svelte'

describe('App.svelte', () => {
  it('renders without errors', () => {
    render(App)
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('shows the product name', () => {
    render(App)
    expect(screen.getByText('Clash Nivo')).toBeInTheDocument()
  })
})
