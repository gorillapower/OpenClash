<script lang="ts">
  import { router, type Route } from '$lib/router.svelte'

  const dashboardUrl = `http://${window.location.hostname}:9090/ui`

  const navItems: { label: string; path: Route }[] = [
    { label: 'Status', path: '/' },
    { label: 'Profiles', path: '/profiles' },
    { label: 'Settings', path: '/settings' },
    { label: 'System', path: '/system' }
  ]
</script>

<nav class="sticky top-0 z-10 border-b border-border bg-background">
  <div class="mx-auto flex h-14 max-w-5xl items-center gap-6 px-6">
    <span class="text-sm font-semibold tracking-tight">Clash Nivo</span>

    <div class="flex items-center gap-1">
      {#each navItems as item}
        <a
          href="#{item.path}"
          aria-current={router.current === item.path ? 'page' : undefined}
          class="rounded-md px-3 py-1.5 text-sm transition-colors
            {router.current === item.path
              ? 'bg-secondary font-medium text-foreground'
              : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'}"
        >
          {item.label}
        </a>
      {/each}
    </div>

    <div class="flex-1"></div>

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
</nav>
