#!/bin/sh
set -eu

repo_root="$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)"
cd "$repo_root"

fail=0

check_no_match() {
  pattern="$1"
  shift
  if rg -n "$pattern" "$@" >/dev/null 2>&1; then
    echo "FAIL: unexpected match for pattern [$pattern] in $*"
    rg -n "$pattern" "$@" || true
    fail=1
  fi
}

check_match() {
  pattern="$1"
  shift
  if ! rg -n "$pattern" "$@" >/dev/null 2>&1; then
    echo "FAIL: expected pattern [$pattern] in $*"
    fail=1
  fi
}

check_match 'service/update\.sh' luci-app-clashnivo/root/usr/share/clashnivo/service/env.sh
check_match 'update_status\(' luci-app-clashnivo/root/etc/init.d/clashnivo
check_match 'update_core\(' luci-app-clashnivo/root/etc/init.d/clashnivo
check_match 'update_core_latest\(' luci-app-clashnivo/root/etc/init.d/clashnivo
check_match 'update_package\(' luci-app-clashnivo/root/etc/init.d/clashnivo
check_match 'update_package_latest\(' luci-app-clashnivo/root/etc/init.d/clashnivo
check_match 'update_assets\(' luci-app-clashnivo/root/etc/init.d/clashnivo
check_no_match 'api\.github\.com/repos/MetaCubeX/mihomo/releases/latest' luci-app-clashnivo/luasrc/clashnivo/backend.lua
check_no_match '/usr/share/clashnivo/openclash_core\.sh' luci-app-clashnivo/luasrc/clashnivo/backend.lua
check_no_match 'openclash_version\.sh' luci-app-clashnivo/luasrc/clashnivo/backend.lua luci-app-clashnivo/luasrc/controller/clash_nivo_rpc.lua
check_no_match 'openclash_update\.sh' luci-app-clashnivo/luasrc/clashnivo/backend.lua luci-app-clashnivo/luasrc/controller/clash_nivo_rpc.lua
check_match 'update_core_latest' luci-app-clashnivo/luasrc/clashnivo/backend.lua
check_match 'update_core' luci-app-clashnivo/luasrc/clashnivo/backend.lua
check_match 'update_status' luci-app-clashnivo/luasrc/clashnivo/backend.lua

exit "$fail"
