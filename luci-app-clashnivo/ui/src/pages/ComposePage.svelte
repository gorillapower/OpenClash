<script lang="ts">
  import {
    useConfigs,
    useConfigSetActive,
    useConfigPreview,
    useConfigValidate,
    useServiceStatus,
    useServiceRestart,
    useProxyGroups,
    useRuleProviders,
    useCustomProxies,
    useCustomRules,
    useConfigOverwrite,
    scopeAppliesToCurrentSource,
    type ConfigCompositionResult
  } from '$lib/queries/luci'
  import Button from '$lib/components/ui/button/button.svelte'
  import { Card, CardHeader, CardContent, CardTitle } from '$lib/components/ui/card/index'
  import PageIntro from '$lib/components/PageIntro.svelte'
  import SectionHeader from '$lib/components/SectionHeader.svelte'
  import EmptyState from '$lib/components/EmptyState.svelte'
  import ExplainerSheet from '$lib/components/ExplainerSheet.svelte'
  import ClashConfigTab from './settings/ClashConfigTab.svelte'

  const configs = useConfigs()
  const serviceStatus = useServiceStatus('clashnivo', { refetchInterval: 5000 })
  const configSetActive = useConfigSetActive()
  const previewMutation = useConfigPreview()
  const validateMutation = useConfigValidate()
  const restartMutation = useServiceRestart('clashnivo')

  const proxyGroups = useProxyGroups()
  const ruleProviders = useRuleProviders()
  const customProxies = useCustomProxies()
  const customRules = useCustomRules()
  const configOverwrite = useConfigOverwrite()

  let previewResult = $state<ConfigCompositionResult | null>(null)
  let validateResult = $state<ConfigCompositionResult | null>(null)
  let explainerOpen = $state(false)
  let pendingSourceName = $state('')

  const selectedSource = $derived(configs.data?.find((config) => config.active) ?? null)
  const hasSelectedSource = $derived(Boolean(selectedSource))

  const proxyGroupCount = $derived(proxyGroups.data?.length ?? 0)
  const ruleProviderCount = $derived(ruleProviders.data?.length ?? 0)
  const customProxyCount = $derived(customProxies.data?.length ?? 0)
  const customRuleCount = $derived(customRules.data?.length ?? 0)
  const effectiveProxyGroupCount = $derived(
    (proxyGroups.data ?? []).filter((group) =>
      scopeAppliesToCurrentSource(group.scopeMode, group.scopeTargets, selectedSource?.name)
    ).length
  )
  const effectiveRuleProviderCount = $derived(
    (ruleProviders.data ?? []).filter((provider) =>
      scopeAppliesToCurrentSource(provider.scopeMode, provider.scopeTargets, selectedSource?.name)
    ).length
  )
  const effectiveCustomProxyCount = $derived(
    (customProxies.data ?? []).filter((proxy) =>
      scopeAppliesToCurrentSource(proxy.scopeMode, proxy.scopeTargets, selectedSource?.name)
    ).length
  )
  const effectiveCustomRuleCount = $derived(
    (customRules.data ?? []).filter((rule) =>
      scopeAppliesToCurrentSource(rule.scopeMode, rule.scopeTargets, selectedSource?.name)
    ).length
  )
  const hasOverwrite = $derived(Boolean(configOverwrite.data?.content?.trim()))

  const workflowReady = $derived(Boolean(validateResult?.valid))
  const sourceSwitchPending = $derived(
    Boolean(pendingSourceName && pendingSourceName !== selectedSource?.name)
  )
  const globalBusy = $derived(serviceStatus.data?.busy ?? false)
  const busyCommand = $derived(serviceStatus.data?.busy_command ?? null)
  const busyMessage = $derived.by(() => {
    if (!busyCommand) return null
    return `Clash Nivo is busy with ${busyCommand}. Compose actions are temporarily disabled.`
  })

  $effect(() => {
    pendingSourceName = selectedSource?.name ?? ''
  })

  function formatStageName(value: string): string {
    return value
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  }

  function stageTone(status: string): string {
    if (status === 'ok' || status === 'done' || status === 'success') return 'text-green-700'
    if (status === 'error' || status === 'failed') return 'text-destructive'
    if (status === 'skipped') return 'text-muted-foreground'
    return 'text-foreground'
  }

  function validationSummary(result: ConfigCompositionResult | null): string {
    if (!result) return 'Validate the generated config before making it live.'
    if (result.valid) return 'Validation passed. The current generated config is ready to activate.'
    if (result.failed_layer) return `Validation failed in ${formatStageName(result.failed_layer)}.`
    return 'Validation failed. Review the stage results before retrying.'
  }

  async function handlePreview() {
    previewResult = await previewMutation.mutateAsync()
  }

  async function handleValidate() {
    validateResult = await validateMutation.mutateAsync()
  }

  async function handleActivate() {
    await restartMutation.mutateAsync()
  }

  async function handleSourceSwitch() {
    if (!pendingSourceName || pendingSourceName === selectedSource?.name) return
    await configSetActive.mutateAsync(pendingSourceName)
    previewResult = null
    validateResult = null
  }
