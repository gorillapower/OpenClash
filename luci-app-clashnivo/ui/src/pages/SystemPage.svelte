<script lang="ts">
  import { useClashVersion } from '$lib/queries/clash'
  import {
    useAssetsUpdate,
    useAssetsUpdateStatus,
    useCoreLatestVersion,
    useCoreUpdate,
    useCoreUpdateStatus,
    usePackageLatestVersion,
    usePackageUpdate,
    usePackageUpdateStatus,
    useUciConfig
  } from '$lib/queries/luci'
  import Button from '$lib/components/ui/button/button.svelte'
  import { Card, CardHeader, CardContent } from '$lib/components/ui/card/index'
  import AutoUpdatesCard from '$lib/components/AutoUpdatesCard.svelte'
  import LogsViewer from '$lib/components/LogsViewer.svelte'
  import SystemAdvancedSettings from '$lib/components/SystemAdvancedSettings.svelte'
  import PageIntro from '$lib/components/PageIntro.svelte'
  import ContextNote from '$lib/components/ContextNote.svelte'

  const config = useUciConfig('clashnivo')

  const currentCore = useClashVersion()
  const latestCore = useCoreLatestVersion()
  const coreUpdateStatus = useCoreUpdateStatus({
    refetchInterval: (query) => isPendingState(query.state.data?.status) ? 2000 : false
  } as never)
  const coreUpdate = useCoreUpdate()

  const latestPackage = usePackageLatestVersion()
  const packageUpdateStatus = usePackageUpdateStatus({
    refetchInterval: (query) => isPendingState(query.state.data?.status) ? 2000 : false
  } as never)
  const packageUpdate = usePackageUpdate()

  const assetsUpdateStatus = useAssetsUpdateStatus('all', {
    refetchInterval: (query) => isPendingState(query.state.data?.status) ? 2000 : false
  } as never)
  const assetsUpdate = useAssetsUpdate('all')

  const cfg = $derived(config.data?.config ?? {})
  const dashboardType = $derived((cfg['dashboard_type'] as string | undefined) ?? 'Official')
  const dashboardForwardSsl = $derived((cfg['dashboard_forward_ssl'] as string | undefined) === '1')
  const coreSourcePolicy = $derived(latestCore.data?.source_policy ?? 'openclash')
  const coreSourceBase = $derived(latestCore.data?.source_base ?? '')
  const coreSourceBranch = $derived(latestCore.data?.source_branch ?? '')
  const dashboardUrl = $derived(
    `${dashboardForwardSsl ? 'https' : 'http'}://${window.location.hostname}:9090/ui`
  )

  const currentCoreVersion = $derived(currentCore.data?.version ?? null)
  const latestCoreVersion = $derived(latestCore.data?.version ?? null)
  const currentCoreType = $derived(currentCore.data?.meta ? 'Mihomo' : 'Clash')
  const latestCoreType = $derived(latestCore.data?.core_type ?? currentCoreType)
  const latestPackageVersion = $derived(latestPackage.data?.version ?? null)

  const coreBusy = $derived(isPendingState(coreUpdateStatus.data?.status) || coreUpdate.isPending)
  const packageBusy = $derived(
    isPendingState(packageUpdateStatus.data?.status) || packageUpdate.isPending
  )
  const assetsBusy = $derived(
    isPendingState(assetsUpdateStatus.data?.status) || assetsUpdate.isPending
  )

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
</script>

