<script lang="ts">
  import { useClashVersion } from '$lib/queries/clash'
  import {
    useAssetsUpdate,
    useAssetsUpdateStatus,
    useDashboards,
    useDashboardSelect,
    useDashboardUpdate,
    useDashboardUpdateStatus,
    useServiceStatus,
    useCoreLatestVersion,
    useCoreRefreshLatestVersion,
    useCoreUpdate,
    useCoreUpdateStatus,
    usePackageLatestVersion,
    usePackageRefreshLatestVersion,
    usePackageUpdate,
    usePackageUpdateStatus,
    useSetUciConfig,
    useUciConfig
  } from '$lib/queries/luci'
  import Button from '$lib/components/ui/button/button.svelte'
  import { Card, CardHeader, CardContent } from '$lib/components/ui/card/index'
  import AutoUpdatesCard from '$lib/components/AutoUpdatesCard.svelte'
  import SystemAdvancedSettings from '$lib/components/SystemAdvancedSettings.svelte'
  import PageIntro from '$lib/components/PageIntro.svelte'
  import ExplainerSheet from '$lib/components/ExplainerSheet.svelte'

  const config = useUciConfig('clashnivo')
  const serviceStatus = useServiceStatus('clashnivo', { refetchInterval: 5000 })

  const currentCore = useClashVersion()
  const latestCore = useCoreLatestVersion()
  const refreshLatestCore = useCoreRefreshLatestVersion()
  const latestPackage = usePackageLatestVersion()
  const refreshLatestPackage = usePackageRefreshLatestVersion()
  const busyCommand = $derived(serviceStatus.data?.busy_command ?? '')
  const globalBusy = $derived(serviceStatus.data?.busy ?? false)
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
  const dashboardSelect = useDashboardSelect()

  const cfg = $derived(config.data?.config ?? {})
  const controllerPort = $derived(((cfg['cn_port'] as string | undefined) ?? '9093').trim() || '9093')
  const dashboardForwardSsl = $derived((cfg['dashboard_forward_ssl'] as string | undefined) === '1')
  const coreSourcePolicy = $derived(latestCore.data?.source_policy ?? 'openclash')
  const dashboardUrl = $derived(
    `${dashboardForwardSsl ? 'https' : 'http'}://${window.location.hostname}:${controllerPort}/ui`
  )

  const currentCoreVersion = $derived(currentCore.data?.version ?? null)
  const latestCoreVersion = $derived(latestCore.data?.version ?? null)
  const currentCoreType = $derived(currentCore.data?.meta ? 'Mihomo' : 'Clash')
  const latestCoreType = $derived(latestCore.data?.core_type ?? currentCoreType)
  const latestPackageVersion = $derived(latestPackage.data?.version ?? null)
  const coreUpdateAvailable = $derived(
    !!latestCoreVersion && !!currentCoreVersion && latestCoreVersion !== currentCoreVersion
  )
  let explainerOpen = $state(false)

  const coreBusy = $derived(isPendingState(coreUpdateStatus.data?.status) || coreUpdate.isPending)
  const packageBusy = $derived(
    isPendingState(packageUpdateStatus.data?.status) || packageUpdate.isPending
  )
  const assetsBusy = $derived(
    isPendingState(assetsUpdateStatus.data?.status) || assetsUpdate.isPending
  )
  const dashboardOptions = $derived(dashboards.data ?? [])
  const selectedDashboard = $derived(
    dashboardOptions.find((option) => option.selected) ?? dashboardOptions[0] ?? null
  )
  const selectedDashboardId = $derived(selectedDashboard?.id ?? '')
  const dashboardUpdate = useDashboardUpdate()
  function dashboardStatusQueryEnabled() {
    return !!selectedDashboardId &&
      (dashboardUpdate.isPending || (globalBusy && busyCommand === `dashboard:${selectedDashboardId}`))
  }
  const dashboardUpdateStatus = useDashboardUpdateStatus(() => selectedDashboard?.id ?? '', {
    enabled: dashboardStatusQueryEnabled(),
    refetchInterval: (query) =>
      dashboardStatusQueryEnabled() && isPendingState(query.state.data?.status) ? 2000 : false
  } as never)
  const dashboardSelectBusy = $derived(dashboardSelect.isPending)
  const dashboardBusy = $derived(
    dashboardSelectBusy ||
    isPendingState(dashboardUpdateStatus.data?.status) ||
    dashboardUpdate.isPending
  )
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
      case 'error':
        return 'Failed'
      default:
        return 'Idle'
    }
  }

  function titleCasePolicy(policy?: string) {
    if (!policy) return 'Unknown'
    if (policy === 'openclash') return 'OpenClash'
    if (policy === 'clashnivo') return 'Clash Nivo'
    return 'Custom'
  }

  function dashboardActionLabel(optionId: string, installed: boolean) {
    if (dashboardBusy && selectedDashboardId === optionId) {
      return installed ? 'Updating…' : 'Downloading…'
    }
    return installed ? 'Update' : 'Download'
  }