</script>

<div class="space-y-8">
  <PageIntro
    eyebrow="Composition"
    title="Compose"
  >
    {#snippet actions()}
      <Button variant="outline" size="sm" onclick={() => (explainerOpen = true)}>
        How this works
      </Button>
    {/snippet}
  </PageIntro>

  {#if busyMessage}
    <div class="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
      {busyMessage}
    </div>
  {/if}

  <div class="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
    <Card>
      <CardHeader class="space-y-2">
        <CardTitle>Pipeline</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        {#if hasSelectedSource}
          <div class="flex flex-col gap-2 sm:flex-row">
            <select
              class="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm"
              value={pendingSourceName}
              disabled={globalBusy || !configs.data?.length || configSetActive.isPending}
              aria-label="Selected source"
              onchange={(event) => (pendingSourceName = (event.target as HTMLSelectElement).value)}
            >
              {#if !configs.data?.length}
                <option value="">No sources available</option>
              {:else}
                {#each configs.data as config (config.name)}
                  <option value={config.name}>{config.name}</option>
                {/each}
              {/if}
            </select>
            <Button
              class="sm:self-start"
              variant="outline"
              onclick={handleSourceSwitch}
              disabled={globalBusy || !sourceSwitchPending || configSetActive.isPending}
            >
              {configSetActive.isPending ? 'Switching…' : 'Switch'}
            </Button>
          </div>
        {:else}
          <EmptyState
            compact
            eyebrow="Selection required"
            title="No source selected"
            body="Add or select a source in Sources before previewing, validating, or activating a generated config."
          >
            {#snippet actions()}
              <a href="#/sources" class="text-sm font-medium text-foreground underline underline-offset-4">
                Go to Sources
              </a>
            {/snippet}
          </EmptyState>
        {/if}

        <div class="space-y-2">
          <div class="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
            <p class="text-sm text-muted-foreground">1. Custom Proxies</p>
            <p class="text-sm font-semibold text-foreground">{effectiveCustomProxyCount} of {customProxyCount}</p>
          </div>
          <div class="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
            <p class="text-sm text-muted-foreground">2. Rule Providers</p>
            <p class="text-sm font-semibold text-foreground">{effectiveRuleProviderCount} of {ruleProviderCount}</p>
          </div>
          <div class="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
            <p class="text-sm text-muted-foreground">3. Proxy Groups</p>
            <p class="text-sm font-semibold text-foreground">{effectiveProxyGroupCount} of {proxyGroupCount}</p>
          </div>
          <div class="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
            <p class="text-sm text-muted-foreground">4. Custom Rules</p>
            <p class="text-sm font-semibold text-foreground">{effectiveCustomRuleCount} of {customRuleCount}</p>
          </div>
          <div class="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
            <p class="text-sm text-muted-foreground">5. Overwrite</p>
            <p class="text-sm font-semibold uppercase tracking-wider text-foreground">
              {hasOverwrite ? 'Configured' : 'Not configured'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="space-y-2">
        <CardTitle>Workflow</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onclick={handlePreview}
            disabled={globalBusy || !hasSelectedSource || previewMutation.isPending}
          >
            {previewMutation.isPending ? 'Generating preview…' : 'Preview generated config'}
          </Button>
          <Button
            variant="outline"
            onclick={handleValidate}
            disabled={globalBusy || !hasSelectedSource || validateMutation.isPending}
          >
            {validateMutation.isPending ? 'Validating generated config…' : 'Validate generated config'}
          </Button>
          <Button
            onclick={handleActivate}
            disabled={globalBusy || !hasSelectedSource || !workflowReady || restartMutation.isPending}
          >
            {restartMutation.isPending ? 'Activating generated config…' : 'Activate generated config'}
          </Button>
        </div>

        <div class="rounded-lg border border-border bg-card px-4 py-3">
          <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Validation state
          </p>
          <p class="mt-2 text-sm text-foreground">{validationSummary(validateResult)}</p>
          {#if validateResult?.failed_layer}
            <p class="mt-1 text-xs text-destructive">
              Failed layer: {formatStageName(validateResult.failed_layer)}
            </p>
          {/if}
        </div>

        {#if validateResult?.stages?.length}
          <div class="rounded-lg border border-border bg-card px-4 py-3">
            <p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Validation stages
            </p>
            <div class="mt-3 space-y-2">
              {#each validateResult.stages as stage (stage.name)}
                <div class="flex items-start justify-between gap-4">
                  <div class="min-w-0">
                    <p class="text-sm font-medium text-foreground">{formatStageName(stage.name)}</p>
                    {#if stage.message}
                      <p class="text-xs text-muted-foreground">{stage.message}</p>
                    {/if}
                  </div>
                  <span class={`shrink-0 text-xs font-medium uppercase tracking-wider ${stageTone(stage.status)}`}>
                    {stage.status}
                  </span>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </CardContent>
    </Card>
  </div>

  {#if previewResult}
    <Card>
      <CardHeader class="space-y-2">
        <CardTitle>Preview</CardTitle>
      </CardHeader>
      <CardContent class="space-y-3">
        <div class="flex flex-wrap gap-4 text-xs text-muted-foreground">
          {#if previewResult.source_path}
            <span>Source: {previewResult.source_path}</span>
          {/if}
          {#if previewResult.preview_path}
            <span>Preview: {previewResult.preview_path}</span>
          {/if}
          {#if previewResult.config_name}
            <span>Config: {previewResult.config_name}</span>
          {/if}
        </div>
        {#if previewResult.preview_content}
          <pre class="max-h-[28rem] overflow-auto rounded-lg border border-border bg-muted/40 p-4 text-xs text-foreground"><code>{previewResult.preview_content}</code></pre>
        {:else}
          <EmptyState
            compact
            title="No preview content returned"
            body="The backend returned a preview result without generated YAML content. Validate the selected source and customizations, then try again."
          />
        {/if}
      </CardContent>
    </Card>
  {/if}

  <div class="space-y-4">
    <SectionHeader title="Customizations" />

    <ClashConfigTab />
  </div>
</div>

<ExplainerSheet
  open={explainerOpen}
  onClose={() => (explainerOpen = false)}
  title="Compose"
  intro="Compose is the build pipeline for the live runtime config. It combines the selected source with Clash Nivo-owned customizations, then lets you preview, validate, and activate the result."
  flow={['Selected source', 'Customizations', 'Preview', 'Validate', 'Activate']}
  sections={[
    {
      title: 'What changes here',
      body: 'This page changes the generated runtime config, not the stored source file. The selected source stays preserved while Clash Nivo layers your custom inputs on top.'
    },
    {
      title: 'Customizations',
      body: 'Custom proxies, rule providers, proxy groups, rules, and overwrite are applied during composition. They extend or shape the generated config without rewriting the source YAML directly.'
    },
    {
      title: 'Preview, validate, activate',
      body: 'Preview shows the generated output. Validate checks whether that output is safe to use. Activate makes the current validated generated config live by restarting Clash Nivo with it.'
    }
  ]}
/>
