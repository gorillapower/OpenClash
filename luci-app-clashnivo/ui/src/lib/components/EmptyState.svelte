<script lang="ts">
  import type { Snippet } from 'svelte'

  type Props = {
    title: string
    body?: string
    eyebrow?: string
    compact?: boolean
    actions?: Snippet
  }

  let { title, body, eyebrow, compact = false, actions }: Props = $props()
</script>

<div
  class={`rounded-xl border border-dashed border-border bg-muted/30 text-center ${compact ? 'px-5 py-6' : 'px-6 py-12 sm:px-10 sm:py-14'}`}
>
  <div class="mx-auto max-w-2xl space-y-2">
    {#if eyebrow}
      <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {eyebrow}
      </p>
    {/if}
    <p class="text-base font-semibold text-foreground">{title}</p>
    {#if body}
      <p class="text-sm leading-6 text-muted-foreground">{body}</p>
    {/if}
  </div>

  {#if actions}
    <div class="mt-5 flex flex-wrap items-center justify-center gap-3">
      {@render actions()}
    </div>
  {/if}
</div>
