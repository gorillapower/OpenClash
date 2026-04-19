---
name: ai-compatible-development-rhythm
description: Set up and operate the AI-Compatible Development Rhythm framework for medium and large repos. Use when a repo wants explicit AI working rules, setup guidance, work classification, or framework-aware task execution.
---

# AI-Compatible Development Rhythm

This skill is the behavioral layer for the framework. The repo-local framework
docs remain the durable source of truth.

## Activation Rules

1. If `.ai-compatible-rhythm.yaml` exists, treat the framework as active for substantive work in this repo.
2. If it does not exist, stay dormant unless the user explicitly asks to set up or
   use the framework.
3. Do not assume framework adoption just because this skill is installed.

## Setup Workflow

When asked to set up the framework:

1. Read `references/setup-wizard.md`.
2. Read `references/setup-protocol.md`.
3. Read `references/setup-prompt.md`.
4. Read `references/setup-authoring.md`.
5. If the repo is brownfield, read `references/brownfield-assessment.md`.
6. After tracker detection, read the relevant tracker overlay:
   - `references/tracker-azure-devops.md`
   - `references/tracker-github.md`
   - `references/tracker-generic.md`
7. Keep setup focused on execution readiness. If deeper structural or legacy
   understanding is needed, recommend `references/brownfield-mapping.md` as a
   separate follow-on workflow instead of expanding setup indefinitely.
7. Follow the setup protocol in order.
8. Inspect the repo enough to determine whether it is greenfield or brownfield
   and to infer likely tracker, hierarchy, verification, and architecture
   expectations.
9. Reflect the inferred structure, product shape, testing posture, and operating
   profile back to the user.
10. Ask only the questions that remain ambiguous or policy-sensitive.
11. Get explicit confirmation before treating the inferred model as framework
   truth.
12. Choose the lightest viable operating profile.
13. Materialize the repo-local framework files with `scripts/setup.sh`,
   `scripts/install.sh`, `scripts/setup.ps1`, or `scripts/install.ps1`
   depending on the host shell.
14. Immediately author the first real framework content in the generated files.
   Do not leave setup at a scaffold-only state.
15. Ensure the tracker-specific work-item artifact is ready to use immediately.
16. Summarize the chosen profile, the authored framework outputs, and any
   explicit assumptions that still need confirmation.

## Runtime Workflow

When the framework is active:

1. Read `.ai-compatible-rhythm.yaml` to resolve the configured framework root.
2. Read `<framework-root>/project-profile.md`.
3. Read `<framework-root>/work-classification.md`.
4. Classify the requested work using the repo's configured lanes.
5. Apply the lightest permitted process lane.
6. Require explicit scope and verification for non-trivial work.
7. If durable behavior changes, update decision docs.
8. If structure or ownership changes, update architecture docs.

## Working Principles

- Optimize for minimum viable ceremony.
- Keep all non-trivial work tracked somehow.
- Treat testing as part of verification.
- Do not leave durable decisions only in chat or comments.
- Do not leave structural changes only in code.

## References

- `references/overview.md`
- `references/variants.md`
- `references/setup-wizard.md`
- `references/setup-protocol.md`
- `references/setup-prompt.md`
- `references/setup-authoring.md`
- `references/brownfield-assessment.md`
- `references/brownfield-mapping.md`
- `references/tracker-azure-devops.md`
- `references/tracker-github.md`
- `references/tracker-generic.md`
- `references/team-explainer.md`
- `scripts/install.sh`
- `scripts/install.ps1`
