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

run_find_check() {
	local label="$1"
	shift

	local output
	output="$(cd "$REPO_ROOT" && find "$@" 2>/dev/null | sort || true)"
	if [[ -n "$output" ]]; then
		report_fail "$label"
		echo "$output"
		failures=$((failures + 1))
	else
		report_pass "$label"
	fi
}

echo "Epic 1 boundary validation"
echo "Repo: $REPO_ROOT"

print_heading "Scope"
cat <<'EOF'
Included:
- LuCI controllers, LuCI backend adapter, package/build surfaces, and UI source tree
- namespace leakage checks for active Clash Nivo boundary codepaths
- direct controller-to-runtime hardcoding checks
- local UI artifact leakage checks

Intentionally excluded during transition:
- the inherited init script and service implementation under root/etc/init.d/
- inherited helper implementation internals under root/usr/share/clashnivo/{runtime,update,lib,import}
- translation strings and copied upstream test content outside the Epic 1 boundary scope
- full CI wiring for the whole project
EOF

print_heading "Namespace Leakage In Epic 1 Boundary Paths"
run_rg_check \
	"legacy openclash naming in active package/LuCI boundary paths" \
	"openclash|OpenClash" \
	"luci-app-clashnivo/Makefile" \
	"luci-app-clashnivo/luasrc" \
	"luci-app-clashnivo/root/etc/uci-defaults" \
	"luci-app-clashnivo/root/usr/share/rpcd" \
	"luci-app-clashnivo/root/usr/share/ucitrack"

print_heading "LuCI Controller Boundary"
run_rg_check \
	"direct runtime hardcoding inside LuCI controllers" \
	"/etc/init\\.d/clashnivo|/usr/share/clashnivo/[^\"'[:space:]]+|pidof (clash|mihomo)|curl -sf --max-time 5|ubus call service list|tail -n [0-9]|find /etc/clashnivo/config|ls /etc/clashnivo/config" \
	"luci-app-clashnivo/luasrc/controller"

print_heading "LuCI Backend Adapter Transitional Debt"
run_rg_check \
	"legacy runtime targets still hidden behind luci.clashnivo.backend" \
	"openclash|OpenClash|pidof (clash|mihomo)|curl -sf --max-time 5" \
	"luci-app-clashnivo/luasrc/clashnivo/backend.lua"

print_heading "UI Workspace Leakage"
run_find_check \
	"local UI development artifacts present under luci-app-clashnivo/ui" \
	"luci-app-clashnivo/ui" \
	\( -type d \( -name node_modules -o -name test-results \) -prune -print \) -o \
	\( -name .DS_Store -print \)

print_heading "Result"
if [[ "$failures" -gt 0 ]]; then
	echo "Epic 1 boundary validation found $failures failing check(s)."
	echo "This is expected until later tickets remove inherited OpenClash coupling and local UI junk."
	exit 1
fi

echo "Epic 1 boundary validation passed."
