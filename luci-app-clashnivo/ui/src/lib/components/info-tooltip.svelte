<script lang="ts">
  import { Tooltip } from '$lib/components/ui/tooltip'
  import { cn } from '$lib/utils'

  type Props = {
    text: string
    href?: string
    class?: string
  }

  let { text, href, class: className }: Props = $props()
</script>

<Tooltip content={text} {href} class={className}>
  <button
    type="button"
    class={cn(
      'inline-flex cursor-default items-center rounded text-muted-foreground',
      'transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
    )}
    aria-label="More information"
    tabindex="0"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  </button>
</Tooltip>
