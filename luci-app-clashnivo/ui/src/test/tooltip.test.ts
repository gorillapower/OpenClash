import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/svelte'
import Tooltip from '$lib/components/ui/tooltip/tooltip.svelte'
import InfoTooltip from '$lib/components/info-tooltip.svelte'
import { createRawSnippet } from 'svelte'

describe('Tooltip component', () => {
  const triggerSnippet = createRawSnippet(() => ({
    render: () => '<button type="button">Trigger</button>',
  }))

  it('renders trigger content', () => {
    render(Tooltip, { props: { content: 'Some info', children: triggerSnippet } })
    expect(screen.getByRole('button', { name: 'Trigger' })).toBeInTheDocument()
  })

  it('tooltip content is not visible by default', () => {
    render(Tooltip, { props: { content: 'Hidden text', children: triggerSnippet } })
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('tooltip content appears on mouseenter', async () => {
    render(Tooltip, { props: { content: 'Hover info', children: triggerSnippet } })
    const trigger = screen.getByRole('button', { name: 'Trigger' }).parentElement!
    await fireEvent.mouseEnter(trigger)
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
    expect(screen.getByRole('tooltip')).toHaveTextContent('Hover info')
  })

  it('tooltip content appears on focus', async () => {
    render(Tooltip, { props: { content: 'Focus info', children: triggerSnippet } })
    const trigger = screen.getByRole('button', { name: 'Trigger' }).parentElement!
    await fireEvent.focus(trigger)
    expect(screen.getByRole('tooltip')).toHaveTextContent('Focus info')
  })

  it('tooltip content appears on click (mobile tap)', async () => {
    render(Tooltip, { props: { content: 'Tap info', children: triggerSnippet } })
    const trigger = screen.getByRole('button', { name: 'Trigger' }).parentElement!
    await fireEvent.click(trigger)
    expect(screen.getByRole('tooltip')).toHaveTextContent('Tap info')
  })

  it('tooltip hides on mouseleave', async () => {
    render(Tooltip, { props: { content: 'Hover info', children: triggerSnippet } })
    const trigger = screen.getByRole('button', { name: 'Trigger' }).parentElement!
    await fireEvent.mouseEnter(trigger)
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
    await fireEvent.mouseLeave(trigger)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('tooltip hides on Escape key', async () => {
    render(Tooltip, { props: { content: 'Escape test', children: triggerSnippet } })
    const trigger = screen.getByRole('button', { name: 'Trigger' }).parentElement!
    await fireEvent.mouseEnter(trigger)
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
    await fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('renders optional href link inside tooltip', async () => {
    render(Tooltip, {
      props: { content: 'Link test', href: 'https://docs.example.com', children: triggerSnippet },
    })
    const trigger = screen.getByRole('button', { name: 'Trigger' }).parentElement!
    await fireEvent.mouseEnter(trigger)
    const link = screen.getByRole('link', { name: /learn more/i })
    expect(link).toHaveAttribute('href', 'https://docs.example.com')
  })

  it('does not render a link when href is not provided', async () => {
    render(Tooltip, { props: { content: 'No link', children: triggerSnippet } })
    const trigger = screen.getByRole('button', { name: 'Trigger' }).parentElement!
    await fireEvent.mouseEnter(trigger)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('trigger has aria-describedby pointing to tooltip when visible', async () => {
    render(Tooltip, { props: { content: 'ARIA test', children: triggerSnippet } })
    const trigger = screen.getByRole('button', { name: 'Trigger' }).parentElement!
    await fireEvent.mouseEnter(trigger)
    const tooltip = screen.getByRole('tooltip')
    expect(trigger).toHaveAttribute('aria-describedby', tooltip.id)
  })
})

describe('InfoTooltip component', () => {
  it('renders an ⓘ icon button', () => {
    render(InfoTooltip, { props: { text: 'Some info' } })
    expect(screen.getByRole('button', { name: /more information/i })).toBeInTheDocument()
  })

  it('shows tooltip text on hover', async () => {
    render(InfoTooltip, { props: { text: 'Detailed explanation' } })
    const btn = screen.getByRole('button', { name: /more information/i })
    await fireEvent.mouseEnter(btn.parentElement!)
    expect(screen.getByRole('tooltip')).toHaveTextContent('Detailed explanation')
  })

  it('accepts and displays custom text content', async () => {
    render(InfoTooltip, { props: { text: 'Custom tooltip text here' } })
    const btn = screen.getByRole('button', { name: /more information/i })
    await fireEvent.mouseEnter(btn.parentElement!)
    expect(screen.getByRole('tooltip')).toHaveTextContent('Custom tooltip text here')
  })

  it('supports optional href link', async () => {
    render(InfoTooltip, { props: { text: 'With link', href: 'https://example.com' } })
    const btn = screen.getByRole('button', { name: /more information/i })
    await fireEvent.mouseEnter(btn.parentElement!)
    expect(screen.getByRole('link', { name: /learn more/i })).toHaveAttribute(
      'href',
      'https://example.com'
    )
  })

  it('multiple InfoTooltips on same page do not interfere', async () => {
    render(InfoTooltip, { props: { text: 'First tooltip' } })
    render(InfoTooltip, { props: { text: 'Second tooltip' } })

    const buttons = screen.getAllByRole('button', { name: /more information/i })
    expect(buttons).toHaveLength(2)

    // Hover first — only its tooltip should appear
    await fireEvent.mouseEnter(buttons[0].parentElement!)
    const tooltips = screen.getAllByRole('tooltip')
    expect(tooltips).toHaveLength(1)
    expect(tooltips[0]).toHaveTextContent('First tooltip')

    // Move to second — only its tooltip should appear
    await fireEvent.mouseLeave(buttons[0].parentElement!)
    await fireEvent.mouseEnter(buttons[1].parentElement!)
    const tooltips2 = screen.getAllByRole('tooltip')
    expect(tooltips2).toHaveLength(1)
    expect(tooltips2[0]).toHaveTextContent('Second tooltip')
  })
})
