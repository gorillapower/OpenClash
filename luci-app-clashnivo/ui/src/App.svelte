<script lang="ts">
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query'
  import { router } from '$lib/router.svelte'
  import Layout from '$lib/components/Layout.svelte'
  import StatusPage from './pages/StatusPage.svelte'
  import SourcesPage from './pages/SourcesPage.svelte'
  import ComposePage from './pages/ComposePage.svelte'
  import LogsPage from './pages/LogsPage.svelte'
  import SystemPage from './pages/SystemPage.svelte'

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 10_000,
        retry: 1
      }
    }
  })
</script>

<QueryClientProvider client={queryClient}>
  <Layout>
    {#if router.current === '/'}
      <StatusPage />
    {:else if router.current === '/sources'}
      <SourcesPage />
    {:else if router.current === '/compose'}
      <ComposePage />
    {:else if router.current === '/logs'}
      <LogsPage />
    {:else if router.current === '/system'}
      <SystemPage />
    {/if}
  </Layout>
</QueryClientProvider>
