# Config Composition

Status: Accepted

Issue:
- #38
- #64

## Purpose

Define the v1 Clash Nivo config composition model for subscriptions, uploaded configs, custom proxies, rule providers, custom proxy groups, custom rules, and overwrite.

## Decision Summary

Clash Nivo v1 builds a generated active config from a selected source config plus Clash Nivo-owned composition inputs.

The product rule is:
- merge, never replace
- source configs are preserved as source material
- Clash Nivo generates a separate final runtime config for activation

Custom proxies, rule providers, custom proxy groups, custom rules, and overwrite are first-class product features. They are not treated as ad hoc mutations of subscription files.

## Source Types

Clash Nivo supports two source config types:
- subscription-derived configs
- uploaded local configs

A source config is an imported YAML file that remains preserved as the user's original baseline for composition.

A generated active config is the runtime output produced by Clash Nivo after composition and validation.

## Ownership Model

Clash Nivo owns:
- metadata about source configs
- custom proxy definitions
- custom rule provider definitions
- custom proxy group definitions
- custom rule definitions
- overwrite snippets or structured overwrite inputs
- the generated active runtime config
- preview and validation results

Clash Nivo does not treat the source subscription file itself as the place where user customizations are stored.

## Final Construction Order

The target final active config construction order for v1 is:

1. load the selected source config
2. normalize it into Clash Nivo's internal composition model
3. append Clash Nivo custom proxies to the source `proxies` list
4. append Clash Nivo rule providers to the source `rule-providers` map
5. append Clash Nivo custom proxy groups to the source `proxy-groups` list
6. prepend Clash Nivo custom rules ahead of the source `rules` list
7. apply Clash Nivo overwrite data on top of the composed config
8. validate the final composed output
9. write the generated active runtime config
10. activate that generated runtime config

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

### Custom Proxies

Custom proxies are Clash Nivo-owned server definitions appended to the selected source config's `proxies` list.

Rules:
- they are first-class composition inputs, not edits to source YAML
- they may be referenced by Clash Nivo custom proxy groups
- they may be referenced by overwrite content after composition
- they must not replace or mutate the source config's existing `proxies` block
- generated proxy ordering must be deterministic

v1 product rule:
- append, never replace

### Rule Providers

Rule providers are Clash Nivo-owned provider definitions appended to the generated config model before custom proxy groups and custom rules are resolved.

Rules:
- they are first-class composition inputs, not edits to source YAML
- they may be referenced by Clash Nivo custom proxy groups or overwrite content
- they must not replace or mutate the source config's existing `rule-providers` block
- generated provider ordering must be deterministic

v1 product rule:
- append, never replace

### Custom Proxy Groups

Custom proxy groups are appended to the source config's `proxy-groups` list.

Rules:
- they are Clash Nivo-owned definitions, not edits to source YAML
- they must not replace the source config's existing `proxy-groups` block
- they may reference effective source proxies, Clash Nivo custom proxies, effective source proxy groups, earlier Clash Nivo custom proxy groups, and effective rule providers when the selected group type supports those references
- common cases should be representable through a structured form model
- advanced definitions may be represented through an advanced YAML-capable input owned by Clash Nivo
- generated group ordering must be deterministic

v1 product rule:
- append, never replace

### Custom Rules

Custom rules are prepended ahead of the source config's `rules` list.

Rules:
- they are Clash Nivo-owned definitions, not edits to source YAML
- they may target effective source proxy groups or effective Clash Nivo custom proxy groups
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
- Clash Nivo must not persist custom proxies into the source file
- Clash Nivo must not persist rule providers into the source file
- Clash Nivo must not persist custom proxy groups into the source file
- Clash Nivo must not persist custom rules into the source file
- Clash Nivo must not persist overwrite results back into the source file
- subscription refresh must replace only the source artifact and related source metadata
- any normalization required for parsing must occur in memory or in generated artifacts owned by Clash Nivo, not by rewriting the user's source config as the customization store

This is a deliberate break from the fragile OpenClash behavior where customization paths could effectively destroy or obscure the original subscription intent.

## Scoping Model

Custom composition inputs support explicit scope.

