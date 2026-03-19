<script lang="ts">
  type Props = {
    title: string
    description?: string
    actions?: import('svelte').Snippet
  }

  let { title, description, actions }: Props = $props()
</script>

<div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
  <div class="min-w-0 space-y-1">
    <h2 class="text-lg font-semibold tracking-tight">{title}</h2>
    {#if description}
      <p class="max-w-3xl text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    {/if}
  </div>

  {#if actions}
    <div class="flex shrink-0 flex-wrap items-center gap-2">
      {@render actions()}
    </div>
  {/if}
</div>
