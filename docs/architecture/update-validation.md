# Update Validation

Epic 4 update validation is performed with:

```sh
bash luci-app-clashnivo/tools/validate-epic4-update.sh
```

The validator checks:

- the service environment sources `service/update.sh`
- the init script exposes update entrypoints
- LuCI/backend code does not directly hardcode:
  - `openclash_update.sh`
  - `openclash_version.sh`
  - `openclash_core.sh`
  - the old direct GitHub latest-release API path
- the backend adapter routes through service update commands

The service update surface uses `assets` rather than `data` for auxiliary downloadable support files.

The validator is intentionally scoped to the service/UI boundary. It does not assert that inherited updater internals are fully rewritten.
