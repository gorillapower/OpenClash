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

  const config = useUciConfig('clashnivo')

  const setDashboardType = useSetUciConfig('clashnivo', 'config', 'dashboard_type')
  const setDashboardForwardSsl = useSetUciConfig('clashnivo', 'config', 'dashboard_forward_ssl')
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
  const setGithubMirror = useSetUciConfig('clashnivo', 'config', 'github_address_mod')
  const setLogLevel = useSetUciConfig('clashnivo', 'config', 'log_level')
  const setLogSize = useSetUciConfig('clashnivo', 'config', 'log_size')
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

  const dashboardType = $derived((cfg['dashboard_type'] as string | undefined) ?? 'Official')
  const dashboardForwardSsl = $derived((cfg['dashboard_forward_ssl'] as string | undefined) === '1')
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
  const githubMirror = $derived((cfg['github_address_mod'] as string | undefined) === '1')
  const logLevel = $derived((cfg['log_level'] as string | undefined) ?? '0')
  const logSize = $derived((cfg['log_size'] as string | undefined) ?? '1024')

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
  let localLogSize = $state('')

  $effect(() => {
    localInterfaceName = interfaceName === '0' ? '' : interfaceName
    localTproxyPort = tproxyPort
    localDnsPort = dnsPort
    localLogSize = logSize
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

  async function handleDashboardTypeChange(e: Event) {
    await setDashboardType.mutateAsync((e.target as HTMLSelectElement).value)
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

  async function saveLogSize() {
    await setLogSize.mutateAsync(localLogSize.trim() || '1024')
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
      <h3 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">External dashboards</h3>
      <div class="divide-y divide-border rounded-lg border border-border bg-card px-4">
        <SettingRow
          label="Dashboard variant"
          tooltip="Choose the supported dashboard flavor used by the external UI integration."
        >
          <select class={selectClass} value={dashboardType} onchange={handleDashboardTypeChange} disabled={setDashboardType.isPending} aria-label="Dashboard variant">
            <option value="Official">Official</option>
            <option value="Meta">Meta</option>
          </select>
        </SettingRow>

        <SettingRow
          label="Dashboard forwarding SSL"
          tooltip="Serve the dashboard over HTTPS on the router. Use this only when clients expect HTTPS."
        >
          <button type="button" role="switch" aria-checked={dashboardForwardSsl} aria-label="Dashboard forwarding SSL" class={switchClasses(dashboardForwardSsl)} onclick={() => setDashboardForwardSsl.mutateAsync(dashboardForwardSsl ? '0' : '1')} disabled={setDashboardForwardSsl.isPending}>
            <span class={thumbClasses(dashboardForwardSsl)}></span>
          </button>
        </SettingRow>
      </div>
    </div>

    <div class="space-y-1">
      <h3 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Traffic mode</h3>
      <div class="divide-y divide-border rounded-lg border border-border bg-card px-4">
        <SettingRow
          label="Operation mode"
          tooltip="How the router intercepts traffic. Fake-IP is the safest default for most installs."
        >
          <select class={selectClass} value={operationMode} onchange={handleOperationModeChange} disabled={setOperationMode.isPending} aria-label="Operation mode">
            <option value="fake-ip">Fake-IP (recommended)</option>
            <option value="redir-host">Redir-Host</option>
            <option value="tun">TUN</option>
          </select>
        </SettingRow>

        <SettingRow
          label="UDP proxy"
          tooltip="Send UDP traffic such as gaming and voice traffic through Clash Nivo."
        >
          <button type="button" role="switch" aria-checked={udpProxy} aria-label="UDP proxy" class={switchClasses(udpProxy)} onclick={() => setUdpProxy.mutateAsync(udpProxy ? '0' : '1')} disabled={setUdpProxy.isPending}>
            <span class={thumbClasses(udpProxy)}></span>
          </button>
        </SettingRow>

        {#if operationMode === 'tun'}
          <SettingRow
            label="TUN stack type"
            tooltip="Choose the network stack for TUN mode. gVisor favors compatibility; system favors speed."
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
          tooltip="Route IPv6 traffic through Clash Nivo. Requires the router to own IPv6 gateway and DNS duties."
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
      <div class="divide-y divide-border rounded-lg border border-border bg-card px-4">
        <SettingRow
          label="Redirect method"
          tooltip="Choose how LAN DNS queries are captured. Dnsmasq is the safest default."
        >
          <select class={selectClass} value={dnsRedirect} onchange={handleDnsRedirectChange} disabled={setDnsRedirect.isPending} aria-label="DNS redirect method">
            <option value="1">Dnsmasq (recommended)</option>
            <option value="0">Firewall</option>
            <option value="2">Disabled</option>
          </select>
        </SettingRow>

        <SettingRow
          label="IPv6 DNS fallback"
          tooltip="Allow IPv6-aware DNS behavior when your upstream and LAN actually use IPv6."
        >
          <button type="button" role="switch" aria-checked={ipv6Dns} aria-label="IPv6 DNS fallback" class={switchClasses(ipv6Dns)} onclick={() => setIpv6Dns.mutateAsync(ipv6Dns ? '0' : '1')} disabled={setIpv6Dns.isPending}>
            <span class={thumbClasses(ipv6Dns)}></span>
          </button>
        </SettingRow>

        <SettingRow
          label="Append default DNS"
          tooltip="Keep the bundled DNS entries in the generated config alongside your selected DNS behavior."
        >
          <button type="button" role="switch" aria-checked={appendDefaultDns} aria-label="Append default DNS" class={switchClasses(appendDefaultDns)} onclick={() => setAppendDefaultDns.mutateAsync(appendDefaultDns ? '0' : '1')} disabled={setAppendDefaultDns.isPending}>
            <span class={thumbClasses(appendDefaultDns)}></span>
          </button>
        </SettingRow>

        <SettingRow
          label="Append WAN DNS"
          tooltip="Also include WAN-learned DNS servers in generated runtime DNS behavior."
        >
          <button type="button" role="switch" aria-checked={appendWanDns} aria-label="Append WAN DNS" class={switchClasses(appendWanDns)} onclick={() => setAppendWanDns.mutateAsync(appendWanDns ? '0' : '1')} disabled={setAppendWanDns.isPending}>
            <span class={thumbClasses(appendWanDns)}></span>
          </button>
        </SettingRow>

        <SettingRow
          label="Flush DNS cache"
          tooltip="Clear DNS and Fake-IP cache after DNS or routing changes."
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
          tooltip="Choose whether all devices are proxied, or manage a blacklist or whitelist."
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
          tooltip="Send the router's own traffic through Clash Nivo. Required for some unlock automation paths."
        >
          <button type="button" role="switch" aria-checked={routerSelfProxy} aria-label="Router self-proxy" class={switchClasses(routerSelfProxy)} onclick={() => setRouterSelfProxy.mutateAsync(routerSelfProxy ? '0' : '1')} disabled={setRouterSelfProxy.isPending}>
            <span class={thumbClasses(routerSelfProxy)}></span>
          </button>
        </SettingRow>

        <SettingRow
          label="Gateway compatible"
          tooltip="Enable if Clash Nivo runs behind another gateway and devices lose connectivity in bypass mode."
        >
          <button type="button" role="switch" aria-checked={gatewayCompat} aria-label="Gateway compatible" class={switchClasses(gatewayCompat)} onclick={() => setGatewayCompat.mutateAsync(gatewayCompat ? '0' : '1')} disabled={setGatewayCompat.isPending}>
            <span class={thumbClasses(gatewayCompat)}></span>
          </button>
        </SettingRow>

        <SettingRow
          label="Custom firewall rules"
          tooltip="Edit advanced firewall rules applied after Clash Nivo config is active."
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
          tooltip="Bind Clash Nivo to a specific outbound interface. Leave blank to use the default route."
        >
          <div class="flex items-center gap-2">
            <input class={inputClass} bind:value={localInterfaceName} aria-label="Interface binding" placeholder="wan" />
            <Button variant="outline" size="sm" onclick={saveInterfaceName} disabled={setInterfaceName.isPending}>Save</Button>
          </div>
        </SettingRow>

        <SettingRow
          label="TProxy port"
          tooltip="Port used for transparent proxy interception. Change only if you know another service conflicts with it."
        >
          <div class="flex items-center gap-2">
            <input class={inputClass} bind:value={localTproxyPort} aria-label="TProxy port" inputmode="numeric" />
            <Button variant="outline" size="sm" onclick={saveTproxyPort} disabled={setTproxyPort.isPending}>Save</Button>
          </div>
        </SettingRow>

        <SettingRow
          label="DNS port"
          tooltip="Port used by Clash Nivo DNS handling. Clients and router internals expect this to stay aligned."
        >
          <div class="flex items-center gap-2">
            <input class={inputClass} bind:value={localDnsPort} aria-label="DNS port" inputmode="numeric" />
            <Button variant="outline" size="sm" onclick={saveDnsPort} disabled={setDnsPort.isPending}>Save</Button>
          </div>
        </SettingRow>
      </div>
    </div>

    <div class="space-y-1">
      <h3 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Download sources and mirrors</h3>
      <div class="divide-y divide-border rounded-lg border border-border bg-card px-4">
        <SettingRow
          label="GitHub mirror modifier"
          tooltip="Use the mirror rewrite path for downloads when direct GitHub access is unreliable."
        >
          <button type="button" role="switch" aria-checked={githubMirror} aria-label="GitHub mirror modifier" class={switchClasses(githubMirror)} onclick={() => setGithubMirror.mutateAsync(githubMirror ? '0' : '1')} disabled={setGithubMirror.isPending}>
            <span class={thumbClasses(githubMirror)}></span>
          </button>
        </SettingRow>
      </div>
    </div>

    <div class="space-y-1">
      <h3 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Logs and diagnostics</h3>
      <div class="divide-y divide-border rounded-lg border border-border bg-card px-4">
        <SettingRow
          label="Log level"
          tooltip="Control how much runtime detail is written to logs. Higher levels are more verbose."
        >
          <select class={selectClass} value={logLevel} onchange={(e) => setLogLevel.mutateAsync((e.target as HTMLSelectElement).value)} disabled={setLogLevel.isPending} aria-label="Log level">
            <option value="0">Silent / default</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
            <option value="debug">Debug</option>
          </select>
        </SettingRow>

        <SettingRow
          label="Log size"
          tooltip="Maximum retained log size in KB before rotation. Higher values keep more history but use more storage."
        >
          <div class="flex items-center gap-2">
            <input class={inputClass} bind:value={localLogSize} aria-label="Log size" inputmode="numeric" />
            <Button variant="outline" size="sm" onclick={saveLogSize} disabled={setLogSize.isPending}>Save</Button>
          </div>
        </SettingRow>
      </div>
    </div>

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
