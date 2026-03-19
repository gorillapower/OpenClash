# Core Artifact Source

Status: Accepted

Issue:
- #47

## Purpose

Define how Clash Nivo decides where core version metadata and downloadable core artifacts come from.

This decision exists because package updates are already project-owned, while the inherited core update path still hardcoded upstream OpenClash sources. That ambiguity is no longer acceptable once the reset `System` UI starts exposing update behavior directly.

## Decision

Clash Nivo has an explicit core artifact source mode in UCI:

- `openclash`
- `clashnivo`
- `custom`

Default:

- `openclash`

UCI fields:

- `clashnivo.config.core_source`
- `clashnivo.config.core_custom_base_url`

## Meaning Of Each Mode

### `openclash`

Use the upstream OpenClash `core` branch layout for core version metadata and downloadable core archives.

Repository:

- `vernesong/OpenClash`

### `clashnivo`

Use the Clash Nivo project-hosted `core` branch layout for core version metadata and downloadable core archives.

Repository:

- `gorillapower/OpenClash`

This mode establishes the product-owned contract even if workflow/publishing reliability still needs follow-up hardening later.

### `custom`

Use a user-provided base URL instead of a fixed GitHub repository.

Required field:

- `clashnivo.config.core_custom_base_url`

If `custom` is selected and the base URL is empty, version lookup and core download must fail clearly instead of silently falling back.

## Custom Source Contract

`custom` uses the same layout contract as the built-in GitHub-backed modes.

If:

- `core_custom_base_url=https://example.com/core`
- `release_branch=master`

Then Clash Nivo expects:

- version metadata:
  - `https://example.com/core/master/core_version`
- meta core archive:
  - `https://example.com/core/master/meta/clash-<platform>.tar.gz`
- smart core archive:
  - `https://example.com/core/master/smart/clash-<platform>.tar.gz`

This keeps the update pipeline simple:
- one mode switch
- one layout contract
- no separate ad hoc URL shapes for each operation

## CDN / Github Address Modify Interaction

`github_address_mod` remains relevant for the GitHub-backed modes:

- `openclash`
- `clashnivo`

It does not rewrite `custom` URLs.

Reason:
- `custom` is already an explicit full source policy
- additional CDN rewriting on top of a custom base URL would make behavior harder to reason about

## Service Contract Expectations

Core update surfaces should expose the chosen source policy explicitly.

At minimum, machine-readable update responses should include:

- source policy
- release branch
- resolved source base

The UI should not have to infer whether core updates come from upstream OpenClash, Clash Nivo, or a custom mirror by scraping logs.

## Current Implementation Boundary

This decision requires:

- one centralized source resolver
- core version lookup to use that resolver
- core artifact download to use that resolver

This decision does not require:

- rewriting all inherited updater internals
- redesigning package or asset update sources
- finishing the Clash Nivo `core` publishing workflows in the same ticket

Those workflow/publishing concerns remain operational follow-up work, but the runtime policy surface is now explicit.

## Why This Shape

This is the smallest design that fixes the real problem:

- the source policy is explicit
- the decision lives in one place
- the service contract can surface it cleanly
- the product can default to upstream while still supporting project-owned and custom sources

It avoids the two bad alternatives:

- pretending the fork-owned workflows are already the live truth when the runtime still downloads upstream
- leaving upstream URLs hardcoded throughout the codebase

## Review Trigger

Revisit this decision if:

- the Clash Nivo project changes where it publishes core artifacts
- the custom source contract needs signatures/checksums or a different metadata layout
- the product decides to expose per-core-source management in the UI instead of a single mode switch
