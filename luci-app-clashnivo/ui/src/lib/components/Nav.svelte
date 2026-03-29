<script lang="ts">
  import { router, type Route } from '$lib/router.svelte'
  import { theme } from '$lib/theme.svelte'
  import { useUciConfig } from '$lib/queries/luci'

  const config = useUciConfig('clashnivo')
  const controllerPort = $derived(
    ((config.data?.config as Record<string, string> | undefined)?.cn_port ?? '9093').trim() || '9093'
  )
  const dashboardUrl = $derived(`http://${window.location.hostname}:${controllerPort}/ui`)

  const navItems: { label: string; path: Route }[] = [
    { label: 'Status', path: '/' },
    { label: 'Sources', path: '/sources' },
    { label: 'Compose', path: '/compose' },
    { label: 'System', path: '/system' },
    { label: 'Logs', path: '/logs' }
  ]
</script>

<nav class="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
  <div class="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
    <div class="flex min-w-0 flex-1 items-center gap-3">
      <span class="text-sm font-semibold tracking-tight">Clash Nivo</span>

      <div class="min-w-0 flex-1 overflow-x-auto">
        <div class="flex min-w-max items-center gap-1">
          {#each navItems as item}
            <a
              href={`#${item.path}`}
              aria-current={router.current === item.path ? 'page' : undefined}
              onclick={(event) => {
                event.preventDefault()
                router.navigate(item.path)
              }}
              class="rounded-md px-3 py-1.5 text-sm transition-colors
                {router.current === item.path
                  ? 'bg-secondary font-medium text-foreground'
                  : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'}"
            >
              {item.label}
            </a>
          {/each}
        </div>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <button
        onclick={() => theme.toggle()}
        aria-label={theme.isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        data-testid="theme-toggle"
        class="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
      >
      {#if theme.isDark}
        <!-- Sun icon — shown in dark mode to switch to light -->
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" data-testid="sun-icon">
          <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
        </svg>
      {:else}
        <!-- Moon icon — shown in light mode to switch to dark -->
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" data-testid="moon-icon">
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
        </svg>
      {/if}
      </button>

      <a
        href={dashboardUrl}
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
      >
        Open Dashboard
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M7 7h10v10"/><path d="M7 17 17 7"/>
        </svg>
      </a>
    </div>
  </div>
</nav>
