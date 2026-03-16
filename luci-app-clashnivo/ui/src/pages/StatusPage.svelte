<script lang="ts">
  import { useServiceStatus, useServiceStart, useServiceStop, useServiceRestart, useUciConfig, useSubscriptionAdd, luciKeys } from '$lib/queries/luci'
  import { useClashConfig, useClashVersion, useConnections, useExternalIp } from '$lib/queries/clash'
  import { useQueryClient } from '@tanstack/svelte-query'
  import Button from '$lib/components/ui/button/button.svelte'
  import { Input } from '$lib/components/ui/input/index'
  import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card/index'
  import { formatBytes } from '$lib/utils'

  const queryClient = useQueryClient()

  const serviceStatus = useServiceStatus('clashnivo', { refetchInterval: 5000 })
  const clashConfig = useClashConfig()
  const uciConfig = useUciConfig('clashnivo')   // no polling — only re-fetched on demand
  const clashVersion = useClashVersion()

  const startMutation = useServiceStart('clashnivo')
  const stopMutation = useServiceStop('clashnivo')
  const restartMutation = useServiceRestart('clashnivo')
  const subscriptionAdd = useSubscriptionAdd()

  // Optimistic state: set immediately on button click, cleared once mutation settles
  let optimisticRunning = $state<boolean | null>(null)

  // Empty state form
  let subscriptionUrl = $state('')
  let urlError = $state<string | null>(null)

  const dashboardUrl = `http://${window.location.hostname}:9090/ui`

  const isRunning = $derived(optimisticRunning ?? serviceStatus.data?.running ?? false)
  const isBusy = $derived(
    startMutation.isPending || stopMutation.isPending || restartMutation.isPending
  )

  const configPath = $derived((uciConfig.data?.config as Record<string, string> | undefined)?.config_path ?? null)
  const configName = $derived(configPath ? configPath.split('/').pop()?.replace(/\.ya?ml$/i, '') ?? configPath : null)
  const operationMode = $derived((uciConfig.data?.config as Record<string, string> | undefined)?.operation_mode ?? null)
  const proxyMode = $derived(clashConfig.data?.mode ?? null)

  // Show empty state when UCI config has loaded but no config is set
  const isEmpty = $derived(uciConfig.isSuccess && !configPath)

  // Info cards — fetch continuously, fail silently when Clash is stopped
  const connections = useConnections({ refetchInterval: 5000, retry: false } as never)
  const geoIp = useExternalIp({ retry: false } as never)

  function formatOperationMode(mode: string): string {
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
      await subscriptionAdd.mutateAsync({ url: subscriptionUrl.trim() })

      // Poll uciConfig every 2s until the config_path appears (download complete)
      const interval = setInterval(async () => {
        await queryClient.invalidateQueries({ queryKey: luciKeys.uci('clashnivo') })
        if (configPath) clearInterval(interval)
      }, 2000)

      // Safety: stop polling after 2 minutes regardless
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

<div class="space-y-10">
  <h1 class="text-2xl font-semibold tracking-tight">Status</h1>

  {#if isEmpty}
    <!-- Empty state — no subscription configured yet -->
    <div class="flex flex-col items-start gap-4 py-4">
      <div class="space-y-1">
        <p class="text-lg font-medium">Add your first subscription</p>
        <p class="text-sm text-muted-foreground">
          Paste a Clash subscription URL to get started. Your config will be downloaded and Clash will start automatically.
        </p>
      </div>

      <div class="flex w-full max-w-md flex-col gap-2">
        <div class="flex gap-2">
          <Input
            type="url"
            placeholder="https://example.com/subscribe?token=..."
            bind:value={subscriptionUrl}
            disabled={subscriptionAdd.isPending}
            aria-label="Subscription URL"
            aria-invalid={urlError ? 'true' : undefined}
          />
          <Button
            variant="default"
            disabled={subscriptionAdd.isPending}
            onclick={handleGetStarted}
          >
            {#if subscriptionAdd.isPending}
              Setting up…
            {:else}
              Get Started
            {/if}
          </Button>
        </div>
        {#if urlError}
          <p class="text-sm text-destructive">{urlError}</p>
        {/if}
      </div>
    </div>

  {:else}
    <!-- Normal status view -->

    <!-- Status indicator -->
    <div class="flex flex-col items-start gap-6">
      <div class="flex items-center gap-4">
        <span
          class="flex h-4 w-4 rounded-full {isRunning ? 'bg-green-500' : 'bg-red-500'}"
          aria-hidden="true"
        ></span>
        <span class="text-xl font-medium">
          {isRunning ? 'Running' : 'Stopped'}
        </span>
      </div>

      <!-- Info row -->
      {#if configName || operationMode || proxyMode}
        <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {#if configName}
            <span>{configName}</span>
          {/if}
          {#if operationMode}
            <span>{formatOperationMode(operationMode)}</span>
          {/if}
          {#if proxyMode}
            <span>{formatProxyMode(proxyMode)}</span>
          {/if}
        </div>
      {/if}
    </div>

    <!-- Service controls -->
    <div class="flex flex-wrap items-center gap-3">
      <Button
        variant="default"
        disabled={isBusy || isRunning}
        onclick={handleStart}
      >
        Start
      </Button>
      <Button
        variant="outline"
        disabled={isBusy || !isRunning}
        onclick={handleStop}
      >
        Stop
      </Button>
      <Button
        variant="outline"
        disabled={isBusy}
        onclick={handleRestart}
      >
        Restart
      </Button>
    </div>

    <!-- Dashboard link -->
    <div>
      <a
        href={dashboardUrl}
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Open Dashboard
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M7 7h10v10"/><path d="M7 17 17 7"/>
        </svg>
      </a>
    </div>

    <!-- Info cards -->
    <div class="grid gap-4 sm:grid-cols-3">
      <!-- External IP card -->
      <Card>
        <CardHeader>External IP</CardHeader>
        <CardContent>
          {#if geoIp.data}
            <p class="text-lg font-semibold tabular-nums">{geoIp.data.ip}</p>
            {#if geoIp.data.city || geoIp.data.country}
              <p class="mt-0.5 text-sm text-muted-foreground">
                {[geoIp.data.city, geoIp.data.country].filter(Boolean).join(', ')}
              </p>
            {/if}
          {:else}
            <p class="text-lg font-semibold text-muted-foreground">—</p>
          {/if}
        </CardContent>
      </Card>

      <!-- Traffic card -->
      <Card>
        <CardHeader>Traffic</CardHeader>
        <CardContent>
          {#if connections.data}
            <div class="space-y-1">
              <div class="flex items-center justify-between text-sm">
                <span class="text-muted-foreground">↑ Up</span>
                <span class="font-medium tabular-nums">{formatBytes(connections.data.uploadTotal)}</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-muted-foreground">↓ Down</span>
                <span class="font-medium tabular-nums">{formatBytes(connections.data.downloadTotal)}</span>
              </div>
            </div>
          {:else}
            <p class="text-lg font-semibold text-muted-foreground">—</p>
          {/if}
        </CardContent>
      </Card>

      <!-- Core version card -->
      <Card>
        <CardHeader>Core Version</CardHeader>
        <CardContent>
          {#if clashVersion.data}
            <p class="text-lg font-semibold tabular-nums">{clashVersion.data.version}</p>
            {#if clashVersion.data.meta}
              <p class="mt-0.5 text-sm text-muted-foreground">Mihomo</p>
            {/if}
          {:else}
            <p class="text-lg font-semibold text-muted-foreground">—</p>
          {/if}
        </CardContent>
      </Card>
    </div>
  {/if}
</div>
