#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
package_root="$(cd "$script_dir/.." && pwd)"
skeleton_root="$package_root/templates/repo-skeleton"
tracking_root="$package_root/templates/tracking"

target_dir="$PWD"
framework_root=""
tracker=""
tier=""
project_mode=""
roadmap_label=""
planning_label=""
execution_label=""
defect_label=""
patch_lane=""
verification_mode=""
ai_policy=""
force=0
dry_run=0
interactive=0

if [[ -t 0 && -t 1 ]]; then
  interactive=1
fi

usage() {
  cat <<EOF
Usage:
  install.sh [options]

Options:
  --target PATH                 Target repo directory. Default: current directory.
  --framework-root PATH         Repo-relative framework root. Default: framework
  --tracker VALUE               generic | github | azure-devops
  --tier VALUE                  medium | large
  --project-mode VALUE          greenfield | brownfield
  --roadmap-label VALUE         Local roadmap label. Default: Epic
  --planning-label VALUE        Local planning label. Default: Feature
  --execution-label VALUE       Local execution label. Default: Task
  --defect-label VALUE          Local defect label. Default: Bug
  --patch-lane VALUE            enabled | disabled
  --verification-mode VALUE     light | standard | strict
  --ai-policy VALUE             Free-text AI execution policy summary
  --force                       Overwrite framework-managed files if they already exist
  --dry-run                     Show planned actions without writing files
  --non-interactive             Use defaults for omitted values
  --help                        Show this help
EOF
}

log() {
  printf '%s\n' "$*"
}

fail() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

normalize_choice() {
  printf '%s' "$1" | tr '[:upper:]' '[:lower:]'
}

prompt_default() {
  local prompt="$1"
  local default_value="$2"
  local response
  printf '%s [%s]: ' "$prompt" "$default_value" >&2
  IFS= read -r response || true
  if [[ -z "$response" ]]; then
    printf '%s' "$default_value"
  else
    printf '%s' "$response"
  fi
}

require_choice() {
  local label="$1"
  local value="$2"
  shift 2
  local normalized
  local option
  normalized="$(normalize_choice "$value")"
  for option in "$@"; do
    if [[ "$normalized" == "$option" ]]; then
      printf '%s' "$normalized"
      return 0
    fi
  done
  fail "invalid ${label}: $value"
}

yaml_escape() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

ensure_parent_dir() {
  local file_path="$1"
  local parent_dir
  parent_dir="$(dirname "$file_path")"
  if [[ "$dry_run" -eq 1 ]]; then
    log "mkdir -p $parent_dir"
  else
    mkdir -p "$parent_dir"
  fi
}

copy_file() {
  local source_path="$1"
  local dest_path="$2"
  ensure_parent_dir "$dest_path"
  if [[ "$dry_run" -eq 1 ]]; then
    log "copy $source_path -> $dest_path"
  else
    cp "$source_path" "$dest_path"
  fi
}

copy_template_file() {
  local source_path="$1"
  local dest_path="$2"
  ensure_parent_dir "$dest_path"
  if [[ "$dry_run" -eq 1 ]]; then
    log "copy $source_path -> $dest_path"
  else
    sed "s#<framework-root>#$framework_root#g" "$source_path" > "$dest_path"
  fi
}

start_write() {
  local dest_path="$1"
  ensure_parent_dir "$dest_path"
  if [[ "$dry_run" -eq 1 ]]; then
    log "write $dest_path"
    return 1
  fi
  return 0
}

verification_lines() {
  case "$verification_mode" in
    light)
      cat <<EOF
- Verification is required on all non-trivial work.
- Testing is part of verification.
- Prefer targeted automated checks where stable behavior is affected.
- Manual verification is acceptable for low-risk local changes when automation is not practical.
EOF
      ;;
    standard)
      cat <<EOF
- Verification is required on all non-trivial work.
- Testing is part of verification.
- Unit tests are expected when stable logic changes.
- Contract tests are expected when stable interfaces change.
- Integration checks are expected when subsystem interaction changes materially.
EOF
      ;;
    strict)
      cat <<EOF
- Verification is required on all non-trivial work.
- Testing is part of verification.
- Unit tests are required when stable logic changes.
- Contract tests are required when stable interfaces change.
- Integration coverage should be added or updated when subsystem interaction changes materially.
- If automated coverage is deferred, record the reason explicitly in the work item.
EOF
      ;;
  esac
}

