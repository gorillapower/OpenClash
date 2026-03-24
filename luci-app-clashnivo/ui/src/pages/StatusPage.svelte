<script lang="ts">
  import {
    useServiceStatus,
    useServiceStart,
    useServiceStop,
    useServiceRestart,
    useServiceCancelJob,
    useUciConfig,
    useSubscriptionAdd,
    useSubscriptionUpdate,
    useProxyGroups,
    useRuleProviders,
    useCustomProxies,
    useCustomRules,
    useConfigOverwrite,
    luciKeys
  } from '$lib/queries/luci'
  import { useQueryClient } from '@tanstack/svelte-query'
  import Button from '$lib/components/ui/button/button.svelte'
  import { Input } from '$lib/components/ui/input/index'
  import { Card, CardHeader, CardContent } from '$lib/components/ui/card/index'
  import PageIntro from '$lib/components/PageIntro.svelte'
  import EmptyState from '$lib/components/EmptyState.svelte'

  const queryClient = useQueryClient()

  const serviceStatus = useServiceStatus('clashnivo', { refetchInterval: 5000 })
  const uciConfig = useUciConfig('clashnivo')
  const proxyGroups = useProxyGroups()
  const ruleProviders = useRuleProviders()
  const customProxies = useCustomProxies()
  const customRules = useCustomRules()
  const configOverwrite = useConfigOverwrite()

  const startMutation = useServiceStart('clashnivo')
  const stopMutation = useServiceStop('clashnivo')
  const restartMutation = useServiceRestart('clashnivo')
  const cancelJobMutation = useServiceCancelJob('clashnivo')
  const subscriptionAdd = useSubscriptionAdd()
  const subscriptionUpdate = useSubscriptionUpdate()

  let optimisticRunning = $state<boolean | null>(null)
  let subscriptionUrl = $state('')
  let urlError = $state<string | null>(null)

  const controllerPort = $derived(
    ((uciConfig.data?.config as Record<string, string> | undefined)?.cn_port ?? '9093').trim() || '9093'
  )
  const dashboardUrl = $derived(`http://${window.location.hostname}:${controllerPort}/ui`)

  const serviceState = $derived.by(() => {
    if (optimisticRunning === true) return 'starting'
    if (optimisticRunning === false) return 'stopped'
    return serviceStatus.data?.state ?? (serviceStatus.data?.running ? 'running' : 'disabled')
  })
  const isRunning = $derived(serviceState === 'running')
  const isBusy = $derived(
    (serviceStatus.data?.busy ?? false) ||
    startMutation.isPending ||
    stopMutation.isPending ||
    restartMutation.isPending
  )
  const busyCommand = $derived(serviceStatus.data?.busy_command ?? null)
  const activeJobCancelable = $derived(serviceStatus.data?.active_job_cancelable ?? false)
  const activeJobKind = $derived(serviceStatus.data?.active_job_kind ?? null)
  const activeJobTarget = $derived(serviceStatus.data?.active_job_target ?? null)

  const activeConfigPath = $derived(
    serviceStatus.data?.active_config ??
      ((uciConfig.data?.config as Record<string, string> | undefined)?.config_path ?? null)
  )
  const activeConfigName = $derived(
    activeConfigPath ? activeConfigPath.split('/').pop()?.replace(/\.ya?ml$/i, '') ?? activeConfigPath : null
  )

  const runMode = $derived(serviceStatus.data?.run_mode ?? null)
  const proxyMode = $derived(serviceStatus.data?.proxy_mode ?? null)
  const coreType = $derived(serviceStatus.data?.core_type ?? null)

  const canStart = $derived(serviceStatus.data?.can_start ?? true)
  const isBlocked = $derived(serviceStatus.data?.blocked ?? false)
  const blockedReason = $derived(serviceStatus.data?.blocked_reason ?? null)
  const openclashInstalled = $derived(serviceStatus.data?.openclash_installed ?? false)
  const openclashActive = $derived(serviceStatus.data?.openclash_active ?? false)
  const coreRunning = $derived(serviceStatus.data?.core_running ?? false)
  const serviceManaged = $derived(serviceStatus.data?.service_running ?? false)
  const watchdogRunning = $derived(serviceStatus.data?.watchdog_running ?? false)

  const isEmpty = $derived(uciConfig.isSuccess && !activeConfigPath)

  const proxyGroupCount = $derived(proxyGroups.data?.length ?? 0)
  const ruleProviderCount = $derived(ruleProviders.data?.length ?? 0)
  const customProxyCount = $derived(customProxies.data?.length ?? 0)
  const customRuleCount = $derived(customRules.data?.length ?? 0)
  const hasOverwrite = $derived(Boolean(configOverwrite.data?.content?.trim()))

  const stateLabel = $derived.by(() => {
    switch (serviceState) {
      case 'blocked':
        return 'Blocked'
      case 'starting':
        return 'Starting'
      case 'running':
        return 'Running'
      case 'degraded':
        return 'Degraded'
      case 'stopped':
        return 'Stopped'
      default:
        return 'Disabled'
    }
  })
  const stateToneClass = $derived(
    serviceState === 'blocked'
      ? 'bg-amber-500'
      : serviceState === 'running'
        ? 'bg-green-500'
        : serviceState === 'starting'
          ? 'bg-sky-500'
          : serviceState === 'degraded'
            ? 'bg-orange-500'
            : serviceState === 'stopped'
              ? 'bg-slate-500'
              : 'bg-slate-400'
  )
  const stateMessage = $derived.by(() => {
    if (serviceState === 'blocked') {
      return blockedReasonMessage(blockedReason)
    }
    if (serviceState === 'starting') {
      return 'Clash Nivo is applying the active config and bringing the runtime online.'
    }
    if (serviceState === 'degraded') {
      return 'Clash Nivo is in a partial runtime state. Service ownership and core health do not currently agree.'
    }
    if (serviceState === 'running') {
      return 'Clash Nivo is active and owns the runtime.'
    }
    if (serviceState === 'stopped') {
      return 'Clash Nivo is enabled but not currently running.'
    }
    return 'Clash Nivo is installed but currently disabled.'
  })

  const busyMessage = $derived.by(() => {
    if (!busyCommand) return null
    switch (busyCommand) {
      case 'start':
        return 'Clash Nivo is starting.'
      case 'stop':
        return 'Clash Nivo is stopping.'
      case 'restart':
        return 'Clash Nivo is restarting.'
      default:
        return `Clash Nivo is busy with ${busyCommand}.`
    }
  })
  const cancelLabel = $derived.by(() => {
    if (!activeJobCancelable) return null
    if (activeJobKind === 'subscription') {
      return activeJobTarget && activeJobTarget !== 'all'
        ? `Cancel source refresh: ${activeJobTarget}`
        : 'Cancel source refresh'
    }
    if (activeJobKind === 'core') return 'Cancel core update'
    if (activeJobKind === 'package') return 'Cancel package update'
    if (activeJobKind === 'assets') return 'Cancel asset refresh'
    if (activeJobKind === 'dashboard') return 'Cancel dashboard download'
    return 'Cancel active job'
  })

  function blockedReasonMessage(reason: string | null): string {
    if (reason === 'openclash_active') {
      return 'OpenClash is active. Clash Nivo cannot take runtime ownership until OpenClash is stopped.'
    }
    if (reason) {
      return `Clash Nivo start is blocked: ${reason}.`
    }
    return 'Clash Nivo start is currently blocked.'
  }

  function formatRunMode(mode: string): string {
    if (mode === 'fake-ip') return 'Fake-IP'
    if (mode === 'redir-host') return 'Redir-Host'
    if (mode === 'tun') return 'TUN'
    return mode
  }

  function formatProxyMode(mode: string): string {
    return mode.charAt(0).toUpperCase() + mode.slice(1)
  }

  function validateUrl(url: string): string | null {
    if (!url.trim()) return 'Please enter a subscription URL'
    try {
      const parsed = new URL(url.trim())
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return 'URL must start with http:// or https://'
      }
    } catch {
      return 'Please enter a valid URL'
    }
    return null
  }

  async function handleGetStarted() {
    urlError = null
    const error = validateUrl(subscriptionUrl)
    if (error) {
      urlError = error
      return
    }

    try {
      const result = await subscriptionAdd.mutateAsync({ url: subscriptionUrl.trim() })
      if (result?.name) {
        await subscriptionUpdate.mutateAsync(result.name)
      }

      const interval = setInterval(async () => {
        await queryClient.invalidateQueries({ queryKey: luciKeys.uci('clashnivo') })
        if (activeConfigPath) clearInterval(interval)
      }, 2000)

      setTimeout(() => clearInterval(interval), 120_000)
    } catch {
      // Error toast handled by mutation onError
    }
  }

  async function handleStart() {
    optimisticRunning = true
    try {
      await startMutation.mutateAsync()
    } finally {
      optimisticRunning = null
    }
  }

  async function handleStop() {
    optimisticRunning = false
    try {
      await stopMutation.mutateAsync()
    } finally {
      optimisticRunning = null
    }
  }

  async function handleRestart() {
    optimisticRunning = true
    try {
      await restartMutation.mutateAsync()
    } finally {
      optimisticRunning = null
    }
  }
