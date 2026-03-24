<script lang="ts">
  import Button from '$lib/components/ui/button/button.svelte'
  import {
    useConfigs,
    useProxyGroups,
    useDeleteProxyGroup,
    useToggleProxyGroup,
    useCustomRules,
    useSetCustomRules,
    useRuleProviders,
    useDeleteRuleProvider,
    useToggleRuleProvider,
    useCustomProxies,
    useDeleteCustomProxy,
    useToggleCustomProxy,
    scopeAppliesToCurrentSource,
    isNarrowerScope,
    type ProxyGroup,
    type CustomRule,
    type RuleProvider,
    type CustomProxy,
    type ScopeMode
  } from '$lib/queries/luci'
  import ProxyGroupSheet from './ProxyGroupSheet.svelte'
  import CustomProxySheet from './CustomProxySheet.svelte'
  import ConfigOverwriteSheet from './ConfigOverwriteSheet.svelte'
  import RuleProviderSheet from './RuleProviderSheet.svelte'
  import CustomRuleScopeSheet from './CustomRuleScopeSheet.svelte'

  const configs = useConfigs()
  const sourceNames = $derived((configs.data ?? []).map((config) => config.name))
  const activeSourceName = $derived(configs.data?.find((config) => config.active)?.name ?? null)

  // ---------------------------------------------------------------------------
  // Proxy groups
  // ---------------------------------------------------------------------------

  const proxyGroups = useProxyGroups()
  const deleteProxyGroup = useDeleteProxyGroup()
  const toggleProxyGroup = useToggleProxyGroup()

  // $derived is more reliable than $effect+$state for read-only derived lists
  const localGroups = $derived(proxyGroups.data ?? [])

  // Local overrides drive the toggle visual instantly on click.
  // Keyed by group.id, cleared on error so UI reverts if the mutation fails.
  let enabledOverrides = $state<Record<string, boolean>>({})

  function getEnabled(group: ProxyGroup): boolean {
    const override = enabledOverrides[group.id]
    return override !== undefined ? override : group.enabled
  }

  function handleToggle(group: ProxyGroup) {
    const newEnabled = !getEnabled(group)
    enabledOverrides[group.id] = newEnabled
    toggleProxyGroup.mutate(
      { id: group.id, enabled: newEnabled },
      { onError() { delete enabledOverrides[group.id] } }
    )
  }

  let proxyGroupSheetOpen = $state(false)
  let editingGroup = $state<ProxyGroup | undefined>(undefined)
  let confirmDeleteId = $state<string | undefined>(undefined)

  function openAddGroup() {
    editingGroup = undefined
    confirmDeleteId = undefined
    proxyGroupSheetOpen = true
  }

  function openEditGroup(group: ProxyGroup) {
    editingGroup = group
    confirmDeleteId = undefined
    proxyGroupSheetOpen = true
  }

  function closeProxyGroupSheet() {
    proxyGroupSheetOpen = false
    editingGroup = undefined
  }

  // ---------------------------------------------------------------------------
  // Custom proxies
  // ---------------------------------------------------------------------------

  const customProxies = useCustomProxies()
  const deleteCustomProxy = useDeleteCustomProxy()
  const toggleCustomProxy = useToggleCustomProxy()

  const localProxies = $derived(customProxies.data ?? [])

  let proxyEnabledOverrides = $state<Record<string, boolean>>({})

  function getProxyEnabled(proxy: CustomProxy): boolean {
    const override = proxyEnabledOverrides[proxy.id]
    return override !== undefined ? override : proxy.enabled
  }

  function handleProxyToggle(proxy: CustomProxy) {
    const newEnabled = !getProxyEnabled(proxy)
    proxyEnabledOverrides[proxy.id] = newEnabled
    toggleCustomProxy.mutate(
      { id: proxy.id, enabled: newEnabled },
      { onError() { delete proxyEnabledOverrides[proxy.id] } }
    )
  }

  let customProxySheetOpen = $state(false)
  let editingProxy = $state<CustomProxy | undefined>(undefined)
  let confirmDeleteProxyId = $state<string | undefined>(undefined)

  function openAddProxy() {
    editingProxy = undefined
    confirmDeleteProxyId = undefined
    customProxySheetOpen = true
  }

  function openEditProxy(proxy: CustomProxy) {
    editingProxy = proxy
    confirmDeleteProxyId = undefined
    customProxySheetOpen = true
  }

  function closeCustomProxySheet() {
    customProxySheetOpen = false
    editingProxy = undefined
  }

  const proxyTypeBadge: Record<CustomProxy['proxyType'], string> = {
    ss: 'SS',
    trojan: 'Trojan',
    vmess: 'VMess',
    vless: 'VLESS'
  }

  // ---------------------------------------------------------------------------
  // Custom rules
  // ---------------------------------------------------------------------------

  const customRulesQuery = useCustomRules()
  const setCustomRules = useSetCustomRules()

  // Local copy for edits
  let rules = $state<CustomRule[]>([])
  let rulesDirty = $state(false)

  // Sync from server on first load
  $effect(() => {
    if (customRulesQuery.data && !rulesDirty) {
      rules = [...customRulesQuery.data]
    }
  })

  // Add rule form
  let newRuleType = $state('DOMAIN-SUFFIX')
  let newRuleValue = $state('')
  let newRuleTarget = $state('DIRECT')
  let newRuleTargetCustom = $state('')
  let newRuleScopeMode = $state<ScopeMode>('all')
  let newRuleScopeTargets = $state<string[]>([])
  let addRuleError = $state('')

  const ruleTypes = [
    'DOMAIN-SUFFIX',
    'DOMAIN-KEYWORD',
    'DOMAIN',
    'IP-CIDR',
    'IP-CIDR6',
    'GEOIP',
    'GEOSITE',
    'RULE-SET',
    'SRC-IP-CIDR',
    'DST-PORT',
    'SRC-PORT',
    'PROCESS-NAME'
  ]

  const builtinTargets = ['DIRECT', 'REJECT']

  const availableTargets = $derived([
    ...builtinTargets,
    ...(proxyGroups.data?.map((g) => g.name) ?? []),
    'custom…'
  ])

  const effectiveTarget = $derived(
    newRuleTarget === 'custom…' ? newRuleTargetCustom : newRuleTarget
  )

  function addRule() {
    addRuleError = ''
    if (!newRuleValue.trim()) {
      addRuleError = 'Value is required'
      return
    }
    const target = effectiveTarget.trim()
    if (!target) {
      addRuleError = 'Target is required'
      return
    }
    if (newRuleScopeMode === 'selected' && newRuleScopeTargets.length === 0) {
      addRuleError = 'Select at least one source'
      return
    }
    rules = [
      ...rules,
      {
        type: newRuleType,
        value: newRuleValue.trim(),
        target,
        scopeMode: newRuleScopeMode,
        scopeTargets: [...newRuleScopeTargets]
      }
    ]
    rulesDirty = true
    newRuleValue = ''
    newRuleTargetCustom = ''
    newRuleScopeMode = 'all'
    newRuleScopeTargets = []
  }

  function removeRule(idx: number) {
    rules = rules.filter((_, i) => i !== idx)
    rulesDirty = true
  }

  function moveRule(idx: number, direction: -1 | 1) {
    const next = idx + direction
    if (next < 0 || next >= rules.length) return
    const copy = [...rules]
    ;[copy[idx], copy[next]] = [copy[next], copy[idx]]
    rules = copy
    rulesDirty = true
  }

  async function saveRules() {
    await setCustomRules.mutateAsync(rules)
    rulesDirty = false
  }

  // ---------------------------------------------------------------------------
  // Config overwrite
  // ---------------------------------------------------------------------------

  let configOverwriteSheetOpen = $state(false)

  // ---------------------------------------------------------------------------
  // Rule providers (Advanced)
  // ---------------------------------------------------------------------------

  const ruleProviders = useRuleProviders()
  const deleteRuleProvider = useDeleteRuleProvider()
  const toggleRuleProvider = useToggleRuleProvider()

  const localProviders = $derived(ruleProviders.data ?? [])

  let providerEnabledOverrides = $state<Record<string, boolean>>({})

  function getProviderEnabled(provider: RuleProvider): boolean {
    const override = providerEnabledOverrides[provider.id]
    return override !== undefined ? override : provider.enabled
  }

  function handleProviderToggle(provider: RuleProvider) {
    const newEnabled = !getProviderEnabled(provider)
    providerEnabledOverrides[provider.id] = newEnabled
    toggleRuleProvider.mutate(
      { id: provider.id, enabled: newEnabled },
      { onError() { delete providerEnabledOverrides[provider.id] } }
    )
  }

  let ruleProviderSheetOpen = $state(false)
  let editingProvider = $state<RuleProvider | undefined>(undefined)
  let confirmDeleteProviderId = $state<string | undefined>(undefined)

  function openAddProvider() {
    editingProvider = undefined
    confirmDeleteProviderId = undefined
    ruleProviderSheetOpen = true
  }

  function openEditProvider(provider: RuleProvider) {
    editingProvider = provider
    confirmDeleteProviderId = undefined
    ruleProviderSheetOpen = true
  }

  function closeRuleProviderSheet() {
    ruleProviderSheetOpen = false
    editingProvider = undefined
  }

  let customRuleScopeSheetOpen = $state(false)
  let editingRuleIndex = $state<number | null>(null)

  function scopeLabel(scopeMode: ScopeMode, scopeTargets: string[]): string {
    if (scopeMode === 'all') return 'All sources'
    if (scopeTargets.length === 1) return scopeTargets[0]
    return `${scopeTargets.length} selected sources`
  }

  function appliesToCurrentSource(scopeMode: ScopeMode, scopeTargets: string[]): boolean {
    return scopeAppliesToCurrentSource(scopeMode, scopeTargets, activeSourceName)
  }

  function ruleScopeWarning(rule: CustomRule): string | null {
    if (rule.target === 'DIRECT' || rule.target === 'REJECT') return null
    const group = localGroups.find((item) => item.name === rule.target)
    if (!group) return null
    if (isNarrowerScope(rule.scopeMode, rule.scopeTargets, group.scopeMode, group.scopeTargets)) {
      return 'This rule depends on a narrower-scope proxy group.'
    }
    return null
  }

  function providerScopeWarning(provider: RuleProvider): string | null {
    if (!provider.group || provider.group === 'DIRECT' || provider.group === 'REJECT') return null
    const group = localGroups.find((item) => item.name === provider.group)
    if (!group) return null
    if (isNarrowerScope(provider.scopeMode, provider.scopeTargets, group.scopeMode, group.scopeTargets)) {
      return 'This provider routes into a narrower-scope proxy group.'
    }
    return null
  }

  function updateRuleScope(rule: CustomRule) {
    if (editingRuleIndex === null) return
    rules = rules.map((item, index) => (index === editingRuleIndex ? rule : item))
    rulesDirty = true
  }
