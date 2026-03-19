<script lang="ts">
  type Props = {
    title: string
    body: string
    id?: string
  }

  let { title, body, id }: Props = $props()
</script>

<div {id} data-doc-hook class="rounded-xl border border-border/70 bg-muted/30 px-4 py-3">
  <p class="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
    {title}
  </p>
  <p class="mt-1 text-sm leading-6 text-muted-foreground">
    {body}
  </p>
</div>