write_project_profile() {
  local dest_path="$1"
  if ! start_write "$dest_path"; then
    return 0
  fi
  {
    cat <<EOF
# Project Profile

## Purpose

Record the operating profile chosen for this repo.

## Project Tier

- Tier: \`$tier_display\`
- Project mode: \`$project_mode_display\`

## Tracker Model

- Tracker: \`$tracker_display\`

## Activation Model

- Framework becomes active after repo setup.
- Framework root: \`$framework_root\`
- Patch fast path: \`$patch_lane_display\`

## Verification Policy

EOF
    verification_lines
    cat <<EOF

## AI Execution Policy

- $ai_policy
EOF
  } > "$dest_path"
}

write_hierarchy_map() {
  local dest_path="$1"
  if ! start_write "$dest_path"; then
    return 0
  fi
  cat > "$dest_path" <<EOF
# Hierarchy Map

## Purpose

Map framework roles to this project's local planning and tracking vocabulary.

## Active Mapping

- Roadmap layer: \`$roadmap_label\`
- Planning layer: \`$planning_label\`
- Execution layer: \`$execution_label\`
- Defect layer: \`$defect_label\`
- Decision layer: \`Decision Doc\`
- Architecture layer: \`Architecture Doc\`

## Rule

Keep the roles stable even if the local labels differ across trackers or teams.
EOF
}

write_work_classification() {
  local dest_path="$1"
  if ! start_write "$dest_path"; then
    return 0
  fi
  {
    cat <<EOF
# Work Classification

## Purpose

Define the work lanes for this repo and the minimum required ceremony for each
lane.

## Active Lanes

EOF
    if [[ "$patch_lane" == "enabled" ]]; then
      cat <<EOF
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

EOF
    fi
    cat <<EOF
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
EOF
  } > "$dest_path"
}

write_setup_summary() {
  local dest_path="$1"
  if ! start_write "$dest_path"; then
    return 0
  fi
  cat > "$dest_path" <<EOF
# Setup Summary

## Summary

Initial framework setup completed on \`$timestamp\`.

## Recorded Decisions

- Project mode: $project_mode_display
- Project tier: $tier_display
- Framework root: $framework_root
- Tracker: $tracker_display
- Hierarchy: roadmap=\`$roadmap_label\`, planning=\`$planning_label\`, execution=\`$execution_label\`, defect=\`$defect_label\`
- Work classes: $work_class_summary
- Verification policy: $verification_mode
- Patch fast path: $patch_lane_display
- AI execution policy: $ai_policy
EOF
}

write_yaml_profile() {
  local dest_path="$1"
  if ! start_write "$dest_path"; then
    return 0
  fi
  {
    cat <<EOF
framework:
  name: ai-compatible-development-rhythm
  active: true
  root: "$yaml_framework_root"
project:
  mode: $project_mode
  tier: $tier
  tracker: $tracker
activation:
  auto_when_configured: true
  patch_lane_enabled: $patch_lane_bool
workflow:
  hierarchy:
    roadmap: "$yaml_roadmap_label"
    planning: "$yaml_planning_label"
    execution: "$yaml_execution_label"
    defect: "$yaml_defect_label"
  work_classes:
EOF
    if [[ "$patch_lane" == "enabled" ]]; then
      cat <<EOF
    - "Patch"
EOF
    fi
    cat <<EOF
    - "Standard Change"
    - "Structural Change"
    - "Decision Change"
verification:
  mode: $verification_mode
  tests_are_part_of_verification: true
EOF
  } > "$dest_path"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --target) target_dir="$2"; shift 2 ;;
    --framework-root) framework_root="$2"; shift 2 ;;
    --tracker) tracker="$2"; shift 2 ;;
    --tier) tier="$2"; shift 2 ;;
    --project-mode) project_mode="$2"; shift 2 ;;
    --roadmap-label) roadmap_label="$2"; shift 2 ;;
    --planning-label) planning_label="$2"; shift 2 ;;
    --execution-label) execution_label="$2"; shift 2 ;;
    --defect-label) defect_label="$2"; shift 2 ;;
    --patch-lane) patch_lane="$2"; shift 2 ;;
    --verification-mode) verification_mode="$2"; shift 2 ;;
    --ai-policy) ai_policy="$2"; shift 2 ;;
    --force) force=1; shift ;;
    --dry-run) dry_run=1; shift ;;
    --non-interactive) interactive=0; shift ;;
    --help) usage; exit 0 ;;
    *) fail "unknown argument: $1" ;;
  esac
done

if [[ "$interactive" -eq 1 ]]; then
  [[ -n "$framework_root" ]] || framework_root="$(prompt_default "Framework root" "framework")"
  [[ -n "$project_mode" ]] || project_mode="$(prompt_default "Project mode (greenfield/brownfield)" "brownfield")"
  [[ -n "$tier" ]] || tier="$(prompt_default "Project tier (medium/large)" "medium")"
  [[ -n "$tracker" ]] || tracker="$(prompt_default "Tracker (generic/github/azure-devops)" "generic")"
  [[ -n "$roadmap_label" ]] || roadmap_label="$(prompt_default "Roadmap label" "Epic")"
  [[ -n "$planning_label" ]] || planning_label="$(prompt_default "Planning label" "Feature")"
  [[ -n "$execution_label" ]] || execution_label="$(prompt_default "Execution label" "Task")"
  [[ -n "$defect_label" ]] || defect_label="$(prompt_default "Defect label" "Bug")"
  [[ -n "$patch_lane" ]] || patch_lane="$(prompt_default "Patch fast path (enabled/disabled)" "enabled")"
  [[ -n "$verification_mode" ]] || verification_mode="$(prompt_default "Verification mode (light/standard/strict)" "standard")"
  [[ -n "$ai_policy" ]] || ai_policy="$(prompt_default "AI execution policy summary" "Replace with local rules for whether AI may commit, publish, or only propose.")"
fi

framework_root="${framework_root:-framework}"
framework_root="${framework_root#/}"
framework_root="${framework_root%/}"
[[ -n "$framework_root" ]] || fail "framework root must not be empty"
project_mode="$(require_choice "project mode" "${project_mode:-brownfield}" greenfield brownfield)"
tier="$(require_choice "tier" "${tier:-medium}" medium large)"
tracker="$(require_choice "tracker" "${tracker:-generic}" generic github azure-devops)"
patch_lane="$(require_choice "patch lane" "${patch_lane:-enabled}" enabled disabled)"
verification_mode="$(require_choice "verification mode" "${verification_mode:-standard}" light standard strict)"

roadmap_label="${roadmap_label:-Epic}"
planning_label="${planning_label:-Feature}"
execution_label="${execution_label:-Task}"
defect_label="${defect_label:-Bug}"
ai_policy="${ai_policy:-Replace with local rules for whether AI may commit, publish, or only propose.}"

mkdir -p "$target_dir"
target_dir="$(cd "$target_dir" && pwd)"

case "$tracker" in
  generic) tracker_display="Generic" ;;
  github) tracker_display="GitHub" ;;
  azure-devops) tracker_display="Azure DevOps" ;;
esac

case "$tier" in
  medium) tier_display="Medium" ;;
  large) tier_display="Large" ;;
esac

case "$project_mode" in
  greenfield) project_mode_display="Greenfield" ;;
  brownfield) project_mode_display="Brownfield" ;;
esac

if [[ "$patch_lane" == "enabled" ]]; then
  patch_lane_display="Enabled"
  patch_lane_bool="true"
  work_class_summary="Patch, Standard Change, Structural Change, Decision Change"
else
  patch_lane_display="Disabled"
  patch_lane_bool="false"
  work_class_summary="Standard Change, Structural Change, Decision Change"
fi

timestamp="$(date '+%Y-%m-%d %H:%M:%S %z')"
yaml_framework_root="$(yaml_escape "$framework_root")"
yaml_roadmap_label="$(yaml_escape "$roadmap_label")"
yaml_planning_label="$(yaml_escape "$planning_label")"
yaml_execution_label="$(yaml_escape "$execution_label")"
yaml_defect_label="$(yaml_escape "$defect_label")"

framework_dir="$target_dir/$framework_root"
decision_dir="$framework_dir/decision"
architecture_dir="$framework_dir/architecture"
project_rhythm_path="$framework_dir/project-rhythm.md"
execution_plan_path="$framework_dir/execution-plan.md"

declare -a managed_files
managed_files=(
  "$framework_dir/README.md"
  "$framework_dir/project-profile.md"
  "$framework_dir/hierarchy-map.md"
  "$framework_dir/work-classification.md"
  "$framework_dir/setup-summary.md"
  "$framework_dir/work-item-template.md"
  "$project_rhythm_path"
  "$execution_plan_path"
  "$decision_dir/README.md"
  "$decision_dir/0001-product-boundary.md"
  "$decision_dir/0002-service-contract.md"
  "$architecture_dir/README.md"
  "$architecture_dir/repo-layout.md"
  "$target_dir/.ai-compatible-rhythm.yaml"
)

if [[ "$tracker" == "github" ]]; then
  managed_files+=("$target_dir/.github/ISSUE_TEMPLATE/ai_task.md")
fi
if [[ "$tracker" == "azure-devops" ]]; then
  managed_files+=("$framework_dir/work-item-template.azure-devops.md")
fi

if [[ "$force" -ne 1 ]]; then
  declare -a conflicts
  conflicts=()
  for path in "${managed_files[@]}"; do
    if [[ -e "$path" ]]; then
      conflicts+=("$path")
    fi
  done
  if [[ "${#conflicts[@]}" -gt 0 ]]; then
    printf 'Refusing to overwrite existing framework-managed files:\n' >&2
    printf '  %s\n' "${conflicts[@]}" >&2
    printf 'Use --force to overwrite them.\n' >&2
    exit 1
  fi
fi

log "Installing AI-Compatible Development Rhythm into: $target_dir"
log "Framework root: $framework_root"
log "Tracker: $tracker_display"
log "Tier: $tier_display"
log "Project mode: $project_mode_display"
log "Patch fast path: $patch_lane_display"
log "Verification mode: $verification_mode"
log "YAML runtime profile: included"

copy_template_file "$skeleton_root/docs/framework/README.md" "$framework_dir/README.md"
copy_template_file "$skeleton_root/docs/project-rhythm.md" "$project_rhythm_path"
copy_file "$skeleton_root/docs/execution-plan.md" "$execution_plan_path"
copy_template_file "$skeleton_root/docs/decision/README.md" "$decision_dir/README.md"
copy_file "$skeleton_root/docs/decision/0001-product-boundary.md" "$decision_dir/0001-product-boundary.md"
copy_file "$skeleton_root/docs/decision/0002-service-contract.md" "$decision_dir/0002-service-contract.md"
copy_template_file "$skeleton_root/docs/architecture/README.md" "$architecture_dir/README.md"
copy_file "$skeleton_root/docs/architecture/repo-layout.md" "$architecture_dir/repo-layout.md"

if [[ "$tracker" == "azure-devops" ]]; then
  copy_file "$tracking_root/azure-devops/work-item-template.md" "$framework_dir/work-item-template.md"
  copy_file "$tracking_root/azure-devops/work-item-template.md" "$framework_dir/work-item-template.azure-devops.md"
else
  copy_file "$tracking_root/generic/work-item-template.md" "$framework_dir/work-item-template.md"
fi

if [[ "$tracker" == "github" ]]; then
  copy_file "$tracking_root/github/ISSUE_TEMPLATE/ai_task.md" "$target_dir/.github/ISSUE_TEMPLATE/ai_task.md"
fi

write_project_profile "$framework_dir/project-profile.md"
write_hierarchy_map "$framework_dir/hierarchy-map.md"
write_work_classification "$framework_dir/work-classification.md"
write_setup_summary "$framework_dir/setup-summary.md"
write_yaml_profile "$target_dir/.ai-compatible-rhythm.yaml"

log "Framework files materialized."
if [[ "$dry_run" -eq 1 ]]; then
  log "Dry run only. No files were written."
else
  log "Next steps:"
  log "  1. Run the skill-led setup wizard to assess the repo and author the initial framework content"
  log "  2. Review $framework_root/project-profile.md and $framework_root/hierarchy-map.md"
  log "  3. Use $framework_root/work-item-template.md (or the tracker-specific variant) after the authored setup pass completes"
fi
