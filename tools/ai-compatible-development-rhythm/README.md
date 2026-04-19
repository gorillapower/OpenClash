# AI-Compatible Development Rhythm

AI-Compatible Development Rhythm is a portable framework package for medium and
large software projects that use AI repeatedly during delivery.

This package is intentionally self-contained so it can be migrated into its own
distribution repo later.

## What This Package Contains

- `SKILL.md`
  - operating behavior for AI agents
- `references/`
  - framework explanation, setup guidance, setup protocol, setup authoring
    guidance, brownfield assessment, optional brownfield mapping guidance,
    tracker overlays, variants, and assessment prompt
- `scripts/`
  - backend file-generation helpers for bash and PowerShell
- `templates/repo-skeleton/`
  - repo-local framework docs and starter records generated during setup
- `templates/tracking/`
  - tracker-specific work-item template variants

## Product Model

This package is meant to be:

1. installed as a reusable skill/package
2. explicitly activated per repo
3. used to generate committed framework files inside the target repo

Installing the package alone does not mean a repo has adopted the framework.

## Activation Model

The recommended activation model is:

- installed globally
- activated per repo
- automatic after activation

A repo is considered framework-enabled when it contains:

- `.ai-compatible-rhythm.yaml`
- and the configured framework files under its chosen root, such as `framework/project-profile.md`

The Markdown files are the durable source of truth for humans and other models.
The YAML file is the thin machine-readable runtime profile for activation and automation.

## Setup Flow

Use the setup flow in:

- `references/setup-wizard.md`
- `references/setup-protocol.md`
- `references/setup-prompt.md`

The intended user experience is prompt-driven:

1. the user asks the AI to set up the framework
2. the skill inspects the repo and asks only the necessary questions
3. the skill uses the scripts as backend generators
4. the skill then authors the first real framework content

The authoritative setup sequence lives in `references/setup-protocol.md`.
For higher-fidelity setup output, use `references/brownfield-assessment.md`
for existing repos and the tracker overlays after tracker detection.
For deeper architectural mapping after setup, use
`references/brownfield-mapping.md`.

The scripts are implementation helpers, not the primary user-facing wizard.

Backend examples:

```bash
tools/ai-compatible-development-rhythm/scripts/setup.sh --target .
```

```powershell
pwsh -File tools/ai-compatible-development-rhythm/scripts/setup.ps1 -Target .
```

At a high level, setup should:

1. detect whether the repo is already configured
2. assess the project
3. choose the lightest viable process profile
4. generate the framework files
5. author the initial repo-specific framework content
6. record tracker, hierarchy, work classes, and verification policy

Setup is for execution readiness. It should leave the repo ready to use the
framework on real work, not force a full historical or architectural mapping
exercise up front.

If a repo needs deeper shared understanding before major structural work, use
the separate optional mapping workflow in `references/brownfield-mapping.md`.

## Tracker Support

This package ships with:

- tracker-agnostic work-item guidance
- GitHub work-item template variant
- Azure DevOps work-item template variant

Tracker choice is a setup decision, not a package-wide assumption.

## Generator Layer

The package includes a selective generator rather than a blanket skeleton copy.
That matters because a real repo may already have its own top-level `README.md`
and other files that should not be overwritten.

The generator writes only framework-managed files such as:

- `<framework-root>/README.md`
- `<framework-root>/project-profile.md`
- `<framework-root>/hierarchy-map.md`
- `<framework-root>/work-classification.md`
- `<framework-root>/setup-summary.md`
- `<framework-root>/project-rhythm.md`
- `<framework-root>/execution-plan.md`
- `<framework-root>/decision/`
- `<framework-root>/architecture/`
- tracker-specific work-item artifacts
- `.ai-compatible-rhythm.yaml`

Backend examples:

```bash
tools/ai-compatible-development-rhythm/scripts/setup.sh --target .
tools/ai-compatible-development-rhythm/scripts/install.sh --target . --tracker github --tier medium --non-interactive
tools/ai-compatible-development-rhythm/scripts/install.sh --target . --framework-root _Docs/framework --tracker azure-devops --tier large --non-interactive
```

```powershell
pwsh -File tools/ai-compatible-development-rhythm/scripts/setup.ps1 -Target .
pwsh -File tools/ai-compatible-development-rhythm/scripts/install.ps1 -Target . -Tracker github -Tier medium
pwsh -File tools/ai-compatible-development-rhythm/scripts/install.ps1 -Target . -FrameworkRoot _Docs/framework -Tracker azure-devops -Tier large
```

The generator refuses to overwrite existing framework-managed files unless you
pass `--force`.

These commands materialize the framework files. A complete setup still requires
the skill-led authoring pass described in `references/setup-authoring.md`.

## Platform Support

- `macOS`: supported with `setup.sh` or `install.sh`
- `Linux`: supported with `setup.sh` or `install.sh`
- `Windows`: supported with `setup.ps1` or `install.ps1`
- `Windows + Git Bash`: also supported through the bash scripts if preferred

## Export Guidance

To migrate this package into a standalone repo later:

1. copy the entire `tools/ai-compatible-development-rhythm/` directory
2. preserve relative paths between `SKILL.md`, `references/`, `scripts/`, and
   `templates/`
3. decide whether to keep the installer scripts exactly as-is or adapt them for
   your preferred distribution model

## Recommended Default

Use this framework for medium and large projects.

For smaller repos, adopt only a lightweight subset or skip the framework.
