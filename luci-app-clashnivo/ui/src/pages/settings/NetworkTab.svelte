<script lang="ts">
  import SettingRow from '$lib/components/setting-row.svelte'
  import { Button } from '$lib/components/ui/button'
  import DeviceListSheet from './DeviceListSheet.svelte'
  import FirewallRulesSheet from './FirewallRulesSheet.svelte'
  import { useUciConfig, useSetUciConfig, useFlushDnsCache } from '$lib/queries/luci'

  // ---------------------------------------------------------------------------
  // Queries & mutations
  // ---------------------------------------------------------------------------

  const config = useUciConfig('openclash')

  const setOperationMode = useSetUciConfig('openclash', 'config', 'en_mode')
  const setUdpProxy = useSetUciConfig('openclash', 'config', 'enable_udp_proxy')
  const setStackType = useSetUciConfig('openclash', 'config', 'stack_type')
  const setDnsRedirect = useSetUciConfig('openclash', 'config', 'enable_redirect_dns')
  const setDeviceMode = useSetUciConfig('openclash', 'config', 'lan_ac_mode')
  const setBlackIps = useSetUciConfig('openclash', 'config', 'lan_ac_black_ips')
  const setBlackMacs = useSetUciConfig('openclash', 'config', 'lan_ac_black_macs')
  const setWhiteIps = useSetUciConfig('openclash', 'config', 'lan_ac_white_ips')
  const setWhiteMacs = useSetUciConfig('openclash', 'config', 'lan_ac_white_macs')
  const flushDns = useFlushDnsCache()

  // Advanced
  const setChinaBypass = useSetUciConfig('openclash', 'config', 'china_ip_route')
  const setCommonPorts = useSetUciConfig('openclash', 'config', 'common_ports')
  const setRouterSelfProxy = useSetUciConfig('openclash', 'config', 'router_self_proxy')
  const setDisableQuic = useSetUciConfig('openclash', 'config', 'disable_udp_quic')
  const setIpv6Enable = useSetUciConfig('openclash', 'config', 'ipv6_enable')
  const setIpv6Mode = useSetUciConfig('openclash', 'config', 'ipv6_mode')
  const setGatewayCompat = useSetUciConfig('openclash', 'config', 'bypass_gateway_compatible')

  // ---------------------------------------------------------------------------
  // Derived values from UCI
  // ---------------------------------------------------------------------------

  const cfg = $derived(config.data?.['config'] ?? {})

  type OpMode = 'fake-ip' | 'redir-host' | 'tun'
  const operationMode = $derived.by<OpMode>(() => {
    const raw = cfg['en_mode'] as string | undefined
    if (!raw) return 'fake-ip'
    if (raw.includes('tun')) return 'tun'
    if (raw.startsWith('redir-host')) return 'redir-host'
    return 'fake-ip'
  })

  const udpProxy = $derived((cfg['enable_udp_proxy'] as string | undefined) === '1')
  const stackType = $derived((cfg['stack_type'] as string | undefined) ?? 'gvisor')
  const dnsRedirect = $derived((cfg['enable_redirect_dns'] as string | undefined) ?? '1')

  type DeviceMode = 'all' | 'blacklist' | 'whitelist'
  const lanAcMode = $derived((cfg['lan_ac_mode'] as string | undefined) ?? '0')
  const blackIps = $derived((cfg['lan_ac_black_ips'] as string[] | undefined) ?? [])
  const blackMacs = $derived((cfg['lan_ac_black_macs'] as string[] | undefined) ?? [])
  const whiteIps = $derived((cfg['lan_ac_white_ips'] as string[] | undefined) ?? [])
  const whiteMacs = $derived((cfg['lan_ac_white_macs'] as string[] | undefined) ?? [])

  const deviceMode = $derived.by<DeviceMode>(() => {
    if (lanAcMode === '1') return 'whitelist'
    if (blackIps.length > 0 || blackMacs.length > 0) return 'blacklist'
    return 'all'
  })

  const deviceCount = $derived(
    deviceMode === 'whitelist'
      ? whiteIps.length + whiteMacs.length
      : blackIps.length + blackMacs.length
  )

  // Advanced derived values
  const COMMON_PORTS_DEFAULT =
    '21 22 23 53 80 123 143 194 443 465 587 853 993 995 998 2052 2053 2082 2083 2086 2095 2096 5222 5228 5229 5230 8080 8443 8880 8888 8889'

  const chinaBypass = $derived((cfg['china_ip_route'] as string | undefined) ?? '0')
  const commonPorts = $derived((cfg['common_ports'] as string | undefined) !== '0' && !!cfg['common_ports'])
  const routerSelfProxy = $derived((cfg['router_self_proxy'] as string | undefined) !== '0')
  const disableQuic = $derived((cfg['disable_udp_quic'] as string | undefined) !== '0')
  const ipv6Enable = $derived((cfg['ipv6_enable'] as string | undefined) === '1')
  const ipv6Mode = $derived((cfg['ipv6_mode'] as string | undefined) ?? '0')
  const gatewayCompat = $derived((cfg['bypass_gateway_compatible'] as string | undefined) === '1')

  // ---------------------------------------------------------------------------
  // Device list sheet
  // ---------------------------------------------------------------------------

  let deviceSheetOpen = $state(false)
  const sheetMode = $derived<'blacklist' | 'whitelist'>(
    deviceMode === 'whitelist' ? 'whitelist' : 'blacklist'
  )
  const sheetIps = $derived(deviceMode === 'whitelist' ? whiteIps : blackIps)
  const sheetMacs = $derived(deviceMode === 'whitelist' ? whiteMacs : blackMacs)

  const isSavingDevices = $derived(
    setBlackIps.isPending ||
      setBlackMacs.isPending ||
      setWhiteIps.isPending ||
      setWhiteMacs.isPending
  )

  // ---------------------------------------------------------------------------
  // Advanced section state
  // ---------------------------------------------------------------------------

  let advancedOpen = $state(false)
  let firewallSheetOpen = $state(false)

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  async function handleOperationModeChange(e: Event) {
    const value = (e.target as HTMLSelectElement).value as OpMode
    await setOperationMode.mutateAsync(value === 'tun' ? 'fake-ip-tun' : value)
  }

  async function handleStackTypeChange(e: Event) {
    await setStackType.mutateAsync((e.target as HTMLSelectElement).value)
  }

  async function handleDnsRedirectChange(e: Event) {
    await setDnsRedirect.mutateAsync((e.target as HTMLSelectElement).value)
  }

  async function handleDeviceModeChange(e: Event) {
    const value = (e.target as HTMLSelectElement).value as DeviceMode
    if (value === 'whitelist') {
      await setDeviceMode.mutateAsync('1')
    } else {
      await setDeviceMode.mutateAsync('0')
      if (value === 'all') {
        await setBlackIps.mutateAsync([])
        await setBlackMacs.mutateAsync([])
      }
    }
  }

  async function handleDeviceSave(ips: string[], macs: string[]) {
    if (deviceMode === 'whitelist') {
      await setWhiteIps.mutateAsync(ips)
      await setWhiteMacs.mutateAsync(macs)
    } else {
      await setBlackIps.mutateAsync(ips)
      await setBlackMacs.mutateAsync(macs)
    }
    deviceSheetOpen = false
  }

  async function handleChinaBypassChange(e: Event) {
    await setChinaBypass.mutateAsync((e.target as HTMLSelectElement).value)
  }

  async function handleIpv6ModeChange(e: Event) {
    await setIpv6Mode.mutateAsync((e.target as HTMLSelectElement).value)
  }
