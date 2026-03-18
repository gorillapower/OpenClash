# Frontend Design System

Status: Accepted

Issue:
- #78

## Purpose

Define the visual direction, interaction language, and component policy for the Clash Nivo frontend.

This document answers:
- what the UI should feel like
- how information should be prioritized visually
- when to use native controls versus custom components
- which interaction patterns are allowed or discouraged
- how to keep the frontend simple while still supporting advanced router features

This is intentionally separate from the stack decision in `#79`.
The product should decide how the interface behaves before deciding which framework or styling system is most appropriate.

## Design Position

Clash Nivo should look and behave like a deliberate operator console:
- calm
- readable
- fast to scan
- explicit about state and consequences

It should not feel like:
- a generic marketing dashboard
- an inherited LuCI form dump
- a playground of bespoke widgets
- a raw shell-script front-end with thin styling

The visual goal is minimal and functional, but not sterile.
The interface should feel good to use repeatedly during normal router administration.

## Core Design Principles

### Clarity Before Personality

The UI should earn trust through legibility and consistent behavior first.

This means:
- state should be obvious
- actions should be explicit
- related controls should live together
- advanced controls should look advanced, not equal to the main path

Visual character is welcome, but must not reduce scan speed or predictability.

### High-Signal Surfaces

Every page should make the primary state and primary action obvious near the top.

Examples:
- `Status` should surface health, active source, active generated config, guard state, and primary service actions
- `Sources` should surface inventory state and refresh/select actions
- `Compose` should surface current source, current effective custom layers, validation state, and activate readiness
- `System` should surface updates, schedules, logs, and diagnostics without competing with the main operational pages

### Consistent Semantics

The same concepts must look and behave the same way across the product.

That includes:
- action labels
- button hierarchy
- form save behavior
- inline help
- warning and error treatment
- success and progress feedback

The interface must never make the user infer meaning from different button placement or inherited wording.

### Structured Over Clever

The frontend should prefer obvious structure over compact but obscure interactions.

Prefer:
- grouped sections
- clear page titles
- descriptive labels
- visible summaries
- explicit review steps

Avoid:
- hidden stateful controls
- overly dense toolbars
- icon-only critical actions
- vague drawers or sheets for core workflows unless the interaction truly benefits from containment

### Native By Default

For an admin interface, standard controls are usually the right answer.

Default to:
- standard form fields
- checkboxes
- radios
- selects
- tabs where the information architecture genuinely calls for them
- tables or list rows for inventory
- ordinary confirm dialogs for destructive actions

Only introduce custom components when they materially improve consistency or reduce repeated complexity.

## Visual Direction

## Tone

The frontend should feel:
- operational
- modern
- restrained
- confident

Notable characteristics:
- soft but clear separation between surfaces
- strong typography hierarchy
- obvious status color usage
- limited decorative color
- deliberate empty-state and error-state design

## Layout

Use a stable application shell:
- persistent top navigation
- one main content column
- optional contextual action area within the page header

The default content layout should favor:
- readable page width
- stacked sections
- cards or section blocks only where they improve grouping

Do not turn every setting into an isolated card if the result becomes visually noisy.

## Typography

Typography should prioritize readability and hierarchy over trendiness.

Rules:
- one primary sans-serif family for the product
- one monospace family for logs, YAML, generated previews, and diagnostic values
- page title, section title, field label, helper text, and state text should each have a stable role
- avoid tiny muted text as the primary explanation mechanism

The current default `Inter`-style direction is acceptable as a baseline, but `#79` may revise implementation choices.

## Color

Color should communicate status and structure, not act as decoration.

Rules:
- neutral surfaces should dominate
- use accent color sparingly for primary actions and focus
- use status colors consistently:
  - healthy / ready
  - warning / attention
  - blocked / error
  - informational
- dark mode may be supported, but the product must not rely on dark mode for its identity

Avoid:
- visually loud gradients as default page treatment
- multiple accent colors competing on one page
- status colors reused for unrelated decorative purposes

## Spacing And Density

Clash Nivo should feel efficient, not cramped.

Rules:
- keep a consistent spacing scale
- use tighter density for dense inventories and diagnostics
- use more breathing room around primary actions, validation state, and empty states
- do not compress advanced controls so much that labels and helper text become hard to scan

## Interaction And State Patterns

### Action Hierarchy

Each screen should distinguish:
- one primary action
- a small number of secondary actions
- destructive actions
- low-priority utility actions

