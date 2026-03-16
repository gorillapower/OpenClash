<script lang="ts">
  import Sheet from '$lib/components/ui/sheet/sheet.svelte'
  import Button from '$lib/components/ui/button/button.svelte'
  import YamlEditor from '$lib/components/YamlEditor.svelte'
  import { useAdvancedYaml, useSetAdvancedYaml } from '$lib/queries/luci'

  type Props = {
    open: boolean
    onClose: () => void
  }

  let { open, onClose }: Props = $props()

  const query = useAdvancedYaml()
  const mutation = useSetAdvancedYaml()

  let localContent = $state('')

  $effect(() => {
    if (open && query.data !== undefined) {
      localContent = query.data.content
    }
  })

  async function handleSave() {
    await mutation.mutateAsync(localContent)
    onClose()
  }
</script>

<Sheet {open} {onClose} title="Advanced YAML">
  <div class="flex h-full flex-col gap-4">
    <p class="text-sm text-muted-foreground">
      Write raw YAML proxy-group and rule definitions that are merged into the active config at
      startup. This is an alternative to the simple forms above for complex setups.
    </p>

    {#if query.isPending}
      <div class="h-64 animate-pulse rounded-md bg-muted"></div>
    {:else}
      <div class="min-h-0 flex-1">
        <YamlEditor content={localContent} onChange={(v) => (localContent = v)} />
      </div>
    {/if}

    <div class="flex justify-end gap-2">
      <Button variant="outline" onclick={onClose} disabled={mutation.isPending}>Cancel</Button>
      <Button onclick={handleSave} disabled={mutation.isPending}>
        {mutation.isPending ? 'Saving…' : 'Save'}
      </Button>
    </div>
  </div>
</Sheet>
