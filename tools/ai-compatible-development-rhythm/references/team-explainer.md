# Team Explainer

This project uses AI-Compatible Development Rhythm.

## Why

AI is fast at bounded execution, but weak at reconstructing durable intent from
scattered context. Teams have the same problem. Tickets go stale, code drifts,
and important decisions end up trapped in chat history or issue comments.

This framework keeps the important context in the repo itself.

## How It Works

- `<framework-root>/` stores the local operating profile for this repo
- `<framework-root>/decision/` stores durable product and contract rules
- `<framework-root>/architecture/` stores intended implementation structure
- `<framework-root>/execution-plan.md` stores epic order and near-term sequencing
- work items define one bounded unit of execution with explicit verification

## Working Rule

If implementation learning would change how future work should be written,
update the docs and plan before continuing.

## Cost

This only works if the docs stay current. Stale docs create false authority.