</script>

<div class="space-y-8">
  <!-- ============================================================
       Section 1: Custom Proxies
  ============================================================ -->
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <h2 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        1. Custom Proxies
      </h2>
      <Button variant="outline" size="sm" onclick={openAddProxy}>Add proxy</Button>
    </div>

    {#if customProxies.isPending}
      <div class="h-16 animate-pulse rounded-lg bg-muted"></div>
    {:else if localProxies.length === 0}
      <div
        class="rounded-lg border border-dashed border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground"
      >
        No custom proxies yet. Add a proxy server you own or control.
      </div>
    {:else}
      <div class="divide-y divide-border rounded-lg border border-border bg-card">
        {#each localProxies as proxy (proxy.id)}
          {@const enabled = getProxyEnabled(proxy)}
          <div class="flex items-center gap-3 px-4 py-3">
            <!-- Enable/disable toggle -->
            <button
              role="switch"
              aria-checked={enabled}
              aria-label="{enabled ? 'Disable' : 'Enable'} {proxy.name}"
              onclick={() => handleProxyToggle(proxy)}
              class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring {enabled ? 'bg-primary' : 'bg-muted-foreground/30'}"
            >
              <span
                class="inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform {enabled ? 'translate-x-4' : 'translate-x-0.5'}"
              ></span>
            </button>

            <div class="min-w-0 flex-1 space-y-0.5 {enabled ? '' : 'opacity-50'}">
              <div class="flex items-center gap-2">
                <p class="truncate text-sm font-medium text-foreground">{proxy.name}</p>
                <span
                  class="shrink-0 rounded px-1.5 py-0.5 text-xs font-medium bg-muted text-muted-foreground"
                >
                  {proxyTypeBadge[proxy.proxyType]}
                </span>
              </div>
              <p class="truncate text-xs text-muted-foreground">{proxy.server}:{proxy.port}</p>
              <div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{scopeLabel(proxy.scopeMode, proxy.scopeTargets)}</span>
                {#if activeSourceName && !appliesToCurrentSource(proxy.scopeMode, proxy.scopeTargets)}
                  <span class="text-amber-700">Out of scope for {activeSourceName}</span>
                {/if}
              </div>
            </div>

            <div class="ml-2 flex shrink-0 gap-2">
              <Button
                variant="ghost"
                size="sm"
                onclick={() => openEditProxy(proxy)}
                aria-label="Edit {proxy.name}"
              >
                Edit
              </Button>
              {#if confirmDeleteProxyId === proxy.id}
                <Button
                  variant="destructive"
                  size="sm"
                  onclick={() => { deleteCustomProxy.mutate(proxy.id); confirmDeleteProxyId = undefined }}
                  disabled={deleteCustomProxy.isPending}
                >
                  Delete
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onclick={() => (confirmDeleteProxyId = undefined)}
                >
                  Cancel
                </Button>
              {:else}
                <Button
                  variant="ghost"
                  size="sm"
                  onclick={() => (confirmDeleteProxyId = proxy.id)}
                  aria-label="Delete {proxy.name}"
                  class="text-destructive hover:text-destructive"
                >
                  Delete
                </Button>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- ============================================================
       Section 2: Rule Providers
  ============================================================ -->
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <h2 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        2. Rule Providers
      </h2>
      <Button variant="outline" size="sm" onclick={openAddProvider}>Add provider</Button>
    </div>

    {#if ruleProviders.isPending}
      <div class="h-10 animate-pulse rounded-lg bg-muted"></div>
    {:else if localProviders.length === 0}
      <div
        class="rounded-lg border border-dashed border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground"
      >
        No rule providers yet.
      </div>
    {:else}
      <div class="divide-y divide-border rounded-lg border border-border bg-card">
        {#each localProviders as provider (provider.id)}
          <div class="flex items-center gap-3 px-4 py-3">
            <button
              type="button"
              role="switch"
              aria-checked={getProviderEnabled(provider)}
              aria-label="Enable {provider.name}"
              class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 {getProviderEnabled(provider) ? 'bg-primary' : 'bg-muted'}"
              onclick={() => handleProviderToggle(provider)}
            >
              <span
                class="pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform {getProviderEnabled(provider) ? 'translate-x-4' : 'translate-x-0'}"
              ></span>
            </button>

            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-foreground">{provider.name}</p>
              <p class="truncate text-xs text-muted-foreground">
                {provider.behavior} · {provider.type}{provider.group ? ` → ${provider.group}` : ''}
              </p>
              <div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{scopeLabel(provider.scopeMode, provider.scopeTargets)}</span>
                {#if activeSourceName && !appliesToCurrentSource(provider.scopeMode, provider.scopeTargets)}
                  <span class="text-amber-700">Out of scope for {activeSourceName}</span>
                {/if}
                {#if providerScopeWarning(provider)}
                  <span class="text-destructive">{providerScopeWarning(provider)}</span>
                {/if}
              </div>
            </div>

            {#if confirmDeleteProviderId === provider.id}
              <div class="flex items-center gap-1.5">
                <Button
                  variant="destructive"
                  size="sm"
                  onclick={() => {
                    deleteRuleProvider.mutate(provider.id)
                    confirmDeleteProviderId = undefined
                  }}
                >
                  Delete
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onclick={() => (confirmDeleteProviderId = undefined)}
                >
                  Cancel
                </Button>
              </div>
            {:else}
              <div class="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Edit {provider.name}"
                  onclick={() => openEditProvider(provider)}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Delete {provider.name}"
                  onclick={() => (confirmDeleteProviderId = provider.id)}
                >
                  Delete
                </Button>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- ============================================================
       Section 3: Custom Proxy Groups
  ============================================================ -->
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <h2 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        3. Custom Proxy Groups
      </h2>
      <Button variant="outline" size="sm" onclick={openAddGroup}>Add group</Button>
    </div>

    {#if proxyGroups.isPending}
      <div class="h-16 animate-pulse rounded-lg bg-muted"></div>
    {:else if localGroups.length === 0}
      <div
        class="rounded-lg border border-dashed border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground"
      >
        No custom proxy groups yet.
      </div>
    {:else}
      <div class="divide-y divide-border rounded-lg border border-border bg-card">
        {#each localGroups as group (group.id)}
          {@const enabled = getEnabled(group)}
          <div class="flex items-center gap-3 px-4 py-3">
            <button
              role="switch"
              aria-checked={enabled}
              aria-label="{enabled ? 'Disable' : 'Enable'} {group.name}"
              onclick={() => handleToggle(group)}
              class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring {enabled ? 'bg-primary' : 'bg-muted-foreground/30'}"
            >
              <span
                class="inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform {enabled ? 'translate-x-4' : 'translate-x-0.5'}"
              ></span>
            </button>

            <div class="min-w-0 flex-1 space-y-0.5 {enabled ? '' : 'opacity-50'}">
              <p class="truncate text-sm font-medium text-foreground">{group.name}</p>
              <p class="text-xs text-muted-foreground">
                {group.type}{group.policyFilter ? ` · ${group.policyFilter}` : ''}
              </p>
              <div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{scopeLabel(group.scopeMode, group.scopeTargets)}</span>
                {#if activeSourceName && !appliesToCurrentSource(group.scopeMode, group.scopeTargets)}
                  <span class="text-amber-700">Out of scope for {activeSourceName}</span>
                {/if}
              </div>
            </div>
            <div class="ml-2 flex shrink-0 gap-2">
              <Button
                variant="ghost"
                size="sm"
                onclick={() => openEditGroup(group)}
                aria-label="Edit {group.name}"
              >
                Edit
              </Button>
              {#if confirmDeleteId === group.id}
                <Button
                  variant="destructive"
                  size="sm"
                  onclick={() => { deleteProxyGroup.mutate(group.id); confirmDeleteId = undefined }}
                  disabled={deleteProxyGroup.isPending}
                >
                  Delete
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onclick={() => (confirmDeleteId = undefined)}
                >
                  Cancel
                </Button>
              {:else}
                <Button
                  variant="ghost"
                  size="sm"
                  onclick={() => (confirmDeleteId = group.id)}
                  aria-label="Delete {group.name}"
                  class="text-destructive hover:text-destructive"
                >
                  Delete
                </Button>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- ============================================================
       Section 4: Custom Rules
  ============================================================ -->
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <h2 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        4. Custom Rules
      </h2>
      {#if rulesDirty}
        <Button
          size="sm"
          onclick={saveRules}
          disabled={setCustomRules.isPending}
        >
          {setCustomRules.isPending ? 'Saving…' : 'Save rules'}
        </Button>
      {/if}
    </div>

    <!-- Add rule form -->
    <div class="rounded-lg border border-border bg-card px-4 py-3">
      <p class="mb-3 text-xs font-medium text-muted-foreground">Add rule</p>
      <div class="flex flex-wrap gap-2">
        <select
          bind:value={newRuleType}
          aria-label="Rule type"
          class="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {#each ruleTypes as rt}
            <option value={rt}>{rt}</option>
          {/each}
        </select>

        <input
          bind:value={newRuleValue}
          placeholder="Value (e.g. google.com)"
          aria-label="Rule value"
          class="h-9 min-w-40 flex-1 rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />

        <select
          bind:value={newRuleTarget}
          aria-label="Rule target"
          class="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {#each availableTargets as t}
            <option value={t}>{t}</option>
          {/each}
        </select>

        {#if newRuleTarget === 'custom…'}
          <input
            bind:value={newRuleTargetCustom}
            placeholder="Group name"
            aria-label="Custom target group name"
            class="h-9 w-36 rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        {/if}

        <Button onclick={addRule} variant="outline" size="sm" class="h-9">Add</Button>
      </div>
      <div class="mt-3 space-y-2">
        <div class="flex flex-wrap items-center gap-2">
          <label for="rule-scope" class="text-xs font-medium text-muted-foreground">Scope</label>
          <select
            id="rule-scope"
            bind:value={newRuleScopeMode}
            aria-label="Rule scope"
            class="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="all">All sources</option>
            <option value="selected">Selected sources</option>
          </select>
        </div>

        {#if newRuleScopeMode === 'selected'}
          <div class="flex flex-wrap gap-3 rounded-md border border-border bg-muted/30 px-3 py-3">
            {#each sourceNames as sourceName (sourceName)}
              <label class="flex items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={newRuleScopeTargets.includes(sourceName)}
                  onchange={(event) => {
                    const checked = (event.currentTarget as HTMLInputElement).checked
                    newRuleScopeTargets = checked
                      ? [...newRuleScopeTargets, sourceName]
                      : newRuleScopeTargets.filter((value) => value !== sourceName)
                  }}
                />
                <span>{sourceName}</span>
              </label>
            {/each}
          </div>
        {/if}
      </div>
      {#if addRuleError}
        <p class="mt-1.5 text-xs text-destructive">{addRuleError}</p>
      {/if}
    </div>

    <!-- Rules list -->
    {#if customRulesQuery.isPending}
      <div class="h-16 animate-pulse rounded-lg bg-muted"></div>
    {:else if rules.length === 0}
      <div
        class="rounded-lg border border-dashed border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground"
      >
        No custom rules yet.
      </div>
    {:else}
      <div class="divide-y divide-border rounded-lg border border-border bg-card">
        {#each rules as rule, idx (idx)}
          <div class="flex items-center gap-2 px-4 py-2.5">
            <div class="flex shrink-0 flex-col gap-0.5">
              <button
                onclick={() => moveRule(idx, -1)}
                disabled={idx === 0}
                aria-label="Move rule up"
                class="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
              >
                <svg class="h-3 w-3" viewBox="0 0 12 12" fill="currentColor"
                  ><path d="M6 2l4 5H2l4-5z" /></svg
                >
              </button>
              <button
                onclick={() => moveRule(idx, 1)}
                disabled={idx === rules.length - 1}
                aria-label="Move rule down"
                class="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
              >
                <svg class="h-3 w-3" viewBox="0 0 12 12" fill="currentColor"
                  ><path d="M6 10L2 5h8l-4 5z" /></svg
                >
              </button>
            </div>

            <div class="min-w-0 flex-1">
              <code class="truncate font-mono text-xs text-foreground">
                {rule.type},{rule.value},{rule.target}
              </code>
              <div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{scopeLabel(rule.scopeMode, rule.scopeTargets)}</span>
                {#if activeSourceName && !appliesToCurrentSource(rule.scopeMode, rule.scopeTargets)}
                  <span class="text-amber-700">Out of scope for {activeSourceName}</span>
                {/if}
                {#if ruleScopeWarning(rule)}
                  <span class="text-destructive">{ruleScopeWarning(rule)}</span>
                {/if}
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onclick={() => { editingRuleIndex = idx; customRuleScopeSheetOpen = true }}
            >
              Scope
            </Button>

            <button
              onclick={() => removeRule(idx)}
              aria-label="Remove rule"
              class="ml-2 shrink-0 rounded p-1 text-muted-foreground hover:text-destructive"
            >
              <svg class="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M4 4l8 8M12 4l-8 8" stroke-linecap="round" />
              </svg>
            </button>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- ============================================================
       Section 5: Config Overwrite
  ============================================================ -->
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <h2 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        5. Config Overwrite
      </h2>
      <Button variant="outline" size="sm" onclick={() => (configOverwriteSheetOpen = true)}>
        Edit script
      </Button>
    </div>

    <div
      class="rounded-lg border border-dashed border-border bg-card px-4 py-4 text-sm text-muted-foreground"
    >
      Use <code class="font-mono text-xs">ruby_edit</code>,
      <code class="font-mono text-xs">ruby_arr_insert</code>, and
      <code class="font-mono text-xs">ruby_merge_hash</code> helpers to modify any key in the
      active Clash YAML at startup. The file opens with annotated examples.
    </div>
  </div>

</div>

<ProxyGroupSheet
  open={proxyGroupSheetOpen}
  onClose={closeProxyGroupSheet}
  group={editingGroup}
  {sourceNames}
/>

<CustomProxySheet
  open={customProxySheetOpen}
  onClose={closeCustomProxySheet}
  proxy={editingProxy}
  {sourceNames}
/>

<ConfigOverwriteSheet
  open={configOverwriteSheetOpen}
  onClose={() => (configOverwriteSheetOpen = false)}
/>

<RuleProviderSheet
  open={ruleProviderSheetOpen}
  onClose={closeRuleProviderSheet}
  provider={editingProvider}
  {sourceNames}
/>

<CustomRuleScopeSheet
  open={customRuleScopeSheetOpen}
  onClose={() => { customRuleScopeSheetOpen = false; editingRuleIndex = null }}
  onSave={updateRuleScope}
  rule={editingRuleIndex === null ? undefined : rules[editingRuleIndex]}
  {sourceNames}
/>
