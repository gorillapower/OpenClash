<script lang="ts">
  import {
    useAssetsUpdate,
    useAssetsUpdateStatus,
    useCoreCurrent,
    useCoreProbeSources,
    useDashboards,
    useDashboardUpdate,
    useDashboardUpdateStatus,
    useServiceCancelJob,
    useServiceStatus,
    useCoreLatestVersion,
    useCoreRefreshLatestVersion,
    useCoreUpdate,
    useCoreUpdateStatus,
    usePackageLatestVersion,
    usePackageRefreshLatestVersion,
    usePackageUpdate,
    usePackageUpdateStatus,
    useSetUciConfigBatch,
    useSetUciConfig,
    useUciConfig
  } from '$lib/queries/luci'
  import Button from '$lib/components/ui/button/button.svelte'
  import { Card, CardHeader, CardContent } from '$lib/components/ui/card/index'
  import AutoUpdatesCard from '$lib/components/AutoUpdatesCard.svelte'
  import SystemAdvancedSettings from '$lib/components/SystemAdvancedSettings.svelte'
  import PageIntro from '$lib/components/PageIntro.svelte'

  const config = useUciConfig('clashnivo')
  const serviceStatus = useServiceStatus('clashnivo', { refetchInterval: 5000 })
  const cancelJob = useServiceCancelJob('clashnivo')

  const currentCore = useCoreCurrent()
  const latestCore = useCoreLatestVersion()
  const refreshLatestCore = useCoreRefreshLatestVersion()
  const probeCoreSources = useCoreProbeSources()
  const latestPackage = usePackageLatestVersion()
  const refreshLatestPackage = usePackageRefreshLatestVersion()
  const busyCommand = $derived(serviceStatus.data?.busy_command ?? '')
  const globalBusy = $derived(serviceStatus.data?.busy ?? false)
  const activeJobCancelable = $derived(serviceStatus.data?.active_job_cancelable ?? false)
  const coreUpdate = useCoreUpdate()
  const packageUpdate = usePackageUpdate()
  const assetsUpdate = useAssetsUpdate('all')
  function coreStatusQueryEnabled() {
    return coreUpdate.isPending || (globalBusy && busyCommand === 'core:core')
  }
  const coreUpdateStatus = useCoreUpdateStatus({
    enabled: coreStatusQueryEnabled(),
    refetchInterval: (query) => coreStatusQueryEnabled() && isPendingState(query.state.data?.status) ? 2000 : false
  } as never)
  function packageStatusQueryEnabled() {
    return packageUpdate.isPending || (globalBusy && busyCommand === 'package:package')
  }
  const packageUpdateStatus = usePackageUpdateStatus({
    enabled: packageStatusQueryEnabled(),
    refetchInterval: (query) => packageStatusQueryEnabled() && isPendingState(query.state.data?.status) ? 2000 : false
  } as never)
  function assetsStatusQueryEnabled() {
    return assetsUpdate.isPending || (globalBusy && busyCommand === 'assets:all')
  }
  const assetsUpdateStatus = useAssetsUpdateStatus('all', {
    enabled: assetsStatusQueryEnabled(),
    refetchInterval: (query) => assetsStatusQueryEnabled() && isPendingState(query.state.data?.status) ? 2000 : false
  } as never)
  const dashboards = useDashboards()
  const setDashboardForwardSsl = useSetUciConfig('clashnivo', 'config', 'dashboard_forward_ssl')
  const setCoreSourceConfig = useSetUciConfigBatch('clashnivo', 'config')

  const cfg = $derived(config.data?.config ?? {})
  const controllerPort = $derived(((cfg['cn_port'] as string | undefined) ?? '9093').trim() || '9093')
  const dashboardForwardSsl = $derived((cfg['dashboard_forward_ssl'] as string | undefined) === '1')
  const rawCoreSourceMode = $derived((cfg['core_source'] as string | undefined) ?? 'auto')
  const coreCustomBaseUrl = $derived((cfg['core_custom_base_url'] as string | undefined) ?? '')
  const currentCoreVersion = $derived(currentCore.data?.version ?? null)
  const latestCoreVersion = $derived(latestCore.data?.version ?? null)
  const currentCoreType = $derived(currentCore.data?.core_type ?? 'Meta')
  const latestCoreType = $derived(latestCore.data?.core_type ?? currentCoreType)
  const selectedCoreSourceLabel = $derived(latestCore.data?.selected_source_label ?? null)
  const selectedCoreSourceBase = $derived(latestCore.data?.source_base ?? null)
  const selectedCoreSourceLatency = $derived(latestCore.data?.latency_ms ?? null)
  const coreMissing = $derived(!currentCoreVersion)
  const latestPackageVersion = $derived(latestPackage.data?.version ?? null)
  const coreUpdateAvailable = $derived(
    !!latestCoreVersion && !!currentCoreVersion && latestCoreVersion !== currentCoreVersion
  )
  let localCoreCustomBaseUrl = $state('')

  const CORE_SOURCE_OPTIONS = {
    auto: 'Auto (recommended)',
    official: 'Official GitHub',
    jsdelivr: 'jsDelivr',
    fastly: 'Fastly jsDelivr',
    testingcf: 'TestingCF jsDelivr',
    custom: 'Custom URL'
  } as const

  type CoreSourceMode = keyof typeof CORE_SOURCE_OPTIONS

  const coreSourceMode = $derived.by<CoreSourceMode>(() => {
    if (rawCoreSourceMode === 'openclash' || rawCoreSourceMode === 'clashnivo') return 'official'
    if (
      rawCoreSourceMode === 'official' ||
      rawCoreSourceMode === 'jsdelivr' ||
      rawCoreSourceMode === 'fastly' ||
      rawCoreSourceMode === 'testingcf' ||
      rawCoreSourceMode === 'custom'
    ) {
      return rawCoreSourceMode
    }
    return 'auto'
  })

  const coreBusy = $derived(isPendingState(coreUpdateStatus.data?.status) || coreUpdate.isPending)
  const packageBusy = $derived(
    isPendingState(packageUpdateStatus.data?.status) || packageUpdate.isPending
  )
  const assetsBusy = $derived(
    isPendingState(assetsUpdateStatus.data?.status) || assetsUpdate.isPending
  )
  const dashboardOptions = $derived(dashboards.data ?? [])
  const dashboardUpdate = useDashboardUpdate()
  function dashboardStatusQueryEnabled() {
    return dashboardUpdate.isPending || busyCommand.startsWith('dashboard:')
  }
  const dashboardUpdateStatus = useDashboardUpdateStatus(() => '', {
    enabled: dashboardStatusQueryEnabled(),
    refetchInterval: (query) =>
      dashboardStatusQueryEnabled() && isPendingState(query.state.data?.status) ? 2000 : false
  } as never)
  const dashboardBusy = $derived(
    isPendingState(dashboardUpdateStatus.data?.status) ||
    dashboardUpdate.isPending
  )
  const dashboardOpenAvailable = $derived(serviceStatus.data?.running ?? false)
  const busyLabel = $derived.by(() => {
    if (!globalBusy || !busyCommand) return null
    switch (busyCommand) {
      case 'start':
        return 'Clash Nivo is starting.'
      case 'stop':
        return 'Clash Nivo is stopping.'
      case 'restart':
        return 'Clash Nivo is restarting.'
      case 'reload':
        return 'Clash Nivo is reloading.'
      case 'core:core':
        return 'A core update is already running.'
      case 'package:package':
        return 'A package update is already running.'
      case 'assets:all':
        return 'An asset refresh is already running.'
      default:
        return `Clash Nivo is busy with ${busyCommand}.`
    }
  })

  function isPendingState(status?: string) {
    return status === 'accepted' || status === 'running'
  }

  $effect(() => {
    localCoreCustomBaseUrl = coreCustomBaseUrl
  })

  function formatStatus(status?: string) {
    switch (status) {
      case 'accepted':
        return 'Queued'
      case 'running':
        return 'Running'
      case 'done':
        return 'Completed'
      case 'nochange':
        return 'No change'
      case 'cancelled':
        return 'Cancelled'
      case 'timed_out':
        return 'Timed out'
      case 'error':
        return 'Failed'
      default:
        return 'Idle'
    }
  }

  function dashboardActionLabel(optionId: string, installed: boolean) {
    if (dashboardBusy && busyCommand === `dashboard:${optionId}`) {
      return installed ? 'Updating…' : 'Downloading…'
    }
    return installed ? 'Update' : 'Download'
  }

  async function handleCoreSourceModeChange(e: Event) {
    const value = (e.target as HTMLSelectElement).value as CoreSourceMode
    if (value === 'custom') {
      if (!localCoreCustomBaseUrl) localCoreCustomBaseUrl = 'https://'
      return
    }
    await setCoreSourceConfig.mutateAsync([
      { option: 'core_source', value },
      { option: 'core_custom_base_url', value: '' }
    ])
  }

  async function saveCustomCoreSource() {
    const trimmed = localCoreCustomBaseUrl.trim()
    const normalised = trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed
    await setCoreSourceConfig.mutateAsync([
      { option: 'core_source', value: 'custom' },
      { option: 'core_custom_base_url', value: normalised }
    ])
  }
