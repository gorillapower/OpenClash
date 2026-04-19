# Setup Authoring

Use this guide when the setup workflow needs to leave a repo ready for actual
use, not just structurally installed.

Apply this after the confirmation and materialization phases in
`references/setup-protocol.md`.

Use tracker overlays and brownfield assessment guidance where relevant:

- `references/brownfield-assessment.md`
- `references/tracker-azure-devops.md`
- `references/tracker-github.md`
- `references/tracker-generic.md`

## Rule

Setup is complete only when the repo has:

- an active runtime profile in `.ai-compatible-rhythm.yaml`
- a committed framework root
- a project-specific operating profile
- a project-specific execution plan
- project-specific first-pass decision docs
- project-specific first-pass architecture docs
- a tracker-ready work-item template

Do not stop at copied templates.
Do not turn setup into a demand for exhaustive codebase backstory.

## Required Setup Outputs

After materializing the framework files, author these outputs immediately:

- `<framework-root>/project-profile.md`
  - final chosen tier, tracker, hierarchy, patch lane, verification mode, AI policy
- `<framework-root>/hierarchy-map.md`
  - real local labels, not placeholders
- `<framework-root>/work-classification.md`
  - real lanes and expectations for this repo
- `<framework-root>/project-rhythm.md`
  - how this repo will refresh decisions, architecture, and planning
- `<framework-root>/execution-plan.md`
  - a real first-pass plan, not blank placeholders
- `<framework-root>/decision/0001-product-boundary.md`
  - first-pass durable product/scope boundary
- `<framework-root>/decision/0002-service-contract.md`
  - first-pass contract or interface policy
- `<framework-root>/architecture/repo-layout.md`
  - first-pass structure and ownership notes

## Brownfield Guidance

For brownfield repos:

- inspect the codebase before finalizing setup
- infer the current architecture from actual paths and subsystem boundaries
- infer testing maturity from the real test surface
- draft the initial framework from the repo as it exists today
- record explicit assumptions where repo reality is unclear

The goal is not perfect documentation. The goal is a usable first-pass framework
grounded in the existing repo.

If the repo needs deeper mapping of subsystem interactions, historical intent,
or ownership ambiguity, recommend the optional workflow in
`references/brownfield-mapping.md`.

## Greenfield Guidance

For greenfield repos:

- define intended product boundary
- define intended architecture shape
- define the initial execution order
- define verification and testing expectations
- leave the repo ready for the first real work item

## Output Standard

The authored framework should be:

- specific enough that another AI model can start using it
- concise enough that the team will keep it updated
- clearly marked as first-pass where uncertainty remains
- aligned to the detected tracker without forcing unnecessary hierarchy
- grounded in actual repo findings for brownfield installs
- intentionally limited to what future work needs in order to execute well

If setup ends with generic placeholders, setup is not complete.
