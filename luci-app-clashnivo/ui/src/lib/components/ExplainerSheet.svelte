<script lang="ts">
  import { Sheet } from '$lib/components/ui/sheet'

  type Section = {
    title: string
    body: string
  }

  type Props = {
    open: boolean
    onClose: () => void
    title: string
    intro: string
    sections: Section[]
    flow?: string[]
  }

  let { open, onClose, title, intro, sections, flow = [] }: Props = $props()
</script>

<Sheet {open} {onClose} {title}>
  <div class="space-y-6">
    <p class="text-sm leading-6 text-muted-foreground">{intro}</p>

    {#if flow.length > 0}
      <div class="space-y-2">
        <p class="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Flow
        </p>
        <div class="flex flex-wrap items-center gap-2">
          {#each flow as step, index (step)}
            <div class="flex items-center gap-2">
              <div class="rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground">
                {step}
              </div>
              {#if index < flow.length - 1}
                <span class="text-muted-foreground" aria-hidden="true">→</span>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <div class="space-y-4">
      {#each sections as section (section.title)}
        <section class="space-y-1">
          <h3 class="text-sm font-semibold text-foreground">{section.title}</h3>
          <p class="text-sm leading-6 text-muted-foreground">{section.body}</p>
        </section>
      {/each}
    </div>
  </div>
</Sheet>
