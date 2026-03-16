<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { HTMLAttributes } from 'svelte/elements'
  import { cn } from '$lib/utils'

  type Props = HTMLAttributes<HTMLParagraphElement> & {
    children?: Snippet
    class?: string
  }

  let { class: className, children, ...restProps }: Props = $props()
</script>

<p class={cn('text-xs font-medium uppercase tracking-wide text-muted-foreground', className)} {...restProps}>
  {@render children?.()}
</p>
