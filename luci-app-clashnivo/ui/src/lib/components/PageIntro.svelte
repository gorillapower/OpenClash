<script lang="ts">
  type Props = {
    title: string
    description: string
    eyebrow?: string
    actions?: import('svelte').Snippet
  }

  let { title, description, eyebrow, actions }: Props = $props()
</script>

<header class="flex flex-col gap-4 border-b border-border/60 pb-5 md:flex-row md:items-end md:justify-between">
  <div class="min-w-0 space-y-2">
    {#if eyebrow}
      <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {eyebrow}
      </p>
    {/if}
    <div class="space-y-1.5">
      <h1 class="text-2xl font-semibold tracking-tight">{title}</h1>
      <p class="max-w-3xl text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  </div>

  {#if actions}
    <div class="flex shrink-0 flex-wrap items-center gap-2">
      {@render actions()}
    </div>
  {/if}
</header>
