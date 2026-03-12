<script lang="ts">
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query'
  import { Button } from '$lib/components/ui/button'

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 10_000,
        retry: 1
      }
    }
  })

  const routerUrl = import.meta.env.VITE_ROUTER_URL ?? 'http://192.168.1.1'
  const proxyPrefixes = ['/cgi-bin', '/rpc', '/api']

  function openRouter() {
    window.open(routerUrl, '_blank', 'noopener,noreferrer')
  }
</script>

<QueryClientProvider client={queryClient}>
<main class="min-h-screen bg-background text-foreground">
  <div class="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-6 py-12 lg:px-10">
    <header class="flex flex-col gap-4">
      <span class="inline-flex w-fit items-center rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
        Phase 0 foundation
      </span>
      <div class="space-y-3">
        <h1 class="text-4xl font-semibold tracking-tight sm:text-5xl">Clash Nivo</h1>
        <p class="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
          A Svelte 5 frontend scaffold for the next-generation OpenClash experience, built
          to ship as static LuCI assets.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <Button onclick={openRouter}>Open router target</Button>
        <code class="rounded-md border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
          base: /luci-static/clash-nivo/
        </code>
      </div>
    </header>

    <section class="grid gap-4 md:grid-cols-3">
      <article class="rounded-xl border border-border bg-card p-6 shadow-sm">
        <p class="text-sm font-medium text-muted-foreground">Framework</p>
        <h2 class="mt-2 text-xl font-semibold">Svelte 5 + Vite</h2>
        <p class="mt-3 text-sm leading-6 text-muted-foreground">
          Small, fast, and easy to ship into the LuCI static asset pipeline.
        </p>
      </article>

      <article class="rounded-xl border border-border bg-card p-6 shadow-sm">
        <p class="text-sm font-medium text-muted-foreground">Styling</p>
        <h2 class="mt-2 text-xl font-semibold">Tailwind CSS v4</h2>
        <p class="mt-3 text-sm leading-6 text-muted-foreground">
          Tailwind is wired through the Vite plugin and ready for shadcn-svelte patterns.
        </p>
      </article>

      <article class="rounded-xl border border-border bg-card p-6 shadow-sm">
        <p class="text-sm font-medium text-muted-foreground">Serving model</p>
        <h2 class="mt-2 text-xl font-semibold">Static dist output</h2>
        <p class="mt-3 text-sm leading-6 text-muted-foreground">
          Production builds emit files into <code>ui/dist</code> for LuCI to serve.
        </p>
      </article>
    </section>

    <section class="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div class="space-y-2">
          <h2 class="text-xl font-semibold">Dev proxy defaults</h2>
          <p class="text-sm leading-6 text-muted-foreground">
            Set <code>VITE_ROUTER_URL</code> to point Vite at your router while keeping the
            browser on localhost during development.
          </p>
        </div>
        <code class="rounded-md border border-border bg-secondary px-3 py-2 text-sm text-secondary-foreground">
          {routerUrl}
        </code>
      </div>

      <ul class="mt-5 flex flex-wrap gap-3">
        {#each proxyPrefixes as prefix}
          <li class="rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
            {prefix}
          </li>
        {/each}
      </ul>
    </section>
  </div>
</main>
</QueryClientProvider>
