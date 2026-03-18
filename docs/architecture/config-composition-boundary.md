# Config Composition Boundary

Issue:
- #60

## Purpose

Define the service-owned config composition boundary for the generated runtime config.

## Boundary

The active composition flow is now routed through:
- `root/usr/share/clashnivo/service/composition.sh`

The service-owned entrypoint is:
- `clashnivo_service_composition_build_generated_config`

The current ordered stages are:
1. `clashnivo_service_composition_prepare_source`
2. `clashnivo_service_composition_normalize_source`
3. `clashnivo_service_composition_append_custom_proxy_groups`
4. `clashnivo_service_composition_prepend_custom_rules`
5. `clashnivo_service_composition_apply_overwrite`

## Contract Alignment

This boundary matches the accepted v1 composition contract in `docs/decision/config-composition.md`:
- source config remains the preserved input
- composition targets the generated working copy
- rules and overwrite are applied through the service-owned composition pipeline
- the ordered stages are explicit and no longer inlined in lifecycle start logic

## Source Immutability

The source config remains preserved because the pipeline starts from `config_check()`, which copies the selected source config into `TMP_CONFIG_FILE` before customization stages run.

Custom rules and overwrite continue to target `TMP_CONFIG_FILE`, not `RAW_CONFIG_FILE`.

## Transitional Constraint

The inherited `yml_groups_set.sh` and `yml_proxys_set.sh` path rewrites `proxy-groups` in place. That behavior conflicts with the accepted Clash Nivo product rule:
- append custom proxy groups
- never replace the source `proxy-groups` block

Because of that, the explicit `clashnivo_service_composition_append_custom_proxy_groups` stage is currently a no-op boundary. This is intentional.

The boundary is present now so later work can implement an append-only proxy-group composer without changing the lifecycle contract again.

## What This Ticket Does Not Do

- It does not redesign preview or validation surfaces.
- It does not replace the inherited Ruby-based overwrite implementation yet.
- It does not ship the final append-only proxy-group composer.

Those are later Epic 4 concerns.
