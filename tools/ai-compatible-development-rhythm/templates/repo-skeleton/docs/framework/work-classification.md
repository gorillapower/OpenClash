# Work Classification

## Purpose

Define the work lanes for this repo and the minimum required ceremony for each
lane.

## Default Lanes

### Patch

Use for:
- small bug fixes
- small test fixes
- typos
- low-risk local cleanup

Requires:
- a tracked work item or equivalent record
- explicit scope
- verification
- tests if logic changed

### Standard Change

Use for:
- normal feature slices
- meaningful behavior changes

Requires:
- full work-item template
- acceptance criteria
- verification

### Structural Change

Use for:
- module boundary changes
- ownership changes
- migration or repo shape changes

Requires:
- architecture doc handling
- bounded work item
- verification appropriate for affected boundaries

### Decision Change

Use for:
- durable behavior rules
- contract changes
- scope changes
- naming policy changes

Requires:
- decision doc handling
- implementation work item if code changes follow

## Rule

Use the lightest lane that still preserves clarity and accountability.
