# Frontend Explainability Model

Status: Accepted

Issue:
- #91

## Purpose

Define how Clash Nivo should explain core product concepts in the UI without turning normal operation pages into manuals.

This document answers:
- which concepts need explicit explanation
- what belongs in lightweight in-page guidance versus a deeper explainer surface
- where explainability entrypoints should live in the UI
- how to keep explanation useful without creating visual noise

## Product Position

Clash Nivo should help users understand how the system works, not just expose settings.

But explanation must be ergonomic.
The product should not rely on dense helper blocks scattered across every page.

The explainability surface therefore has two layers:
- light contextual guidance near important actions or confusing states
- a deeper central explainer surface for cross-cutting concepts

This keeps normal operation fast while still giving motivated users a reliable way to build a correct mental model.

## Explainability Principles

### Explain Only Where Confusion Is Real

Do not add explanatory text just because a page exists.

Use explicit explanation when a user would otherwise have to guess:
- which layer owns behavior
- what an action actually changes
- why a state is blocked
- why a setting matters

### Keep The Main Path Fast

The primary page flow should stay scannable.

Normal surfaces should rely first on:
- clear page structure
- explicit labels
- consistent actions
- concise state summaries

Longer explanation belongs behind a deliberate affordance such as:
- `Learn how this works`
- `Why is this blocked?`
- `How DNS works here`

### Centralize Cross-Cutting Concepts

Some concepts are too broad for tooltip-sized help:
- source config versus generated config
- preview, validate, activate
- router DNS versus Clash DNS
- dnsmasq forwarding and DNS interception
- traffic mode and interception model
- OpenClash guard behavior
- package versus core versus assets

These should have one canonical explainer, not slightly different ad hoc versions on every page.

### Use Product Language

Explain behavior in operator language, not backend vocabulary.

Prefer:
- selected source
- generated config
- activate
- router DNS
- Clash DNS
- runtime ownership
- blocked by OpenClash

Avoid treating implementation details as product concepts:
- helper script names
- temporary paths
- raw service internals

## Explainability Layers

### Layer 1: Microcopy

Microcopy is the default layer.

Use it for:
- button labels
- section titles
- compact empty states
- inline state summaries
- short field helper text

Microcopy should do most of the explanatory work in ordinary flows.

### Layer 2: Contextual Hints

Contextual hints are short, optional, and local.

Use them when a page or section needs one extra mental-model nudge, for example:
- `Refreshing a source updates source material only. It does not rewrite custom layers.`
- `Activation makes the current validated generated config live.`
- `OpenClash must stop before Clash Nivo can take runtime ownership.`

Rules:
- one short paragraph maximum
- no repeated background explanation the user can already infer from the page
- no stacking multiple large hint blocks on one screen
- hints should support scanning, not interrupt it

### Layer 3: Linked Explainers

Linked explainers are the bridge between local UI and deeper learning.

Use them for:
- `How composition works`
- `How DNS works on the router`
- `How traffic modes differ`
- `How updates are separated`

These should open a central explainer surface rather than expanding dense prose inline everywhere.

### Layer 4: Central Explainer Surface

Clash Nivo should have one dedicated explainability surface for deeper understanding.

This may be implemented as:
- a dedicated route
- a structured panel
- a docs-like section under `System`

The exact UI container can be decided later.
What matters is that the surface is:
- intentional
- discoverable
- linkable from `Status`, `Compose`, and `System`

## Core Concepts To Explain

### 1. Source Config Versus Generated Config

Need:
- contextual hint in `Sources`
- contextual hint in `Compose`
- deeper canonical explainer

Key message:
- source configs are preserved inputs
- Clash Nivo builds a generated runtime config from the selected source plus Clash Nivo-owned layers

### 2. Preview, Validate, Activate

Need:
- contextual hint in `Compose`
- deeper canonical explainer

Key message:
- preview shows the generated result
- validate checks whether it is acceptable
- activate makes the valid generated config live

### 3. Router DNS Versus Clash DNS

Need:
- contextual hint in `System`
- deeper canonical explainer
- visual flow/diagram

Key message:
- clients usually ask the router for DNS first
- the router may forward or redirect DNS into Clash Nivo
- the generated Clash config then decides upstream DNS behavior

### 4. Traffic Interception Model

Need:
- deeper canonical explainer
- visual flow/diagram
- lighter local references from relevant `System` sections

Key message:
- traffic mode determines how router traffic is captured and sent through Clash Nivo
- router firewall, routing, and Clash runtime behavior all contribute

### 5. OpenClash Guard And Runtime Ownership

Need:
- short contextual help in `Status`
- deeper canonical explainer

Key message:
- installed OpenClash is informational
- active OpenClash blocks Clash Nivo runtime ownership

### 6. Update Domains

Need:
- local clarification in `System`
- deeper canonical explainer

Key message:
- package updates the app
- core updates the runtime binary
- assets refresh supporting datasets

## Placement Rules

### Status

Use for:
- short operational clarification
- blocked-state explanation
- links to deeper explainers when runtime ownership or service state is confusing

Do not use `Status` for:
- long architecture text
- multi-paragraph DNS or routing explanation

### Sources

Use for:
- short clarification that refresh changes source material only
- link to deeper source-versus-generated explainer

### Compose

Use for:
- short clarification of preview / validate / activate
- link to deeper composition explainer

### System

Use for:
- short clarification of router-facing behavior
- local DNS or traffic hints only where needed
- links to deeper DNS and traffic explainers

Do not turn `System` into a prose-heavy knowledge base page by default.

## Content Density Rules

These rules are explicit because the current UI already showed the risk of over-explaining:

- empty states should usually be title-only
- helper text should be brief and consequence-focused
- contextual hints should be rare and compact
- if explanation needs more than a short paragraph, link out to the deeper explainer
- repeated concepts should be linked, not re-explained from scratch on every page

## Recommended Initial Explainer Structure

The first central explainer surface should cover:

1. `How Clash Nivo builds the active config`
2. `How activation works`
3. `How DNS works on the router`
4. `How traffic reaches Clash Nivo`
5. `Why OpenClash can block Clash Nivo`
6. `What package, core, and assets updates each do`

Each section should use:
- product-language summary first
- optional visual steps or simple diagrams
- technical detail only after the summary

## Implementation Guidance

The next implementation steps should be split:

1. calibrate the existing contextual-help pattern so it becomes lighter and more selective
2. add stable `Learn more` style entrypoints from the key pages
3. build the central explainability surface

This keeps short-term UI ergonomics improving while preserving the longer-term product goal of making Clash understandable.

