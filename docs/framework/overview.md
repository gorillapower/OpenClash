# Overview

## Definition

AI-Compatible Development Rhythm is an operating model for software projects
where humans and AI both contribute repeatedly over time.

It separates durable decisions from implementation structure, keeps execution
planning close to current reality, and uses bounded work items with explicit
verification so context does not drift across sessions, contributors, or models.

## Problems It Tries To Solve

This model is designed to reduce four common failure modes:

1. durable intent lives only in chat history
2. detailed tickets go stale before implementation reaches them
3. code structure drifts away from the intended architecture
4. AI fills context gaps by guessing from nearby code or stale issues

## Core Layers

### 1. Decisions

Use `docs/decision/` for durable truths that should outlive any single task.

Typical contents:
- product boundary
- service or API contract
- naming policy
- scope policy
- UX rules that later work depends on

Question answered:
- what must remain true?

### 2. Architecture

Use `docs/architecture/` for intended implementation shape.

Typical contents:
- repo layout
- module boundaries
- route structure
- migration order
- ownership boundaries
- validation surfaces

Question answered:
- what shape should the code converge toward?

### 3. Execution Plan

Use `docs/execution-plan.md` for the rolling roadmap and near-term sequencing.

Typical contents:
- epic order
- current batch order
- sequencing notes
- checkpoint rules

Question answered:
- what should we do next, and in what order?

### 4. Execution Unit

Use a strict task template for one bounded implementation slice.

Typical contents:
- exact goal
- in-scope and out-of-scope items
- owned files or modules
- references
- acceptance criteria
- verification requirements

Question answered:
- what exactly should be changed right now?

## Operating Rules

### Decision Rule

If a task changes accepted behavior, policy, naming, scope, contract semantics,
or durable UX rules, update the relevant decision doc before or alongside
implementation.

### Architecture Rule

If a task changes module boundaries, route structure, migration order,
validation surfaces, or ownership boundaries, update the relevant architecture
doc before or alongside implementation.

### Planning Rule

Keep epics visible, but keep only the near-term execution batch detailed.

Avoid writing a large detailed backlog based on assumptions that later work will
invalidate.

### Task Rule

Execute one bounded task at a time.

Each task should:
- own one behavior or module slice
- name exact scope
- name explicit out-of-scope items
- include concrete acceptance criteria
- include explicit verification

### Refresh Rule

If what was just learned would cause future tasks to be written differently,
refresh the relevant docs and plan now rather than later.

This is the core anti-drift rule of the framework.

## Working Loop

1. refresh relevant decision docs if durable truth changed
2. refresh relevant architecture docs if structure or ownership changed
3. regenerate the near-term task batch from current truth
4. execute one bounded task
5. verify explicitly
6. confirm completion
7. commit and publish
8. checkpoint after a small batch or when major learning occurs

## Why It Works With AI

AI models are strong at bounded execution and weak at reconstructing durable
intent from fragmented context.

This model improves AI performance because the repo itself contains:
- what must remain true
- what shape the code should converge toward
- what matters now
- what exactly is being changed
- how completion must be verified

This makes the framework portable across models because it relies on repo
artifacts, not model memory.

## When To Use It

Strong fit:
- multi-epic work
- migrations and rewrites
- systems with meaningful contracts or boundaries
- projects with repeated AI execution over weeks or months
- repos where backlog drift is already a problem

Weak fit:
- throwaway prototypes
- very small apps
- one-off scripts
- repos where nobody will maintain the docs

## Main Risk

The largest risk is false authority.

If the docs stop matching reality, humans and AI will both trust them and
amplify the mistake. This framework only works if the refresh rule is followed
in practice.
