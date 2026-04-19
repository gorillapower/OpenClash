# Setup Protocol

This is the authoritative setup sequence for AI-Compatible Development Rhythm.
Use it when a repo is being initialized with the framework.

The setup wizard is prompt-driven. The scripts are backend generators only.

## Goal

Leave the repo in a state where:

- the framework is activated
- the user has confirmed the inferred operating model
- the framework docs contain project-specific first-pass content
- the work-item artifact is ready for immediate use
- the repo is ready to start using the execution model on real work

If setup ends with copied templates or unconfirmed assumptions, setup is not
complete.

Setup is for execution readiness, not exhaustive system archaeology. If the repo
needs deeper architectural or historical mapping, use the separate workflow in
`references/brownfield-mapping.md` after setup or before major structural work.

## Protocol

### Phase 1: Discovery

1. Inspect the repo before asking broad setup questions.
2. Determine whether the repo is greenfield or brownfield.
3. Infer the likely project tier, tracker, hierarchy, verification posture, and
   framework root.
4. For brownfield repos, inspect:
   - top-level structure
   - existing docs
   - test surface
   - delivery signals such as pipelines, tracker references, or folder naming

5. If the repo is brownfield, follow `references/brownfield-assessment.md`.
6. After tracker detection, load the matching tracker guidance:
   - `references/tracker-azure-devops.md`
   - `references/tracker-github.md`
   - `references/tracker-generic.md`

### Phase 2: Proposed Model

Reflect the inferred model back to the user before writing anything
authoritative.

The proposal should include:

- project mode: greenfield or brownfield
- project tier
- proposed framework root
- proposed tracker
- proposed hierarchy mapping
- proposed work classes
- proposed verification/testing posture
- major inferred architecture boundaries
- major inferred product/runtime boundary assumptions
- any tracker-specific recommendation about default work-item shape

The proposal should be good enough to govern work, not an attempt to fully
reconstruct the system's entire backstory.

### Phase 3: Targeted Questions

Ask only the questions that remain ambiguous or policy-sensitive after
inspection.

Do not ask the user to restate information that inspection already established
with reasonable confidence.

Typical question areas:

- framework root when multiple strong conventions exist
- tracker choice when signals conflict
- hierarchy labels when team vocabulary is unclear
- patch-lane policy when team preference is not obvious
- verification strictness when test maturity is unclear
- AI publish/commit policy when governance is not obvious

### Phase 4: Confirmation Gate

Do not generate final framework docs until the user has confirmed or corrected
the proposed model.

The confirmed model must cover:

- architecture and ownership shape
- product/runtime split
- tracker and hierarchy mapping
- verification/testing posture
- framework root
- assumptions that will be written into the framework docs

If the user corrects the proposal, update the setup inputs before generating
files.

### Phase 5: Materialization

Use the backend generator to materialize the framework-managed files:

- `.ai-compatible-rhythm.yaml`
- `<framework-root>/README.md`
- `<framework-root>/project-profile.md`
- `<framework-root>/hierarchy-map.md`
- `<framework-root>/work-classification.md`
- `<framework-root>/setup-summary.md`
- `<framework-root>/project-rhythm.md`
- `<framework-root>/execution-plan.md`
- `<framework-root>/decision/*`
- `<framework-root>/architecture/*`
- tracker-specific work-item artifact

### Phase 6: First-Pass Authoring

Immediately replace scaffold content with repo-specific first-pass content.

Minimum required authored outputs:

- `<framework-root>/project-profile.md`
- `<framework-root>/hierarchy-map.md`
- `<framework-root>/work-classification.md`
- `<framework-root>/project-rhythm.md`
- `<framework-root>/execution-plan.md`
- `<framework-root>/decision/0001-product-boundary.md`
- `<framework-root>/decision/0002-service-contract.md`
- `<framework-root>/architecture/repo-layout.md`

This content should be specific enough for another AI model to use without
reconstructing the repo from scratch.

It does not need to exhaustively document every subsystem before work can begin.

### Phase 7: Closeout

Summarize the completed setup with:

- confirmed project profile
- chosen framework root
- chosen tracker and hierarchy
- authored framework files
- explicit assumptions still left open
- the resulting rule that future substantive work should now follow the
  framework

## Output Standard

Setup output should be:

- confirmed, not guessed
- specific, not placeholder-heavy
- concise enough that the team will maintain it
- immediately usable for real work items
- scoped to execution readiness rather than full historical reconstruction
