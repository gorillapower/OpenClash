# Repo Layout

Status: Draft

## Purpose

Define the intended internal repo layout so later restructure work moves code
toward one agreed shape.

## Layout Rule

- Describe the top-level concerns the repo should separate.
- State why this separation exists.

## Target Layout

List the intended major paths and what each one owns.

Example sections:
- package root
- app or UI source
- backend or service source
- shared libraries
- generated or packaged assets
- tests
- tooling

## Transitional Paths

- List paths that are acceptable temporarily but not part of the long-term
  shape.

## Legacy Debt

- List paths or patterns that are not accepted as target architecture.

## Change Control

- Later tasks should preserve this layout unless this document is updated first.
