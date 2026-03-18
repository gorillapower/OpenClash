# Config Paths

## Goal

Define the Clash Nivo-owned path contract for source configs, generated runtime configs, preview output, and validation output.

## Canonical Paths

- source config root: `/etc/clashnivo/config/`
- generated runtime config root: `/etc/clashnivo/`
- custom config assets: `/etc/clashnivo/custom/`
- overwrite assets: `/etc/clashnivo/overwrite/`
- history state: `/etc/clashnivo/history/`
- preview output root: `/tmp/clashnivo-preview/`
- validation output root: `/tmp/clashnivo-validation/`

## Path Roles

Source configs are the preserved inputs selected by the user or refreshed from subscriptions.

- default source config: `/etc/clashnivo/config/config.yaml`
- named source config: `/etc/clashnivo/config/<name>.yaml`

Generated runtime configs are the service-owned outputs used to launch the Clash core.

- generated runtime config: `/etc/clashnivo/<name>.yaml`
- generated temp working copy: `/tmp/yaml_config_tmp_<name>.yaml`

Preview and validation outputs are explicitly separate from both source configs and generated runtime configs.

- preview output: `/tmp/clashnivo-preview/<name>.yaml`
- validation report: `/tmp/clashnivo-validation/<name>.yaml.json`

## Contract

The service-owned source of truth for these paths is:

- `luci-app-clashnivo/root/usr/share/clashnivo/service/config.sh`

Active service code should derive:

- `RAW_CONFIG_FILE`
- `CONFIG_FILE`
- `TMP_CONFIG_FILE`
- `HISTORY_PATH`
- `PREVIEW_CONFIG_FILE`
- `VALIDATION_REPORT_FILE`

through the service-owned helpers instead of reconstructing these paths inline.

## Transitional Note

The generated runtime config still lives flat under `/etc/clashnivo/` in the current implementation. This is accepted as the Epic 4 starting contract so long as it remains explicitly distinct from `/etc/clashnivo/config/`, which is reserved for source artifacts.
