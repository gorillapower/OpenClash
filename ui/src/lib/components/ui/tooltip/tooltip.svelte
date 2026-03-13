<script lang="ts">
  import type { Snippet } from 'svelte'
  import { cn } from '$lib/utils'

  type Props = {
    content: string
    href?: string
    children: Snippet
    class?: string
  }

  let { content, href, children, class: className }: Props = $props()

  let visible = $state(false)
  const tooltipId = crypto.randomUUID()

  function show() {
    visible = true
  }

  function hide() {
    visible = false
  }

  function toggle() {
    visible = !visible
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') hide()
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<span class={cn('relative inline-flex', className)}>
  <!-- Trigger wrapper: captures hover/focus from the child and propagates to tooltip -->
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <span
    class="inline-flex"
    onmouseenter={show}
    onmouseleave={hide}
    onfocus={show}
    onblur={hide}
    onclick={toggle}
    aria-describedby={visible ? tooltipId : undefined}
  >
    {@render children()}
  </span>

  {#if visible}
    <span
      id={tooltipId}
      role="tooltip"
      class={cn(
        'pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2',
        'w-max max-w-64 rounded-md bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md'
      )}
    >
      {content}
      {#if href}
        <a
          {href}
          target="_blank"
          rel="noopener noreferrer"
          class="pointer-events-auto ml-1 underline opacity-70 hover:opacity-100"
        >
          Learn more
        </a>
      {/if}
    </span>
  {/if}
</span>
