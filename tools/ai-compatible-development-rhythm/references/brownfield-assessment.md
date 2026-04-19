# Brownfield Assessment

Use this guide during setup for existing repos.

## Goal

Infer enough repo reality that the first-pass framework docs describe the
actual project instead of a generic scaffold.

## Inspect These Sources First

- root `README.md`
- contributing or engineering-process docs
- architecture docs
- existing decision or ADR docs
- pipeline files
- top-level project and module layout
- test projects and test strategy signals

## Infer These Outcomes

Translate the repo inspection into:

- product boundary
- service or contract boundary
- top-level architecture layout
- tracker choice
- hierarchy recommendation
- verification posture
- framework root recommendation

## Brownfield Mapping Rules

### Product Boundary

Use existing docs and folder structure to identify:

- the actual user-facing product or platform shape
- the runtime systems that are product-critical even if not directly user-facing
- subsystems that are secondary, transitional, or legacy

### Service Contract

Identify the stable boundary between:

- user-facing layers
- transport layers
- application orchestration
- domain logic
- infrastructure/runtime implementation

Do not let internal storage or runtime details become the primary contract if
the repo already exposes a clearer API or service boundary.

### Repo Layout

Name actual top-level modules and what they own.

Call out:

- primary paths
- secondary support paths
- legacy or transitional debt
- boundary rules the repo should preserve

### Verification Posture

Infer verification expectations from:

- explicit testing docs
- presence of unit, integration, component, or e2e suites
- pipeline coverage and enforcement signals

If a repo already has meaningful test maturity, the framework should reinforce
it rather than lower it.

### Hierarchy Recommendation

Recommend the lightest tracker hierarchy that matches real team behavior.

Do not force every available tracker layer just because the tracker supports it.

## Output Standard

A brownfield setup should leave:

- concise repo-specific framework docs
- explicit assumptions where the repo is ambiguous
- a hierarchy recommendation that minimizes ceremony
- an execution plan that starts from adoption and near-term use, not fake roadmap placeholders