Examples:
- `Activate` may be primary in `Compose`
- `Refresh source` is secondary in `Sources`
- `Delete` is destructive
- `View logs` is utility/navigation

Do not present five equal-weight buttons in the same action row.

### Form Behavior

Form behavior must be consistent across the app.

Rules:
- saving stored settings must look different from runtime actions
- if a form has unsaved changes, the UI should say so explicitly
- destructive or invalidating actions should not silently discard edits
- helper text should explain consequence, not restate the label
- field groups should be organized by user intent, not backend file structure

### Preview, Validation, Activation

These three states must be visually and semantically separate:
- `Preview`: show what would be generated
- `Validate`: confirm whether generation is acceptable
- `Activate`: make the validated generated config live

The UI must not blur those into a single ambiguous save/update action.

### Status Feedback

The product needs consistent patterns for:
- loading
- success
- warning
- blocked
- validation failure
- background progress

Use inline page-level feedback first.
Toasts should be supplementary, not the primary carrier of important state.

### Logs And Diagnostics

Logs are important, but they should not dominate the default interface.

Rules:
- quick log access from `Status` is acceptable
- full log browsing belongs to `System`
- logs and diagnostics must use readable monospace presentation
- timestamps, severity, and source should be scannable

## Component Policy

### Keep The Shared Layer Small

The shared component layer should stay intentionally small.

Good shared components:
- layout shell
- navigation
- page header
- status badge
- action bar
- section shell
- inventory row/table primitives
- confirm dialog
- inline help / tooltip
- log viewer
- validation result summary

Bad shared components:
- wrappers around every native field for their own sake
- highly generic “do everything” panels
- components that exist only to hide simple markup

### Prefer Page Composition Over Deep Abstraction

Most feature-specific UI should be assembled in the page or page-module layer.

Do not create a reusable abstraction until:
- the pattern repeats enough to justify it
- the semantic contract is actually stable
- it reduces complexity instead of moving it around

### Native Controls Versus Custom Components

Use native controls for most settings and forms.

Introduce custom components only for:
- repeated structured objects such as proxy-group editors or rule-provider editors
- validation/result presentation
- specialized viewers like logs or generated config preview
- navigation/state shells used across pages

Even then, custom components should remain narrow and task-specific.

### Sheets, Modals, Drawers

Use overlays sparingly.

Appropriate uses:
- create/edit a single structured object
- confirm destructive actions
- focused preview or diagnostics when preserving page context matters

Not appropriate:
- hiding the main workflow
- nesting advanced settings inside multiple overlay layers
- turning every edit path into a sheet by default

If a workflow is central and multi-step, it should usually live in the page, not in a sheet.

## Content And Documentation Policy

### Labels

Labels must use product language, not inherited script language.

Prefer:
- `Activate`
- `Refresh source`
- `Validate config`
- `Open dashboard`

Avoid inherited implementation vocabulary unless the user truly needs it.

### Helper Text

Helper text should explain:
- what a setting affects
- when it matters
- what the common or safe choice is

Helper text should not merely repeat the label in longer words.

### Tooltips And Docs

Tooltips are for:
- short clarifications
- acronym expansion
- edge-case warnings

Longer conceptual explanations should link to deeper documentation or in-product help.

Advanced settings should be understandable through:
- grouping
- labels
- helper text
- optional linked documentation

not by expecting the user to read raw source or trial-and-error behavior.

## Accessibility And Robustness

The interface should remain usable on:
- desktop LuCI browser sessions
- narrower tablet-sized widths
- reduced-motion preferences where applicable

Minimum rules:
- keyboard-reachable primary flows
- visible focus states
- status not expressed by color alone
- readable contrast for muted/help text
- destructive actions clearly differentiated

## Design Constraints For Later Implementation

These constraints should govern regenerated Epic 5 work:
- do not optimize the UI around legacy page names or legacy control groupings
- do not add more bespoke primitives unless a stable repeated need exists
- do not let external dashboards become the primary Clash Nivo experience
- do keep external dashboard access as a supported integration
- do make advanced/system settings explainable in context
- do preserve a clear distinction between source management, composition, and system maintenance

## Outcome

Clash Nivo v1 should present as:
- a clean operational control surface
- with explicit actions
- strong state visibility
- a small and disciplined component layer
- enough in-context explanation for advanced features
- and a visual system that supports repeat admin use rather than novelty
