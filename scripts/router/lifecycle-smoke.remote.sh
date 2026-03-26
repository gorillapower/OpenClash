#!/bin/sh

set -eu

DEBUG_LOG_FILE=/tmp/clashnivo_debug.log
BACKUP_INIT=/tmp/clashnivo.init.backup
BACKUP_LIFECYCLE=/tmp/clashnivo.lifecycle.backup
BACKUP_GUARD=/tmp/clashnivo.guard.backup
export DEBUG_LOG_FILE

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

if value == nil then
  os.exit(2)
end

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
  if [ -f "$BACKUP_LIFECYCLE" ]; then
    cp "$BACKUP_LIFECYCLE" /usr/share/clashnivo/service/lifecycle.sh
    chmod 0644 /usr/share/clashnivo/service/lifecycle.sh
  fi
  if [ -f "$BACKUP_GUARD" ]; then
    cp "$BACKUP_GUARD" /usr/share/clashnivo/service/guard.sh
    chmod 0644 /usr/share/clashnivo/service/guard.sh
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
    state=""
    if [ -r "/proc/${stop_pid}/status" ]; then
      state="$(sed -n 's/^State:[[:space:]]*\\([^[:space:]]*\\).*/\\1/p' "/proc/${stop_pid}/status" 2>/dev/null)"
    fi
    if [ "$state" = "Z" ]; then
      break
    fi
    sleep 1
    waited=$((waited + 1))
    if [ "$waited" -ge 30 ]; then
      echo RECOVERY_FORCE_STOP
      echo "--- STOP PID STATE ---"
      if [ -r "/proc/${stop_pid}/status" ]; then
        sed -n '1,40p' "/proc/${stop_pid}/status" 2>/dev/null || true
      fi
      echo "--- STOP PID CMDLINE ---"
      if [ -r "/proc/${stop_pid}/cmdline" ]; then
        tr '\000' ' ' < "/proc/${stop_pid}/cmdline" 2>/dev/null || true
        echo
      fi
      echo "--- STOP PID WCHAN ---"
      cat "/proc/${stop_pid}/wchan" 2>/dev/null || true
      echo
      echo "--- STOP PID CHILDREN ---"
      cat "/proc/${stop_pid}/task/${stop_pid}/children" 2>/dev/null || true
      echo
      echo "--- STOP PID PPID CMDLINE ---"
      ppid="$(sed -n 's/^PPid:[[:space:]]*//p' "/proc/${stop_pid}/status" 2>/dev/null | head -n1)"
      if [ -n "${ppid}" ] && [ -r "/proc/${ppid}/cmdline" ]; then
        tr '\000' ' ' < "/proc/${ppid}/cmdline" 2>/dev/null || true
        echo
      fi
      kill -9 "$stop_pid" 2>/dev/null || true
      hard_recover
      return 0
    fi
  done

  wait "$stop_pid" 2>/dev/null || true
}

cleanup() {
  bounded_stop
  restore_files
  if [ "$was_openclash" -eq 1 ]; then
    /etc/init.d/openclash start >/tmp/openclash.restore.out 2>&1 || /etc/init.d/openclash restart >/tmp/openclash.restore.out 2>&1 || true
    sleep 5
  fi
}
trap cleanup EXIT INT TERM

cp /etc/init.d/clashnivo "$BACKUP_INIT"
cp /usr/share/clashnivo/service/lifecycle.sh "$BACKUP_LIFECYCLE"
cp /usr/share/clashnivo/service/guard.sh "$BACKUP_GUARD"
cp /tmp/clashnivo.init.test /etc/init.d/clashnivo
cp /tmp/clashnivo.lifecycle.test /usr/share/clashnivo/service/lifecycle.sh
cp /tmp/clashnivo.guard.test /usr/share/clashnivo/service/guard.sh
chmod 0755 /etc/init.d/clashnivo
chmod 0644 /usr/share/clashnivo/service/lifecycle.sh
chmod 0644 /usr/share/clashnivo/service/guard.sh
rm -f "$DEBUG_LOG_FILE" /tmp/clashnivo.start.test.out /tmp/clashnivo.stop.recovery.out /tmp/openclash.stop.test.out /tmp/openclash.restore.out

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

echo '--- START CLASHNIVO ---'
/etc/init.d/clashnivo start >/tmp/clashnivo.start.test.out 2>&1 || true

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
cat /tmp/clashnivo.start.test.out 2>/dev/null || true

echo '--- PROCESS LIST ---'
ps | grep -E '/etc/init.d/clashnivo|/etc/clashnivo/clash -d /etc/clashnivo -f |openclash' | grep -v grep || true

echo '--- DEBUG LOG ---'
cat "$DEBUG_LOG_FILE" 2>/dev/null || true

echo '--- STOP CLASHNIVO ---'
bounded_stop
echo '--- POST STOP STATUS ---'
status_json

echo '--- RECOVERY STOP STDOUT ---'
cat /tmp/clashnivo.stop.recovery.out 2>/dev/null || true

echo '--- START LOG ---'
tail -n 40 /tmp/clashnivo.log 2>/dev/null || true

echo '--- CORE LOG ---'
tail -n 40 /tmp/clash.log 2>/dev/null || true
