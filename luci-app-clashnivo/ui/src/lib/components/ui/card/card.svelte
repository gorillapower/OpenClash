<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'
  import { cn } from '$lib/utils'

  type Props = HTMLAttributes<HTMLDivElement> & {
    children?: Snippet
    class?: string
  }

  let { class: className, children, ...restProps }: Props = $props()
</script>

<div
  class={cn('rounded-lg border border-border bg-card text-card-foreground shadow-sm', className)}
  {...restProps}
>
  {@render children?.()}
</div>
