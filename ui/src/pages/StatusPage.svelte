<script lang="ts">
  import { useServiceStatus, useServiceStart, useServiceStop, useServiceRestart, useUciConfig } from '$lib/queries/luci'
  import { useClashConfig } from '$lib/queries/clash'
  import Button from '$lib/components/ui/button/button.svelte'

  const serviceStatus = useServiceStatus('openclash', { refetchInterval: 5000 })
  const clashConfig = useClashConfig()
  const uciConfig = useUciConfig('openclash')

  const startMutation = useServiceStart('openclash')
  const stopMutation = useServiceStop('openclash')
  const restartMutation = useServiceRestart('openclash')

  // Optimistic state: set immediately on button click, cleared once mutation settles
  let optimisticRunning = $state<boolean | null>(null)

  const dashboardUrl = `http://${window.location.hostname}:9090/ui`

  const isRunning = $derived(optimisticRunning ?? serviceStatus.data?.running ?? false)
  const isBusy = $derived(
    startMutation.isPending || stopMutation.isPending || restartMutation.isPending
  )

  const configPath = $derived((uciConfig.data?.config as Record<string, string> | undefined)?.config_path ?? null)
  const configName = $derived(configPath ? configPath.split('/').pop()?.replace(/\.ya?ml$/i, '') ?? configPath : null)
  const operationMode = $derived((uciConfig.data?.config as Record<string, string> | undefined)?.operation_mode ?? null)
  const proxyMode = $derived(clashConfig.data?.mode ?? null)

  function formatOperationMode(mode: string): string {
    if (mode === 'fake-ip') return 'Fake-IP'
    if (mode === 'redir-host') return 'Redir-Host'
    if (mode === 'tun') return 'TUN'
    return mode
  }

  function formatProxyMode(mode: string): string {
    return mode.charAt(0).toUpperCase() + mode.slice(1)
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
</div>
