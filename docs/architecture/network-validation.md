# Network Validation

## Command

Run:

```bash
bash luci-app-clashnivo/tools/validate-epic3-network.sh
```

## Purpose

This validator checks the active Epic 3 network ownership boundary after the
firewall, DNS, and routing modules were introduced.

It is intentionally narrower than a whole-runtime audit. The goal is to keep a
repeatable check on the service-owned callsites that now control network
sequencing.

## What It Checks

- `service/env.sh` sources the network orchestration module
- `service/lifecycle.sh` uses orchestration helpers instead of directly calling
  firewall or DNS helpers
- active start/reload application in `/etc/init.d/clashnivo` goes through the
  network orchestration helper
- direct `ip rule` / `ip route` mutation stays out of lifecycle and
  orchestration codepaths

## What It Does Not Check Yet

- the inherited firewall body inside `/etc/init.d/clashnivo`
- the inherited DNS mutation body inside `/etc/init.d/clashnivo`
- full nftables ownership cleanup across all later runtime paths

Those remain later rewrite work.
