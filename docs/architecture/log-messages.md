# Log Message Style

## Goal
Keep Clash Nivo service and runtime logs easy to follow during long-running operations such as start, refresh, validation, Clash core updates, and package updates.

## Rules
- Write logs in direct English.
- Prefer `stage: action` wording for multi-step flows.
- Say what subsystem is running:
  - `Source refresh`
  - `Clash core update`
  - `Package update`
  - `Rule refresh`
  - `Watchdog`
- Say what happens next:
  - downloading
  - validating
  - checking for changes
  - replacing the current file
  - retrying
  - aborting
- Only include operator instructions when there is a real action they can take.
- Avoid filler such as:
  - `stop continuing`
  - `please check the log infos`
  - `do nothing`
- Avoid awkward success messages. Prefer:
  - `updated`
  - `saved`
  - `started successfully`
  - `is already current`
- Keep OpenClash naming only where it is intentional and product-correct:
  - coexistence detection
  - upstream source-policy references

## Severity Guidance
- `LOG_TIP`
  - progress updates and successful stage transitions
- `LOG_OUT`
  - neutral process output and non-error state changes
- `LOG_WARN`
  - degraded behavior, fallback paths, or skipped work that may matter
- `LOG_ERROR`
  - abort conditions, validation failures, or action-required failures

## Examples
- Good:
  - `Source refresh: validation passed. Checking whether the source changed.`
  - `Clash core update failed for 【Meta】. Check the network connection and try again later.`
  - `Package update skipped. Clash Nivo is already current.`
- Bad:
  - `Config File Tested Faild, Please Check The Log Infos!`
  - `Core Has Not Been Updated, Stop Continuing Operation!`
  - `Updated GeoIP Dat No Change, Do Nothing...`
