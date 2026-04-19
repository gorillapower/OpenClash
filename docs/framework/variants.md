# Variants

Use the same operating principles at different weights depending on project
complexity.

## Light

Best for:
- small applications
- new products with a short planning horizon
- utility repos
- teams that want minimal ceremony

Recommended files:
- `README.md`
- `docs/decision/`
- `docs/execution-plan.md`
- one AI task template

Optional:
- `docs/project-rhythm.md`
- `docs/architecture/` only if structure is changing materially

Refresh cadence:
- at feature boundaries
- when a major decision changes
- before asking AI to do structurally important work

Main tradeoff:
- fastest to maintain
- weakest structural guidance if the codebase starts to sprawl

## Standard

Best for:
- serious product repos
- multi-month projects
- projects with repeated AI usage
- repos where architecture and sequencing both matter

Recommended files:
- `docs/decision/`
- `docs/architecture/`
- `docs/execution-plan.md`
- `docs/project-rhythm.md`
- strict AI task template

Refresh cadence:
- after a small batch of tasks
- at epic boundaries
- whenever new learning changes the next planned work

Main tradeoff:
- good balance of clarity and effort
- requires active maintenance discipline

Recommendation:
- use this as the default starting point for most substantial repos

## Heavy

Best for:
- large migrations
- multi-team repos
- platform or infrastructure work
- regulated or high-assurance environments

Additions:
- stricter decision templates
- change-control sections
- explicit validation strategy docs
- epic-level review checkpoints
- stronger traceability from decisions to tasks

Refresh cadence:
- batch checkpoints
- formal epic checkpoints
- before cross-team handoffs

Main tradeoff:
- strongest alignment and auditability
- highest overhead
- easiest to turn into process theater if the team lacks discipline

## Selection Rule

Choose the lightest variant that still protects the project from drift.

If the project keeps encountering:
- stale tickets
- unclear boundaries
- repeated re-explanation to AI
- hidden policy changes in code

move up one level.

If the docs are not being maintained, move down a level rather than pretending a
heavier process is helping.
