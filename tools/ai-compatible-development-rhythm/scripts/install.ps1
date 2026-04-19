#!/usr/bin/env pwsh

[CmdletBinding()]
param(
    [string]$Target = (Get-Location).Path,
    [string]$FrameworkRoot = 'framework',
    [ValidateSet('generic', 'github', 'azure-devops')]
    [string]$Tracker = 'generic',
    [ValidateSet('medium', 'large')]
    [string]$Tier = 'medium',
    [ValidateSet('greenfield', 'brownfield')]
    [string]$ProjectMode = 'brownfield',
    [string]$RoadmapLabel = 'Epic',
    [string]$PlanningLabel = 'Feature',
    [string]$ExecutionLabel = 'Task',
    [string]$DefectLabel = 'Bug',
    [ValidateSet('enabled', 'disabled')]
    [string]$PatchLane = 'enabled',
    [ValidateSet('light', 'standard', 'strict')]
    [string]$VerificationMode = 'standard',
    [string]$AiPolicy = 'Replace with local rules for whether AI may commit, publish, or only propose.',
    [switch]$Force,
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$PackageRoot = Split-Path -Parent $ScriptDir
$SkeletonRoot = Join-Path $PackageRoot 'templates/repo-skeleton'
$TrackingRoot = Join-Path $PackageRoot 'templates/tracking'

function Write-Log {
    param([string]$Message)
    Write-Host $Message
}

function Ensure-ParentDir {
    param([string]$Path)
    $parent = Split-Path -Parent $Path
    if ($DryRun) {
        Write-Log "mkdir $parent"
    } else {
        New-Item -ItemType Directory -Path $parent -Force | Out-Null
    }
}

function Copy-ManagedFile {
    param(
        [string]$SourcePath,
        [string]$DestinationPath
    )
    Ensure-ParentDir -Path $DestinationPath
    if ($DryRun) {
        Write-Log "copy $SourcePath -> $DestinationPath"
    } else {
        Copy-Item -Path $SourcePath -Destination $DestinationPath -Force
    }
}

function Write-ManagedFile {
    param(
        [string]$DestinationPath,
        [string]$Content
    )
    Ensure-ParentDir -Path $DestinationPath
    if ($DryRun) {
        Write-Log "write $DestinationPath"
    } else {
        [System.IO.File]::WriteAllText($DestinationPath, $Content)
    }
}

function Escape-Yaml {
    param([string]$Value)
    return $Value.Replace('\', '\\').Replace('"', '\"')
}

$Target = [System.IO.Path]::GetFullPath($Target)
if (-not (Test-Path -LiteralPath $Target)) {
    New-Item -ItemType Directory -Path $Target -Force | Out-Null
}

$FrameworkRoot = $FrameworkRoot.Trim().TrimStart('/').TrimEnd('/')
if ([string]::IsNullOrWhiteSpace($FrameworkRoot)) {
    throw 'FrameworkRoot must not be empty.'
}

$TrackerDisplay = switch ($Tracker) {
    'generic' { 'Generic' }
    'github' { 'GitHub' }
    'azure-devops' { 'Azure DevOps' }
}

$TierDisplay = switch ($Tier) {
    'medium' { 'Medium' }
    'large' { 'Large' }
}

$ProjectModeDisplay = switch ($ProjectMode) {
    'greenfield' { 'Greenfield' }
    'brownfield' { 'Brownfield' }
}

if ($PatchLane -eq 'enabled') {
    $PatchLaneDisplay = 'Enabled'
    $PatchLaneBool = 'true'
    $WorkClassSummary = 'Patch, Standard Change, Structural Change, Decision Change'
    $YamlWorkClasses = @('    - "Patch"', '    - "Standard Change"', '    - "Structural Change"', '    - "Decision Change"') -join "`n"
    $PatchBlock = @'
## Active Lanes

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

'@
} else {
    $PatchLaneDisplay = 'Disabled'
    $PatchLaneBool = 'false'
    $WorkClassSummary = 'Standard Change, Structural Change, Decision Change'
    $YamlWorkClasses = @('    - "Standard Change"', '    - "Structural Change"', '    - "Decision Change"') -join "`n"
    $PatchBlock = ''
}

$VerificationText = switch ($VerificationMode) {
    'light' {
        @'
- Verification is required on all non-trivial work.
- Testing is part of verification.
- Prefer targeted automated checks where stable behavior is affected.
- Manual verification is acceptable for low-risk local changes when automation is not practical.
'@
    }
    'standard' {
        @'
- Verification is required on all non-trivial work.
- Testing is part of verification.
- Unit tests are expected when stable logic changes.
- Contract tests are expected when stable interfaces change.
- Integration checks are expected when subsystem interaction changes materially.
'@
    }
    'strict' {
        @'
- Verification is required on all non-trivial work.
- Testing is part of verification.
- Unit tests are required when stable logic changes.
- Contract tests are required when stable interfaces change.
- Integration coverage should be added or updated when subsystem interaction changes materially.
- If automated coverage is deferred, record the reason explicitly in the work item.
'@
    }
}

$Timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz'
$YamlFrameworkRoot = Escape-Yaml $FrameworkRoot
$YamlRoadmapLabel = Escape-Yaml $RoadmapLabel
$YamlPlanningLabel = Escape-Yaml $PlanningLabel
$YamlExecutionLabel = Escape-Yaml $ExecutionLabel
$YamlDefectLabel = Escape-Yaml $DefectLabel
$FrameworkDir = Join-Path $Target $FrameworkRoot
$DecisionDir = Join-Path $FrameworkDir 'decision'
$ArchitectureDir = Join-Path $FrameworkDir 'architecture'
$ProjectRhythmPath = Join-Path $FrameworkDir 'project-rhythm.md'
$ExecutionPlanPath = Join-Path $FrameworkDir 'execution-plan.md'

$ManagedFiles = @(
    (Join-Path $FrameworkDir 'README.md'),
    (Join-Path $FrameworkDir 'project-profile.md'),
    (Join-Path $FrameworkDir 'hierarchy-map.md'),
    (Join-Path $FrameworkDir 'work-classification.md'),
    (Join-Path $FrameworkDir 'setup-summary.md'),
    (Join-Path $FrameworkDir 'work-item-template.md'),
    $ProjectRhythmPath,
    $ExecutionPlanPath,
    (Join-Path $DecisionDir 'README.md'),
    (Join-Path $DecisionDir '0001-product-boundary.md'),
    (Join-Path $DecisionDir '0002-service-contract.md'),
    (Join-Path $ArchitectureDir 'README.md'),
    (Join-Path $ArchitectureDir 'repo-layout.md'),
    (Join-Path $Target '.ai-compatible-rhythm.yaml')
)
if ($Tracker -eq 'github') {
    $ManagedFiles += (Join-Path $Target '.github/ISSUE_TEMPLATE/ai_task.md')
}
if ($Tracker -eq 'azure-devops') {
    $ManagedFiles += (Join-Path $FrameworkDir 'work-item-template.azure-devops.md')
}

if (-not $Force) {
    $Conflicts = @($ManagedFiles | Where-Object { Test-Path -LiteralPath $_ })
    if ($Conflicts.Count -gt 0) {
        Write-Error ("Refusing to overwrite existing framework-managed files:`n  " + ($Conflicts -join "`n  ") + "`nUse -Force to overwrite them.")
    }
}

Write-Log "Installing AI-Compatible Development Rhythm into: $Target"
Write-Log "Framework root: $FrameworkRoot"
Write-Log "Tracker: $TrackerDisplay"
Write-Log "Tier: $TierDisplay"
Write-Log "Project mode: $ProjectModeDisplay"
Write-Log "Patch fast path: $PatchLaneDisplay"
Write-Log "Verification mode: $VerificationMode"
Write-Log 'YAML runtime profile: included'

$FrameworkReadme = (Get-Content -Raw (Join-Path $SkeletonRoot 'docs/framework/README.md')).Replace('<framework-root>', $FrameworkRoot)
$ProjectRhythm = (Get-Content -Raw (Join-Path $SkeletonRoot 'docs/project-rhythm.md')).Replace('<framework-root>', $FrameworkRoot)
$DecisionReadme = (Get-Content -Raw (Join-Path $SkeletonRoot 'docs/decision/README.md')).Replace('<framework-root>', $FrameworkRoot)
$ArchitectureReadme = (Get-Content -Raw (Join-Path $SkeletonRoot 'docs/architecture/README.md')).Replace('<framework-root>', $FrameworkRoot)

Write-ManagedFile (Join-Path $FrameworkDir 'README.md') $FrameworkReadme
Write-ManagedFile $ProjectRhythmPath $ProjectRhythm
Copy-ManagedFile (Join-Path $SkeletonRoot 'docs/execution-plan.md') $ExecutionPlanPath
Write-ManagedFile (Join-Path $DecisionDir 'README.md') $DecisionReadme
Copy-ManagedFile (Join-Path $SkeletonRoot 'docs/decision/0001-product-boundary.md') (Join-Path $DecisionDir '0001-product-boundary.md')
Copy-ManagedFile (Join-Path $SkeletonRoot 'docs/decision/0002-service-contract.md') (Join-Path $DecisionDir '0002-service-contract.md')
Write-ManagedFile (Join-Path $ArchitectureDir 'README.md') $ArchitectureReadme
Copy-ManagedFile (Join-Path $SkeletonRoot 'docs/architecture/repo-layout.md') (Join-Path $ArchitectureDir 'repo-layout.md')

if ($Tracker -eq 'azure-devops') {
    Copy-ManagedFile (Join-Path $TrackingRoot 'azure-devops/work-item-template.md') (Join-Path $FrameworkDir 'work-item-template.md')
    Copy-ManagedFile (Join-Path $TrackingRoot 'azure-devops/work-item-template.md') (Join-Path $FrameworkDir 'work-item-template.azure-devops.md')
} else {
    Copy-ManagedFile (Join-Path $TrackingRoot 'generic/work-item-template.md') (Join-Path $FrameworkDir 'work-item-template.md')
}

if ($Tracker -eq 'github') {
    Copy-ManagedFile (Join-Path $TrackingRoot 'github/ISSUE_TEMPLATE/ai_task.md') (Join-Path $Target '.github/ISSUE_TEMPLATE/ai_task.md')
}

$ProjectProfile = @"
# Project Profile

## Purpose

Record the operating profile chosen for this repo.

## Project Tier

- Tier: ``$TierDisplay``
- Project mode: ``$ProjectModeDisplay``

## Tracker Model

- Tracker: ``$TrackerDisplay``

## Activation Model

- Framework becomes active after repo setup.
- Framework root: ``$FrameworkRoot``
- Patch fast path: ``$PatchLaneDisplay``

## Verification Policy

$VerificationText

## AI Execution Policy

- $AiPolicy
"@
Write-ManagedFile (Join-Path $FrameworkDir 'project-profile.md') $ProjectProfile

$HierarchyMap = @"
# Hierarchy Map

## Purpose

Map framework roles to this project's local planning and tracking vocabulary.

## Active Mapping

- Roadmap layer: ``$RoadmapLabel``
- Planning layer: ``$PlanningLabel``
- Execution layer: ``$ExecutionLabel``
- Defect layer: ``$DefectLabel``
- Decision layer: ``Decision Doc``
- Architecture layer: ``Architecture Doc``

## Rule

Keep the roles stable even if the local labels differ across trackers or teams.
"@
Write-ManagedFile (Join-Path $FrameworkDir 'hierarchy-map.md') $HierarchyMap

$WorkClassification = @"
# Work Classification

## Purpose

Define the work lanes for this repo and the minimum required ceremony for each
lane.

## Active Lanes

$PatchBlock### Standard Change

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
"@
Write-ManagedFile (Join-Path $FrameworkDir 'work-classification.md') $WorkClassification

$SetupSummary = @"
# Setup Summary

## Summary

Initial framework setup completed on ``$Timestamp``.

## Recorded Decisions

- Project mode: $ProjectModeDisplay
- Project tier: $TierDisplay
- Framework root: $FrameworkRoot
- Tracker: $TrackerDisplay
- Hierarchy: roadmap=``$RoadmapLabel``, planning=``$PlanningLabel``, execution=``$ExecutionLabel``, defect=``$DefectLabel``
- Work classes: $WorkClassSummary
- Verification policy: $VerificationMode
- Patch fast path: $PatchLaneDisplay
- AI execution policy: $AiPolicy
"@
Write-ManagedFile (Join-Path $FrameworkDir 'setup-summary.md') $SetupSummary

$YamlContent = @"
framework:
  name: ai-compatible-development-rhythm
  active: true
  root: "$YamlFrameworkRoot"
project:
  mode: $ProjectMode
  tier: $Tier
  tracker: $Tracker
activation:
  auto_when_configured: true
  patch_lane_enabled: $PatchLaneBool
workflow:
  hierarchy:
    roadmap: "$YamlRoadmapLabel"
    planning: "$YamlPlanningLabel"
    execution: "$YamlExecutionLabel"
    defect: "$YamlDefectLabel"
  work_classes:
$YamlWorkClasses
verification:
  mode: $VerificationMode
  tests_are_part_of_verification: true
"@
Write-ManagedFile (Join-Path $Target '.ai-compatible-rhythm.yaml') $YamlContent

Write-Log 'Framework files materialized.'
if ($DryRun) {
    Write-Log 'Dry run only. No files were written.'
} else {
    Write-Log 'Next steps:'
    Write-Log '  1. Run the skill-led setup wizard to assess the repo and author the initial framework content'
    Write-Log "  2. Review $FrameworkRoot/project-profile.md and $FrameworkRoot/hierarchy-map.md"
    Write-Log "  3. Use $FrameworkRoot/work-item-template.md (or the tracker-specific variant) after the authored setup pass completes"
}
