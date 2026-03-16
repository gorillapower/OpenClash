<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements'
  import { cn } from '$lib/utils'

  type Props = HTMLInputAttributes & {
    class?: string
    value?: string | number | readonly string[]
  }

  let { class: className, value = $bindable(''), ...restProps }: Props = $props()
</script>

<input
  bind:value
  class={cn(
    'flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm text-foreground shadow-sm transition-colors',
    'placeholder:text-muted-foreground',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    'disabled:cursor-not-allowed disabled:opacity-50',
    className
  )}
  {...restProps}
/>
