#!/bin/sh

clashnivo_service_read_blocked_reason() {
   [ -f "${BLOCKED_REASON_FILE}" ] && sed -n '1p' "${BLOCKED_REASON_FILE}" 2>/dev/null
}

clashnivo_service_set_blocked_reason() {
   mkdir -p "${CLASHNIVO_STATE_DIR}" 2>/dev/null
   printf '%s\n' "${1:-}" > "${BLOCKED_REASON_FILE}"
}

clashnivo_service_clear_blocked_reason() {
   rm -f "${BLOCKED_REASON_FILE}"
}

clashnivo_openclash_installed() {
   [ -x /etc/init.d/openclash ]
}

clashnivo_openclash_enabled() {
   clashnivo_openclash_installed && /etc/init.d/openclash enabled >/dev/null 2>&1
}

clashnivo_openclash_service_running() {
   ubus call service list '{"name":"openclash"}' 2>/dev/null | \
      jsonfilter -e '@.openclash.instances.*.running' 2>/dev/null | \
      grep -q 'true'
}

clashnivo_openclash_watchdog_running() {
   ubus call service list '{"name":"openclash-watchdog"}' 2>/dev/null | \
      jsonfilter -e '@["openclash-watchdog"].instances.*.running' 2>/dev/null | \
      grep -q 'true'
}

clashnivo_openclash_core_pid() {
   local pid
   pid="$(ps -w 2>/dev/null | grep -E '/etc/openclash/|/usr/share/openclash/' | grep -E 'clash|mihomo' | grep -v grep | awk 'NR==1 {print $1}')"
   [ -n "$pid" ] && printf '%s' "$pid"
}

clashnivo_openclash_core_running() {
   [ -n "$(clashnivo_openclash_core_pid)" ]
}

clashnivo_openclash_active() {
   clashnivo_openclash_service_running || clashnivo_openclash_watchdog_running || clashnivo_openclash_core_running
}

clashnivo_service_guard_blocked_reason() {
   if clashnivo_openclash_active; then
      printf 'openclash_active'
      return 0
   fi

   return 1
}

clashnivo_service_guard_blocked() {
   clashnivo_service_guard_blocked_reason >/dev/null 2>&1
}

clashnivo_service_emit_guard_json() {
   local context="${1:-unknown}"
   local reason="${2:-}"

   printf '{"blocked":true,"blocked_reason":"%s","context":"%s"}\n' "$reason" "$context" >&2
}

clashnivo_service_require_guard_clear() {
   local context="${1:-start}"
   local reason

   reason="$(clashnivo_service_guard_blocked_reason)" || {
      clashnivo_service_clear_blocked_reason
      return 0
   }

   clashnivo_service_set_blocked_reason "$reason"
   LOG_WARN "Clash Nivo cannot ${context} while OpenClash is active. Stop OpenClash first."
   clashnivo_service_emit_guard_json "$context" "$reason"
   return 2
}
