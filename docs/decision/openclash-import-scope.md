# OpenClash Import Scope

Status: Accepted

Issue:
- #39

## Purpose

Define what the built-in OpenClash import will migrate, transform, warn on, or skip.

## Decision Summary

Clash Nivo includes a built-in one-time import flow for users who already have OpenClash installed.

The import exists to preserve useful user-owned data while breaking runtime dependence on OpenClash.

The product rule is:
- import data once
- translate it into Clash Nivo-owned state
- do not carry forward OpenClash runtime ownership
- do not preserve OpenClash as an ongoing compatibility layer

## Import Entry Conditions

Import is intended for this state:
- OpenClash is installed, or its config/files remain on disk
- the user wants to move their configuration into Clash Nivo

Import is not intended to support:
- simultaneous active runtime ownership by OpenClash and Clash Nivo
- background synchronization between the two products
- repeated silent mirroring of OpenClash changes after migration

## Imported Items

The built-in import may import the following categories when present and readable.

### OpenClash UCI Settings With Clear v1 Equivalents

Importable when a direct or bounded mapping exists:
- primary Clash mode selections relevant to Clash Nivo v1
- operation mode selections relevant to Clash Nivo v1
- DNS redirect and DNS server selections that map to Clash Nivo's supported model
- router self-proxy and similar network options when the v1 backend supports the same behavior
- subscription definitions and associated source metadata that map cleanly to Clash Nivo-owned source records
- selected active config or selected source reference when it can be represented safely

### User-Owned Config Sources

Importable source artifacts:
- downloaded or stored subscription YAML files that represent user source configs
- uploaded local YAML configs owned by the user

These are imported as source material, not as already-composed final configs.

### Clash Nivo-Equivalent Customization Inputs

Importable when they can be represented as Clash Nivo-owned composition inputs:
- compatible custom rules
- compatible custom DNS and host lists
- compatible custom provider-like references if Clash Nivo v1 supports the same model
- compatible overwrite content that can be represented in Clash Nivo's overwrite layer

### Compatible User Assets

Importable when they are clearly user-authored and not runtime residue:
- custom list files under OpenClash custom directories
- compatible overwrite snippets
- compatible custom YAML fragments

## Transformed Items

Some imported data is valid to carry forward only after translation into Clash Nivo's model.

These items are transformed during import rather than copied verbatim.

### UCI Schema Translation

OpenClash settings are mapped into Clash Nivo-owned UCI sections and option names.

Rules:
- import writes only `clashnivo`-owned configuration after translation
- imported values must be normalized to Clash Nivo's accepted v1 schema
- values without a valid v1 representation must not be guessed silently

### Source Config Registration

Imported subscription or local YAML files are transformed into Clash Nivo source records.

Rules:
- imported files become source inputs in the Clash Nivo composition pipeline
- import does not treat an upstream generated config as the place to preserve future customization state
- any selected active config from OpenClash is translated into a selected Clash Nivo source where possible

### Customizations Into Composition Inputs

Imported OpenClash customizations are transformed into Clash Nivo-owned composition layers when possible.

Examples:
- upstream custom rule material may become Clash Nivo custom rules
- upstream overwrite content may become Clash Nivo overwrite input
- upstream custom lists may become Clash Nivo custom assets if the new backend still supports that category

### Explicitly Simplified Behavior

When OpenClash supports a broader or more implicit behavior than Clash Nivo v1, import may simplify the result.

Allowed simplification examples:
- preserving the underlying user intent while dropping unsupported legacy automation
- flattening legacy behavior into a static Clash Nivo-owned configuration artifact
- converting multi-path OpenClash customization behavior into the single Clash Nivo composition pipeline

## Warned And Skipped Items

The importer must identify unsupported or ambiguous items and report them explicitly.

### Warn And Skip

Warn and skip when:
- a setting exists but has no supported Clash Nivo v1 equivalent
- the value semantics are ambiguous or unsafe to map automatically
- the data appears partially user-authored but depends on unsupported OpenClash runtime behavior
- the data references deprecated legacy paths, helper scripts, or behavior that Clash Nivo will not preserve

### Skip Without Importing As Configuration

The following are not migrated as live configuration:
- runtime firewall state
- nftables or iptables rules currently applied by OpenClash
- dnsmasq runtime state and caches
- policy routing state and fwmarks
- process state, procd state, watchdog state, cron execution state
- logs, caches, temp files, lock files, PID files, or status snapshots
- downloaded core binaries already managed by OpenClash
- active network residue that belongs to runtime ownership rather than configuration

### Unsupported Legacy Behavior

The importer must call out unsupported legacy behavior early rather than trying to emulate it invisibly.

Examples of likely unsupported or constrained areas:
- OpenClash runtime naming and ownership conventions
- legacy Ruby-driven overwrite execution as an architectural requirement
- implicit mutation of source subscription files to store long-term customization state
- feature buckets that Clash Nivo intentionally drops from v1 product scope

## Import Report

Every import run must produce a structured report suitable for UI display and diagnostics.

The report must contain:
- whether import succeeded, partially succeeded, or failed
- whether OpenClash was detected
- which source configs were imported
- which settings were imported directly
- which items were transformed into Clash Nivo-owned equivalents
- which items were skipped
- which warnings require user review
- whether a fallback or rollback action was taken

The report should separate results into at least these categories:
- imported
- transformed
- skipped
- warnings
- errors

## Failure And Rollback Expectations

Import must be recoverable.

Rules:
- import must not destroy the user's OpenClash data before the Clash Nivo import result is known
- import must write into Clash Nivo-owned state without depending on immediate deletion of upstream data
- if import fails before Clash Nivo-owned state is valid, the user must be able to retry after correction
- partial import must be reported explicitly rather than presented as success
- rollback means preserving recoverability, not recreating OpenClash runtime state automatically

## Post-Import Boundary

After a successful import:
- Clash Nivo runs only from Clash Nivo-owned state
- the product must not continue reading OpenClash runtime state as part of normal operation
- upstream files may remain on disk until the user removes OpenClash, but they are no longer the live source of truth for Clash Nivo

## Non-Goals

The built-in import does not promise:
- exact behavioral parity with OpenClash legacy customization internals
- ongoing synchronization between OpenClash and Clash Nivo
- preservation of runtime residue or active router state
- silent guessing for unsupported or unclear settings

## Notes For Later Phases

This decision sets the implementation target for:
- import discovery logic
- import mapping and transformation rules
- UI reporting for imported, transformed, skipped, and warned items
- later handoff behavior when import is combined with runtime guard and switching flow