</script>

<div class="space-y-8">
  <PageIntro
    eyebrow="Maintenance"
    title="System"
  >
    {#snippet actions()}
      <Button variant="outline" size="sm" onclick={() => (explainerOpen = true)}>
        How this works
      </Button>
    {/snippet}
  </PageIntro>

  <div class="space-y-6">
      {#if busyLabel}
        <div class="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          {busyLabel}
        </div>
      {/if}

      <Card>
        <CardHeader>
          <div class="flex items-center justify-between gap-3">
            <div>
              <h2 class="text-sm font-semibold">Core runtime</h2>
            </div>
            <span class="rounded-full border border-border px-2.5 py-1 text-xs font-medium">
              {titleCasePolicy(coreSourcePolicy)}
            </span>
          </div>
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
                  {#if coreBusy || coreUpdateAvailable}
                    <Button
                      variant="default"
                      size="sm"
                      disabled={globalBusy || coreBusy || latestCore.isPending || refreshLatestCore.isPending}
                      onclick={() => coreUpdate.mutateAsync()}
                    >
                      {#if coreBusy}
                        Updating…
                      {:else if coreUpdateAvailable}
                        Update available
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
                      Latest version has not been checked yet.
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
                    {refreshLatestCore.isPending ? 'Checking latest…' : 'Check latest'}
                  </Button>
                </div>
              </div>
            </div>

            {#if coreUpdateStatus.data?.message}
              <p class="text-sm text-muted-foreground">{coreUpdateStatus.data.message}</p>
            {/if}

            <div class="space-y-6 border-t border-border pt-6">
              <section class="space-y-4">
                <div class="flex items-start justify-between gap-4">
                  <div class="space-y-1 text-sm">
                    <div class="font-medium">Package update</div>
                    <div class="flex items-baseline gap-2 text-muted-foreground">
                      <span>Latest</span>
                      <span class="font-medium tabular-nums text-foreground">{latestPackageVersion ?? '—'}</span>
                    </div>
                    <div class="flex items-baseline gap-2 text-muted-foreground">
                      <span>Status</span>
                      <span class="font-medium text-foreground">{formatStatus(packageUpdateStatus.data?.status)}</span>
                    </div>
                  </div>
                  <Button
                    variant="default"
                    disabled={globalBusy || packageBusy || latestPackage.isPending || refreshLatestPackage.isPending}
                    onclick={() => packageUpdate.mutateAsync()}
                  >
                    {#if packageBusy}
                      Updating package…
                    {:else}
                      Update package
                    {/if}
                  </Button>
                </div>

                {#if packageUpdateStatus.data?.message}
                  <p class="text-sm text-muted-foreground">{packageUpdateStatus.data.message}</p>
                {/if}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={globalBusy || refreshLatestPackage.isPending}
                  onclick={() => refreshLatestPackage.mutateAsync()}
                >
                  {refreshLatestPackage.isPending ? 'Checking latest…' : 'Check latest'}
                </Button>
              </section>

              <section class="space-y-4 border-t border-border pt-6">
                <div class="flex items-start justify-between gap-4">
                  <div class="space-y-1 text-sm">
                    <div class="font-medium">Asset maintenance</div>
                    <div class="flex items-baseline gap-2 text-muted-foreground">
                      <span>Target</span>
                      <span class="font-medium text-foreground">All assets</span>
                    </div>
                    <div class="flex items-baseline gap-2 text-muted-foreground">
                      <span>Status</span>
                      <span class="font-medium text-foreground">{formatStatus(assetsUpdateStatus.data?.status)}</span>
                    </div>
                  </div>
                  <Button variant="default" disabled={globalBusy || assetsBusy} onclick={() => assetsUpdate.mutateAsync()}>
                    {#if assetsBusy}
                      Refreshing assets…
                    {:else}
                      Refresh all assets
                    {/if}
                  </Button>
                </div>

                {#if assetsUpdateStatus.data?.message}
                  <p class="text-sm text-muted-foreground">{assetsUpdateStatus.data.message}</p>
                {/if}
              </section>

              <section class="space-y-4 border-t border-border pt-6">
                <div class="flex items-start justify-between gap-4">
                  <div class="space-y-1 text-sm">
                    <div class="font-medium">Dashboards</div>
                    <div class="flex items-baseline gap-2 text-muted-foreground">
                      <span>Selected</span>
                      <span class="font-medium text-foreground">{selectedDashboard?.label ?? '—'}</span>
                    </div>
                    <div class="flex items-baseline gap-2 text-muted-foreground">
                      <span>Transport</span>
                      <span class="font-medium text-foreground">{dashboardForwardSsl ? 'HTTPS' : 'HTTP'}</span>
                    </div>
                    <p class="break-all text-muted-foreground">{dashboardUrl}</p>
                  </div>
                  <div class="flex flex-col items-end gap-3">
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
                    <a
                      class="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                      href={dashboardUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open dashboard
                    </a>
                  </div>
                </div>

                <div class="space-y-3">
                  {#each dashboardOptions as option (option.id)}
                    <div class="rounded-lg border border-border bg-card px-4 py-3">
                      <div class="flex items-start justify-between gap-4">
                        <div class="space-y-1">
                          <div class="flex flex-wrap items-center gap-2">
                            <span class="font-medium">{option.label}</span>
                            {#if option.selected}
                              <span class="rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                Active
                              </span>
                            {/if}
                            {#if !option.installed}
                              <span class="rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                Not installed
                              </span>
                            {/if}
                          </div>
                        </div>
                        <div class="flex flex-wrap items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={globalBusy || dashboardSelectBusy || option.selected}
                            onclick={() => dashboardSelect.mutateAsync(option.id)}
                          >
                            {option.selected ? 'Active' : 'Use'}
                          </Button>
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
              </section>
            </div>
          </div>
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

<ExplainerSheet
  open={explainerOpen}
  onClose={() => (explainerOpen = false)}
  title="System"
  intro="System is where Clash Nivo stops being just a config composer and starts interacting with the router. These settings affect updates, DNS, traffic interception, logging, and runtime behavior."
  flow={['Client', 'Router', 'dnsmasq / redirect', 'Clash Nivo', 'Upstream DNS']}
  sections={[
    {
      title: 'What changes here',
      body: 'These settings change the router environment around Clash Nivo: ports, DNS capture, traffic interception, schedules, update behavior, and diagnostics. They do not directly edit your source YAML.'
    },
    {
      title: 'DNS layers',
      body: 'LAN clients usually send DNS to the router first. The router can then forward or redirect those queries into Clash Nivo, and the generated Clash config decides which upstream DNS servers are used from there. That is why router DNS settings and source-config DNS are related but not the same thing.'
    },
    {
      title: 'What the assets are',
      body: 'Assets are supporting data files used by routing and matching logic. GeoIP and GeoSite describe IP and domain datasets, IPDB is an IP database, GeoASN maps IP ranges to autonomous systems, and Chnroute is a route list of China IP ranges used by direct-routing and bypass logic.'
    },
    {
      title: 'How to read the page',
      body: 'Use the upper sections for maintenance tasks like package, core, and asset updates. Use Advanced settings only when you need to change how the router captures traffic, handles DNS, or routes devices.'
    }
  ]}
/>
