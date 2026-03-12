## Coding Philosophy

- **Optimise for the 90% case** — simplicity and predictable behaviour over completeness. Edge cases may require more manual effort; that's an accepted trade-off.
- **Progressive disclosure** — the common path should be simple and opinionated; complexity belongs in advanced flows, not bolted onto the main one.
- **Constraint-based design** — deliberate limitations are better than flexible complexity. Don't add configurability to avoid making a decision.

## Documentation Guide

Start with the broadest doc, then only drop into the deeper milestone docs when the task needs that detail.

- [`docs/architecture.md`](docs/architecture.md)
  - **Why:** This is the system-level map. It explains the two-layer model, the current codebase shape, and the overall rewrite direction.
  - **When to reference it:** Use this first when you're orienting yourself, deciding where a change belongs, or explaining how the UI, network layer, and Clash core relate to each other.

- [`docs/milestones/ui.md`](docs/milestones/ui.md)
  - **Why:** This is the product and UX decision doc for the new interface. It captures navigation, interaction patterns, progressive disclosure in the UI, and what should stay simple vs advanced.
  - **When to reference it:** Use this when working on the frontend, information architecture, copy, tooltips, settings layout, or deciding whether a UI control deserves to be visible by default.

- [`docs/milestones/network-layer.md`](docs/milestones/network-layer.md)
  - **Why:** This is the implementation plan for the router/networking rewrite: nftables, DNS hijacking, routing, service lifecycle, and shell architecture.
  - **When to reference it:** Use this when touching service startup, firewall/routing behaviour, dnsmasq integration, OpenWrt-specific plumbing, or performance/correctness trade-offs in the backend scripts.
