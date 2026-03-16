<script lang="ts">
  import NetworkTab from './settings/NetworkTab.svelte'
  import ClashConfigTab from './settings/ClashConfigTab.svelte'

  type Tab = 'clash-config' | 'network'
  let activeTab = $state<Tab>('clash-config')
</script>

<div class="space-y-6">
  <div>
    <h1 class="text-2xl font-semibold tracking-tight">Settings</h1>
    <p class="mt-1 text-sm text-muted-foreground">Network and Clash configuration.</p>
  </div>

  <!-- Tab navigation -->
  <div class="border-b border-border">
    <nav class="-mb-px flex gap-6" aria-label="Settings sections">
      <button
        class="border-b-2 pb-3 text-sm font-medium transition-colors"
        class:border-primary={activeTab === 'clash-config'}
        class:text-foreground={activeTab === 'clash-config'}
        class:border-transparent={activeTab !== 'clash-config'}
        class:text-muted-foreground={activeTab !== 'clash-config'}
        onclick={() => (activeTab = 'clash-config')}
        type="button"
        aria-current={activeTab === 'clash-config' ? 'page' : undefined}
      >
        Clash
      </button>
      <button
        class="border-b-2 pb-3 text-sm font-medium transition-colors"
        class:border-primary={activeTab === 'network'}
        class:text-foreground={activeTab === 'network'}
        class:border-transparent={activeTab !== 'network'}
        class:text-muted-foreground={activeTab !== 'network'}
        onclick={() => (activeTab = 'network')}
        type="button"
        aria-current={activeTab === 'network' ? 'page' : undefined}
      >
        Router
      </button>
    </nav>
  </div>

  {#if activeTab === 'clash-config'}
    <ClashConfigTab />
  {:else if activeTab === 'network'}
    <NetworkTab />
  {/if}
</div>
