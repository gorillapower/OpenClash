# Subscription Refresh Boundary

Issue:
- #62

## Purpose

Define the service-owned boundary for subscription source refresh so the UI and scheduled update paths stop depending directly on inherited downloader scripts.

## Boundary

Clash Nivo now owns subscription refresh through a service module:
- `root/usr/share/clashnivo/service/subscription.sh`

The public service entrypoints are:
- `/etc/init.d/clashnivo refresh_source <name-or-path>`
- `/etc/init.d/clashnivo refresh_sources`

The inherited downloader remains a transitional implementation detail behind that boundary:
- `/usr/share/clashnivo/openclash.sh`

## Refresh Contract

Subscription refresh is a source-layer operation.

It may replace:
- stored source YAML artifacts under `/etc/clashnivo/config/`
- source metadata associated with the subscription record

It must not rewrite or delete Clash Nivo-owned customization layers:
- custom proxy groups
- custom rules
- overwrite inputs
- preview outputs
- validation reports
- generated runtime config outputs

## Refresh Failure Contract

Subscription refresh is best-effort and may fail for reasons outside Clash Nivo control.

Examples:
- temporary network failure
- provider-side rate limiting
- expired short-lived subscription URLs
- conversion endpoint failure
- invalid refreshed payload

When refresh fails:
- the last successfully stored source artifact remains the source of truth
- the refresh path must not delete or truncate the previous source artifact
- the generated runtime config remains untouched
- Clash Nivo-owned customization layers remain untouched

This is especially important for providers that issue short-lived import URLs. If the source file was successfully materialized before the URL expired, later refresh failure must not destroy that usable source artifact.

## Active Code Paths

The active code paths that now route through the service boundary are:
- LuCI backend subscription refresh calls
- first-run source download from `config_choose()`
- scheduled auto-refresh cron entries

This keeps the downloader implementation centralized behind the service contract even though the inherited script still performs the actual fetch.

## Async Behavior

Refresh entrypoints are asynchronous.

The service emits immediate JSON describing the accepted refresh request and the source-layer scope, then launches the inherited downloader in the background.

Current response fields include:
- `accepted`
- `mode`
- `target_name`
- `source_path`
- `refresh_scope`
- `generated_runtime_preserved`
- `custom_layers_preserved`
- `async`

## Selected Source Implications

If a refreshed subscription is also the currently selected source:
- the stored source artifact is replaced
- the generated runtime config remains a separate layer
- later composition/preview/activation regenerates runtime output from the updated source plus Clash Nivo-owned inputs

This preserves the accepted config composition model:
- refresh source material
- do not mutate customization layers in place

## Transitional Notes

This ticket does not rewrite the inherited downloader internals.

Transitional reality:
- `openclash.sh` still performs the network fetch and source-file replacement
- some downloader internals still use inherited naming and direct paths

Accepted boundary after this ticket:
- callers use the Clash Nivo service interface
- inherited downloader internals are no longer the public contract

Current inherited behavior already mostly aligns with this failure rule:
- refreshed content is downloaded into a temporary file first
- the stored source file is only replaced after a successful validation/update path
