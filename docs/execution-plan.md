# Clash Nivo Execution Plan

## Product Assumptions

- `luci-app-clashnivo` remains a single user-facing install package.
- The product is internally separated into UI, runtime/service, and import tooling.
- OpenClash and Clash Nivo may both be installed on the same router.
- OpenClash and Clash Nivo must not control router networking at the same time.
- OpenClash import is built in as a one-time data import flow, not an ongoing compatibility mode.
- Clash Nivo runtime ownership is fully `clashnivo` namespaced.

## Execution Model

The project should be run in this order:

1. Create the epics up front.
2. Complete the contract/decision work first.
3. Create detailed tickets only for the current epic, plus at most the next epic if needed.
4. Execute tickets one by one with Codex using a strict issue template.
5. Review and integrate after a small batch of tickets.
6. Close the current epic, then detail the next one using the latest decisions and code state.

This keeps the roadmap visible without locking the team into stale implementation tickets too early.

## Why Not Create Every Ticket Up Front

Later work depends on earlier decisions. If every ticket is written before the contract is stable, the backlog drifts away from reality.

Examples of drift:

- docs describe one UCI schema while code implements another
- UI tickets assume RPC methods that the backend later removes or renames
- import tasks try to migrate settings that the contract later marks unsupported
- implementation tickets quietly follow legacy OpenClash behavior instead of the intended Clash Nivo design

In this plan, epics preserve the roadmap, while detailed tickets stay close to the current truth.

## Epic Order

### Epic 0: Product Contract

Goal:
- lock the core product boundaries before major rewrite work starts

Outputs:
- product boundary decision
- service contract v1
- config composition model
- import scope
- runtime guard policy

### Epic 1: Internal Codebase Restructure

Goal:
- separate UI, runtime/service, and import concerns inside the repo

Outputs:
- clear module boundaries
- reduced coupling between LuCI/UI and backend shell logic

First ticket batch:
- `#41` Repo Layout And Module Map
- `#42` UI Workspace And Packaging Boundary
- `#43` LuCI Boundary And Backend Adapter
- `#44` Backend Helper Tree Reorganization
- `#45` Validation For Coupling And Namespace Leakage

### Epic 2: Service Skeleton And Runtime Guard

Goal:
- establish the new `clashnivo` runtime entrypoint and ownership model

Outputs:
- thin service skeleton
- logging/state conventions
- start/stop/restart/status behavior
- guard against simultaneous OpenClash runtime ownership

### Epic 3: Network Layer Rewrite

Goal:
- rewrite router integration cleanly for the new backend

Outputs:
- nftables ownership
- dnsmasq ownership
- routing/TPROXY ownership
- clean start/stop/restart semantics

### Epic 4: Config Composition And Update Pipeline

Goal:
- implement the Clash Nivo product model, not just legacy parity

Outputs:
- subscription handling
- uploaded config handling
- custom proxy groups
- custom rules
- overwrite/merge model
- merged config preview/validation
- core and asset update flows

### Epic 5: UI Integration

Goal:
- implement the reset frontend against the accepted backend and frontend product contracts

Outputs:
- reset navigation and route model:
  - `Status`
  - `Sources`
  - `Compose`
  - `System`
- `Status` as the operational homepage
- `Sources` as the source inventory/import surface
- `Compose` as the preview/validate/activate workflow surface
- `System` as the maintenance/update/logs/diagnostics surface
- no UI dependence on legacy OpenClash internals

Current regenerated batch:
- `#83` Navigation Shell And Route Cutover
- `#84` Status Surface Reset
- `#85` Sources Surface Reset
- `#86` Compose Workflow Reset
- `#87` System Maintenance Surface Baseline
- `#88` System Advanced Settings Integration
- `#89` UI Reset Cleanup And Smoke Validation

Current recommended order:
1. `#83`
2. `#84`
3. `#85`
4. `#86`
5. `#87`
6. `#82`
7. `#88`
8. `#89`

Placement notes:
- `#82` belongs between the baseline `System` page and advanced settings implementation so obscure inherited settings are catalogued before they are exposed in the UI.

### Epic 6: Built-In OpenClash Import

Goal:
- provide one-time migration for existing users

Outputs:
- import detection
- import transformation rules
- report of imported/transformed/skipped items
- safe handoff from OpenClash ownership to Clash Nivo ownership

### Epic 7: Hardening And Release

Goal:
- prove install, switching, import, cleanup, and docs are correct

Outputs:
- integration coverage
- real-router validation
- release and migration docs
- legacy OpenClash reference audit and cleanup

Current hardening follow-ups:
- `#90` Clash Nivo Core Publishing Workflow And Branch Contract
- `#101` Full OpenClash Legacy Reference Audit And Cleanup

Hardening execution rule:
- assume fresh Clash Nivo install unless a ticket explicitly states otherwise
- do not preserve legacy compatibility scaffolding by default
- any compatibility exception must be justified explicitly in the ticket scope