</script>

<div class="space-y-8">
  <PageIntro eyebrow="Operations" title="Status" />

  {#if isEmpty}
    <div class="space-y-5 py-2">
      {#if busyMessage}
        <div class="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          <span>{busyMessage}</span>
          {#if activeJobCancelable}
            <Button
              variant="outline"
              size="sm"
              disabled={cancelJobMutation.isPending}
              onclick={() => cancelJobMutation.mutateAsync()}
            >
              {cancelJobMutation.isPending ? 'Cancelling…' : cancelLabel}
            </Button>
          {/if}
        </div>
      {/if}

      <EmptyState
        title="Add a subscription"
        body=""
      />

      <div class="flex w-full max-w-2xl flex-col gap-2">
        <div class="flex gap-2">
          <Input
            type="url"
            placeholder="https://example.com/subscribe?token=..."
            bind:value={subscriptionUrl}
            disabled={subscriptionAdd.isPending || subscriptionUpdate.isPending || isBusy}
            aria-label="Subscription URL"
            aria-invalid={urlError ? 'true' : undefined}
          />
          <Button
            variant="default"
            disabled={subscriptionAdd.isPending || subscriptionUpdate.isPending || isBusy}
            onclick={handleGetStarted}
          >
            {#if subscriptionAdd.isPending}
              Saving subscription...
            {:else if subscriptionUpdate.isPending}
              Checking and refreshing...
            {:else}
              Save + refresh
            {/if}
          </Button>
        </div>
        {#if urlError}
          <p class="text-sm text-destructive">{urlError}</p>
        {/if}
        <div class="flex flex-wrap gap-3 text-sm">
          <a href="#/sources" class="text-foreground underline underline-offset-4">Open Sources</a>
          <a href="#/compose" class="text-muted-foreground underline underline-offset-4">Open Compose</a>
        </div>
      </div>
    </div>
  {:else}
    <div class="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <Card class="h-full">
        <CardHeader class="space-y-4">
          {#if busyMessage}
            <div class="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              <span>{busyMessage}</span>
              {#if activeJobCancelable}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={cancelJobMutation.isPending}
                  onclick={() => cancelJobMutation.mutateAsync()}
                >
                  {cancelJobMutation.isPending ? 'Cancelling…' : cancelLabel}
                </Button>
              {/if}
            </div>
          {/if}

          <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="space-y-2">
              <div class="flex items-center gap-3">
                <span
                  class="flex h-3.5 w-3.5 rounded-full {stateToneClass}"
                  aria-hidden="true"
                ></span>
                <span class="text-xl font-semibold">{stateLabel}</span>
              </div>
              <p class="max-w-2xl text-sm text-muted-foreground">{stateMessage}</p>
            </div>

            <div class="flex flex-wrap gap-2">
              <Button
                variant="default"
                disabled={isBusy || serviceState === 'running' || serviceState === 'starting' || !canStart}
                onclick={handleStart}
              >
                Start
              </Button>
              <Button
                variant="outline"
                disabled={isBusy || (serviceState !== 'running' && serviceState !== 'degraded')}
                onclick={handleStop}
              >
                Stop
              </Button>
              <Button
                variant="outline"
                disabled={isBusy || (serviceState !== 'running' && serviceState !== 'degraded')}
                onclick={handleRestart}
              >
                Restart
              </Button>
            </div>
          </div>

          <div class="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {#if activeConfigName}
              <span class="rounded-full border border-border px-2 py-1">Source: {activeConfigName}</span>
            {/if}
            {#if runMode}
              <span class="rounded-full border border-border px-2 py-1">Run mode: {formatRunMode(runMode)}</span>
            {/if}
            {#if proxyMode}
              <span class="rounded-full border border-border px-2 py-1">Proxy mode: {formatProxyMode(proxyMode)}</span>
            {/if}
            {#if coreType}
              <span class="rounded-full border border-border px-2 py-1">Core: {coreType}</span>
            {/if}
            {#if watchdogRunning}
              <span class="rounded-full border border-border px-2 py-1">Watchdog active</span>
            {/if}
          </div>
        </CardHeader>

        <CardContent class="space-y-4">
          <div class="grid gap-3 sm:grid-cols-2">
            <div class="rounded-md border border-border p-3">
              <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">OpenClash guard</p>
              <p class="mt-1 text-sm">
                {#if openclashActive}
                  OpenClash is active and currently blocks Clash Nivo startup.
                {:else if openclashInstalled}
                  OpenClash is installed but not currently blocking Clash Nivo.
                {:else}
                  No OpenClash runtime conflict is currently detected.
                {/if}
              </p>
            </div>
          </div>

          <div class="flex flex-wrap gap-3 text-sm">
            <a href="#/compose" class="font-medium text-foreground underline underline-offset-4">
              Compose
            </a>
            <a href="#/logs" class="font-medium text-foreground underline underline-offset-4">
              Logs
            </a>
            <a
              href={dashboardUrl}
              target="_blank"
              rel="noopener noreferrer"
              class="text-muted-foreground underline underline-offset-4"
            >
              Dashboard
            </a>
          </div>
        </CardContent>
      </Card>

      <div class="grid gap-4">
        <Card class="h-full">
          <CardHeader>
            <p class="text-sm font-semibold">Active runtime summary</p>
          </CardHeader>
          <CardContent class="space-y-3 text-sm">
            <div class="flex items-start justify-between gap-4">
              <span class="text-muted-foreground">Selected source</span>
              <span class="text-right font-medium">{activeConfigName ?? 'None selected'}</span>
            </div>
            <div class="flex items-start justify-between gap-4">
              <span class="text-muted-foreground">Service</span>
              <span class="text-right font-medium">{stateLabel}</span>
            </div>
            <div class="flex items-start justify-between gap-4">
              <span class="text-muted-foreground">Core</span>
              <span class="text-right font-medium">{coreRunning ? 'Running' : 'Not running'}</span>
            </div>
            <div class="flex items-start justify-between gap-4">
              <span class="text-muted-foreground">Service ownership</span>
              <span class="text-right font-medium">{serviceManaged ? 'Managed' : 'Not managed'}</span>
            </div>
            <div class="flex items-start justify-between gap-4">
              <span class="text-muted-foreground">Activation</span>
              <span class="text-right font-medium">{serviceState === 'blocked' ? 'Blocked' : 'Available'}</span>
            </div>
          </CardContent>
        </Card>

        <Card class="h-full">
          <CardHeader>
            <p class="text-sm font-semibold">Custom layers</p>
          </CardHeader>
          <CardContent class="space-y-3 text-sm">
            <div class="flex items-start justify-between gap-4">
              <span class="text-muted-foreground">Custom proxies</span>
              <span class="font-medium">{customProxyCount}</span>
            </div>
            <div class="flex items-start justify-between gap-4">
              <span class="text-muted-foreground">Rule providers</span>
              <span class="font-medium">{ruleProviderCount}</span>
            </div>
            <div class="flex items-start justify-between gap-4">
              <span class="text-muted-foreground">Proxy groups</span>
              <span class="font-medium">{proxyGroupCount}</span>
            </div>
            <div class="flex items-start justify-between gap-4">
              <span class="text-muted-foreground">Custom rules</span>
              <span class="font-medium">{customRuleCount}</span>
            </div>
            <div class="flex items-start justify-between gap-4">
              <span class="text-muted-foreground">Overwrite</span>
              <span class="font-medium">{hasOverwrite ? 'Enabled' : 'Not set'}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  {/if}
</div>