</script>

<div class="space-y-8">
  <PageIntro eyebrow="Maintenance" title="System" />

  <div class="space-y-6">
      {#if busyLabel}
        <div class="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          <span>{busyLabel}</span>
          {#if activeJobCancelable}
            <Button
              variant="outline"
              size="sm"
              disabled={cancelJob.isPending}
              onclick={() => cancelJob.mutateAsync()}
            >
              {cancelJob.isPending ? 'Cancelling…' : 'Cancel'}
            </Button>
          {/if}
        </div>
      {/if}

      <Card>
        <CardHeader>
          <h2 class="text-sm font-semibold">Clash Core</h2>
        </CardHeader>
        <CardContent>
          <div class="space-y-4">
            <div class="grid gap-3 sm:grid-cols-2">
              <div class="rounded-lg border border-border bg-card px-4 py-3">
                <div class="text-xs uppercase tracking-wider text-muted-foreground">Current</div>
                <div class="mt-2 flex items-baseline gap-2">
                  <span class="text-lg font-semibold tabular-nums">
                    {currentCoreVersion ?? '—'}
                  </span>
                  <span class="text-xs text-muted-foreground">{currentCoreType}</span>
                </div>
              </div>
              <div class="rounded-lg border border-border bg-card px-4 py-3">
                <div class="flex items-start justify-between gap-4">
                  <div class="text-xs uppercase tracking-wider text-muted-foreground">Latest</div>
                  {#if coreBusy || coreUpdateAvailable || coreMissing}
                    <Button
                      variant="default"
                      size="sm"
                      disabled={globalBusy || coreBusy || latestCore.isPending || refreshLatestCore.isPending}
                      onclick={() => coreUpdate.mutateAsync()}
                    >
                      {#if coreBusy}
                        Updating…
                      {:else if coreMissing}
                        Install
                      {:else if coreUpdateAvailable}
                        Update
                      {:else}
                        Update
                      {/if}
                    </Button>
                  {/if}
                </div>
                <div class="mt-2 flex items-baseline gap-2">
                  {#if latestCore.isPending || refreshLatestCore.isPending}
                    <span class="text-sm text-muted-foreground">Checking…</span>
                  {:else}
                    <span class="text-lg font-semibold tabular-nums">
                      {latestCoreVersion ?? '—'}
                    </span>
                    <span class="text-xs text-muted-foreground">{latestCoreType}</span>
                  {/if}
                </div>
                {#if !latestCore.isPending && !refreshLatestCore.isPending && !coreUpdateAvailable}
                  <p class="mt-2 text-xs text-muted-foreground">
                    {#if !latestCoreVersion}
                      Not checked
                    {:else if coreMissing}
                      Not installed
                    {:else if coreBusy}
                      {formatStatus(coreUpdateStatus.data?.status)}
                    {:else}
                      Current
                    {/if}
                  </p>
                {/if}
                <div class="mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={globalBusy || refreshLatestCore.isPending}
                    onclick={() => refreshLatestCore.mutateAsync()}
                  >
                    {refreshLatestCore.isPending ? 'Checking…' : 'Check'}
                  </Button>
                </div>
              </div>
            </div>

            <div class="rounded-lg border border-border bg-card px-4 py-4">
              <div class="flex flex-col gap-3">
                <div class="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <div class="text-xs uppercase tracking-wider text-muted-foreground">Github source</div>
                  {#if selectedCoreSourceLabel}
                    <span class="text-xs text-muted-foreground">
                      {#if coreSourceMode === 'auto'}
                        Selected: {selectedCoreSourceLabel}{#if selectedCoreSourceLatency !== null} ({selectedCoreSourceLatency} ms){/if}
                      {:else}
                        Current: {selectedCoreSourceLabel}
                      {/if}
                    </span>
                  {/if}
                </div>

                <div class="flex flex-wrap items-center gap-2">
                  <select
                    class="rounded-md border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                    value={coreSourceMode}
                    onchange={handleCoreSourceModeChange}
                    disabled={globalBusy || setCoreSourceConfig.isPending || probeCoreSources.isPending}
                    aria-label="Download source"
                  >
                    {#each Object.entries(CORE_SOURCE_OPTIONS) as [value, label]}
                      <option value={value}>{label}</option>
                    {/each}
                  </select>
                  {#if coreSourceMode === 'custom'}
                    <input
                      class="min-w-[16rem] flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                      bind:value={localCoreCustomBaseUrl}
                      aria-label="Custom download source prefix"
                      placeholder="https://mirror.example.com"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onclick={saveCustomCoreSource}
                      disabled={globalBusy || setCoreSourceConfig.isPending || probeCoreSources.isPending}
                    >
                      Save
                    </Button>
                  {/if}
                  <Button
                    variant="outline"
                    size="sm"
                    onclick={() => probeCoreSources.mutateAsync()}
                    disabled={globalBusy || setCoreSourceConfig.isPending || probeCoreSources.isPending}
                  >
                    {probeCoreSources.isPending ? 'Checking…' : 'Check source'}
                  </Button>
                </div>

                {#if selectedCoreSourceBase}
                  <p class="break-all text-xs text-muted-foreground">{selectedCoreSourceBase}</p>
                {/if}
              </div>
            </div>

            {#if coreUpdateStatus.data?.message}
              <p class="text-sm text-muted-foreground">{coreUpdateStatus.data.message}</p>
            {/if}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 class="text-sm font-semibold">Dashboard</h2>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="flex items-center gap-3 text-sm text-muted-foreground">
              <span>Transport</span>
              <span class="font-medium text-foreground">{dashboardForwardSsl ? 'HTTPS' : 'HTTP'}</span>
              <button
                type="button"
                class={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${dashboardForwardSsl ? 'bg-primary' : 'bg-muted'}`}
                role="switch"
                aria-checked={dashboardForwardSsl}
                aria-label="Dashboard forwarding SSL"
                disabled={globalBusy || setDashboardForwardSsl.isPending}
                onclick={() => setDashboardForwardSsl.mutateAsync(dashboardForwardSsl ? '0' : '1')}
              >
                <span class={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform ${dashboardForwardSsl ? 'translate-x-4' : 'translate-x-0'}`}></span>
              </button>
          </div>

          <div class="space-y-3">
            {#each dashboardOptions as option (option.id)}
              <div class="rounded-lg border border-border bg-card px-3 py-2">
                <div class="flex flex-wrap items-center gap-2">
                  <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                      <span class="font-medium">{option.label}</span>
                      <span class="rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        {option.installed ? 'Installed' : 'Not installed'}
                      </span>
                    </div>
                  </div>
                  <div class="flex items-center gap-1.5">
                    {#if dashboardOpenAvailable && option.installed && option.url}
                      <a
                        class="inline-flex h-8 items-center justify-center rounded-md border border-border bg-background px-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                        href={option.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open
                      </a>
                    {/if}
                    <Button
                      variant={option.installed ? 'outline' : 'default'}
                      size="sm"
                      disabled={globalBusy || dashboardBusy}
                      onclick={() => dashboardUpdate.mutateAsync(option.id)}
                    >
                      {dashboardActionLabel(option.id, option.installed)}
                    </Button>
                  </div>
                </div>
              </div>
            {/each}
          </div>

          {#if dashboardUpdateStatus.data?.message}
            <p class="text-sm text-muted-foreground">{dashboardUpdateStatus.data.message}</p>
          {/if}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 class="text-sm font-semibold">Maintenance</h2>
        </CardHeader>
        <CardContent class="space-y-6">
          <section class="space-y-4">
            <div class="flex items-start justify-between gap-4">
              <div class="space-y-1 text-sm">
                <div class="font-medium">Package</div>
                <div class="flex items-baseline gap-2 text-muted-foreground">
                  <span>Latest</span>
                  <span class="font-medium tabular-nums text-foreground">{latestPackageVersion ?? '—'}</span>
                </div>
                <div class="flex items-baseline gap-2 text-muted-foreground">
                  <span>Status</span>
                  <span class="font-medium text-foreground">{formatStatus(packageUpdateStatus.data?.status)}</span>
                </div>
              </div>
              <div class="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={globalBusy || refreshLatestPackage.isPending}
                  onclick={() => refreshLatestPackage.mutateAsync()}
                >
                  {refreshLatestPackage.isPending ? 'Checking…' : 'Check'}
                </Button>
                <Button
                  variant="default"
                  disabled={globalBusy || packageBusy || latestPackage.isPending || refreshLatestPackage.isPending}
                  onclick={() => packageUpdate.mutateAsync()}
                >
                  {packageBusy ? 'Updating…' : 'Update'}
                </Button>
              </div>
            </div>

            {#if packageUpdateStatus.data?.message}
              <p class="text-sm text-muted-foreground">{packageUpdateStatus.data.message}</p>
            {/if}
          </section>

          <section class="space-y-4 border-t border-border pt-6">
            <div class="flex items-start justify-between gap-4">
              <div class="space-y-1 text-sm">
                <div class="font-medium">Assets</div>
                <div class="flex items-baseline gap-2 text-muted-foreground">
                  <span>Target</span>
                  <span class="font-medium text-foreground">All</span>
                </div>
                <div class="flex items-baseline gap-2 text-muted-foreground">
                  <span>Status</span>
                  <span class="font-medium text-foreground">{formatStatus(assetsUpdateStatus.data?.status)}</span>
                </div>
              </div>
              <Button variant="default" disabled={globalBusy || assetsBusy} onclick={() => assetsUpdate.mutateAsync()}>
                {assetsBusy ? 'Refreshing…' : 'Refresh'}
              </Button>
            </div>

            {#if assetsUpdateStatus.data?.message}
              <p class="text-sm text-muted-foreground">{assetsUpdateStatus.data.message}</p>
            {/if}
          </section>
        </CardContent>
      </Card>

      <AutoUpdatesCard />

      <Card>
        <CardHeader>
          <div>
            <h2 class="text-sm font-semibold">Advanced settings</h2>
          </div>
        </CardHeader>
        <CardContent>
          <SystemAdvancedSettings />
        </CardContent>
      </Card>
  </div>
</div>
