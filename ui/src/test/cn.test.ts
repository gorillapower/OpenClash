import { describe, it, expect } from 'vitest'
import { cn } from '$lib/utils'

describe('cn()', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('handles falsy values', () => {
    expect(cn('foo', undefined, false, 'bar')).toBe('foo bar')
  })

  it('resolves Tailwind conflicts — last wins', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2')
  })
})
