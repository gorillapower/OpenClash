<script lang="ts">
  import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query'
  import { luciRpc } from '$lib/api/luci'
  import { luciKeys } from '$lib/queries/luci'
  import Button from '$lib/components/ui/button/button.svelte'
  import { Card, CardContent, CardHeader } from '$lib/components/ui/card/index'

  type Tab = 'clashnivo' | 'core'

  const POLL_INTERVAL = 5000
  const LINE_OPTIONS = [100, 250, 500] as const
  const TAB_META: Record<Tab, { label: string; path: string }> = {
    clashnivo: { label: 'ClashNivo', path: '/tmp/clashnivo.log' },
    core: { label: 'Clash Core', path: '/tmp/clash.log' },
  }

  let activeTab = $state<Tab>('clashnivo')
  let lines = $state<(typeof LINE_OPTIONS)[number]>(100)
  let paused = $state(false)
  let userScrolled = $state(false)
  let logEl = $state<HTMLPreElement | null>(null)

  const queryClient = useQueryClient()

  const serviceLog = createQuery(() => ({
    queryKey: luciKeys.logService(lines),
    queryFn: () => luciRpc.logService(lines),
    refetchInterval: !paused && activeTab === 'clashnivo' ? POLL_INTERVAL : false,
    retry: false,
  }))

  const coreLog = createQuery(() => ({
    queryKey: luciKeys.logCore(lines),
    queryFn: () => luciRpc.logCore(lines),
    refetchInterval: !paused && activeTab === 'core' ? POLL_INTERVAL : false,
    retry: false,
  }))

  const activeLog = $derived(
    activeTab === 'core'
      ? coreLog
      : {
          isPending: serviceLog.isPending,
          isError: serviceLog.isError,
        },
  )
  const logText = $derived.by(() => (activeTab === 'core' ? (coreLog.data ?? '') : (serviceLog.data ?? '')))
  const clearLog = createMutation(() => ({
    mutationFn: async () => {
      if (activeTab === 'core') {
        await luciRpc.clearLog('core')
        return
      }
      await luciRpc.clearLog('service')
      await luciRpc.clearLog('updates')
    },
    onSuccess: () => {
      userScrolled = false
      refresh()
    },
  }))

  function scrollToBottom() {
    if (logEl) logEl.scrollTop = logEl.scrollHeight
  }

  function onLogScroll() {
    if (!logEl) return
    const distFromBottom = logEl.scrollHeight - logEl.scrollTop - logEl.clientHeight
    userScrolled = distFromBottom > 10
  }

  $effect(() => {
    // Re-run whenever logText changes; auto-scroll if user is at the bottom
    logText
    if (!userScrolled) requestAnimationFrame(() => scrollToBottom())
  })

  function switchTab(tab: Tab) {
    activeTab = tab
    userScrolled = false
  }

  function refresh() {
    queryClient.invalidateQueries({
      queryKey:
        activeTab === 'core' ? luciKeys.logCore(lines) : luciKeys.logService(lines),
    })
  }

  function jumpToBottom() {
    userScrolled = false
    scrollToBottom()
  }
</script>

<Card class="xl:min-h-[42rem]">
  <CardHeader>
    <div class="flex flex-wrap items-center justify-between gap-2">
      <!-- Tab switcher -->
      <div class="flex rounded-md bg-muted p-1">
        {#each (['clashnivo', 'core'] as Tab[]) as tab (tab)}
          <button
            onclick={() => switchTab(tab)}
            class="rounded px-3 py-1 text-xs font-medium transition-colors {activeTab === tab
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'}"
          >
            {TAB_META[tab].label}
          </button>
        {/each}
      </div>

      <!-- Controls -->
      <div class="flex items-center gap-2">
        <select
          bind:value={lines}
          onchange={() => (userScrolled = false)}
          class="rounded-sm border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {#each LINE_OPTIONS as n (n)}
            <option value={n}>{n} lines</option>
          {/each}
        </select>

        <Button variant="ghost" size="sm" onclick={refresh} class="h-7 px-2 text-xs">
          Refresh
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onclick={() => clearLog.mutate()}
          disabled={clearLog.isPending}
          class="h-7 px-2 text-xs"
        >
          {clearLog.isPending ? 'Clearing…' : 'Clear'}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onclick={() => (paused = !paused)}
          class="h-7 px-2 text-xs"
        >
          {paused ? 'Resume' : 'Pause'}
        </Button>
      </div>
    </div>
  </CardHeader>

  <CardContent>
    <div class="mb-3 text-xs text-muted-foreground">
      <span class="font-medium text-foreground">{TAB_META[activeTab].label}</span>
      <span class="ml-2 font-mono">{TAB_META[activeTab].path}</span>
    </div>

    <div class="relative">
      <pre
        data-testid="log-output"
        bind:this={logEl}
        onscroll={onLogScroll}
        class="h-[28rem] overflow-y-auto rounded-sm bg-muted p-3 font-mono text-xs leading-relaxed text-foreground sm:h-[32rem] xl:h-[40rem] 2xl:h-[46rem]"
      >{#if activeLog.isPending}<span class="text-muted-foreground">Loading…</span>{:else if activeLog.isError}<span class="text-destructive">Failed to load logs.</span>{:else if !logText.trim()}<span class="text-muted-foreground">No log output yet.</span>{:else}{logText}{/if}</pre>

      {#if userScrolled}
        <button
          onclick={jumpToBottom}
          class="absolute bottom-3 right-3 rounded-sm bg-background/90 px-2 py-1 text-xs text-muted-foreground shadow-sm ring-1 ring-border hover:text-foreground"
        >
          ↓ Jump to bottom
        </button>
      {/if}
    </div>
  </CardContent>
</Card>
