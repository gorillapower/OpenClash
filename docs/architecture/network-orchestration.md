# Network Orchestration

## Purpose

Epic 3 now has service-owned module boundaries for:

- network inputs
- firewall ownership
- DNS integration
- routing ownership

This ticket makes the sequencing between those concerns explicit so start, stop,
restart, and runtime-activating reload paths are not coupled only by scattered
direct helper calls.

## Owned Module

- `root/usr/share/clashnivo/service/orchestration.sh`

This module is the service-owned boundary for active network sequencing.

## Current Contract

The orchestration module exposes:

- `clashnivo_service_network_apply_runtime`
- `clashnivo_service_network_cleanup_runtime`
- `clashnivo_service_network_cleanup_firewall_only`
- `clashnivo_service_network_restore_dns_runtime`
- `clashnivo_service_network_cleanup_disabled_runtime`

## Lifecycle Ordering

Current ordering is:

### Start

1. core config and process startup completes
2. DNS runtime apply runs if redirect-DNS is enabled
3. firewall apply runs

This is owned through:

- `clashnivo_service_network_apply_runtime "start"`

### Reload: firewall/manual

1. firewall cleanup runs
2. mode/config refresh runs
3. core status check re-applies runtime firewall state

The cleanup boundary is owned through:

- `clashnivo_service_network_cleanup_firewall_only`

The apply boundary is owned through:

- `clashnivo_service_network_apply_runtime "reload"`

### Stop / revert

1. firewall cleanup runs
2. dnsmasq runtime state is restored
3. if Clash Nivo is disabled, Clash Nivo-owned dnsmasq include files are removed

These are owned through:

- `clashnivo_service_network_cleanup_runtime`
- `clashnivo_service_network_restore_dns_runtime`
- `clashnivo_service_network_cleanup_disabled_runtime`

## Idempotence Expectations

Service-owned network orchestration should be safe to execute repeatedly.

Current idempotence guarantees are:

- routing add/delete helpers check whether their owned rules/routes are already
  present before mutating them
- DNS file cleanup is safe when files are already absent
- firewall cleanup is the single cleanup boundary the lifecycle calls

Later tickets can deepen the underlying firewall and DNS internals without
changing this service-owned orchestration contract.
