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

<div class={cn('p-5 pt-3', className)} {...restProps}>
  {@render children?.()}
</div>
