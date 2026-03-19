<script lang="ts">
  import type { ConfigFile } from '$lib/api/luci'

  type Props = {
    config: ConfigFile
    onSelect?: (name: string) => void
    onEdit?: (config: ConfigFile) => void
    onDownload?: (name: string) => void
    onDelete?: (name: string) => void
    selecting?: boolean
  }

  let { config, onSelect, onEdit, onDownload, onDelete, selecting = false }: Props = $props()

  let confirmingSelect = $state(false)
  let confirmingDelete = $state(false)

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  function formatDate(ts: string): string {
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  }

  function handleSelect() {
    if (config.active) return
    confirmingSelect = true
  }

  function confirmSelect() {
    confirmingSelect = false
    onSelect?.(config.name)
  }
</script>

<div
  class="flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors {config.active ? 'border-primary bg-primary/5' : 'border-border'}"
  data-active={config.active}
>
  <!-- Active indicator dot -->
  <div class="shrink-0">
    {#if config.active}
      <div class="h-2 w-2 rounded-full bg-primary" title="Active config" aria-label="Active"></div>
    {:else}
      <div class="h-2 w-2 rounded-full bg-muted-foreground/30"></div>
    {/if}
  </div>

  <!-- File info -->
  <div class="min-w-0 flex-1">
    <div class="flex items-center gap-2">
      <span class="truncate text-sm font-medium">{config.name}</span>
      {#if config.active}
        <span class="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">Active</span>
      {/if}
    </div>
    {#if config.size !== undefined || config.lastModified}
      <p class="mt-0.5 text-xs text-muted-foreground">
        {#if config.size !== undefined}{formatSize(config.size)}{/if}
        {#if config.size !== undefined && config.lastModified} · {/if}
        {#if config.lastModified}{formatDate(config.lastModified)}{/if}
      </p>
    {/if}
  </div>

  <!-- Actions -->
  <div class="flex shrink-0 items-center gap-1">
    {#if confirmingSelect}
      <!-- Select confirmation -->
      <span class="flex items-center gap-1.5 text-xs">
        <span class="text-muted-foreground">Use this as the selected source.</span>
        <button
          class="rounded px-1.5 py-0.5 font-medium text-primary transition-colors hover:bg-primary/10"
          onclick={confirmSelect}
          type="button"
          aria-label="Confirm select {config.name}"
          disabled={selecting}
        >
          Select
        </button>
        <button
          class="rounded px-1.5 py-0.5 text-muted-foreground transition-colors hover:bg-muted"
          onclick={() => (confirmingSelect = false)}
          type="button"
          aria-label="Cancel source selection"
        >
          Cancel
        </button>
      </span>
    {:else if confirmingDelete}
      <!-- Delete confirmation -->
      <span class="flex items-center gap-1.5 text-xs">
        <button
          class="rounded px-1.5 py-0.5 font-medium text-destructive transition-colors hover:bg-destructive/10"
          onclick={() => { confirmingDelete = false; onDelete?.(config.name) }}
          type="button"
          aria-label="Confirm delete {config.name}"
        >
          Delete
        </button>
        <button
          class="rounded px-1.5 py-0.5 text-muted-foreground transition-colors hover:bg-muted"
          onclick={() => (confirmingDelete = false)}
          type="button"
          aria-label="Cancel delete"
        >
          Cancel
        </button>
      </span>
    {:else}
      <!-- Select -->
      {#if !config.active}
        <button
          class="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
          onclick={handleSelect}
          disabled={selecting}
          title="Select source"
          type="button"
          aria-label="Select source {config.name}"
        >
          <!-- Check/arrow icon -->
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M20 6 9 17l-5-5"/>
          </svg>
        </button>
      {/if}

      <!-- Edit -->
      <button
        class="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        onclick={() => onEdit?.(config)}
        title="Edit config"
        type="button"
        aria-label="Edit {config.name}"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>

      <!-- Download -->
      <button
        class="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        onclick={() => onDownload?.(config.name)}
        title="Download config"
        type="button"
        aria-label="Download {config.name}"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
      </button>

      <!-- Delete -->
      <button
        class="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
        onclick={() => (confirmingDelete = true)}
        title="Delete config"
        type="button"
        aria-label="Delete {config.name}"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          <path d="M10 11v6"/>
          <path d="M14 11v6"/>
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
        </svg>
      </button>
    {/if}
  </div>
</div>
