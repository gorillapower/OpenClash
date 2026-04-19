# Brownfield Mapping

Use this workflow when a repo is already framework-enabled but still needs a
deeper architectural or historical map before major structural work.

This is not part of normal setup. Setup is for execution readiness. Mapping is
for repos where the team needs stronger shared understanding before attempting
large refactors, migrations, or cross-cutting redesigns.

## When To Use It

Use brownfield mapping when one or more of these are true:

- the repo has large legacy or transitional areas
- subsystem ownership is unclear
- major structural work is planned
- current docs do not explain how important areas interact
- historical decisions are affecting current work but are poorly captured

Do not require this workflow before every framework adoption.

## Goal

Produce deeper repo-specific context that helps future work avoid false
assumptions. Typical outputs include:

- richer architecture notes
- interaction and dependency maps
- clarified ownership boundaries
- identified legacy or transitional zones
- explicit open questions where the current system is still unclear

## Mapping Sequence

1. Read the existing framework docs first.
2. Inspect the top-level repo structure and the major executable or deployable
   areas.
3. Trace the main interaction paths across UI, service, runtime, persistence,
   and external integrations.
4. Identify the most important ownership boundaries and where they are violated
   or blurred.
5. Identify legacy, transitional, or duplicate paths that affect current work.
6. Compare repo reality with existing docs and note mismatches.
7. Summarize the inferred model back to the user and confirm any major
   uncertain areas.
8. Update or add framework architecture and decision docs only after user
   confirmation.

## Output Standard

Mapping outputs should be:

- deeper than setup docs
- specific to the repo's actual interaction model
- explicit about uncertainty
- limited to information that will improve future execution quality

The purpose is not to write a complete system encyclopedia. The purpose is to
reduce ambiguity before high-risk work.
