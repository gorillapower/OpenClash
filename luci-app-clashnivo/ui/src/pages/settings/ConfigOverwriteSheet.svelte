<script lang="ts">
  import Sheet from '$lib/components/ui/sheet/sheet.svelte'
  import Button from '$lib/components/ui/button/button.svelte'
  import YamlEditor from '$lib/components/YamlEditor.svelte'
  import { useConfigOverwrite, useSetConfigOverwrite } from '$lib/queries/luci'

  type Props = {
    open: boolean
    onClose: () => void
  }

  let { open, onClose }: Props = $props()

  const query = useConfigOverwrite()
  const mutation = useSetConfigOverwrite()

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

<Sheet {open} {onClose} title="Config Overwrite">
  <div class="flex h-full flex-col gap-4">
    <p class="text-sm text-muted-foreground">
      This shell script runs at startup after the active config is loaded. Use the helper
      functions (<code class="font-mono text-xs">ruby_edit</code>,
      <code class="font-mono text-xs">ruby_arr_insert</code>,
      <code class="font-mono text-xs">ruby_merge_hash</code>) to modify any YAML key
      without touching your subscription file.
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
