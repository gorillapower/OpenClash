# Product Boundary

Status: Accepted

Issue:
- #35

## Purpose

Define the Clash Nivo product boundary and coexistence policy with installed OpenClash.

## Decisions

### Product Shape

- Clash Nivo is shipped as a single user-facing install package.
- The product is internally separated into three concerns:
  - UI
  - runtime/service
  - built-in import tooling
- Internal separation is an implementation rule, not a packaging requirement for users.

### Relationship To OpenClash

- OpenClash and Clash Nivo may both be installed on the same router.
- Clash Nivo does not support shared runtime ownership with OpenClash.
- Clash Nivo is not an OpenClash-compatible runtime mode and does not preserve ongoing runtime compatibility with upstream internals.

### Runtime Ownership Rule

- Only one product may control router networking at a time.
- "Control router networking" includes ownership of:
  - firewall and nftables state
  - dnsmasq integration and DNS hijack behavior
  - policy routing and TPROXY state
  - service lifecycle for the active proxy backend
  - related generated runtime state
- If OpenClash is active, Clash Nivo must not start its runtime.
- If Clash Nivo is active, the product must not proceed as if OpenClash can remain an active peer runtime.

### Allowed States

- Clash Nivo installed, OpenClash not installed
- Clash Nivo installed and active, OpenClash absent or installed but inactive
- OpenClash installed and active, Clash Nivo installed but inactive
- OpenClash installed, Clash Nivo installed, both inactive

### Disallowed States

- OpenClash active and Clash Nivo active at the same time
- Any mode where both products attempt to own firewall, DNS, routing, or proxy runtime simultaneously
- Any Clash Nivo feature that depends on continued live reads from OpenClash runtime state after import

### Import Policy

- Clash Nivo includes a built-in one-time import flow for existing OpenClash users.
- Import exists to carry forward user data, not to preserve runtime coupling.
- Import may read OpenClash configuration and compatible user assets once, translate them into Clash Nivo-owned state, and then exit.
- Import is not a background service, not a daemon, and not an ongoing synchronization mechanism.
- After import, Clash Nivo runtime behavior is based on Clash Nivo-owned configuration only.

### Compatibility Boundary

- Clash Nivo may support import from OpenClash.
- Clash Nivo does not support:
  - long-term runtime coexistence with OpenClash
  - ongoing config synchronization with OpenClash
  - continued use of `openclash` namespaced runtime ownership as part of the target architecture

### Documentation And Ticketing Rule

- Later implementation tickets must treat this document as the source of truth for:
  - installed coexistence policy
  - runtime ownership exclusivity
  - built-in import positioning
- If a later ticket needs to change one of these rules, it must update this decision first instead of silently changing code behavior.

## Notes

- This decision intentionally allows installed coexistence because users may want to keep an existing OpenClash installation on-device while evaluating or migrating to Clash Nivo.
- This decision intentionally forbids simultaneous runtime ownership because router networking is a singleton system resource on OpenWrt.
