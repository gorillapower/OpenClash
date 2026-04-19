# Setup Wizard

Use this guide when setting up AI-Compatible Development Rhythm in a repo.

`references/setup-protocol.md` is the authoritative sequence. This file explains
how to use that protocol in practice.

## Goal

Leave the repo with a usable framework, not just copied framework files.
Setup should install the framework, assess the project, and author the first
real framework content.

Setup should stop at execution readiness. It should not turn into a mandatory
deep archaeology exercise before the framework can be used.

## Recommended Entry Point

The intended flow is prompt-driven. The skill should act as the wizard:

1. inspect the repo
2. summarize the inferred setup model
3. ask only the necessary questions
4. get explicit user confirmation
5. choose the operating profile
6. use the scripts as backend generators
7. author the initial framework content

Use the scripts directly only when you need the backend generator behavior:

```bash
tools/ai-compatible-development-rhythm/scripts/setup.sh --target .
```

```powershell
pwsh -File tools/ai-compatible-development-rhythm/scripts/setup.ps1 -Target .
```

Use `install.sh` instead of `setup.sh` when you want to pass explicit
non-interactive flags such as tracker choice, tier, or framework root. Use
`install.ps1` the same way on Windows.

## Assessment Sequence

Follow the ordered phases in `references/setup-protocol.md`. In practice, that
means:

1. Determine whether the repo is greenfield or brownfield.
2. Determine whether the project is medium-sized or large enough to justify the
   framework.
3. Identify the tracker used by the project.
4. Identify the preferred framework root for framework-managed files.
5. Identify the hierarchy terms already used by the team.
6. Decide whether patch-class work should use a lightweight fast path.
7. Define verification and testing expectations.
8. For brownfield repos, inspect the current codebase and existing tests before
   authoring the initial framework.
9. Load brownfield assessment guidance when applicable.
10. Load tracker-specific guidance after tracker detection.
11. Summarize the inferred model back to the user.
12. Ask only the questions that remain ambiguous after inspection.
13. Get explicit confirmation before writing authoritative framework docs.

If the repo appears large, legacy-heavy, or architecturally unclear, the wizard
should recommend the separate mapping workflow in
`references/brownfield-mapping.md`. That mapping pass is optional follow-on
work, not a prerequisite for setup.

## Inputs To Record

- framework root
- project tier
- tracker model
- hierarchy mapping
- work classes
- verification expectations
- patch-lane behavior
- AI execution expectations

## Outputs To Generate

- `<framework-root>/README.md`
- `<framework-root>/project-profile.md`
- `<framework-root>/hierarchy-map.md`
- `<framework-root>/work-classification.md`
- `<framework-root>/setup-summary.md`
- `<framework-root>/project-rhythm.md`
- `<framework-root>/execution-plan.md`
- project-specific first-pass decision docs
- project-specific first-pass architecture docs
- tracker-specific work-item template or guidance
- `.ai-compatible-rhythm.yaml`
- explicit user-confirmed setup assumptions

## Default Recommendation

For most target repos:
- choose the `Standard` profile
- use repo opt-in activation
- allow a lightweight patch path
- require explicit verification on all non-trivial work
- treat testing as part of verification

## Installer Notes

- The scripts are backend generators, not the full setup experience.
- The generator is selective and does not blindly copy the entire skeleton into
  the target repo.
- It refuses to overwrite framework-managed files unless `--force` is passed.
- It always writes the YAML runtime profile.
- It generates tracker-specific artifacts based on the chosen tracker.
- It supports a configurable framework root such as `framework` or `_Docs/framework`.
- Bash and PowerShell variants should produce the same repo-local result.
- A real setup is not complete until the skill has authored the initial
  framework content described in `references/setup-authoring.md`.
- A real setup is not complete until the user has confirmed the inferred setup
  model that will be written into the framework docs.
- A real setup does not need to fully map every subsystem before the framework
  can start governing work.
