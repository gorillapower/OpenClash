# Setup Prompt

Use this as the conversation contract when a user says things like:

- "Set up AI-Compatible Development Rhythm for this repo"
- "Install the framework here"
- "Initialize this repo with the framework"

## Setup Prompt Behavior

The skill should behave like a setup wizard and follow
`references/setup-protocol.md`.

At a high level:

1. inspect the repo first
2. infer as much as possible
3. summarize the inferred structure and decisions back to the user
4. ask only the minimum necessary questions
5. get explicit confirmation on the proposed model
6. choose the lightest viable operating profile
7. materialize the framework files
8. author the initial project-specific framework content
9. summarize the resulting execution model

## Questions To Ask Only When Needed

Ask only where inspection cannot answer confidently:

- framework root if the repo already has a strong competing convention
- tracker choice when multiple signals exist
- hierarchy labels when team vocabulary is unclear
- patch-lane policy when team preference cannot be inferred
- verification strictness when test maturity is ambiguous
- AI publish/commit policy when governance is unclear

## Confirmation Gate

Before the framework becomes authoritative, the skill should explicitly confirm:

- the inferred architecture and ownership shape
- the inferred product/runtime split
- the tracker and hierarchy mapping
- the verification/testing posture
- the chosen framework root
- any assumptions that will be written into the first-pass framework docs

If the user corrects the inferred model, update the setup inputs before writing
the final framework docs.

## Brownfield Setup Sequence

For brownfield repos:

1. inspect repo structure
2. inspect test surface
3. inspect existing docs and delivery signals
4. infer tracker and hierarchy defaults
5. summarize the inferred model back to the user
6. ask only unresolved questions
7. get explicit confirmation on the proposed framework shape
8. generate the framework files
9. rewrite the generated framework files with repo-specific first-pass content
10. leave the work-item artifact ready for immediate use

## Greenfield Setup Sequence

For greenfield repos:

1. ask for the missing product and delivery assumptions
2. summarize the inferred/proposed framework model back to the user
3. get explicit confirmation
4. choose the process profile
5. generate the framework files
6. author the initial product boundary, architecture intent, execution plan, and working rules
7. leave the work-item artifact ready for immediate use

## Completion Standard

Setup is complete only when:

- `.ai-compatible-rhythm.yaml` exists
- the framework root exists
- the user has confirmed the inferred setup model
- the framework docs contain project-specific first-pass content
- the work-item template is ready to use
- the skill can switch into runtime governance mode for future work
