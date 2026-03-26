#!/bin/sh

set -eu

cat > /tmp/clashnivo_backend_status.lua <<'LUA'
package.path = '/usr/lib/lua/?.lua;/usr/lib/lua/?/init.lua;' .. package.path
package.cpath = '/usr/lib/lua/?.so;/usr/lib/lua/loadall.so;' .. package.cpath
local backend = require('luci.clashnivo.backend')
local json = require('luci.jsonc')
print(json.stringify(backend.service_status()))
LUA

was_openclash=0
if /etc/init.d/openclash status >/dev/null 2>&1; then
  was_openclash=1
fi

hard_recover() {
  for pid in $(pgrep -f '/etc/rc.common /etc/init.d/clashnivo' 2>/dev/null); do
    kill -9 "$pid" 2>/dev/null || true
  done
  for pid in $(pgrep -f '/etc/clashnivo/clash -d /etc/clashnivo -f ' 2>/dev/null); do
    kill -9 "$pid" 2>/dev/null || true
  done
  fw4 restart >/dev/null 2>&1 || true
  /etc/init.d/dnsmasq restart >/dev/null 2>&1 || true
}

bounded_stop() {
  /etc/init.d/clashnivo stop >/tmp/clashnivo.stop.recovery.out 2>&1 &
  stop_pid=$!
  waited=0

  while kill -0 "$stop_pid" >/dev/null 2>&1; do
    sleep 1
    waited=$((waited + 1))
    if [ "$waited" -ge 30 ]; then
      echo RECOVERY_FORCE_STOP
      kill -9 "$stop_pid" 2>/dev/null || true
      hard_recover
      return 0
    fi
  done

  wait "$stop_pid" 2>/dev/null || true
}

cleanup() {
  bounded_stop
  if [ "$was_openclash" -eq 1 ]; then
    /etc/init.d/openclash start >/tmp/openclash.restore.out 2>&1 || /etc/init.d/openclash restart >/tmp/openclash.restore.out 2>&1 || true
  fi
}
trap cleanup EXIT INT TERM

echo '--- BEFORE ---'
lua5.1 /tmp/clashnivo_backend_status.lua || true

echo '--- STOP OPENCLASH ---'
/etc/init.d/openclash stop >/tmp/openclash.stop.test.out 2>&1 || true
sleep 5
lua5.1 /tmp/clashnivo_backend_status.lua || true

echo '--- START CLASHNIVO ---'
/etc/init.d/clashnivo start >/tmp/clashnivo.start.test.out 2>&1 || true

count=0
while [ "$count" -lt 20 ]; do
  echo "--- POLL $count ---"
  lua5.1 /tmp/clashnivo_backend_status.lua || true
  sleep 1
  count=$((count + 1))
done

echo '--- START LOG ---'
tail -n 40 /tmp/clashnivo.log 2>/dev/null || true

echo '--- CORE LOG ---'
tail -n 40 /tmp/clash.log 2>/dev/null || true
