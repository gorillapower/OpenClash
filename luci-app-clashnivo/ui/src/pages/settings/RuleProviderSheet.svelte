<script lang="ts">
  import Sheet from '$lib/components/ui/sheet/sheet.svelte'
  import Button from '$lib/components/ui/button/button.svelte'
  import Input from '$lib/components/ui/input/input.svelte'
  import {
    useAddRuleProvider,
    useUpdateRuleProvider,
    type RuleProvider,
    type RuleProviderInput
  } from '$lib/queries/luci'

  type Props = {
    open: boolean
    onClose: () => void
    /** Pass a provider to edit; undefined = add mode */
    provider?: RuleProvider
  }

  let { open, onClose, provider }: Props = $props()

  const addMutation = useAddRuleProvider()
  const updateMutation = useUpdateRuleProvider()

  const isEdit = $derived(provider !== undefined)
  const isPending = $derived(addMutation.isPending || updateMutation.isPending)

  let name = $state('')
  let type = $state<RuleProvider['type']>('http')
  let behavior = $state<RuleProvider['behavior']>('domain')
  let url = $state('')
  let interval = $state('86400')
  let format = $state<RuleProvider['format']>('yaml')
  let group = $state('')
  let position = $state<RuleProvider['position']>('0')
  let errors = $state<Record<string, string>>({})

  const showUrlFields = $derived(type === 'http')

  $effect(() => {
    if (open) {
      name = provider?.name ?? ''
      type = provider?.type ?? 'http'
      behavior = provider?.behavior ?? 'domain'
      url = provider?.url ?? ''
      interval = provider?.interval ?? '86400'
      format = provider?.format ?? 'yaml'
      group = provider?.group ?? ''
      position = provider?.position ?? '0'
      errors = {}
    }
  })

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'Name is required'
    if (showUrlFields && !url.trim()) e.url = 'URL is required for HTTP type'
    errors = e
    return Object.keys(e).length === 0
  }

  async function handleSubmit() {
    if (!validate()) return
    const input: RuleProviderInput = {
      name: name.trim(),
      type,
      behavior,
      format,
      position,
      url: showUrlFields && url.trim() ? url.trim() : undefined,
      interval: showUrlFields && interval.trim() ? interval.trim() : undefined,
      group: group.trim() || undefined
    }
    if (isEdit && provider) {
      await updateMutation.mutateAsync({ id: provider.id, ...input })
    } else {
      await addMutation.mutateAsync(input)
    }
    onClose()
  }
</script>

<Sheet {open} {onClose} title={isEdit ? 'Edit Rule Provider' : 'Add Rule Provider'}>
  <div class="flex h-full flex-col gap-6">
    <div class="space-y-4">
      <!-- Name -->
      <div class="space-y-1.5">
        <label for="rp-name" class="text-sm font-medium text-foreground">Name</label>
        <Input
          id="rp-name"
          bind:value={name}
          placeholder="e.g. Azure_West_Europe"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'rp-name-error' : undefined}
        />
        {#if errors.name}
          <p id="rp-name-error" class="text-xs text-destructive">{errors.name}</p>
        {/if}
      </div>

      <!-- Type -->
      <div class="space-y-1.5">
        <label for="rp-type" class="text-sm font-medium text-foreground">Type</label>
        <select
          id="rp-type"
          bind:value={type}
          class="flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm text-foreground shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="http">HTTP (remote URL)</option>
          <option value="inline">Inline YAML</option>
        </select>
      </div>

      <!-- URL + interval (http only) -->
      {#if showUrlFields}
        <div class="space-y-1.5">
          <label for="rp-url" class="text-sm font-medium text-foreground">URL</label>
          <Input
            id="rp-url"
            bind:value={url}
            placeholder="https://example.com/rules.yaml"
            aria-invalid={!!errors.url}
            aria-describedby={errors.url ? 'rp-url-error' : undefined}
          />
          {#if errors.url}
            <p id="rp-url-error" class="text-xs text-destructive">{errors.url}</p>
          {/if}
        </div>

        <div class="space-y-1.5">
          <label for="rp-interval" class="text-sm font-medium text-foreground">
            Refresh interval <span class="font-normal text-muted-foreground">(seconds)</span>
          </label>
          <Input id="rp-interval" type="number" bind:value={interval} placeholder="86400" />
        </div>
      {/if}

      <!-- Behavior -->
      <div class="space-y-1.5">
        <label for="rp-behavior" class="text-sm font-medium text-foreground">Behavior</label>
        <select
          id="rp-behavior"
          bind:value={behavior}
          class="flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm text-foreground shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="domain">Domain</option>
          <option value="ipcidr">IP CIDR</option>
          <option value="classical">Classical</option>
        </select>
        <p class="text-xs text-muted-foreground">
          Matches the format of the rule file: domain names, CIDR ranges, or full Clash rule entries.
        </p>
      </div>

      <!-- Format -->
      <div class="space-y-1.5">
        <label for="rp-format" class="text-sm font-medium text-foreground">Format</label>
        <select
          id="rp-format"
          bind:value={format}
          class="flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm text-foreground shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="yaml">YAML</option>
          <option value="text">Text (one rule per line)</option>
        </select>
      </div>

      <!-- Target group -->
      <div class="space-y-1.5">
        <label for="rp-group" class="text-sm font-medium text-foreground">
          Target group <span class="font-normal text-muted-foreground">(optional)</span>
        </label>
        <Input
          id="rp-group"
          bind:value={group}
          placeholder="e.g. PROXY or REJECT"
        />
        <p class="text-xs text-muted-foreground">
          Traffic matching this provider's rules is routed to this proxy group.
        </p>
      </div>

      <!-- Rule position -->
      <div class="space-y-1.5">
        <label for="rp-position" class="text-sm font-medium text-foreground">Rule position</label>
        <select
          id="rp-position"
          bind:value={position}
          class="flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm text-foreground shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="0">Top (higher priority)</option>
          <option value="1">Bottom (lower priority)</option>
        </select>
      </div>
    </div>

    <div class="mt-auto flex justify-end gap-2">
      <Button variant="outline" onclick={onClose} disabled={isPending}>Cancel</Button>
      <Button onclick={handleSubmit} disabled={isPending}>
        {isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Add provider'}
      </Button>
    </div>
  </div>
</Sheet>
