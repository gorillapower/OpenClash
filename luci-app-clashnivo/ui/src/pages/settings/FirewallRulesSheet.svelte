<script lang="ts">
  import Sheet from '$lib/components/ui/sheet/sheet.svelte'
  import { Button } from '$lib/components/ui/button'
  import { useFirewallRules, useSetFirewallRules } from '$lib/queries/luci'

  type Props = {
    open: boolean
    onClose: () => void
  }

  let { open, onClose }: Props = $props()

  const query = useFirewallRules()
  const mutation = useSetFirewallRules()

  let localContent = $state('')

  $effect(() => {
    if (open && query.data !== undefined) {
      localContent = query.data.content
    }
  })

  async function handleSave() {
    await mutation.mutateAsync(localContent)
    onClose()
  }
</script>

<Sheet {open} {onClose} title="Custom Firewall Rules">
  <div class="flex h-full flex-col gap-4">
    <p class="text-sm text-muted-foreground">
      Shell script rules applied after Clash loads. Supports IPv4 and IPv6 iptables/nftables commands.
    </p>

    {#if query.isPending}
      <div class="h-64 animate-pulse rounded-md bg-muted"></div>
    {:else}
      <textarea
        class="min-h-64 flex-1 resize-none rounded-md border border-border bg-background p-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        placeholder="# Add custom iptables/nftables rules here&#10;# Example: iptables -I FORWARD -p tcp --dport 22 -j ACCEPT"
        bind:value={localContent}
      ></textarea>
    {/if}

    <div class="flex justify-end gap-2">
      <Button variant="outline" onclick={onClose} disabled={mutation.isPending}>
        Cancel
      </Button>
      <Button
        onclick={handleSave}
        disabled={query.isPending || mutation.isPending}
      >
        {mutation.isPending ? 'Saving…' : 'Save'}
      </Button>
    </div>
  </div>
</Sheet>
