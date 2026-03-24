<script lang="ts">
  import SettingRow from '$lib/components/setting-row.svelte'
  import { Button } from '$lib/components/ui/button'
  import DeviceListSheet from '../../pages/settings/DeviceListSheet.svelte'
  import FirewallRulesSheet from '../../pages/settings/FirewallRulesSheet.svelte'
  import {
    useFlushDnsCache,
    useSetUciConfig,
    useUciConfig
  } from '$lib/queries/luci'

  let { showDownloadSourceSection = true }: { showDownloadSourceSection?: boolean } = $props()

  const config = useUciConfig('clashnivo')

  const setOperationMode = useSetUciConfig('clashnivo', 'config', 'en_mode')
  const setUdpProxy = useSetUciConfig('clashnivo', 'config', 'enable_udp_proxy')
  const setStackType = useSetUciConfig('clashnivo', 'config', 'stack_type')
  const setDnsRedirect = useSetUciConfig('clashnivo', 'config', 'enable_redirect_dns')
  const setIpv6Dns = useSetUciConfig('clashnivo', 'config', 'ipv6_dns')
  const setAppendDefaultDns = useSetUciConfig('clashnivo', 'config', 'append_default_dns')
  const setAppendWanDns = useSetUciConfig('clashnivo', 'config', 'append_wan_dns')
  const setChinaBypass = useSetUciConfig('clashnivo', 'config', 'china_ip_route')
  const setCommonPorts = useSetUciConfig('clashnivo', 'config', 'common_ports')
  const setRouterSelfProxy = useSetUciConfig('clashnivo', 'config', 'router_self_proxy')
  const setDisableQuic = useSetUciConfig('clashnivo', 'config', 'disable_udp_quic')
  const setIpv6Enable = useSetUciConfig('clashnivo', 'config', 'ipv6_enable')
  const setIpv6Mode = useSetUciConfig('clashnivo', 'config', 'ipv6_mode')
  const setGatewayCompat = useSetUciConfig('clashnivo', 'config', 'bypass_gateway_compatible')
  const setDeviceMode = useSetUciConfig('clashnivo', 'config', 'lan_ac_mode')
  const setBlackIps = useSetUciConfig('clashnivo', 'config', 'lan_ac_black_ips')
  const setBlackMacs = useSetUciConfig('clashnivo', 'config', 'lan_ac_black_macs')
  const setWhiteIps = useSetUciConfig('clashnivo', 'config', 'lan_ac_white_ips')
  const setWhiteMacs = useSetUciConfig('clashnivo', 'config', 'lan_ac_white_macs')
  const setInterfaceName = useSetUciConfig('clashnivo', 'config', 'interface_name')
  const setTproxyPort = useSetUciConfig('clashnivo', 'config', 'tproxy_port')
  const setDnsPort = useSetUciConfig('clashnivo', 'config', 'dns_port')
  const setControllerPort = useSetUciConfig('clashnivo', 'config', 'cn_port')
  const flushDns = useFlushDnsCache()

  const cfg = $derived(config.data?.config ?? {})

  type OpMode = 'fake-ip' | 'redir-host' | 'tun'
  type DeviceMode = 'all' | 'blacklist' | 'whitelist'

  const selectClass =
    'rounded-md border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50'
  const inputClass =
    'rounded-md border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50'
  const COMMON_PORTS_DEFAULT =
    '21 22 23 53 80 123 143 194 443 465 587 853 993 995 998 2052 2053 2082 2083 2086 2095 2096 5222 5228 5229 5230 8080 8443 8880 8888 8889'

  const operationMode = $derived.by<OpMode>(() => {
    const raw = cfg['en_mode'] as string | undefined
    if (!raw || raw === '0') return 'fake-ip'
    if (raw.includes('tun')) return 'tun'
    if (raw.startsWith('redir-host')) return 'redir-host'
    return 'fake-ip'
  })
  const udpProxy = $derived((cfg['enable_udp_proxy'] as string | undefined) === '1')
  const stackType = $derived((cfg['stack_type'] as string | undefined) ?? 'gvisor')
  const dnsRedirect = $derived((cfg['enable_redirect_dns'] as string | undefined) ?? '1')
  const ipv6Dns = $derived((cfg['ipv6_dns'] as string | undefined) === '1')
  const appendDefaultDns = $derived((cfg['append_default_dns'] as string | undefined) === '1')
  const appendWanDns = $derived((cfg['append_wan_dns'] as string | undefined) === '1')
  const chinaBypass = $derived((cfg['china_ip_route'] as string | undefined) ?? '0')
  const commonPorts = $derived((cfg['common_ports'] as string | undefined) !== '0' && !!cfg['common_ports'])
  const routerSelfProxy = $derived((cfg['router_self_proxy'] as string | undefined) !== '0')
  const disableQuic = $derived((cfg['disable_udp_quic'] as string | undefined) !== '0')
  const ipv6Enable = $derived((cfg['ipv6_enable'] as string | undefined) === '1')
  const ipv6Mode = $derived((cfg['ipv6_mode'] as string | undefined) ?? '0')
  const gatewayCompat = $derived((cfg['bypass_gateway_compatible'] as string | undefined) === '1')
  const lanAcMode = $derived((cfg['lan_ac_mode'] as string | undefined) ?? '0')
  const blackIps = $derived((cfg['lan_ac_black_ips'] as string[] | undefined) ?? [])
  const blackMacs = $derived((cfg['lan_ac_black_macs'] as string[] | undefined) ?? [])
  const whiteIps = $derived((cfg['lan_ac_white_ips'] as string[] | undefined) ?? [])
  const whiteMacs = $derived((cfg['lan_ac_white_macs'] as string[] | undefined) ?? [])
  const interfaceName = $derived((cfg['interface_name'] as string | undefined) ?? '0')
  const tproxyPort = $derived((cfg['tproxy_port'] as string | undefined) ?? '7895')
  const dnsPort = $derived((cfg['dns_port'] as string | undefined) ?? '7874')
  const controllerPort = $derived((cfg['cn_port'] as string | undefined) ?? '9093')

  const deviceMode = $derived.by<DeviceMode>(() => {
    if (lanAcMode === '1') return 'whitelist'
    if (blackIps.length > 0 || blackMacs.length > 0) return 'blacklist'
    return 'all'
  })
  const deviceCount = $derived(
    deviceMode === 'whitelist' ? whiteIps.length + whiteMacs.length : blackIps.length + blackMacs.length
  )

  let deviceSheetOpen = $state(false)
  let firewallSheetOpen = $state(false)
  let localInterfaceName = $state('')
  let localTproxyPort = $state('')
  let localDnsPort = $state('')
  let localControllerPort = $state('')

  $effect(() => {
    localInterfaceName = interfaceName === '0' ? '' : interfaceName
    localTproxyPort = tproxyPort
    localDnsPort = dnsPort
    localControllerPort = controllerPort
  })

  function switchClasses(on: boolean) {
    return `relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${on ? 'bg-primary' : 'bg-muted'}`
  }

  function thumbClasses(on: boolean) {
    return `pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform ${on ? 'translate-x-4' : 'translate-x-0'}`
  }

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

  async function handleChinaBypassChange(e: Event) {
    await setChinaBypass.mutateAsync((e.target as HTMLSelectElement).value)
  }

  async function handleIpv6ModeChange(e: Event) {
    await setIpv6Mode.mutateAsync((e.target as HTMLSelectElement).value)
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

  async function saveInterfaceName() {
    await setInterfaceName.mutateAsync(localInterfaceName.trim() || '0')
  }

  async function saveTproxyPort() {
    await setTproxyPort.mutateAsync(localTproxyPort.trim() || '7895')
  }

  async function saveDnsPort() {
    await setDnsPort.mutateAsync(localDnsPort.trim() || '7874')
  }

  async function saveControllerPort() {
    await setControllerPort.mutateAsync(localControllerPort.trim() || '9093')
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
    <div>
      <h2 class="text-sm font-semibold">Advanced runtime and maintenance</h2>
      <p class="mt-1 text-sm text-muted-foreground">
        Grouped operator controls for dashboards, traffic handling, DNS, LAN policy, ports, mirrors,
        and diagnostics.
      </p>
    </div>

    <div class="space-y-1">
      <h3 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Traffic mode</h3>
      <div class="divide-y divide-border rounded-lg border border-border bg-card px-4">
        <SettingRow
          label="Operation mode"
          tooltip="Changes how the router hands traffic to Clash Nivo. Fake-IP is the safest default for most installs; use Redir-Host or TUN only if you specifically need their behavior."
        >
          <select class={selectClass} value={operationMode} onchange={handleOperationModeChange} disabled={setOperationMode.isPending} aria-label="Operation mode">
            <option value="fake-ip">Fake-IP (recommended)</option>
            <option value="redir-host">Redir-Host</option>
            <option value="tun">TUN</option>
          </select>
        </SettingRow>

        <SettingRow
          label="UDP proxy"
          tooltip="Routes UDP traffic such as gaming or voice traffic through Clash Nivo. Leave it on only if you need UDP proxied and your setup handles it reliably."
        >
          <button type="button" role="switch" aria-checked={udpProxy} aria-label="UDP proxy" class={switchClasses(udpProxy)} onclick={() => setUdpProxy.mutateAsync(udpProxy ? '0' : '1')} disabled={setUdpProxy.isPending}>
            <span class={thumbClasses(udpProxy)}></span>
          </button>
        </SettingRow>

        {#if operationMode === 'tun'}
          <SettingRow
            label="TUN stack type"
            tooltip="Only applies in TUN mode. gVisor is the safer default for compatibility; System is faster but can be less forgiving."
          >
            <select class={selectClass} value={stackType} onchange={handleStackTypeChange} disabled={setStackType.isPending} aria-label="TUN stack type">
              <option value="gvisor">gVisor (recommended)</option>
              <option value="system">System</option>
            </select>
          </SettingRow>
        {/if}

        <SettingRow
          label="China bypass mode"
          tooltip="Direct-route either mainland or overseas traffic instead of sending it through the proxy."
        >
          <select class={selectClass} value={chinaBypass} onchange={handleChinaBypassChange} disabled={setChinaBypass.isPending} aria-label="China bypass mode">
            <option value="0">Disabled</option>
            <option value="1">Bypass mainland</option>
            <option value="2">Bypass overseas</option>
          </select>
        </SettingRow>

        <SettingRow
          label="Common ports only"
          tooltip="Only proxy common ports to reduce interception overhead on unusual traffic."
        >
          <button type="button" role="switch" aria-checked={commonPorts} aria-label="Common ports only" class={switchClasses(commonPorts)} onclick={() => setCommonPorts.mutateAsync(commonPorts ? '0' : COMMON_PORTS_DEFAULT)} disabled={setCommonPorts.isPending}>
            <span class={thumbClasses(commonPorts)}></span>
          </button>
        </SettingRow>

        <SettingRow
          label="Disable QUIC"
          tooltip="Block UDP 443 to force HTTPS fallback when some services bypass the proxy over QUIC."
        >
          <button type="button" role="switch" aria-checked={disableQuic} aria-label="Disable QUIC" class={switchClasses(disableQuic)} onclick={() => setDisableQuic.mutateAsync(disableQuic ? '0' : '1')} disabled={setDisableQuic.isPending}>
            <span class={thumbClasses(disableQuic)}></span>
          </button>
        </SettingRow>

        <SettingRow
          label="IPv6 proxy"
          tooltip="Routes IPv6 traffic through Clash Nivo instead of leaving it direct. Only enable this when the router is actually handling IPv6 gateway and DNS duties for your LAN."
        >
          <div class="flex items-center gap-2">
            {#if ipv6Enable}
              <select class={selectClass} value={ipv6Mode} onchange={handleIpv6ModeChange} disabled={setIpv6Mode.isPending} aria-label="IPv6 proxy mode">
                <option value="0">TProxy</option>
                <option value="1">Redirect</option>
                <option value="2">TUN</option>
                <option value="3">Mix</option>
              </select>
            {/if}
            <button type="button" role="switch" aria-checked={ipv6Enable} aria-label="IPv6 proxy" class={switchClasses(ipv6Enable)} onclick={() => setIpv6Enable.mutateAsync(ipv6Enable ? '0' : '1')} disabled={setIpv6Enable.isPending}>
              <span class={thumbClasses(ipv6Enable)}></span>
            </button>
          </div>
        </SettingRow>
      </div>
    </div>

    <div class="space-y-1">
      <h3 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">DNS behavior</h3>
      <div class="px-1 text-xs text-muted-foreground">
        These controls affect router and runtime DNS behavior, not just the source YAML.
      </div>
      <div class="divide-y divide-border rounded-lg border border-border bg-card px-4">
        <SettingRow
          label="Redirect method"
          tooltip="Controls how LAN DNS reaches Clash Nivo. Dnsmasq is the safest default for most routers; Firewall is lower-level and should only be used if you know you need it."
        >
          <select class={selectClass} value={dnsRedirect} onchange={handleDnsRedirectChange} disabled={setDnsRedirect.isPending} aria-label="DNS redirect method">
            <option value="1">Dnsmasq (recommended)</option>
            <option value="0">Firewall</option>
            <option value="2">Disabled</option>
          </select>
        </SettingRow>

        <SettingRow
          label="IPv6 DNS fallback"
          tooltip="Allows IPv6-aware DNS behavior in Clash Nivo. Use it only when your upstream DNS and LAN clients actually rely on IPv6."
        >
          <button type="button" role="switch" aria-checked={ipv6Dns} aria-label="IPv6 DNS fallback" class={switchClasses(ipv6Dns)} onclick={() => setIpv6Dns.mutateAsync(ipv6Dns ? '0' : '1')} disabled={setIpv6Dns.isPending}>
            <span class={thumbClasses(ipv6Dns)}></span>
          </button>
        </SettingRow>

        <SettingRow
          label="Append default DNS"
          tooltip="Keeps Clash Nivo's bundled DNS entries in the generated config alongside the DNS behavior coming from your source and runtime settings."
        >
          <button type="button" role="switch" aria-checked={appendDefaultDns} aria-label="Append default DNS" class={switchClasses(appendDefaultDns)} onclick={() => setAppendDefaultDns.mutateAsync(appendDefaultDns ? '0' : '1')} disabled={setAppendDefaultDns.isPending}>
            <span class={thumbClasses(appendDefaultDns)}></span>
          </button>
        </SettingRow>

        <SettingRow
          label="Append WAN DNS"
          tooltip="Adds the router's WAN-learned DNS servers to the generated runtime DNS list. Use this only if you want the router WAN resolvers available to Clash Nivo."
        >
          <button type="button" role="switch" aria-checked={appendWanDns} aria-label="Append WAN DNS" class={switchClasses(appendWanDns)} onclick={() => setAppendWanDns.mutateAsync(appendWanDns ? '0' : '1')} disabled={setAppendWanDns.isPending}>
            <span class={thumbClasses(appendWanDns)}></span>
          </button>
        </SettingRow>

        <SettingRow
          label="Flush DNS cache"
          tooltip="Clears cached DNS and Fake-IP state inside Clash Nivo. Useful after DNS, routing, or mode changes when old resolution data is getting in the way."
        >
          <Button variant="outline" size="sm" onclick={() => flushDns.mutateAsync()} disabled={flushDns.isPending}>
            {flushDns.isPending ? 'Flushing…' : 'Flush'}
          </Button>
        </SettingRow>
      </div>
    </div>

    <div class="space-y-1">
      <h3 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">LAN and compatibility</h3>
      <div class="divide-y divide-border rounded-lg border border-border bg-card px-4">
        <SettingRow
          label="Device access mode"
          tooltip="Controls which LAN devices are sent through Clash Nivo. Use All devices as the normal default, or switch to a blacklist or whitelist when only some devices should be affected."
        >
          <select class={selectClass} value={deviceMode} onchange={handleDeviceModeChange} disabled={setDeviceMode.isPending} aria-label="Device access mode">
            <option value="all">All devices</option>
            <option value="blacklist">Blacklist</option>
            <option value="whitelist">Whitelist</option>
          </select>
        </SettingRow>

        {#if deviceMode !== 'all'}
          <SettingRow
            label={deviceMode === 'blacklist' ? 'Bypassed devices' : 'Proxied devices'}
            tooltip={deviceMode === 'blacklist' ? 'Devices in this list connect directly.' : 'Only devices in this list are routed through Clash Nivo.'}
          >
            <div class="flex items-center gap-3">
              {#if deviceCount > 0}
                <span class="text-xs text-muted-foreground">{deviceCount} {deviceCount === 1 ? 'device' : 'devices'}</span>
              {/if}
              <Button variant="outline" size="sm" onclick={() => (deviceSheetOpen = true)}>Manage</Button>
            </div>
          </SettingRow>
        {/if}

        <SettingRow
          label="Router self-proxy"
          tooltip="Sends the router's own traffic through Clash Nivo instead of leaving it direct. Enable it only when router-originated traffic needs to follow the proxy path."
        >
          <button type="button" role="switch" aria-checked={routerSelfProxy} aria-label="Router self-proxy" class={switchClasses(routerSelfProxy)} onclick={() => setRouterSelfProxy.mutateAsync(routerSelfProxy ? '0' : '1')} disabled={setRouterSelfProxy.isPending}>
            <span class={thumbClasses(routerSelfProxy)}></span>
          </button>
        </SettingRow>

        <SettingRow
          label="Gateway compatible"
          tooltip="Use this when Clash Nivo sits behind another gateway and bypass traffic starts breaking or looping. Leave it off in a normal single-gateway setup."
        >
          <button type="button" role="switch" aria-checked={gatewayCompat} aria-label="Gateway compatible" class={switchClasses(gatewayCompat)} onclick={() => setGatewayCompat.mutateAsync(gatewayCompat ? '0' : '1')} disabled={setGatewayCompat.isPending}>
            <span class={thumbClasses(gatewayCompat)}></span>
          </button>
        </SettingRow>

        <SettingRow
          label="Custom firewall rules"
          tooltip="Advanced post-start firewall rules for edge cases. Leave this alone unless you know exactly which router rule you need to add."
        >
          <Button variant="outline" size="sm" onclick={() => (firewallSheetOpen = true)}>Edit</Button>
        </SettingRow>
      </div>
    </div>

    <div class="space-y-1">
      <h3 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ports and interfaces</h3>
      <div class="divide-y divide-border rounded-lg border border-border bg-card px-4">
        <SettingRow
          label="Interface binding"
          tooltip="Forces Clash Nivo to use a specific outbound interface. Leave it blank unless the default route is wrong for your setup."
        >
          <div class="flex items-center gap-2">
            <input class={inputClass} bind:value={localInterfaceName} aria-label="Interface binding" placeholder="wan" />
            <Button variant="outline" size="sm" onclick={saveInterfaceName} disabled={setInterfaceName.isPending}>Save</Button>
          </div>
        </SettingRow>

        <SettingRow
          label="TProxy port"
          tooltip="The transparent proxy port Clash Nivo listens on. Change it only when another service is already using the default port."
        >
          <div class="flex items-center gap-2">
            <input class={inputClass} bind:value={localTproxyPort} aria-label="TProxy port" inputmode="numeric" />
            <Button variant="outline" size="sm" onclick={saveTproxyPort} disabled={setTproxyPort.isPending}>Save</Button>
          </div>
        </SettingRow>

        <SettingRow
          label="DNS port"
          tooltip="The DNS port Clash Nivo listens on. Change it only if you also understand the router-side DNS wiring that depends on it."
        >
          <div class="flex items-center gap-2">
            <input class={inputClass} bind:value={localDnsPort} aria-label="DNS port" inputmode="numeric" />
            <Button variant="outline" size="sm" onclick={saveDnsPort} disabled={setDnsPort.isPending}>Save</Button>
          </div>
        </SettingRow>

        <SettingRow
          label="Controller port"
          tooltip="The Clash core API port used for status checks, dashboard access, and runtime control. Change this if the router already serves another app on the current port."
        >
          <div class="flex items-center gap-2">
            <input class={inputClass} bind:value={localControllerPort} aria-label="Controller port" inputmode="numeric" />
            <Button variant="outline" size="sm" onclick={saveControllerPort} disabled={setControllerPort.isPending}>Save</Button>
          </div>
        </SettingRow>
      </div>
    </div>

    {#if showDownloadSourceSection}
      <div class="space-y-1">
        <h3 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Download sources and mirrors</h3>
        <div class="divide-y divide-border rounded-lg border border-border bg-card px-4">
          <SettingRow
            label="Download source"
            tooltip="Controls how Clash Nivo selects GitHub-backed download sources for core, package, asset, and managed rule fetches."
          >
            <p class="text-xs text-muted-foreground">Download source controls now live in the Core runtime panel above.</p>
          </SettingRow>
        </div>
      </div>
    {/if}

    <DeviceListSheet
      open={deviceSheetOpen}
      onClose={() => (deviceSheetOpen = false)}
      mode={deviceMode === 'whitelist' ? 'whitelist' : 'blacklist'}
      ips={deviceMode === 'whitelist' ? whiteIps : blackIps}
      macs={deviceMode === 'whitelist' ? whiteMacs : blackMacs}
      onSave={handleDeviceSave}
      isPending={setBlackIps.isPending || setBlackMacs.isPending || setWhiteIps.isPending || setWhiteMacs.isPending}
    />

    <FirewallRulesSheet open={firewallSheetOpen} onClose={() => (firewallSheetOpen = false)} />
  </div>
{/if}
