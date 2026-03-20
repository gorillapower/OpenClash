#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
REPO_ROOT="$(CDPATH= cd -- "$SCRIPT_DIR/../.." && pwd)"
CLASSIFICATION_FILE="$SCRIPT_DIR/openclash-legacy-classification.tsv"

if ! command -v rg >/dev/null 2>&1; then
  echo "error: ripgrep (rg) is required for this validation command" >&2
  exit 2
fi

if [[ ! -f "$CLASSIFICATION_FILE" ]]; then
  echo "error: missing classification file: $CLASSIFICATION_FILE" >&2
  exit 2
fi

declare -a category_order=(
  "active_behavioral_risk"
  "packaging_install_risk"
  "intentional_coexistence_reference"
  "upstream_source_policy_reference"
  "runtime_naming_debt"
  "docs_migration_reference"
  "tooling_reference"
)

declare -a rule_categories=()
declare -a rule_patterns=()
declare -a rule_reasons=()

while IFS=$'\t' read -r category pattern reason; do
  [[ -z "${category:-}" ]] && continue
  [[ "${category:0:1}" == "#" ]] && continue
  rule_categories+=("$category")
  rule_patterns+=("$pattern")
  rule_reasons+=("$reason")
done < "$CLASSIFICATION_FILE"

classify_path() {
  local path="$1"
  local i
  for ((i=0; i<${#rule_patterns[@]}; i++)); do
    if [[ "$path" =~ ${rule_patterns[$i]} ]]; then
      printf '%s\t%s\n' "${rule_categories[$i]}" "${rule_reasons[$i]}"
      return 0
    fi
  done
  return 1
}

echo "Legacy OpenClash reference classification"
echo "Repo: $REPO_ROOT"
echo "Classification file: $CLASSIFICATION_FILE"
echo

matches="$(cd "$REPO_ROOT" && rg -n "openclash|OpenClash" . \
  -g '!luci-app-clashnivo/ui/node_modules' \
  -g '!luci-app-clashnivo/ui/dist/assets/*' \
  -g '!.git' || true)"

if [[ -z "$matches" ]]; then
  echo "PASS: no legacy OpenClash references found"
  exit 0
fi

tmp_dir="$(mktemp -d)"
classified_file="$tmp_dir/classified.tsv"
unknown_file="$tmp_dir/unknown.txt"

cleanup() {
  rm -rf "$tmp_dir"
}
trap cleanup EXIT

unknown_count=0
total_count=0

while IFS= read -r line; do
  [[ -z "$line" ]] && continue
  total_count=$((total_count + 1))
  path="${line%%:*}"
  path="${path#./}"

  if classification="$(classify_path "$path")"; then
    category="${classification%%$'\t'*}"
    reason="${classification#*$'\t'}"
    printf '%s\t%s\t%s\n' "$category" "$path" "$reason" >> "$classified_file"
  else
    unknown_count=$((unknown_count + 1))
    printf '%s\n' "$line" >> "$unknown_file"
  fi
done <<< "$matches"

echo "Summary:"
echo "- total references: $total_count"
for category in "${category_order[@]}"; do
  count="$(awk -F'\t' -v category="$category" '$1 == category {count++} END {print count+0}' "$classified_file" 2>/dev/null || true)"
  [[ "$count" -eq 0 ]] && continue
  printf -- "- %s: %s\n" "$category" "$count"
  example="$(awk -F'\t' -v category="$category" '$1 == category {print $2; exit}' "$classified_file" 2>/dev/null || true)"
  printf -- "  example: %s\n" "$example"
done

echo
if [[ "$unknown_count" -gt 0 ]]; then
  echo "FAIL: found $unknown_count unclassified legacy OpenClash reference(s)"
  echo
  cat "$unknown_file"
  echo
  echo "Every remaining reference must be classified, even if it is still accepted debt."
  exit 1
fi

echo "PASS: all legacy OpenClash references are classified"
echo "Note: this validator does not claim the remaining references are acceptable."
echo "It proves they are accounted for by the audit and classification file."
