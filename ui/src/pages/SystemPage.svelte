<script lang="ts">
  import { useClashVersion } from '$lib/queries/clash'
  import { useCoreLatestVersion, useCoreUpdate, useCoreUpdateStatus } from '$lib/queries/luci'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { luciKeys } from '$lib/queries/luci'
  import Button from '$lib/components/ui/button/button.svelte'
  import { Card, CardHeader, CardContent } from '$lib/components/ui/card/index'
  import LogsViewer from '$lib/components/LogsViewer.svelte'

  const queryClient = useQueryClient()

  const currentVersion = useClashVersion()
  const latestVersion = useCoreLatestVersion()
  const updateMutation = useCoreUpdate()

  // Declared before useCoreUpdateStatus so the refetchInterval closure can read it
  let isUpdating = $state(false)

  // Poll update status while an update is in flight
  const updateStatus = useCoreUpdateStatus({
    refetchInterval: () => (isUpdating ? 2000 : false),
    enabled: false
  } as never)

  const current = $derived(currentVersion.data?.version ?? null)
  const latest = $derived(latestVersion.data?.version ?? null)
  const isMihomo = $derived(currentVersion.data?.meta ?? false)

  // Update is available when both versions are known and latest > current
  const updateAvailable = $derived(
    current !== null && latest !== null && isNewerVersion(latest, current)
  )

  function isNewerVersion(candidate: string, current: string): boolean {
    const parse = (v: string) => v.replace(/^v/, '').split('.').map(Number)
    const a = parse(candidate)
    const b = parse(current)
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      const diff = (a[i] ?? 0) - (b[i] ?? 0)
      if (diff !== 0) return diff > 0
    }
    return false
  }

  async function handleUpdate() {
    isUpdating = true
    // Enable status polling
    queryClient.invalidateQueries({ queryKey: luciKeys.coreUpdateStatus })
    try {
      await updateMutation.mutateAsync()
      // Refresh current version after update
      queryClient.invalidateQueries({ queryKey: ['clash', 'version'] })
    } finally {
      isUpdating = false
    }
  }
</script>

<div class="space-y-6">
  <div>
    <h1 class="text-2xl font-semibold tracking-tight">System</h1>
    <p class="mt-1 text-sm text-muted-foreground">Core updates, logs, and diagnostics.</p>
  </div>

  <!-- Clash Core section -->
  <Card>
    <CardHeader>
      <div class="flex items-center justify-between">
        <span class="text-sm font-semibold">Clash Core</span>
        {#if updateAvailable}
          <span class="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
            Update available
          </span>
        {/if}
      </div>
    </CardHeader>
    <CardContent>
      <div class="space-y-4">
        <!-- Version rows -->
        <div class="space-y-2 text-sm">
          <div class="flex items-baseline justify-between gap-4">
            <span class="text-muted-foreground">Current</span>
            <div class="flex items-baseline gap-2">
              {#if current}
                <span class="font-medium tabular-nums">{current}</span>
                {#if isMihomo}
                  <span class="text-xs text-muted-foreground">Mihomo</span>
                {/if}
              {:else}
                <span class="text-muted-foreground">—</span>
              {/if}
            </div>
          </div>
          <div class="flex items-baseline justify-between gap-4">
            <span class="text-muted-foreground">Latest</span>
            <div class="flex items-baseline gap-2">
              {#if latestVersion.isPending}
                <span class="text-muted-foreground">Checking…</span>
              {:else if latest}
                <span class="font-medium tabular-nums">{latest}</span>
              {:else}
                <span class="text-muted-foreground">—</span>
              {/if}
            </div>
          </div>
        </div>

        <!-- Update button -->
        {#if updateAvailable || isUpdating}
          <Button
            variant="default"
            disabled={isUpdating || updateMutation.isPending}
            onclick={handleUpdate}
          >
            {#if isUpdating || updateMutation.isPending}
              Updating…
            {:else}
              Update to {latest}
            {/if}
          </Button>
        {/if}
      </div>
    </CardContent>
  </Card>

  <!-- Logs section -->
  <LogsViewer />
</div>
