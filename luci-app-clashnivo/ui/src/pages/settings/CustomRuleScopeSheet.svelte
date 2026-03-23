<script lang="ts">
  import Sheet from '$lib/components/ui/sheet/sheet.svelte'
  import Button from '$lib/components/ui/button/button.svelte'
  import type { CustomRule, ScopeMode } from '$lib/queries/luci'

  type Props = {
    open: boolean
    onClose: () => void
    onSave: (rule: CustomRule) => void
    rule?: CustomRule
    sourceNames: string[]
  }

  let { open, onClose, onSave, rule, sourceNames }: Props = $props()

  let scopeMode = $state<ScopeMode>('all')
  let scopeTargets = $state<string[]>([])
  let error = $state('')

  $effect(() => {
    if (open && rule) {
      scopeMode = rule.scopeMode ?? 'all'
      scopeTargets = [...(rule.scopeTargets ?? [])]
      error = ''
    }
  })

  function handleSave() {
    if (!rule) return
    if (scopeMode === 'selected' && scopeTargets.length === 0) {
      error = 'Select at least one source'
      return
    }
    onSave({ ...rule, scopeMode, scopeTargets })
    onClose()
  }
</script>

<Sheet {open} {onClose} title="Edit Rule Scope">
  <div class="flex h-full flex-col gap-6">
    <div class="space-y-4">
      {#if rule}
        <div class="rounded-md border border-border bg-muted/30 px-3 py-3">
          <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rule</p>
          <code class="mt-2 block font-mono text-xs text-foreground">
            {rule.type},{rule.value},{rule.target}
          </code>
        </div>
      {/if}

      <div class="space-y-2">
        <label for="rule-scope" class="text-sm font-medium text-foreground">Scope</label>
        <select
          id="rule-scope"
          bind:value={scopeMode}
          class="flex h-9 w-full rounded-md border border-border bg-background px-3 py-1 text-sm text-foreground shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="all">All sources</option>
          <option value="selected">Selected sources</option>
        </select>
      </div>

      {#if scopeMode === 'selected'}
        <div class="space-y-2 rounded-md border border-border bg-muted/30 px-3 py-3">
          {#each sourceNames as sourceName (sourceName)}
            <label class="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={scopeTargets.includes(sourceName)}
                onchange={(event) => {
                  const checked = (event.currentTarget as HTMLInputElement).checked
                  scopeTargets = checked
                    ? [...scopeTargets, sourceName]
                    : scopeTargets.filter((value) => value !== sourceName)
                }}
              />
              <span>{sourceName}</span>
            </label>
          {/each}
        </div>
      {/if}

      {#if error}
        <p class="text-xs text-destructive">{error}</p>
      {/if}
    </div>

    <div class="mt-auto flex justify-end gap-2">
      <Button variant="outline" onclick={onClose}>Cancel</Button>
      <Button onclick={handleSave}>Save scope</Button>
    </div>
  </div>
</Sheet>
