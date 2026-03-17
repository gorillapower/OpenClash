# Config Composition

Status: Accepted

Issue:
- #38

## Purpose

Define the v1 Clash Nivo config composition model for subscriptions, uploaded configs, custom proxy groups, custom rules, and overwrite.

## Decision Summary

Clash Nivo v1 builds a generated active config from a selected source config plus Clash Nivo-owned composition inputs.

The product rule is:
- merge, never replace
- source configs are preserved as source material
- Clash Nivo generates a separate final runtime config for activation

Custom proxy groups, custom rules, and overwrite are first-class product features. They are not treated as ad hoc mutations of subscription files.

## Source Types

Clash Nivo supports two source config types:
- subscription-derived configs
- uploaded local configs

A source config is an imported YAML file that remains preserved as the user's original baseline for composition.

A generated active config is the runtime output produced by Clash Nivo after composition and validation.

## Ownership Model

Clash Nivo owns:
- metadata about source configs
- custom proxy group definitions
- custom rule definitions
- overwrite snippets or structured overwrite inputs
- the generated active runtime config
- preview and validation results

Clash Nivo does not treat the source subscription file itself as the place where user customizations are stored.

## Final Construction Order

The final active config construction order for v1 is:

1. load the selected source config
2. normalize it into Clash Nivo's internal composition model
3. append Clash Nivo custom proxy groups to the source `proxy-groups` list
4. prepend Clash Nivo custom rules ahead of the source `rules` list
5. apply Clash Nivo overwrite data on top of the composed config
6. validate the final composed output
7. write the generated active runtime config
8. activate that generated runtime config

This order is the contract for both backend implementation and UI preview.

## Behavior By Feature

### Subscriptions

Subscriptions are treated as refreshable config sources.

Rules:
- a subscription update replaces the stored source config for that subscription
- a subscription update does not delete or rewrite Clash Nivo-owned custom groups, rules, or overwrite inputs
- a subscription update does not directly edit the generated active config in place; the active config is regenerated from inputs
- the selected source remains selectable independently from other sources

### Uploaded Configs

Uploaded configs behave like local source configs.

Rules:
- uploaded configs participate in the same composition pipeline as subscription configs
- uploaded configs are preserved as source material
- uploaded configs may be selected as the active source for composition
- custom groups, rules, and overwrite apply consistently regardless of whether the source came from subscription or upload

### Custom Proxy Groups

Custom proxy groups are appended to the source config's `proxy-groups` list.

Rules:
- they are Clash Nivo-owned definitions, not edits to source YAML
- they must not replace the source config's existing `proxy-groups` block
- common cases should be representable through a structured form model
- advanced definitions may be represented through an advanced YAML-capable input owned by Clash Nivo
- generated group ordering must be deterministic

v1 product rule:
- append, never replace

### Custom Rules

Custom rules are prepended ahead of the source config's `rules` list.

Rules:
- they are Clash Nivo-owned definitions, not edits to source YAML
- they must preserve user-declared priority order within the custom rule set
- they must execute before source rules after composition
- advanced rule syntax may be supported through an advanced Clash Nivo-owned input

v1 product rule:
- prepend, never replace

### Overwrite

Overwrite is the highest-precedence user customization layer in v1.

Rules:
- overwrite applies after custom proxy groups and custom rules are composed
- overwrite targets the generated config model, not the stored source file on disk
- overwrite is intended for fields that do not fit the structured forms cleanly, such as advanced DNS or provider settings
- overwrite must be explicitly previewable before activation
- overwrite behavior must be deterministic and documented; silent destructive behavior is not acceptable

## Source Mutation Rules

Source subscription configs and uploaded source configs are preserved as immutable inputs from the perspective of user customization.

Explicit rules:
- Clash Nivo must not persist custom proxy groups into the source file
- Clash Nivo must not persist custom rules into the source file
- Clash Nivo must not persist overwrite results back into the source file
- subscription refresh must replace only the source artifact and related source metadata
- any normalization required for parsing must occur in memory or in generated artifacts owned by Clash Nivo, not by rewriting the user's source config as the customization store

This is a deliberate break from the fragile OpenClash behavior where customization paths could effectively destroy or obscure the original subscription intent.

## Preview And Validation

Preview is a required part of the model, not an optional UI convenience.

The system must support:
- preview of the final composed config before activation
- validation of the final composed config before activation
- actionable validation errors that identify whether the problem came from the source config, custom groups, custom rules, or overwrite

The UI may present simplified preview views, but the backend contract must support inspection of the generated full config.

## Determinism Requirements

Composition must be deterministic.

That means:
- the same selected source plus the same Clash Nivo-owned inputs must yield the same generated output
- ordering of custom groups and custom rules must be stable
- overwrite application must not depend on hidden runtime state

## Non-Goals

The v1 composition model does not promise:
- compatibility with OpenClash's legacy Ruby overwrite behavior as an architectural requirement
- destructive in-place editing of subscription files
- per-source hidden mutations that bypass the shared composition pipeline

## Notes For Later Phases

This decision sets the implementation target for:
- backend config generation
- backend preview and validation endpoints
- Settings UI for custom proxy groups, custom rules, and overwrite
- import behavior where upstream customizations may need to be mapped into Clash Nivo-owned composition inputs
