# Routing Ownership

## Purpose

Epic 3 introduces a service-owned routing boundary for Clash Nivo policy-routing and
TUN route setup/cleanup. This keeps route identity and lifecycle decisions under
`/usr/share/clashnivo/service/` instead of leaving them scattered across the init
script.

## Owned Routing Identities

Clash Nivo currently owns these routing identifiers through
`root/usr/share/clashnivo/service/routing.sh`:

- firewall mark: `0x162`
- route table: `0x162`
- preferred rule priority for TUN routes: `1888`
- TUN device name: `utun`

These are exported as:

- `CLASHNIVO_ROUTING_FWMARK`
- `CLASHNIVO_ROUTING_TABLE`
- `CLASHNIVO_ROUTING_PREF`
- `CLASHNIVO_ROUTING_TUN_DEVICE`

The inherited `PROXY_FWMARK` and `PROXY_ROUTE_TABLE` variables remain available as
compatibility aliases, but the service-owned values are the source of truth.

## Service-Owned Entry Points

The routing module currently owns these entry points:

- `clashnivo_service_routing_apply_local_ipv4`
- `clashnivo_service_routing_apply_local_ipv6`
- `clashnivo_service_routing_cleanup_local_ipv4`
- `clashnivo_service_routing_cleanup_local_ipv6`
- `clashnivo_service_routing_apply_tun_ipv4`
- `clashnivo_service_routing_apply_tun_ipv6`
- `clashnivo_service_routing_cleanup_tun_ipv4`
- `clashnivo_service_routing_cleanup_tun_ipv6`
- `clashnivo_service_routing_cleanup_tun_core_table_ipv6`
- `clashnivo_service_routing_tun_route_present`

## Current Scope

This ticket does not fully rewrite the inherited TPROXY rule construction.
`/etc/init.d/clashnivo` still contains the larger routing/firewall orchestration
logic, but active policy-routing setup and cleanup now route through the service
module.

That means:

- nftables and iptables TPROXY rule bodies remain transitional
- route identity and route add/delete call sites are now centralized
- later tickets can move more of the orchestration into the routing module without
  changing the ownership contract again

## Cleanup Expectations

Clash Nivo cleanup is expected to remove:

- IPv4 local policy-route entries for table `0x162`
- IPv6 local policy-route entries for table `0x162`
- IPv4 TUN default-route entries for table `0x162`
- IPv6 TUN default-route entries for table `0x162`

The special IPv6 table `2022` cleanup is treated as transitional core-side TUN
cleanup and is wrapped by the routing module so the init script no longer owns
that raw command directly.
