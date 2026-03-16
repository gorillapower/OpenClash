<script lang="ts">
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query'
  import { router } from '$lib/router.svelte'
  import Layout from '$lib/components/Layout.svelte'
  import StatusPage from './pages/StatusPage.svelte'
  import ProfilesPage from './pages/ProfilesPage.svelte'
  import SettingsPage from './pages/SettingsPage.svelte'
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
    {:else if router.current === '/profiles'}
      <ProfilesPage />
    {:else if router.current === '/settings'}
      <SettingsPage />
    {:else if router.current === '/system'}
      <SystemPage />
    {/if}
  </Layout>
</QueryClientProvider>
