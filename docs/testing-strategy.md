# Testing Strategy

This repo should not optimize for raw coverage percentage. The backend is
OpenWrt-runtime-dependent, shell-heavy, and cross-cutting across UCI, procd,
dnsmasq, nftables, routing, files, and LuCI RPC. The right goal is repeatable
confidence at the system boundaries that matter.

## Goals

- Catch syntax and wiring regressions on every task
- Add automated checks around stable service and RPC contracts
- Validate router behavior through a small number of high-value integration scenarios
- Add UI smoke coverage only after the RPC surface is stable enough to justify it

## Testing Layers

### 1. Static and syntax checks

These are mandatory and cheap.

Examples:

- `sh -n` for touched shell files
- `luac -p` for touched Lua files
- grep-based ownership and namespace validators
- repo policy checks already added during earlier epics

Every implementation issue should run the relevant syntax checks.

### 2. Contract tests

These validate the outputs of the module boundaries introduced in the rewrite.

Priority targets:

- service status JSON
- runtime guard behavior
- config path assignment
- preview and validation JSON
- network ownership validators
- LuCI backend adapter and RPC smoke paths

These should usually be small automated tests with fixtures or controlled mocks,
not full router boots.

### 3. Integration tests on OpenWrt

These are the most important functional checks for the backend.

Priority scenarios:

1. clean install without OpenClash
2. OpenClash installed but inactive
3. OpenClash active and Clash Nivo start blocked
4. config selection and generated config update
5. preview and validation success and failure cases
6. start, stop, restart idempotence
7. firewall, DNS, and routing cleanup on stop
8. uninstall and reinstall cleanup
9. one-time import from OpenClash when that work lands

Run these manually first if needed, then automate the highest-value flows.

### 4. UI and RPC smoke tests

UI testing should start narrow and target critical flows only.

Initial scope:

- app loads
- service status renders
- config list loads
- preview and validation action succeeds
- start, stop, restart flow triggers expected RPCs

This is where browser automation can help, but it should not be the first
testing investment for the project.

## Browser Automation

Browser automation is useful, but only after the service and RPC contract has
stabilized enough to make the tests durable.

Recommended approach:

- start with service and RPC contract tests
- add a thin UI smoke layer later
- expand browser coverage only when the UI flows stop changing rapidly

Cypress is acceptable for UI smoke tests. It should initially cover only the
critical user journeys listed above rather than broad end-to-end UI coverage.

## Verification Policy For Issues

Every implementation issue should explicitly state:

- what syntax checks were run
- what validator checks were run
- whether automated tests were added or updated
- whether manual integration verification was performed
- if tests were deferred, why they were deferred and what risk remains

## Backfill Policy

Do not stop current implementation to retroactively test everything at once.

Instead, backfill tests in priority order for the highest-value completed
boundaries:

1. service status
2. runtime guard
3. config path assignment
4. preview and validation surface
5. network validators
6. LuCI backend and RPC smoke paths

## Recommended First Harness

The first practical automated harness should focus on shell and contract tests.

Recommended first steps:

1. add a small shell test harness for service modules
2. add contract tests for status, guard, config, and preview surfaces
3. keep existing validator scripts as part of standard verification
4. add browser-based smoke tests only after the RPC contract is stable enough

This keeps testing aligned with the real risks in the codebase rather than
optimizing for headline coverage numbers.