</script>

{#if config.isPending}
  <div class="space-y-4">
    {#each [0, 1, 2] as i (i)}
      <div class="h-28 animate-pulse rounded-lg bg-muted"></div>
    {/each}
  </div>
{:else}
  <div class="space-y-6">
    <!-- Traffic Mode -->
    <div class="space-y-1">
      <h2 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Traffic Mode
      </h2>
      <div class="divide-y divide-border rounded-lg border border-border bg-card px-4">
        <SettingRow
          label="Operation mode"
          tooltip="How the router intercepts network traffic. Fake-IP is recommended for best performance."
        >
          <select
            class="rounded-md border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            value={operationMode}
            onchange={handleOperationModeChange}
            disabled={setOperationMode.isPending}
            aria-label="Operation mode"
          >
            <option value="fake-ip">Fake-IP (recommended)</option>
            <option value="redir-host">Redir-Host</option>
            <option value="tun">TUN</option>
          </select>
        </SettingRow>

        <SettingRow
          label="UDP proxy"
          tooltip="Whether UDP traffic (gaming, voice calls) goes through the proxy."
        >
          <button
            type="button"
            role="switch"
            aria-checked={udpProxy}
            aria-label="UDP proxy"
            class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 {udpProxy
              ? 'bg-primary'
              : 'bg-muted'}"
            onclick={() => setUdpProxy.mutateAsync(udpProxy ? '0' : '1')}
            disabled={setUdpProxy.isPending}
          >
            <span
              class="pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform {udpProxy
                ? 'translate-x-4'
                : 'translate-x-0'}"
            ></span>
          </button>
        </SettingRow>

        {#if operationMode === 'tun'}
          <SettingRow
            label="TUN stack type"
            tooltip="The network stack used in TUN mode. gVisor is more compatible; system is faster."
          >
            <select
              class="rounded-md border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
              value={stackType}
              onchange={handleStackTypeChange}
              disabled={setStackType.isPending}
              aria-label="TUN stack type"
            >
              <option value="gvisor">gVisor (recommended)</option>
              <option value="system">System</option>
            </select>
          </SettingRow>
        {/if}
      </div>
    </div>

    <!-- DNS -->
    <div class="space-y-1">
      <h2 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">DNS</h2>
      <div class="divide-y divide-border rounded-lg border border-border bg-card px-4">
        <SettingRow
          label="Redirect method"
          tooltip="How DNS queries from LAN devices are captured. Dnsmasq is recommended."
        >
          <select
            class="rounded-md border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            value={dnsRedirect}
            onchange={handleDnsRedirectChange}
            disabled={setDnsRedirect.isPending}
            aria-label="DNS redirect method"
          >
            <option value="1">Dnsmasq (recommended)</option>
            <option value="0">Firewall</option>
            <option value="2">Disabled</option>
          </select>
        </SettingRow>

        <SettingRow
          label="Flush DNS cache"
          tooltip="Clears the DNS and Fake-IP caches in Clash. Useful after changing DNS settings."
        >
          <Button
            variant="outline"
            size="sm"
            onclick={() => flushDns.mutateAsync()}
            disabled={flushDns.isPending}
          >
            {flushDns.isPending ? 'Flushing…' : 'Flush'}
          </Button>
        </SettingRow>
      </div>
    </div>

    <!-- Device Control -->
    <div class="space-y-1">
      <h2 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Device Control
      </h2>
      <div class="divide-y divide-border rounded-lg border border-border bg-card px-4">
        <SettingRow
          label="Mode"
          tooltip="Control which LAN devices are routed through the proxy. 'All devices' proxies everything."
        >
          <select
            class="rounded-md border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            value={deviceMode}
            onchange={handleDeviceModeChange}
            disabled={setDeviceMode.isPending}
            aria-label="Device control mode"
          >
            <option value="all">All devices</option>
            <option value="blacklist">Blacklist</option>
            <option value="whitelist">Whitelist</option>
          </select>
        </SettingRow>

        {#if deviceMode !== 'all'}
          <SettingRow
            label={deviceMode === 'blacklist' ? 'Bypassed devices' : 'Proxied devices'}
            tooltip={deviceMode === 'blacklist'
              ? 'Devices in this list connect directly, bypassing the proxy.'
              : 'Only devices in this list are routed through the proxy.'}
          >
            <div class="flex items-center gap-3">
              {#if deviceCount > 0}
                <span class="text-xs text-muted-foreground">
                  {deviceCount}
                  {deviceCount === 1 ? 'device' : 'devices'}
                </span>
              {/if}
              <Button variant="outline" size="sm" onclick={() => (deviceSheetOpen = true)}>
                Manage
              </Button>
            </div>
          </SettingRow>
        {/if}
      </div>
    </div>

    <!-- Advanced -->
    <div class="space-y-1">
      <button
        type="button"
        class="flex w-full items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
        onclick={() => (advancedOpen = !advancedOpen)}
        aria-expanded={advancedOpen}
        aria-controls="advanced-section"
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
          class="transition-transform duration-200 {advancedOpen ? 'rotate-180' : ''}"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
        Advanced
      </button>

      {#if advancedOpen}
        <div
          id="advanced-section"
          class="divide-y divide-border rounded-lg border border-border bg-card px-4"
        >
          <!-- China bypass mode -->
          <SettingRow
            label="China bypass mode"
            tooltip="Route traffic to mainland China or overseas destinations directly, bypassing the proxy."
          >
            <select
              class="rounded-md border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
              value={chinaBypass}
              onchange={handleChinaBypassChange}
              disabled={setChinaBypass.isPending}
              aria-label="China bypass mode"
            >
              <option value="0">Disabled</option>
              <option value="1">Bypass mainland</option>
              <option value="2">Bypass overseas</option>
            </select>
          </SettingRow>

          <!-- Common ports -->
          <SettingRow
            label="Common ports only"
            tooltip="Only proxy traffic on common ports (HTTP, HTTPS, DNS, etc.). Reduces overhead for non-standard ports."
          >
            <button
              type="button"
              role="switch"
              aria-checked={commonPorts}
              aria-label="Common ports only"
              class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 {commonPorts
                ? 'bg-primary'
                : 'bg-muted'}"
              onclick={() =>
                setCommonPorts.mutateAsync(commonPorts ? '0' : COMMON_PORTS_DEFAULT)}
              disabled={setCommonPorts.isPending}
            >
              <span
                class="pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform {commonPorts
                  ? 'translate-x-4'
                  : 'translate-x-0'}"
              ></span>
            </button>
          </SettingRow>

          <!-- Router self-proxy -->
          <SettingRow
            label="Router self-proxy"
            tooltip="Route the router's own traffic through Clash. Required for stream enhancement features."
          >
            <button
              type="button"
              role="switch"
              aria-checked={routerSelfProxy}
              aria-label="Router self-proxy"
              class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 {routerSelfProxy
                ? 'bg-primary'
                : 'bg-muted'}"
              onclick={() => setRouterSelfProxy.mutateAsync(routerSelfProxy ? '0' : '1')}
              disabled={setRouterSelfProxy.isPending}
            >
              <span
                class="pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform {routerSelfProxy
                  ? 'translate-x-4'
                  : 'translate-x-0'}"
              ></span>
            </button>
          </SettingRow>

          <!-- QUIC disable -->
          <SettingRow
            label="Disable QUIC"
            tooltip="Block QUIC (UDP port 443) to force HTTPS fallback. Improves proxy compatibility with YouTube and similar services."
          >
            <button
              type="button"
              role="switch"
              aria-checked={disableQuic}
              aria-label="Disable QUIC"
              class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 {disableQuic
                ? 'bg-primary'
                : 'bg-muted'}"
              onclick={() => setDisableQuic.mutateAsync(disableQuic ? '0' : '1')}
              disabled={setDisableQuic.isPending}
            >
              <span
                class="pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform {disableQuic
                  ? 'translate-x-4'
                  : 'translate-x-0'}"
              ></span>
            </button>
          </SettingRow>

          <!-- IPv6 proxy -->
          <SettingRow
            label="IPv6 proxy"
            tooltip="Route IPv6 traffic through Clash. Requires the router to be the IPv6 gateway and DNS for LAN devices."
          >
            <div class="flex items-center gap-2">
              {#if ipv6Enable}
                <select
                  class="rounded-md border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                  value={ipv6Mode}
                  onchange={handleIpv6ModeChange}
                  disabled={setIpv6Mode.isPending}
                  aria-label="IPv6 proxy mode"
                >
                  <option value="0">TProxy</option>
                  <option value="1">Redirect</option>
                  <option value="2">TUN</option>
                  <option value="3">Mix</option>
                </select>
              {/if}
              <button
                type="button"
                role="switch"
                aria-checked={ipv6Enable}
                aria-label="IPv6 proxy"
                class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 {ipv6Enable
                  ? 'bg-primary'
                  : 'bg-muted'}"
                onclick={() => setIpv6Enable.mutateAsync(ipv6Enable ? '0' : '1')}
                disabled={setIpv6Enable.isPending}
              >
                <span
                  class="pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform {ipv6Enable
                    ? 'translate-x-4'
                    : 'translate-x-0'}"
                ></span>
              </button>
            </div>
          </SettingRow>

          <!-- Gateway compatible -->
          <SettingRow
            label="Gateway compatible"
            tooltip="Fix routing loops when running alongside another gateway. Enable if devices lose connectivity in bypass mode."
          >
            <button
              type="button"
              role="switch"
              aria-checked={gatewayCompat}
              aria-label="Gateway compatible"
              class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 {gatewayCompat
                ? 'bg-primary'
                : 'bg-muted'}"
              onclick={() => setGatewayCompat.mutateAsync(gatewayCompat ? '0' : '1')}
              disabled={setGatewayCompat.isPending}
            >
              <span
                class="pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform {gatewayCompat
                  ? 'translate-x-4'
                  : 'translate-x-0'}"
              ></span>
            </button>
          </SettingRow>

          <!-- Custom firewall rules -->
          <SettingRow
            label="Custom firewall rules"
            tooltip="Shell script rules applied after Clash loads. Use this to add custom iptables or nftables rules."
          >
            <Button
              variant="outline"
              size="sm"
              onclick={() => (firewallSheetOpen = true)}
            >
              Edit
            </Button>
          </SettingRow>
        </div>
      {/if}
    </div>
  </div>
{/if}

<DeviceListSheet
  open={deviceSheetOpen}
  onClose={() => (deviceSheetOpen = false)}
  mode={sheetMode}
  ips={sheetIps}
  macs={sheetMacs}
  onSave={handleDeviceSave}
  isPending={isSavingDevices}
/>

<FirewallRulesSheet open={firewallSheetOpen} onClose={() => (firewallSheetOpen = false)} />
