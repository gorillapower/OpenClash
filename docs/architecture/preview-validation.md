# Preview And Validation Surface

Clash Nivo exposes machine-readable preview and validation entrypoints through
the service contract:

- `/etc/init.d/clashnivo preview`
- `/etc/init.d/clashnivo validate`

Both commands return JSON and write a validation report to the service-owned
validation path for the selected config.

## Owned Outputs

- Preview artifact: `PREVIEW_CONFIG_FILE`
- Validation report: `VALIDATION_REPORT_FILE`

These paths are assigned by the config path contract in
`service/config.sh`.

## Stage Model

Preview and validation report against the service-owned composition stages:

1. `source`
2. `normalize`
3. `custom_proxy_groups`
4. `custom_rules`
5. `overwrite`
6. `validation`

This deliberately matches the current composition boundary without resolving the
full scoping and collision semantics tracked separately in issue `#64`.

## Result Shape

The JSON result contains:

- `valid`
- `config_name`
- `source_path`
- `preview_path`
- `preview_exists`
- `report_path`
- `failed_layer`
- `preview_content`
- `stages`

Each stage object contains:

- `name`
- `status`
- `message`

## Failure Attribution

The service attributes failures to the first stage that:

- fails to execute successfully, or
- produces invalid YAML in the generated working config

This is intentionally conservative. It distinguishes source, normalize,
custom-rules, and overwrite failures without pretending that the unresolved
expanded composition semantics are already finalized.

## LuCI Consumption

LuCI consumes this surface through backend adapter methods:

- `config.preview`
- `config.validate`

The UI should treat the JSON report as authoritative and should not scrape log
text to infer validation state.
