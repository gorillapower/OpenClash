<script lang="ts">
  import Sheet from '$lib/components/ui/sheet/sheet.svelte'
  import Button from '$lib/components/ui/button/button.svelte'
  import Input from '$lib/components/ui/input/input.svelte'
  import {
    useAddProxyGroup,
    useUpdateProxyGroup,
    type ProxyGroup,
    type ProxyGroupInput
  } from '$lib/queries/luci'

  type Props = {
    open: boolean
    onClose: () => void
    /** Pass a group to edit; undefined = add mode */
    group?: ProxyGroup
  }

  let { open, onClose, group }: Props = $props()

  const addMutation = useAddProxyGroup()
  const updateMutation = useUpdateProxyGroup()

  const isEdit = $derived(group !== undefined)
  const isPending = $derived(addMutation.isPending || updateMutation.isPending)

  let name = $state('')
  let type = $state<ProxyGroup['type']>('select')
  let testUrl = $state('')
  let testInterval = $state('')
  let policyFilter = $state('')
  let errors = $state<Record<string, string>>({})

  const showTestFields = $derived(type === 'url-test' || type === 'fallback')

  // Sync form when the sheet opens or the group changes
  $effect(() => {
    if (open) {
      name = group?.name ?? ''
      type = group?.type ?? 'select'
      testUrl = group?.testUrl ?? ''
      testInterval = group?.testInterval ?? ''
      policyFilter = group?.policyFilter ?? ''
      errors = {}
    }
  })

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'Name is required'
    if (showTestFields && !testUrl.trim()) e.testUrl = 'Test URL is required for this type'
    errors = e
    return Object.keys(e).length === 0
  }

  async function handleSubmit() {
    if (!validate()) return
    const input: ProxyGroupInput = {
      name: name.trim(),
      type,
      testUrl: showTestFields && testUrl.trim() ? testUrl.trim() : undefined,
      testInterval: showTestFields && testInterval.trim() ? testInterval.trim() : undefined,
      policyFilter: policyFilter.trim() || undefined
    }
    if (isEdit && group) {
      await updateMutation.mutateAsync({ id: group.id, ...input })
    } else {
      await addMutation.mutateAsync(input)
    }
    onClose()
  }
</script>

<Sheet {open} {onClose} title={isEdit ? 'Edit Proxy Group' : 'Add Proxy Group'}>
  <div class="flex h-full flex-col gap-6">
    <div class="space-y-4">
      <!-- Name -->
      <div class="space-y-1.5">
        <label for="pg-name" class="text-sm font-medium text-foreground">Name</label>
        <Input
          id="pg-name"
          bind:value={name}
          placeholder="e.g. HK Select"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'pg-name-error' : undefined}
        />
        {#if errors.name}
          <p id="pg-name-error" class="text-xs text-destructive">{errors.name}</p>
        {/if}
      </div>

      <!-- Type -->
      <div class="space-y-1.5">
        <label for="pg-type" class="text-sm font-medium text-foreground">Type</label>
        <select
          id="pg-type"
          bind:value={type}
          class="flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm text-foreground shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="select">Manual select</option>
          <option value="url-test">URL test (auto fastest)</option>
          <option value="fallback">Fallback (auto failover)</option>
          <option value="load-balance">Load balance</option>
        </select>
      </div>

      <!-- Test URL (url-test / fallback only) -->
      {#if showTestFields}
        <div class="space-y-1.5">
          <label for="pg-test-url" class="text-sm font-medium text-foreground">Test URL</label>
          <Input
            id="pg-test-url"
            bind:value={testUrl}
            placeholder="https://cp.cloudflare.com/generate_204"
            aria-invalid={!!errors.testUrl}
            aria-describedby={errors.testUrl ? 'pg-test-url-error' : undefined}
          />
          {#if errors.testUrl}
            <p id="pg-test-url-error" class="text-xs text-destructive">{errors.testUrl}</p>
          {/if}
        </div>

        <div class="space-y-1.5">
          <label for="pg-interval" class="text-sm font-medium text-foreground"
            >Test interval <span class="font-normal text-muted-foreground">(seconds)</span></label
          >
          <Input
            id="pg-interval"
            type="number"
            bind:value={testInterval}
            placeholder="300"
          />
        </div>
      {/if}

      <!-- Proxy filter -->
      <div class="space-y-1.5">
        <label for="pg-filter" class="text-sm font-medium text-foreground">
          Proxy filter
          <span class="font-normal text-muted-foreground">(regex)</span>
        </label>
        <Input
          id="pg-filter"
          bind:value={policyFilter}
          placeholder="e.g. .*HK.* to match all HK servers"
        />
        <p class="text-xs text-muted-foreground">
          Regex applied to proxy names from your subscription. Leave blank to include all.
        </p>
      </div>
    </div>

    <div class="mt-auto flex justify-end gap-2">
      <Button variant="outline" onclick={onClose} disabled={isPending}>Cancel</Button>
      <Button onclick={handleSubmit} disabled={isPending}>
        {isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Add group'}
      </Button>
    </div>
  </div>
</Sheet>
