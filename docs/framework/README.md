# AI-Compatible Development Rhythm

This folder packages a portable operating model for software projects that use
AI repeatedly during delivery.

The model separates:
- durable decisions
- intended implementation structure
- rolling execution planning
- bounded execution tasks

The goal is to reduce drift across:
- code and docs
- roadmap and current reality
- humans and AI sessions
- different AI models

## Package Contents

- `overview.md`
  - full framework definition
- `variants.md`
  - light, standard, and heavy operating modes
- `team-explainer.md`
  - short internal explainer for teammates
- `model-assessment-prompt.md`
  - prompt for evaluating the framework with other AI models
- `templates/repo-skeleton/`
  - exportable starter files for a new repo

## Recommended Default

For most substantial software projects, start with the `Standard` variant from
`variants.md`.

Use `Light` for small repos and early projects.

Use `Heavy` only when the project has enough complexity, coordination overhead,
or compliance pressure to justify the extra ceremony.

## Export Guidance

To reuse this in another repo:

1. Copy `templates/repo-skeleton/` into the target repo root.
2. Rename placeholder titles and assumptions.
3. Start by filling in:
   - `docs/decision/0001-product-boundary.md`
   - `docs/decision/0002-service-contract.md`
   - `docs/architecture/repo-layout.md`
   - `docs/execution-plan.md`
4. Adopt the task template before asking AI to execute non-trivial work.
5. Keep the docs current. Stale docs create false authority.

## Naming

Use `AI-Compatible Development Rhythm` as the umbrella framework name.

Within that framework, the implementation loop can be described as a
`Decision-Guided Execution Loop`.
