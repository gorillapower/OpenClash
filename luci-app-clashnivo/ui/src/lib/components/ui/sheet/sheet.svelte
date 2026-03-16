<script lang="ts">
  import type { Snippet } from 'svelte'
  import { cn } from '$lib/utils'

  type Props = {
    open?: boolean
    onClose?: () => void
    title?: string
    children?: Snippet
    class?: string
  }

  let { open = false, onClose, title, children, class: className }: Props = $props()

  function close() {
    onClose?.()
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') close()
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) close()
  }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <!-- Backdrop -->
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    class="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] transition-opacity"
    onclick={handleBackdropClick}
    aria-hidden="true"
  ></div>

  <!-- Panel -->
  <div
    class={cn(
      'fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-background shadow-xl',
      'sm:w-[420px] sm:border-l sm:border-border',
      'animate-in slide-in-from-right duration-200',
      className
    )}
    role="dialog"
    aria-modal="true"
    aria-label={title}
  >
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-border px-6 py-4">
      {#if title}
        <h2 class="text-base font-semibold">{title}</h2>
      {/if}
      <button
        class={cn(
          'ml-auto rounded-md p-1 text-muted-foreground transition-colors',
          'hover:bg-muted hover:text-foreground'
        )}
        onclick={close}
        aria-label="Close"
        type="button"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>

    <!-- Scrollable content -->
    <div class="flex-1 overflow-y-auto px-6 py-5">
      {@render children?.()}
    </div>
  </div>
{/if}