## Epic Completion Rule

An epic is only complete when:

- the acceptance criteria for its tickets are met
- the code and docs still match
- follow-on tickets for the next epic are rechecked against current reality

## Ticket Authoring Rules

Every execution ticket should:

- own one bounded behavior or module slice
- name the exact files or directories in scope
- name what is explicitly out of scope
- include concrete acceptance criteria
- include a verification method
- include linked docs/decisions

Avoid tickets like:

- "rewrite backend"
- "finish migration"
- "implement settings page"

Prefer tickets like:

- "Define `clashnivo` runtime guard behavior when `openclash` service is active"
- "Document the v1 `clashnivo` UCI schema for subscriptions and config composition"
- "Refactor service skeleton into lifecycle/firewall/dns/routing module placeholders"

## Codex Working Rhythm

Recommended rhythm:

1. Pick one ticket.
2. Give Codex the ticket and the references it needs.
3. Require Codex to report:
   - changed files
   - what was verified
   - open risks or follow-ups
4. Review the result quickly.
5. Merge or refine.
6. After every 3-5 tickets, do an integration checkpoint.

Integration checkpoint:

- read the changed docs and code together
- confirm the contract still holds
- confirm the next tickets are still correct
- adjust the next ticket batch if needed

## First Ticket Batch: Epic 0

These are the first detailed tickets to create and execute.

### CN-EP0-01 Product Boundary Decision

Title:
- Define Clash Nivo product boundary and coexistence policy

Goal:
- document how Clash Nivo relates to installed-but-inactive OpenClash

Deliverables:
- decision doc covering:
  - single package distribution
  - internal separation
  - installed coexistence allowed
  - simultaneous runtime ownership disallowed
  - built-in one-time import policy

Acceptance criteria:
- the allowed and disallowed coexistence states are explicit
- the document states who owns router networking at runtime

### CN-EP0-02 Runtime Ownership Map

Title:
- Define all `clashnivo`-owned files, temp paths, logs, service names, and generated state

Goal:
- establish a complete namespace/ownership map

Deliverables:
- service/runtime ownership doc covering:
  - `/etc/config/clashnivo`
  - `/etc/clashnivo/*`
  - `/usr/share/clashnivo/*`
  - `/tmp/clashnivo*`
  - firewall comments/chains/sets
  - cron markers
  - procd instance names

Acceptance criteria:
- there is a clear list of owned names and paths
- the list is sufficient to guide later cleanup and grep-based validation

### CN-EP0-03 Service Contract V1

Title:
- Define the v1 Clash Nivo service contract

Goal:
- freeze the interface between UI and backend before rewrite work

Deliverables:
- doc covering:
  - service commands
  - status/log/reporting expectations
  - RPC surface expectations
  - high-level UCI structure

Acceptance criteria:
- the UI team can build against it without guessing
- backend tickets can refer to the same contract

### CN-EP0-04 Config Composition Model

Title:
- Define the v1 config composition model for subscriptions, custom proxy groups, custom rules, and overwrite

Goal:
- formalize the new product behavior already introduced in the UI direction

Deliverables:
- doc covering:
  - source subscription configs
  - uploaded configs
  - merge order
  - custom proxy group behavior
  - custom rules behavior
  - overwrite behavior
  - preview/validation expectations

Acceptance criteria:
- the final active config construction order is explicit
- destructive mutation of source subscriptions is either forbidden or explicitly justified

### CN-EP0-05 OpenClash Import Scope

Title:
- Define what the built-in OpenClash import will migrate, transform, warn on, or skip

Goal:
- constrain migration before code is written

Deliverables:
- doc covering:
  - imported items
  - transformed items
  - skipped items
  - import report format
  - failure and rollback expectations

Acceptance criteria:
- migration code can later follow explicit rules
- unsupported legacy behavior is called out early

### CN-EP0-06 Runtime Guard And Switching Flow

Title:
- Define the runtime guard and switching flow between installed OpenClash and Clash Nivo

Goal:
- settle the user-facing and backend behavior when the other product is active

Deliverables:
- doc covering:
  - start refusal behavior if OpenClash is active
  - handoff behavior during import
  - expected warnings/messages
  - manual switch guidance

Acceptance criteria:
- no ambiguity remains about what happens if both are installed
- service implementation has a clear behavior target

## Suggested Next Batch After Epic 0

Only create these once Epic 0 is stable:

- repo/module restructure ticket
- service skeleton ticket
- runtime guard implementation ticket
- logging/state convention ticket
- grep/validation ticket for upstream naming leakage

## Definition Of Done For Each Ticket

- requested files are updated
- docs and code remain aligned
- verification is documented
- out-of-scope areas were not changed casually
- follow-up risk is called out explicitly if unresolved
