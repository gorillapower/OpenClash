<script lang="ts">
  import type { Snippet } from 'svelte'
  import InfoTooltip from './info-tooltip.svelte'
  import { cn } from '$lib/utils'

  type Props = {
    label: string
    tooltip: string
    href?: string
    children?: Snippet
    class?: string
  }

  let { label, tooltip, href, children, class: className }: Props = $props()
</script>

<div class={cn('flex items-center justify-between gap-4 py-3', className)}>
  <div class="flex min-w-0 flex-1 items-center gap-1.5">
    <span class="text-sm font-medium">{label}</span>
    <InfoTooltip text={tooltip} {href} />
  </div>
  {#if children}
    <div class="flex shrink-0 items-center">
      {@render children()}
    </div>
  {/if}
</div>
