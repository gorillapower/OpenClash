#!/bin/sh

set -eu

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

bounded_stop
/etc/init.d/openclash start >/tmp/openclash.restore.out 2>&1 || /etc/init.d/openclash restart >/tmp/openclash.restore.out 2>&1 || true
sleep 5

echo OPENCLASH_STATUS
/etc/init.d/openclash status 2>/dev/null || true
echo ---
ps | grep -E 'openclash|/etc/clashnivo/clash -d /etc/clashnivo -f ' | grep -v grep || true
