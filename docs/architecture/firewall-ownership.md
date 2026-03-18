# Firewall Ownership Module

Status: Accepted

Issue:
- #55

Epic:
- #30

## Purpose

Establish a dedicated Clash Nivo firewall module boundary before the deeper
nftables rule-body rewrite.

This ticket does not replace the inherited firewall implementation yet. It
creates one service-owned entrypoint for firewall apply/cleanup operations and
defines the Clash Nivo nftables naming contract those later rewrites must own.

## Owned Module

- `luci-app-clashnivo/root/usr/share/clashnivo/service/firewall.sh`

This module now owns:

- firewall backend identity for the rewritten service path
- nftables family/table naming constants
- Clash Nivo chain-name constants
- Clash Nivo comment naming constants
- service-owned firewall apply/cleanup wrappers

## Current Contract

The firewall module exposes:

- `clashnivo_service_firewall_init`
- `clashnivo_service_firewall_apply`
- `clashnivo_service_firewall_cleanup`
- `clashnivo_service_firewall_comment_regex`

The service environment initializes the firewall module during
`clashnivo_service_init_env`.

Active service entrypoints now route firewall ownership through:

- `clashnivo_service_firewall_apply`
- `clashnivo_service_firewall_cleanup`

instead of calling inherited firewall functions directly from service code.

## Ownership Names

The explicit Clash Nivo nftables ownership contract is:

- family: `inet`
- table: `fw4`
- chain prefix: `clashnivo`
- comment prefix: `ClashNivo`

Current chain constants exported by the module:

- `clashnivo`
- `clashnivo_output`
- `clashnivo_mangle`
- `clashnivo_mangle_output`
- `clashnivo_post`
- `clashnivo_wan_input`
- `clashnivo_dns_redirect`
- `clashnivo_upnp`
- `clashnivo_v6`
- `clashnivo_output_v6`
- `clashnivo_mangle_v6`
- `clashnivo_mangle_output_v6`

Current comment constants exported by the module:

- `ClashNivo DNS Hijack`
- `ClashNivo Bypass Gateway Compatible`

## Transition Boundary

This ticket intentionally does not move the full firewall body out of
`/etc/init.d/clashnivo`.

Still transitional after this ticket:

- `set_firewall()` remains implemented in the inherited init script
- `revert_firewall()` remains implemented in the inherited init script
- iptables fallback code still exists inside those inherited functions
- many inherited nft rules still emit `OpenClash` comments

Those are later Epic 3 rewrite targets.

## What This Ticket Changes

- service code no longer calls `set_firewall` or `revert_firewall` directly
- firewall apply/cleanup now have one service-owned boundary
- nftables ownership naming is explicit and documented
- transition grep logic for firewall cleanup now reads from the firewall module
  comment regex instead of duplicating a raw regex string

## Rules For Later Tickets

- new service-owned firewall entry logic should land in `service/firewall.sh`
- deeper nftables rule creation should converge on the documented Clash Nivo
  naming constants
- no new iptables paths should be introduced
- inherited `OpenClash` comments should be removed deliberately during later
  nftables rewrite tickets, not ad hoc
