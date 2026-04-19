# Tracker Guidance: Azure DevOps

Use this overlay after tracker detection when the repo uses Azure DevOps.

## Principle

Do not use the full Azure DevOps hierarchy by default.

Choose the lightest shape that matches real team behavior.

## Recommended Lean Default

- `Bug` for defect work
- `PBI` or equivalent backlog item for normal implementation work
- `Feature` only when multiple related implementation items need a shared parent
- `Epic` only for large long-running initiatives
- `Task` only for decomposition beneath a larger implementation item

## Authoring Guidance

When setup writes the first-pass framework:

- make the normal implementation unit explicit
- state which layers are optional
- avoid implying that every change needs an Epic or Feature
- reflect actual team practice when known

## Warning

If the team uses `Task` as the default implementation unit, record that
explicitly. Do not assume it from the tracker alone.
