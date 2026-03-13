<script lang="ts">
  import NetworkTab from './settings/NetworkTab.svelte'

  type Tab = 'network'
  let activeTab = $state<Tab>('network')
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
        class:border-primary={activeTab === 'network'}
        class:text-foreground={activeTab === 'network'}
        class:border-transparent={activeTab !== 'network'}
        class:text-muted-foreground={activeTab !== 'network'}
        onclick={() => (activeTab = 'network')}
        type="button"
        aria-current={activeTab === 'network' ? 'page' : undefined}
      >
        Network
      </button>
    </nav>
  </div>

  {#if activeTab === 'network'}
    <NetworkTab />
  {/if}
</div>
