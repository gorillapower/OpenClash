---
name: Codex Task
about: Bounded implementation or decision task intended for Codex execution
title: "[Codex] "
labels: ["codex"]
assignees: []
---

## Goal 

Describe the exact outcome required.

## Background


Summarize the relevant context in 3-8 lines.

## In Scope

- List the behaviors or deliverables this task owns.

## Out Of Scope

- List what must not be changed.

## Owned Files / Modules

- List the exact files or directories Codex should treat as primary ownership.

## References

- Link the docs, issues, or files that define the intended behavior.

## Acceptance Criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Verification

- Explain how this should be validated.
- Include commands, test steps, or grep checks where relevant.
- State which of these were added or updated:
  - syntax checks
  - validator checks
  - automated tests
  - manual integration checks
- If no automated test is added for a stable module boundary, explain why and note the remaining risk.

## Notes For Codex

- Keep the task bounded to the files/modules above.
- Do not broaden scope without a strong reason.
- If this task names a file under `docs/decision/`, that file is a primary output of the task and must be updated before the issue is considered complete.
- When a decision doc is updated, keep any related execution-plan or reference docs aligned if the task scope includes them.
- After implementation, summarize the work and ask the user to confirm the issue is complete.
- After the user confirms completion, create a scoped git commit for the issue before closing it.
- After creating the commit, push it if the branch is in a publishable state and remote push is available.
- If commit or push cannot be completed cleanly, report the blocker and do not close the issue as if the workflow were finished.
- If the worktree contains unrelated or mixed changes, stop and separate or revert them before committing rather than sweeping them into the issue commit.
- Unless a task explicitly says otherwise, assume there are no existing Clash Nivo installations that require backward-compatibility handling; do not add migration or transitional support for prior Clash Nivo builds by default.
- Treat verification as part of the task, not an optional extra. At minimum run syntax checks for touched shell/Lua files and any relevant validator scripts.
- If the task changes a service, RPC, or other stable module boundary, prefer adding or updating an automated test unless there is a documented reason not to.
- Report back with:
  - changed files
  - what was verified
  - open risks or follow-up tasks
