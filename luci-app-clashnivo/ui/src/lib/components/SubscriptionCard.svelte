<script lang="ts">
  import type { Subscription } from '$lib/api/luci'
  import { formatBytes } from '$lib/utils'
  import { Card, CardContent } from '$lib/components/ui/card'
  import { Button } from '$lib/components/ui/button'

  type Props = {
    subscription: Subscription
    onUpdate?: (name: string) => void
    onEdit?: (subscription: Subscription) => void
    onDelete?: (name: string) => void
    updating?: boolean
    disabled?: boolean
  }

  let { subscription, onUpdate, onEdit, onDelete, updating = false, disabled = false }: Props = $props()

  let confirmingDelete = $state(false)

  function formatExpiry(expiry: string): string {
    const date = new Date(expiry)
    const now = new Date()
    const diffMs = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return 'Expired'
    if (diffDays === 0) return 'Expires today'
    if (diffDays === 1) return 'Expires tomorrow'
    if (diffDays < 30) return `Expires in ${diffDays} days`
    const diffMonths = Math.floor(diffDays / 30)
    return `Expires in ${diffMonths} month${diffMonths === 1 ? '' : 's'}`
  }

  function formatLastUpdated(ts: string): string {
    const date = new Date(ts)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60_000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }

  const dataPercent = $derived(
    subscription.dataUsed !== undefined && subscription.dataTotal
      ? Math.min(100, (subscription.dataUsed / subscription.dataTotal) * 100)
      : null
  )

  const isExpired = $derived(
    subscription.expiry ? new Date(subscription.expiry) < new Date() : false
  )
</script>

<Card>
  <CardContent class="pt-5">
    <div class="space-y-3">
      <!-- Name + actions row -->
      <div class="flex items-start justify-between gap-2">
        <p class="text-sm font-medium leading-snug">{subscription.name}</p>
        <div class="flex shrink-0 items-center gap-1">
          <!-- Refresh -->
          <button
            class="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
            onclick={() => onUpdate?.(subscription.name)}
            disabled={updating || disabled}
            title="Refresh source"
            type="button"
            aria-label="Refresh {subscription.name}"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            class={updating ? 'animate-spin' : ''}
              aria-hidden="true"
            >
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
              <path d="M3 3v5h5"></path>
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path>
              <path d="M16 16h5v5"></path>
            </svg>
          </button>

          <!-- Edit -->
          <button
            class="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onclick={() => onEdit?.(subscription)}
            disabled={disabled}
            title="Edit subscription"
            type="button"
            aria-label="Edit {subscription.name}"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>

          <!-- Delete (inline confirm) -->
          {#if confirmingDelete}
            <span class="flex items-center gap-1 text-xs">
              <button
                class="rounded px-1.5 py-0.5 text-destructive transition-colors hover:bg-destructive/10 font-medium"
                onclick={() => { confirmingDelete = false; onDelete?.(subscription.name) }}
                disabled={disabled}
                type="button"
                aria-label="Confirm delete {subscription.name}"
              >
                Delete
              </button>
              <button
                class="rounded px-1.5 py-0.5 text-muted-foreground transition-colors hover:bg-muted"
                onclick={() => (confirmingDelete = false)}
                disabled={disabled}
                type="button"
                aria-label="Cancel delete"
              >
                Cancel
              </button>
            </span>
          {:else}
            <button
              class="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
              onclick={() => (confirmingDelete = true)}
              disabled={disabled}
              title="Delete subscription"
              type="button"
              aria-label="Delete {subscription.name}"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                <path d="M10 11v6"></path>
                <path d="M14 11v6"></path>
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
              </svg>
            </button>
          {/if}
        </div>
      </div>

      <!-- Meta row -->
      <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {#if subscription.expiry}
          <span class:text-destructive={isExpired} title={new Date(subscription.expiry).toLocaleDateString()}>
            {formatExpiry(subscription.expiry)}
          </span>
        {/if}
        {#if subscription.lastUpdated}
          <span>Updated {formatLastUpdated(subscription.lastUpdated)}</span>
        {/if}
      </div>

      <!-- Data quota bar -->
      {#if dataPercent !== null && subscription.dataTotal}
        <div class="space-y-1">
          <div class="flex justify-between text-xs text-muted-foreground">
            <span>{formatBytes(subscription.dataUsed ?? 0)} used</span>
            <span>{formatBytes(subscription.dataTotal)}</span>
          </div>
          <div class="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              class="h-full rounded-full bg-primary transition-all"
              class:bg-destructive={dataPercent > 90}
              style="width: {dataPercent}%"
            ></div>
          </div>
        </div>
      {/if}
    </div>
  </CardContent>
</Card>