Supported scope modes:
- `all`
- `selected`

The following input types support scoping:
- custom proxies
- rule providers
- custom proxy groups
- custom rules

Rules:
- `all` means the input participates in composition for every selected source config
- `selected` means the input participates only when the active source config is one of the input's declared targets
- overwrite remains a generated-config layer and is not modeled as a per-object scoped list in v1
- scope membership must be explicit in Clash Nivo-owned metadata; it must not be inferred from source file names or provider URLs
- an input outside the active source config's effective scope is ignored for that composition run
- switching the selected source config is allowed even when other stored customizations target different configs
- only the effective inputs for the currently selected source participate in composition, preview, validation, and activation

Selected-scope targets may be represented by Clash Nivo source identifiers, not by direct mutation of source YAML.

## Effective Layer Ordering

When both `all` and `selected` inputs are effective for the same composition run, Clash Nivo resolves them in deterministic scope order.

Rules:
- custom proxies are appended in this order:
  1. all-scope proxies
  2. selected-scope proxies
- rule providers are appended in this order:
  1. all-scope providers
  2. selected-scope providers
- custom proxy groups are appended in this order:
  1. all-scope groups
  2. selected-scope groups
- custom rules are prepended in this order:
  1. selected-scope rules
  2. all-scope rules

Within each scope bucket, user-defined order is preserved.

This gives specific rules higher precedence while keeping append-only object layers predictable.

## Reference Resolution

Reference resolution is performed against the effective object graph for the selected source config.

The effective object graph consists of:
- source objects present after normalization
- effective Clash Nivo custom proxies
- effective Clash Nivo rule providers
- effective Clash Nivo custom proxy groups
- effective Clash Nivo custom rules

Rules:
- custom rules may reference only effective proxy groups
- a custom object may reference only objects whose scope is equal to or broader than its own effective scope
- a global custom object must not depend on a selected-scope object
- custom rules that reference a missing group are validation errors
- custom proxy groups may reference only effective proxies, effective proxy groups, or effective rule providers supported by that group definition
- custom proxy groups may reference earlier custom proxy groups in the same resolved order, but must not depend on forward references to later custom groups
- custom proxy groups that reference missing proxies, missing groups, or missing providers are validation errors
- inputs outside the active source config's scope are excluded before reference resolution

Missing references are not ignored silently and are not auto-created.

## Collision Policy

Clash Nivo does not silently replace named source objects with Clash Nivo-owned objects.

Rules:
- a custom proxy name must not collide with any effective source proxy name
- a custom proxy name must not collide with any effective proxy group name
- a custom rule provider name must not collide with any effective source rule provider name
- a custom proxy group name must not collide with any effective source proxy group name
- a custom proxy group name must not collide with any effective proxy name
- two effective Clash Nivo custom objects of the same type must not share the same name
- two effective Clash Nivo custom objects from different scopes must not collide after scope resolution
- collisions are validation errors
- overwrite remains the explicit escape hatch for advanced users; collision rejection applies to the structured composition layers

This policy is intentionally strict because silent replacement would make composition unpredictable.

## Preview And Validation

Preview is a required part of the model, not an optional UI convenience.

The system must support:
- preview of the final composed config before activation
- validation of the final composed config before activation
- actionable validation errors that identify whether the problem came from the source config, custom proxies, rule providers, custom groups, custom rules, or overwrite

Preview and validation must attribute failures clearly for:
- scope exclusion vs effective participation
- scope incompatibility between dependent objects
- name collisions
- missing references
- invalid generated YAML after overwrite

The UI may present simplified preview views, but the backend contract must support inspection of the generated full config.

## Determinism Requirements

Composition must be deterministic.

That means:
- the same selected source plus the same Clash Nivo-owned inputs must yield the same generated output
- ordering of custom proxies, rule providers, custom groups, and custom rules must be stable
- scope resolution must be stable
- collision handling must be stable
- missing-reference handling must be stable
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
- Settings UI for custom proxies, rule providers, custom proxy groups, custom rules, and overwrite
- import behavior where upstream customizations may need to be mapped into Clash Nivo-owned composition inputs
