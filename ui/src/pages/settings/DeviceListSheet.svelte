<script lang="ts">
  import Sheet from '$lib/components/ui/sheet/sheet.svelte'
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'

  type Props = {
    open: boolean
    onClose: () => void
    mode: 'blacklist' | 'whitelist'
    ips?: string[]
    macs?: string[]
    onSave: (ips: string[], macs: string[]) => void
    isPending?: boolean
  }

  let { open, onClose, mode, ips = [], macs = [], onSave, isPending = false }: Props = $props()

  let localIps = $state<string[]>([])
  let localMacs = $state<string[]>([])
  let newIp = $state('')
  let newMac = $state('')
  let ipError = $state('')
  let macError = $state('')

  $effect(() => {
    if (open) {
      localIps = [...ips]
      localMacs = [...macs]
      newIp = ''
      newMac = ''
      ipError = ''
      macError = ''
    }
  })

  const title = $derived(mode === 'blacklist' ? 'Blacklisted Devices' : 'Whitelisted Devices')
  const description = $derived(
    mode === 'blacklist'
      ? 'These devices will bypass the proxy and connect directly.'
      : 'Only these devices will be routed through the proxy.'
  )

  function addIp() {
    const val = newIp.trim()
    if (!val) return
    if (localIps.includes(val)) {
      ipError = 'Already in the list'
      return
    }
    localIps = [...localIps, val]
    newIp = ''
    ipError = ''
  }

  function removeIp(ip: string) {
    localIps = localIps.filter((x) => x !== ip)
  }

  function addMac() {
    const val = newMac.trim()
    if (!val) return
    if (localMacs.includes(val)) {
      macError = 'Already in the list'
      return
    }
    localMacs = [...localMacs, val]
    newMac = ''
    macError = ''
  }

  function removeMac(mac: string) {
    localMacs = localMacs.filter((x) => x !== mac)
  }

  function handleIpKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addIp()
    }
  }

  function handleMacKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addMac()
    }
  }

  function handleSave() {
    onSave(localIps, localMacs)
  }
</script>

<Sheet {open} {onClose} {title}>
  <div class="space-y-6">
    <p class="text-sm text-muted-foreground">{description}</p>

    <!-- IP Addresses -->
    <section class="space-y-3">
      <h3 class="text-sm font-medium">IP Addresses</h3>

      {#if localIps.length > 0}
        <ul class="space-y-1.5" aria-label="IP address list">
          {#each localIps as ip (ip)}
            <li class="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-1.5">
              <span class="flex-1 font-mono text-sm">{ip}</span>
              <button
                type="button"
                class="rounded p-0.5 text-muted-foreground transition-colors hover:text-destructive"
                onclick={() => removeIp(ip)}
                aria-label="Remove {ip}"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </li>
          {/each}
        </ul>
      {/if}

      <div class="flex gap-2">
        <Input
          placeholder="192.168.1.x or 192.168.1.0/24"
          bind:value={newIp}
          onkeydown={handleIpKeydown}
          oninput={() => (ipError = '')}
          aria-invalid={!!ipError}
          aria-describedby={ipError ? 'ip-error' : undefined}
          class="flex-1"
        />
        <Button type="button" variant="outline" size="sm" onclick={addIp}>Add</Button>
      </div>
      {#if ipError}
        <p id="ip-error" class="text-xs text-destructive">{ipError}</p>
      {/if}
    </section>

    <!-- MAC Addresses -->
    <section class="space-y-3">
      <h3 class="text-sm font-medium">MAC Addresses</h3>

      {#if localMacs.length > 0}
        <ul class="space-y-1.5" aria-label="MAC address list">
          {#each localMacs as mac (mac)}
            <li class="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-1.5">
              <span class="flex-1 font-mono text-sm">{mac}</span>
              <button
                type="button"
                class="rounded p-0.5 text-muted-foreground transition-colors hover:text-destructive"
                onclick={() => removeMac(mac)}
                aria-label="Remove {mac}"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </li>
          {/each}
        </ul>
      {/if}

      <div class="flex gap-2">
        <Input
          placeholder="AA:BB:CC:DD:EE:FF"
          bind:value={newMac}
          onkeydown={handleMacKeydown}
          oninput={() => (macError = '')}
          aria-invalid={!!macError}
          aria-describedby={macError ? 'mac-error' : undefined}
          class="flex-1"
        />
        <Button type="button" variant="outline" size="sm" onclick={addMac}>Add</Button>
      </div>
      {#if macError}
        <p id="mac-error" class="text-xs text-destructive">{macError}</p>
      {/if}
    </section>

    <Button class="w-full" onclick={handleSave} disabled={isPending}>
      {isPending ? 'Saving…' : 'Save'}
    </Button>
  </div>
</Sheet>
