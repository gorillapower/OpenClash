import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/svelte'
import Sheet from '$lib/components/ui/sheet/sheet.svelte'

// Svelte 5 snippet workaround: pass children as a string rendered in a wrapper.
// @testing-library/svelte renders the component; we check visible DOM output.

describe('Sheet component', () => {
  it('is hidden when open is false', () => {
    render(Sheet, { props: { open: false, title: 'Test Sheet' } })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders when open is true', () => {
    render(Sheet, { props: { open: true, title: 'My Sheet' } })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('shows the title', () => {
    render(Sheet, { props: { open: true, title: 'Add Subscription' } })
    expect(screen.getByText('Add Subscription')).toBeInTheDocument()
  })

  it('renders a close button', () => {
    render(Sheet, { props: { open: true, title: 'Test' } })
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn()
    render(Sheet, { props: { open: true, title: 'Test', onClose } })
    await fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when backdrop is clicked', async () => {
    const onClose = vi.fn()
    const { container } = render(Sheet, { props: { open: true, title: 'Test', onClose } })
    // The backdrop is the first fixed div (aria-hidden)
    const backdrop = container.querySelector('[aria-hidden="true"]')
    expect(backdrop).not.toBeNull()
    await fireEvent.click(backdrop!)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when Escape key is pressed', async () => {
    const onClose = vi.fn()
    render(Sheet, { props: { open: true, title: 'Test', onClose } })
    await fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('does not call onClose for non-Escape keys', async () => {
    const onClose = vi.fn()
    render(Sheet, { props: { open: true, title: 'Test', onClose } })
    await fireEvent.keyDown(window, { key: 'Enter' })
    expect(onClose).not.toHaveBeenCalled()
  })
})
