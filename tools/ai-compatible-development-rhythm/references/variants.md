# Variants

Use the same framework principles at different weights depending on project
complexity.

## Light

Best for:
- smaller product repos that still want some structure
- early projects with a short planning horizon

Recommended files:
- `README.md`
- `<framework-root>/decision/`
- `<framework-root>/execution-plan.md`
- one work-item template

This is not the primary target for the framework. It is a reduced fallback.

## Standard

Best for:
- medium-sized product repos
- multi-month projects
- teams using AI regularly

Recommended files:
- `<framework-root>/`
- `<framework-root>/decision/`
- `<framework-root>/architecture/`
- `<framework-root>/execution-plan.md`
- `<framework-root>/project-rhythm.md`
- tracker-specific work-item template

Recommendation:
- use this as the default starting point

## Heavy

Best for:
- large migrations
- multi-team repos
- regulated or high-assurance environments

Add:
- stricter checkpoints
- stronger traceability
- more explicit validation and change-control rules

## Selection Rule

Choose the lightest profile that still prevents drift.

If the project keeps suffering from stale tickets, unclear boundaries, or
repeated AI re-explanation, move up in structure.
