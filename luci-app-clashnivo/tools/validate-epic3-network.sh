#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
REPO_ROOT="$(CDPATH= cd -- "$SCRIPT_DIR/../.." && pwd)"

if ! command -v rg >/dev/null 2>&1; then
	echo "error: ripgrep (rg) is required for this validation command" >&2
	exit 2
fi

failures=0

print_heading() {
	echo
	echo "== $1 =="
}

report_pass() {
	echo "PASS: $1"
}

report_fail() {
	echo "FAIL: $1"
}

run_rg_check() {
	local label="$1"
	local pattern="$2"
	shift 2

	local output
	output="$(cd "$REPO_ROOT" && rg -n "$pattern" "$@" || true)"
	if [[ -n "$output" ]]; then
		report_fail "$label"
		echo "$output"
		failures=$((failures + 1))
	else
		report_pass "$label"
	fi
}

run_rg_presence_check() {
	local label="$1"
	local pattern="$2"
	shift 2

	local output
	output="$(cd "$REPO_ROOT" && rg -n "$pattern" "$@" || true)"
	if [[ -n "$output" ]]; then
		report_pass "$label"
		echo "$output"
	else
		report_fail "$label"
		failures=$((failures + 1))
	fi
}

echo "Epic 3 network validation"
echo "Repo: $REPO_ROOT"

print_heading "Scope"
cat <<'EOF'
Included:
- service-owned network, firewall, DNS, routing, and orchestration modules
- lifecycle callsite validation for start/stop/reload network sequencing
- direct routing command leakage checks in active service/orchestration codepaths

Intentionally excluded during transition:
- inherited firewall/dns/routing function bodies that still live in root/etc/init.d/clashnivo
- broader runtime/update internals outside the active Epic 3 network ownership boundary
EOF

print_heading "Service Network Module Presence"
run_rg_presence_check \
	"service env sources the network orchestration module" \
	"service/orchestration\\.sh" \
	"luci-app-clashnivo/root/usr/share/clashnivo/service/env.sh"

print_heading "Lifecycle Boundary"
run_rg_check \
	"service lifecycle should not call firewall or dns module helpers directly" \
	"clashnivo_service_(firewall_cleanup|firewall_apply|dns_restore_runtime_state|dns_cleanup_files)" \
	"luci-app-clashnivo/root/usr/share/clashnivo/service/lifecycle.sh"

run_rg_presence_check \
	"core status start/reload flow should go through network orchestration helper" \
	"clashnivo_service_network_apply_runtime" \
	"luci-app-clashnivo/root/etc/init.d/clashnivo"

print_heading "Routing Command Ownership"
run_rg_check \
	"direct ip rule/route mutation should stay out of lifecycle code" \
	"ip( -6)? rule (add|del)|ip( -6)? route (add|del)" \
	"luci-app-clashnivo/root/usr/share/clashnivo/service/lifecycle.sh"

run_rg_check \
	"direct ip rule/route mutation should stay out of orchestration module" \
	"ip( -6)? rule (add|del)|ip( -6)? route (add|del)" \
	"luci-app-clashnivo/root/usr/share/clashnivo/service/orchestration.sh"

print_heading "Result"
if [[ "$failures" -gt 0 ]]; then
	echo "Epic 3 network validation found $failures failing check(s)."
	exit 1
fi

echo "Epic 3 network validation passed."
