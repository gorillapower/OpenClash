# Project Rhythm

## Purpose

Define where Clash Nivo planning truth lives and when the team should refresh roadmap, decision, and architecture documents during execution.

## Planning Sources Of Truth

### Roadmap And Epic Sequencing

Use [execution-plan.md](./execution-plan.md) for:
- epic order
- current regenerated batch order where needed
- project-level sequencing notes

Use GitHub epic/issues for:
- operational tracking
- open/closed state
- day-to-day execution queue

The repo plan and GitHub queue should agree on the current execution model.

### Product Decisions

Use `docs/decision/` for:
- accepted product rules
- frontend/backend contract decisions
- scope, policy, and UX decisions that should outlive any single ticket

### Architecture And Migration Structure

Use `docs/architecture/` for:
- module boundaries
- migration plans
- implementation structure
- validation strategy tied to code organization

### Execution Discipline

Use `.github/ISSUE_TEMPLATE/codex_task.md` for:
- per-issue execution expectations
- verification expectations
- confirmation, commit, push, and close workflow

## Execution Cycle

The default working cycle is:
1. settle or update the relevant decision/architecture docs
2. create or refresh the current issue batch
3. execute one issue at a time
4. confirm completion
5. commit, push, and close
6. checkpoint the plan after a small batch or epic boundary

## Refresh Triggers

Refresh planning docs deliberately instead of waiting for drift to accumulate.

### Always Refresh When

- switching from one epic to the next
- a follow-up issue changes the next planned batch materially
- a frontend/backend reset changes the intended execution order

### Regular Checkpoint Rhythm

Do a documentation and planning checkpoint after every 5 closed implementation issues.

At that checkpoint:
- re-read `docs/execution-plan.md`
- re-read affected files under `docs/decision/`
- re-read affected files under `docs/architecture/`
- confirm the next issue order still makes sense
- insert follow-up issues into the plan where needed
- update stale sequencing notes before continuing

### Decision-Doc Updates

Update a decision doc when a ticket changes:
- accepted product behavior
- contract semantics
- scope policy
- naming policy
- UX rules that later tickets depend on

Do not leave those decisions only in issue comments or chat history.

### Architecture-Doc Updates

Update an architecture doc when a ticket changes:
- module boundaries
- page/route structure
- migration order
- validation surfaces
- ownership boundaries

## Practical Rule

If a future ticket would likely be written differently because of what was just learned, refresh the plan/docs now rather than later.

## Current Application

At the current stage of the project:
- GitHub issues are the execution queue
- `docs/execution-plan.md` is the in-repo epic and sequencing reference
- `docs/decision/` holds the accepted backend and frontend contracts
- `docs/architecture/` holds migration plans and module boundary docs

This keeps the roadmap visible without forcing the team to maintain a giant stale ticket backlog.