<div class="space-y-8">
  <PageIntro
    eyebrow="Maintenance"
    title="System"
    description="Updates, schedules, logs, diagnostics, and dashboard access."
  />

  <ContextNote
    id="system-runtime-model"
    title="Runtime model"
    body="System owns router-facing behavior such as updates, schedules, logs, dashboards, DNS capture, and traffic handling. Source YAML can define DNS and routing preferences, but the router still applies dnsmasq wiring, firewall interception, and Clash Nivo runtime controls on top."
  />

  <div class="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
    <div class="space-y-6">
      <Card>
        <CardHeader>
          <div class="flex items-center justify-between gap-3">
            <div>
              <h2 class="text-sm font-semibold">Core runtime</h2>
              <p class="mt-1 text-sm text-muted-foreground">
                Current and latest core information with explicit source policy context.
              </p>
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
                <div class="text-xs uppercase tracking-wider text-muted-foreground">Latest</div>
                <div class="mt-2 flex items-baseline gap-2">
                  {#if latestCore.isPending}
                    <span class="text-sm text-muted-foreground">Checking…</span>
                  {:else}
                    <span class="text-lg font-semibold tabular-nums">
                      {latestCoreVersion ?? '—'}
                    </span>
                    <span class="text-xs text-muted-foreground">{latestCoreType}</span>
                  {/if}
                </div>
              </div>
            </div>

            <dl class="grid gap-2 text-sm sm:grid-cols-3">
              <div>
                <dt class="text-muted-foreground">Source</dt>
                <dd class="mt-1 font-medium">{titleCasePolicy(coreSourcePolicy)}</dd>
              </div>
              <div>
                <dt class="text-muted-foreground">Branch</dt>
                <dd class="mt-1 font-medium">{coreSourceBranch || '—'}</dd>
              </div>
              <div>
                <dt class="text-muted-foreground">Status</dt>
                <dd class="mt-1 font-medium">{formatStatus(coreUpdateStatus.data?.status)}</dd>
              </div>
            </dl>

            {#if coreSourceBase}
              <p class="text-xs text-muted-foreground break-all">
                Resolved source base: {coreSourceBase}
              </p>
            {/if}

            {#if coreUpdateStatus.data?.message}
              <p class="text-sm text-muted-foreground">{coreUpdateStatus.data.message}</p>
            {/if}

            <div class="flex flex-wrap items-center gap-3">
              <Button
                variant="default"
                disabled={coreBusy || latestCore.isPending}
                onclick={() => coreUpdate.mutateAsync()}
              >
                {#if coreBusy}
                  Updating core runtime…
                {:else}
                  Update core runtime
                {/if}
              </Button>
              <p class="text-xs text-muted-foreground">
                Core source mode is informational here. Editing it is deferred to a later System
                settings pass.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div class="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <h2 class="text-sm font-semibold">Package update</h2>
              <p class="mt-1 text-sm text-muted-foreground">
                Update the installed LuCI package and supporting scripts.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <div class="space-y-4">
              <div class="text-sm">
                <div class="flex items-baseline justify-between gap-3">
                  <span class="text-muted-foreground">Latest package</span>
                  <span class="font-medium tabular-nums">{latestPackageVersion ?? '—'}</span>
                </div>
                <div class="mt-2 flex items-baseline justify-between gap-3">
                  <span class="text-muted-foreground">Status</span>
                  <span class="font-medium">{formatStatus(packageUpdateStatus.data?.status)}</span>
                </div>
              </div>

              {#if packageUpdateStatus.data?.message}
                <p class="text-sm text-muted-foreground">{packageUpdateStatus.data.message}</p>
              {/if}

              <Button
                variant="default"
                disabled={packageBusy || latestPackage.isPending}
                onclick={() => packageUpdate.mutateAsync()}
              >
                {#if packageBusy}
                  Updating package…
                {:else}
                  Update package
                {/if}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <h2 class="text-sm font-semibold">Asset maintenance</h2>
              <p class="mt-1 text-sm text-muted-foreground">
                Refresh IPDB, GeoIP, GeoSite, GeoASN, and Chnroute support assets.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <div class="space-y-4">
              <div class="text-sm">
                <div class="flex items-baseline justify-between gap-3">
                  <span class="text-muted-foreground">Target</span>
                  <span class="font-medium">All assets</span>
                </div>
                <div class="mt-2 flex items-baseline justify-between gap-3">
                  <span class="text-muted-foreground">Status</span>
                  <span class="font-medium">{formatStatus(assetsUpdateStatus.data?.status)}</span>
                </div>
              </div>

              {#if assetsUpdateStatus.data?.message}
                <p class="text-sm text-muted-foreground">{assetsUpdateStatus.data.message}</p>
              {/if}

              <Button variant="default" disabled={assetsBusy} onclick={() => assetsUpdate.mutateAsync()}>
                {#if assetsBusy}
                  Refreshing assets…
                {:else}
                  Refresh all assets
                {/if}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <AutoUpdatesCard />

      <Card>
        <CardHeader>
          <div>
            <h2 class="text-sm font-semibold">Advanced settings</h2>
            <p class="mt-1 text-sm text-muted-foreground">
              Advanced runtime, DNS, LAN policy, port, mirror, and diagnostic controls grouped by operator intent.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <SystemAdvancedSettings />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <h2 class="text-sm font-semibold">Logs and diagnostics</h2>
            <p class="mt-1 text-sm text-muted-foreground">
              Service and core logs for immediate troubleshooting.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <LogsViewer />
        </CardContent>
      </Card>
    </div>

    <div class="space-y-6">
      <Card>
        <CardHeader>
          <div>
            <h2 class="text-sm font-semibold">Maintenance summary</h2>
            <p class="mt-1 text-sm text-muted-foreground">
              Quick read-only context for update and dashboard behavior.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <dl class="space-y-4 text-sm">
            <div>
              <dt class="text-muted-foreground">Core source policy</dt>
              <dd class="mt-1 font-medium">{titleCasePolicy(coreSourcePolicy)}</dd>
            </div>
            <div>
              <dt class="text-muted-foreground">Dashboard</dt>
              <dd class="mt-1 font-medium">{dashboardType}</dd>
            </div>
            <div>
              <dt class="text-muted-foreground">Dashboard transport</dt>
              <dd class="mt-1 font-medium">{dashboardForwardSsl ? 'HTTPS' : 'HTTP'}</dd>
            </div>
            <div>
              <dt class="text-muted-foreground">Advanced settings</dt>
              <dd class="mt-1 text-muted-foreground">Grouped runtime and maintenance controls are available below.</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <h2 class="text-sm font-semibold">Dashboard access</h2>
            <p class="mt-1 text-sm text-muted-foreground">
              External dashboards remain a supported runtime integration.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <div class="space-y-3">
            <p class="text-sm text-muted-foreground break-all">
              {dashboardUrl}
            </p>
            <a
              class="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              href={dashboardUrl}
              target="_blank"
              rel="noreferrer"
            >
              Open dashboard
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</div>
