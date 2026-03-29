#!/bin/sh

set -eu

COMPARE_LOG_FILE=/tmp/clashnivo_compare_debug.log
BACKUP_INIT=/tmp/clashnivo.init.backup
BACKUP_GUARD=/tmp/clashnivo.guard.backup
BACKUP_COMPOSITION=/tmp/clashnivo.composition.backup

cat > /tmp/clashnivo_backend_status.lua <<'LUA'
package.path = '/usr/lib/lua/?.lua;/usr/lib/lua/?/init.lua;' .. package.path
package.cpath = '/usr/lib/lua/?.so;/usr/lib/lua/loadall.so;' .. package.cpath
local backend = require('luci.clashnivo.backend')
local json = require('luci.jsonc')
print(json.stringify(backend.service_status()))
LUA

cat > /tmp/clashnivo_backend_field.lua <<'LUA'
package.path = '/usr/lib/lua/?.lua;/usr/lib/lua/?/init.lua;' .. package.path
package.cpath = '/usr/lib/lua/?.so;/usr/lib/lua/loadall.so;' .. package.cpath
local backend = require('luci.clashnivo.backend')
local field = arg[1]
local status = backend.service_status()
local value = status[field]
if value == nil then os.exit(2) end
if type(value) == 'boolean' then
  io.write(value and 'true' or 'false')
elseif type(value) == 'number' then
  io.write(tostring(value))
else
  io.write(tostring(value))
end
io.write('\n')
LUA

was_openclash=0
if /etc/init.d/openclash status >/dev/null 2>&1; then
  was_openclash=1
fi

restore_files() {
  if [ -f "$BACKUP_INIT" ]; then
    cp "$BACKUP_INIT" /etc/init.d/clashnivo
    chmod 0755 /etc/init.d/clashnivo
  fi
  if [ -f "$BACKUP_GUARD" ]; then
    cp "$BACKUP_GUARD" /usr/share/clashnivo/service/guard.sh
    chmod 0644 /usr/share/clashnivo/service/guard.sh
  fi
  if [ -f "$BACKUP_COMPOSITION" ]; then
    cp "$BACKUP_COMPOSITION" /usr/share/clashnivo/service/composition.sh
    chmod 0644 /usr/share/clashnivo/service/composition.sh
  fi
}

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

status_json() {
  lua5.1 /tmp/clashnivo_backend_status.lua || true
}

status_field() {
  lua5.1 /tmp/clashnivo_backend_field.lua "$1" 2>/dev/null || true
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
  restore_files
  bounded_stop
  if [ "$was_openclash" -eq 1 ]; then
    /etc/init.d/openclash start >/tmp/openclash.restore.out 2>&1 || /etc/init.d/openclash restart >/tmp/openclash.restore.out 2>&1 || true
    sleep 5
  fi
}
trap cleanup EXIT INT TERM

cp /etc/init.d/clashnivo "$BACKUP_INIT"
cp /usr/share/clashnivo/service/guard.sh "$BACKUP_GUARD"
cp /usr/share/clashnivo/service/composition.sh "$BACKUP_COMPOSITION"
cp /tmp/clashnivo.guard.test /usr/share/clashnivo/service/guard.sh
cp /tmp/clashnivo.composition.test /usr/share/clashnivo/service/composition.sh
chmod 0644 /usr/share/clashnivo/service/guard.sh
chmod 0644 /usr/share/clashnivo/service/composition.sh
rm -f "$COMPARE_LOG_FILE" /tmp/clashnivo.compare.start.out /tmp/clashnivo.stop.recovery.out /tmp/openclash.stop.test.out /tmp/openclash.restore.out
cp /tmp/clashnivo.compare.init.test /etc/init.d/clashnivo
chmod 0755 /etc/init.d/clashnivo

echo '--- BEFORE ---'
status_json

echo '--- STOP OPENCLASH ---'
/etc/init.d/openclash stop >/tmp/openclash.stop.test.out 2>&1 || true
count=0
while [ "$count" -lt 30 ]; do
  active=$(status_field openclash_active)
  echo "--- OPENCLASH POLL $count active=${active:-unknown} ---"
  status_json
  [ "$active" = "false" ] && break
  sleep 1
  count=$((count + 1))
done

if [ "$(status_field openclash_active)" != "false" ]; then
  echo '--- OPENCLASH DID NOT CLEAR ---'
  exit 1
fi

echo '--- START DIRECT COMPARE ---'
ADD_CHECK_RUN_QUICK="${ADD_CHECK_RUN_QUICK:-0}" \
ADD_OVERWRITE_FILE="${ADD_OVERWRITE_FILE:-0}" \
ADD_DO_RUN_FILE="${ADD_DO_RUN_FILE:-0}" \
ADD_COMPOSE="${ADD_COMPOSE:-0}" \
ADD_NETWORK_ENSURE_LOADED="${ADD_NETWORK_ENSURE_LOADED:-0}" \
ADD_CLEAR_START_FAILED="${ADD_CLEAR_START_FAILED:-0}" \
DEBUG_LOG_FILE="$COMPARE_LOG_FILE" \
/etc/init.d/clashnivo start >/tmp/clashnivo.compare.start.out 2>&1 || true

count=0
while [ "$count" -lt 20 ]; do
  echo "--- POLL $count ---"
  status_json
  core_running=$(status_field core_running)
  [ "$core_running" = "true" ] && break
  sleep 1
  count=$((count + 1))
done

echo '--- START STDOUT ---'
cat /tmp/clashnivo.compare.start.out 2>/dev/null || true
echo '--- PROCESS LIST ---'
ps | grep -E '/etc/init.d/clashnivo|/etc/clashnivo/clash -d /etc/clashnivo -f |openclash' | grep -v grep || true
echo '--- DEBUG LOG ---'
cat "$COMPARE_LOG_FILE" 2>/dev/null || true
echo '--- START LOG ---'
tail -n 40 /tmp/clashnivo.log 2>/dev/null || true
echo '--- CORE LOG ---'
tail -n 40 /tmp/clash.log 2>/dev/null || true
