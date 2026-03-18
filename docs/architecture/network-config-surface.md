# Network Config Surface

## Purpose

Epic 3 starts by separating network runtime inputs from the firewall, DNS, and
routing implementations that consume them.

The current inherited runtime mixes:

- `uci_get_config` lookups against `clashnivo.config`
- direct `uci -q get dhcp.@dnsmasq[0]...` lookups
- ad hoc globals assigned inside `/etc/init.d/clashnivo`

That makes later network-layer rewrites harder because each module has to know
where settings come from before it can own its own behavior.

The service-owned network config surface fixes that by defining one loader:

- `clashnivo_service_network_load`

and one idempotent guard:

- `clashnivo_service_network_ensure_loaded`

## Owned Module

- `root/usr/share/clashnivo/service/network.sh`

This module is the service-owned source of network runtime inputs for later Epic
3 work.

## Current Contract

`clashnivo_service_network_load` batches reads from:

- `clashnivo.config`
- `dhcp`

It exports a normalized set of variables for active network-layer consumers:

- `CLASHNIVO_NETWORK_ENABLE`
- `CLASHNIVO_NETWORK_RUN_MODE`
- `CLASHNIVO_NETWORK_PROXY_MODE`
- `CLASHNIVO_NETWORK_PROXY_PORT`
- `CLASHNIVO_NETWORK_TPROXY_PORT`
- `CLASHNIVO_NETWORK_MIXED_PORT`
- `CLASHNIVO_NETWORK_DNS_PORT`
- `CLASHNIVO_NETWORK_HTTP_PORT`
- `CLASHNIVO_NETWORK_SOCKS_PORT`
- `CLASHNIVO_NETWORK_IPV6_ENABLE`
- `CLASHNIVO_NETWORK_IPV6_DNS`
- `CLASHNIVO_NETWORK_ENABLE_REDIRECT_DNS`
- `CLASHNIVO_NETWORK_DISABLE_UDP_QUIC`
- `CLASHNIVO_NETWORK_STACK_TYPE`
- `CLASHNIVO_NETWORK_STACK_TYPE_V6`
- `CLASHNIVO_NETWORK_CHINA_IP_ROUTE`
- `CLASHNIVO_NETWORK_CHINA_IP6_ROUTE`
- `CLASHNIVO_NETWORK_INTERFACE_NAME`
- `CLASHNIVO_NETWORK_COMMON_PORTS`
- `CLASHNIVO_NETWORK_ROUTER_SELF_PROXY`
- `CLASHNIVO_NETWORK_APPEND_WAN_DNS`
- `CLASHNIVO_NETWORK_APPEND_WAN_DNS6`
- `CLASHNIVO_NETWORK_LAN_DHCPV6`
- `CLASHNIVO_DNSMASQ_PORT`
- `CLASHNIVO_DNSMASQ_NORESOLV`
- `CLASHNIVO_DNSMASQ_RESOLVFILE`
- `CLASHNIVO_DNSMASQ_CACHESIZE`
- `CLASHNIVO_DNSMASQ_FILTER_AAAA`

The module also normalizes route-mode values for:

- `CLASHNIVO_NETWORK_CHINA_IP_ROUTE`
- `CLASHNIVO_NETWORK_CHINA_IP6_ROUTE`

so later modules do not need to repeat defensive validation.

## Initial Consumers

This ticket intentionally keeps the call-site migration small.

Current direct consumers are:

- `get_config()` in `/etc/init.d/clashnivo` for core network/runtime inputs
- `service/lifecycle.sh` for the IPv6 DHCP warning path

## Transition Rules

This module does not yet eliminate all direct `uci_get_config` usage. That is
expected at this stage.

What it does establish is:

- later firewall work should read nftables-relevant inputs from the service
  network surface
- later DNS work should read dnsmasq-relevant inputs from the service network
  surface
- later routing work should read policy-routing inputs from the service network
  surface

Direct `uci -q get dhcp...` reads in active network paths should be treated as
transition debt after this module exists.
