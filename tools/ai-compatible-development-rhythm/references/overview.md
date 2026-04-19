# Overview

AI-Compatible Development Rhythm is an operating model for medium and large
software projects where humans and AI both contribute repeatedly over time.

It separates:
- durable decisions
- intended implementation structure
- rolling execution planning
- bounded execution work

The goal is to reduce drift across:
- code and docs
- backlog and current reality
- humans and AI sessions
- different AI models

## Core Layers

### Decisions

Use `<framework-root>/decision/` for durable truths that should outlive a single task.

Examples:
- product boundary
- service or API contract
- naming policy
- scope policy

### Architecture

Use `<framework-root>/architecture/` for intended implementation structure.

Examples:
- repo layout
- module boundaries
- migration order
- ownership boundaries

### Execution Plan

Use `<framework-root>/execution-plan.md` for roadmap sequencing and the current batch of
planned work.

### Execution Unit

Use a work-item template for one bounded implementation slice with explicit
scope, references, acceptance criteria, and verification.

## Operating Rules

- If durable behavior changes, update the relevant decision doc.
- If code structure or ownership changes, update the relevant architecture doc.
- Keep only the near-term work batch detailed.
- Treat testing as part of verification.
- If new learning would change how future work should be written, refresh the
  docs and plan now.

## Why It Works With AI

AI performs best when the repo explicitly states:
- what must remain true
- what shape the code should converge toward
- what matters now
- how a task is verified

This framework externalizes that context so it does not depend on memory.

## Main Risk

The main risk is false authority. Stale docs are worse than missing docs if
they continue to govern execution after reality changed.
