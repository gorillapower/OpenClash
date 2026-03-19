<script lang="ts">
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card'

  type Props = {
    label: string
    value: string | number
    detail?: string
    valueClass?: string
  }

  let { label, value, detail, valueClass = 'text-2xl' }: Props = $props()
</script>

<Card class="h-full">
  <CardHeader class="pb-2">
    <p class="text-sm text-muted-foreground">{label}</p>
    <CardTitle class={valueClass}>{value}</CardTitle>
  </CardHeader>
  {#if detail}
    <CardContent class="pt-0 text-sm leading-6 text-muted-foreground">
      {detail}
    </CardContent>
  {/if}
</Card>
