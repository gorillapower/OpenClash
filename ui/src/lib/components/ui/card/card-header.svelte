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

<div class={cn('flex flex-col gap-1 p-5 pb-0', className)} {...restProps}>
  {@render children?.()}
</div>
