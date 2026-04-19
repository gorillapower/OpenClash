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

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$InstallScript = Join-Path $ScriptDir 'install.ps1'

& $InstallScript `
    -Target $Target `
    -FrameworkRoot $FrameworkRoot `
    -Tracker $Tracker `
    -Tier $Tier `
    -ProjectMode $ProjectMode `
    -RoadmapLabel $RoadmapLabel `
    -PlanningLabel $PlanningLabel `
    -ExecutionLabel $ExecutionLabel `
    -DefectLabel $DefectLabel `
    -PatchLane $PatchLane `
    -VerificationMode $VerificationMode `
    -AiPolicy $AiPolicy `
    -Force:$Force `
    -DryRun:$DryRun
