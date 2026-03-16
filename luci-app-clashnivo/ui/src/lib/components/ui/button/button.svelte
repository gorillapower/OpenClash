<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { HTMLButtonAttributes } from 'svelte/elements'
  import { cn } from '$lib/utils'
  import { buttonVariants, type ButtonSize, type ButtonVariant } from './variants'

  type Props = HTMLButtonAttributes & {
    variant?: ButtonVariant
    size?: ButtonSize
    children?: Snippet
    class?: string
  }

  let {
    class: className,
    variant = 'default',
    size = 'default',
    children,
    type = 'button',
    ...restProps
  }: Props = $props()
</script>

<button
  class={cn(buttonVariants({ variant, size }), className)}
  type={type}
  {...restProps}
>
  {@render children?.()}
</button>
