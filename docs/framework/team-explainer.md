# Team Explainer

This repo uses AI-Compatible Development Rhythm.

## Why

AI is fast at bounded execution, but weak at reconstructing durable intent from
scattered context. Teams have the same problem. Tickets go stale, code drifts,
and important decisions get trapped in chat history or issue comments.

This operating model keeps the important context in the repo itself.

## How It Works

- `docs/decision/` records durable product and contract rules.
- `docs/architecture/` records intended implementation structure and migration
  shape.
- `docs/execution-plan.md` records epic order and near-term sequencing.
- the AI task template defines one bounded unit of work with explicit
  verification.

## Working Rule

If implementation learning would change how future tasks should be written,
update the docs and plan before continuing.

## Benefits

- less backlog drift
- less architecture drift
- less hidden policy change in code
- better handoff across sessions, contributors, and models
- stronger AI execution because context is explicit

## Cost

This only works if the docs stay current. Stale docs are worse than missing docs
because they create false authority.

## Short Version

The repo should tell AI and humans:
- what must remain true
- what shape the code should converge toward
- what matters now
- how each task will be verified
