# DNS Integration Module

## Purpose

Epic 3 introduces a service-owned DNS boundary so dnsmasq mutation and Clash Nivo DNS include files are no longer defined only by the init script.

This ticket does not complete the full DNS/network rewrite. It establishes ownership and service entrypoints that later tickets can continue to absorb.

## Owned Module

- `root/usr/share/clashnivo/service/dns.sh`

The module owns:

- dnsmasq apply flow
- dnsmasq restore flow
- Clash Nivo dnsmasq include file cleanup
- saved dnsmasq server list handoff for restore

## Owned Paths

The DNS module manages these Clash Nivo-owned dnsmasq include files:

- `dnsmasq_clashnivo_custom_domain.conf`
- `dnsmasq_clashnivo_chnroute_pass.conf`
- `dnsmasq_clashnivo_chnroute6_pass.conf`

These are exposed through:

- `CLASHNIVO_DNS_DNSMASQ_CONF_DIR`
- `CLASHNIVO_DNS_CUSTOM_DOMAIN_CONF`
- `CLASHNIVO_DNS_CHNROUTE_PASS_CONF`
- `CLASHNIVO_DNS_CHNROUTE6_PASS_CONF`

## Service Entry Points

The stable service-owned DNS entrypoints are:

- `clashnivo_service_dns_apply`
- `clashnivo_service_dns_restore`
- `clashnivo_service_dns_restore_runtime_state`
- `clashnivo_service_dns_cleanup_files`

## Cleanup Expectations

DNS cleanup means:

- remove Clash Nivo dnsmasq include files
- restore saved dnsmasq server / resolv / cache / AAAA state where applicable
- restart dnsmasq after apply and restore

Cleanup does not imply broader firewall or routing rollback. Those remain owned by their respective modules.

## Transitional Boundary

This module is intentionally scoped to dnsmasq integration and dns-facing state handling.

It does not yet:

- redesign nftables DNS redirect logic
- redesign routing behavior
- remove all inherited downstream helper naming

Those follow in later Epic 3 and Epic 4 work.
