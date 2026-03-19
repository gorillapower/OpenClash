<script lang="ts">
  import {
    useConfigs,
    useConfigPreview,
    useConfigValidate,
    useServiceRestart,
    useProxyGroups,
    useRuleProviders,
    useCustomProxies,
    useCustomRules,
    useConfigOverwrite,
    type ConfigCompositionResult
  } from '$lib/queries/luci'
  import Button from '$lib/components/ui/button/button.svelte'
  import { Card, CardHeader, CardContent, CardTitle } from '$lib/components/ui/card/index'
  import PageIntro from '$lib/components/PageIntro.svelte'
  import SectionHeader from '$lib/components/SectionHeader.svelte'
  import SummaryStatCard from '$lib/components/SummaryStatCard.svelte'
  import ContextNote from '$lib/components/ContextNote.svelte'
  import ClashConfigTab from './settings/ClashConfigTab.svelte'

  const configs = useConfigs()
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

  const selectedSource = $derived(configs.data?.find((config) => config.active) ?? null)
  const hasSelectedSource = $derived(Boolean(selectedSource))

  const proxyGroupCount = $derived(proxyGroups.data?.length ?? 0)
  const ruleProviderCount = $derived(ruleProviders.data?.length ?? 0)
  const customProxyCount = $derived(customProxies.data?.length ?? 0)
  const customRuleCount = $derived(customRules.data?.length ?? 0)
  const hasOverwrite = $derived(Boolean(configOverwrite.data?.content?.trim()))

  const workflowReady = $derived(Boolean(validateResult?.valid))

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
</script>

<div class="space-y-8">
  <PageIntro
    eyebrow="Composition"
    title="Compose"
    description="Build the generated Clash Nivo runtime from the selected source, validate it, then make it live."
  />

  <ContextNote
    id="compose-workflow"
    title="Composition workflow"
    body="Compose follows one order: selected source, Clash Nivo custom layers, preview, validation, then activation. Activation makes the current validated generated config live. Saving an editor form alone does not restart Clash Nivo."
  />

  <div class="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
    <Card>
      <CardHeader class="space-y-2">
        <CardTitle>Current source</CardTitle>
        <p class="text-sm text-muted-foreground">
          Compose always runs against the selected source from Sources.
        </p>
      </CardHeader>
      <CardContent class="space-y-4">
        {#if hasSelectedSource}
          <div class="rounded-lg border border-border bg-card px-4 py-3">
            <div class="flex items-start justify-between gap-4">
              <div class="space-y-1">
                <p class="text-sm font-medium text-foreground">{selectedSource?.name}</p>
                <p class="text-xs text-muted-foreground">
                  Select a different source in Sources if you want these custom layers to apply to
                  a different config.
                </p>
              </div>
              <a href="#/sources" class="text-sm text-foreground underline underline-offset-4">
                Open Sources
              </a>
            </div>
          </div>
        {:else}
          <div class="rounded-lg border border-dashed border-border bg-card px-4 py-6">
            <p class="text-sm font-medium text-foreground">No source selected</p>
            <p class="mt-1 text-sm text-muted-foreground">
              Add or select a source in Sources before previewing, validating, or activating a
              generated config.
            </p>
            <div class="mt-4">
              <a href="#/sources" class="text-sm text-foreground underline underline-offset-4">
                Go to Sources
              </a>
            </div>
          </div>
        {/if}

        <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <SummaryStatCard
            label="Custom Proxies"
            value={customProxyCount}
            detail="Clash Nivo-owned proxies appended during composition."
          />
          <SummaryStatCard
            label="Rule Providers"
            value={ruleProviderCount}
            detail="Structured external rule sources available to the generated config."
          />
          <SummaryStatCard
            label="Proxy Groups"
            value={proxyGroupCount}
            detail="Custom routing buckets layered on top of the selected source."
          />
          <SummaryStatCard
            label="Custom Rules"
            value={customRuleCount}
            detail="Rules prepended before the selected source ruleset."
          />
          <SummaryStatCard
            label="Overwrite"
            value={hasOverwrite ? 'Configured' : 'Not configured'}
            valueClass="text-sm"
            detail="Highest-precedence escape hatch applied only to the generated config."
          />
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="space-y-2">
        <CardTitle>Workflow</CardTitle>
        <p class="text-sm text-muted-foreground">
          Preview and validate use the backend composition contract. Activation restarts Clash Nivo
          with the current validated generated config.
        </p>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onclick={handlePreview}
            disabled={!hasSelectedSource || previewMutation.isPending}
          >
            {previewMutation.isPending ? 'Generating preview…' : 'Preview generated config'}
          </Button>
          <Button
            variant="outline"
            onclick={handleValidate}
            disabled={!hasSelectedSource || validateMutation.isPending}
          >
            {validateMutation.isPending ? 'Validating generated config…' : 'Validate generated config'}
          </Button>
          <Button
            onclick={handleActivate}
            disabled={!hasSelectedSource || !workflowReady || restartMutation.isPending}
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
        <p class="text-sm text-muted-foreground">
          The generated config preview reflects the current selected source plus Clash Nivo-owned
          custom layers.
        </p>
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
          <div class="rounded-lg border border-dashed border-border px-4 py-4 text-sm text-muted-foreground">
            No preview content was returned.
          </div>
        {/if}
      </CardContent>
    </Card>
  {/if}

  <div class="space-y-4">
    <SectionHeader
      title="Custom layers"
      description="Structured Clash Nivo-owned inputs. Out-of-scope customizations are ignored for the currently selected source."
    />

    <ClashConfigTab />
  </div>
</div>
