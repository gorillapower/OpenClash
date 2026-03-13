<script lang="ts">
  import SettingRow from '$lib/components/setting-row.svelte'
</script>

<div class="space-y-6">
  <div>
    <h1 class="text-2xl font-semibold tracking-tight">Settings</h1>
    <p class="mt-1 text-sm text-muted-foreground">Network and Clash configuration.</p>
  </div>

  <!-- Network tab -->
  <div class="space-y-1">
    <h2 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      Traffic Mode
    </h2>
    <div class="rounded-lg border border-border bg-card divide-y divide-border">
      <SettingRow
        label="Operation Mode"
        tooltip="How the router intercepts network traffic. Fake-IP is recommended for best performance."
      >
        <select class="rounded-md border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
          <option value="fake-ip">Fake-IP (recommended)</option>
          <option value="redir-host">Redir-Host</option>
          <option value="tun">TUN</option>
        </select>
      </SettingRow>

      <SettingRow
        label="UDP Proxy"
        tooltip="Whether UDP traffic (gaming, voice calls) goes through the proxy."
      >
        <button
          type="button"
          role="switch"
          aria-checked="false"
          aria-label="UDP Proxy"
          class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span class="pointer-events-none inline-block h-4 w-4 translate-x-0 rounded-full bg-background shadow-sm transition-transform" aria-hidden="true"></span>
        </button>
      </SettingRow>
    </div>
  </div>

  <div class="space-y-1">
    <h2 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">DNS</h2>
    <div class="rounded-lg border border-border bg-card divide-y divide-border">
      <SettingRow
        label="DNS Redirect"
        tooltip="How DNS queries from LAN devices are captured. Dnsmasq is recommended."
      >
        <select class="rounded-md border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
          <option value="dnsmasq">Dnsmasq (recommended)</option>
          <option value="firewall">Firewall</option>
          <option value="disabled">Disabled</option>
        </select>
      </SettingRow>
    </div>
  </div>

  <div class="space-y-1">
    <h2 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      Device Control
    </h2>
    <div class="rounded-lg border border-border bg-card divide-y divide-border">
      <SettingRow
        label="LAN Device Control"
        tooltip="Choose which devices on your network are proxied. Whitelist: only listed devices. Blacklist: all except listed."
      >
        <select class="rounded-md border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
          <option value="all">All devices</option>
          <option value="whitelist">Whitelist</option>
          <option value="blacklist">Blacklist</option>
        </select>
      </SettingRow>
    </div>
  </div>
</div>

