#!/bin/sh

clashnivo_service_command_lock_active_pid() {
   [ -f "${COMMAND_LOCK_PID_FILE}" ] && sed -n '1p' "${COMMAND_LOCK_PID_FILE}" 2>/dev/null
}

clashnivo_service_command_lock_active_context() {
   [ -f "${COMMAND_LOCK_CONTEXT_FILE}" ] && sed -n '1p' "${COMMAND_LOCK_CONTEXT_FILE}" 2>/dev/null
}

clashnivo_service_command_lock_started_at() {
   [ -f "${COMMAND_LOCK_STARTED_AT_FILE}" ] && sed -n '1p' "${COMMAND_LOCK_STARTED_AT_FILE}" 2>/dev/null
}

clashnivo_service_command_lock_kind() {
   [ -f "${COMMAND_LOCK_KIND_FILE}" ] && sed -n '1p' "${COMMAND_LOCK_KIND_FILE}" 2>/dev/null
}

clashnivo_service_command_lock_target() {
   [ -f "${COMMAND_LOCK_TARGET_FILE}" ] && sed -n '1p' "${COMMAND_LOCK_TARGET_FILE}" 2>/dev/null
}

clashnivo_service_command_lock_cancelable() {
   [ -f "${COMMAND_LOCK_CANCELABLE_FILE}" ] && sed -n '1p' "${COMMAND_LOCK_CANCELABLE_FILE}" 2>/dev/null
}

clashnivo_service_command_lock_timeout_at() {
   [ -f "${COMMAND_LOCK_TIMEOUT_AT_FILE}" ] && sed -n '1p' "${COMMAND_LOCK_TIMEOUT_AT_FILE}" 2>/dev/null
}

clashnivo_service_command_lock_status_path() {
   [ -f "${COMMAND_LOCK_STATUS_PATH_FILE}" ] && sed -n '1p' "${COMMAND_LOCK_STATUS_PATH_FILE}" 2>/dev/null
}

clashnivo_service_command_lock_log_path() {
   [ -f "${COMMAND_LOCK_LOG_PATH_FILE}" ] && sed -n '1p' "${COMMAND_LOCK_LOG_PATH_FILE}" 2>/dev/null
}

clashnivo_service_command_lock_final_state() {
   [ -f "${COMMAND_LOCK_FINAL_STATE_FILE}" ] && sed -n '1p' "${COMMAND_LOCK_FINAL_STATE_FILE}" 2>/dev/null
}

clashnivo_service_command_lock_final_message() {
   [ -f "${COMMAND_LOCK_FINAL_MESSAGE_FILE}" ] && sed -n '1p' "${COMMAND_LOCK_FINAL_MESSAGE_FILE}" 2>/dev/null
}

clashnivo_service_command_lock_cleanup_stale() {
   local pid

   [ -d "${COMMAND_LOCK_DIR}" ] || return 0

   pid="$(clashnivo_service_command_lock_active_pid)"
   if [ -n "${pid}" ] && kill -0 "${pid}" 2>/dev/null; then
      return 0
   fi

   rm -rf "${COMMAND_LOCK_DIR}"
}

clashnivo_service_command_lock_busy() {
   clashnivo_service_command_lock_cleanup_stale
   [ -d "${COMMAND_LOCK_DIR}" ]
}

clashnivo_service_command_lock_set_owner() {
   local context="${1:-unknown}"
   local pid="${2:-$$}"

   mkdir -p "${COMMAND_LOCK_DIR}" 2>/dev/null || return 1
   printf '%s\n' "${pid}" > "${COMMAND_LOCK_PID_FILE}"
   printf '%s\n' "${context}" > "${COMMAND_LOCK_CONTEXT_FILE}"
   date +%s > "${COMMAND_LOCK_STARTED_AT_FILE}" 2>/dev/null
}

clashnivo_service_command_lock_set_job_metadata() {
   local kind="${1:-}"
   local target="${2:-}"
   local cancelable="${3:-false}"
   local timeout_at="${4:-}"
   local status_path="${5:-}"
   local log_path="${6:-}"

   mkdir -p "${COMMAND_LOCK_DIR}" 2>/dev/null || return 1
   printf '%s\n' "${kind}" > "${COMMAND_LOCK_KIND_FILE}"
   printf '%s\n' "${target}" > "${COMMAND_LOCK_TARGET_FILE}"
   printf '%s\n' "${cancelable}" > "${COMMAND_LOCK_CANCELABLE_FILE}"
   printf '%s\n' "${timeout_at}" > "${COMMAND_LOCK_TIMEOUT_AT_FILE}"
   printf '%s\n' "${status_path}" > "${COMMAND_LOCK_STATUS_PATH_FILE}"
   printf '%s\n' "${log_path}" > "${COMMAND_LOCK_LOG_PATH_FILE}"
   rm -f "${COMMAND_LOCK_FINAL_STATE_FILE}" "${COMMAND_LOCK_FINAL_MESSAGE_FILE}"
}

clashnivo_service_command_lock_set_final_state() {
   local state="${1:-}"
   local message="${2:-}"

   mkdir -p "${COMMAND_LOCK_DIR}" 2>/dev/null || return 1
   printf '%s\n' "${state}" > "${COMMAND_LOCK_FINAL_STATE_FILE}"
   printf '%s\n' "${message}" > "${COMMAND_LOCK_FINAL_MESSAGE_FILE}"
}

clashnivo_service_command_lock_is_cancelable() {
   [ "$(clashnivo_service_command_lock_cancelable)" = "true" ]
}

clashnivo_service_command_lock_kill_owner() {
   local pid="${1:-$(clashnivo_service_command_lock_active_pid)}"

   [ -n "${pid}" ] || return 1

   kill -TERM -- "-${pid}" >/dev/null 2>&1 || kill -TERM "${pid}" >/dev/null 2>&1
   sleep 2
   if kill -0 "${pid}" >/dev/null 2>&1; then
      kill -KILL -- "-${pid}" >/dev/null 2>&1 || kill -KILL "${pid}" >/dev/null 2>&1
   fi

   return 0
}

clashnivo_service_command_lock_cancel_active_job() {
   local pid context

   clashnivo_service_command_lock_cleanup_stale
   [ -d "${COMMAND_LOCK_DIR}" ] || return 1

   if ! clashnivo_service_command_lock_is_cancelable; then
      return 2
   fi

   pid="$(clashnivo_service_command_lock_active_pid)"
   context="$(clashnivo_service_command_lock_active_context)"
   clashnivo_service_command_lock_set_final_state "cancelled" "Cancelled by user."
   clashnivo_service_command_lock_kill_owner "${pid}" >/dev/null 2>&1
   printf '%s' "${context}"
   return 0
}

clashnivo_service_command_lock_acquire() {
   local context="${1:-unknown}"

   clashnivo_service_command_lock_cleanup_stale
   mkdir "${COMMAND_LOCK_DIR}" 2>/dev/null || return 1
   clashnivo_service_command_lock_set_owner "${context}" "$$"
}

clashnivo_service_command_lock_release() {
   local owner

   owner="$(clashnivo_service_command_lock_active_pid)"
   if [ -n "${owner}" ] && [ "${owner}" != "$$" ] && kill -0 "${owner}" 2>/dev/null; then
      return 0
   fi

   rm -rf "${COMMAND_LOCK_DIR}"
}

clashnivo_service_emit_busy_json() {
   local context="${1:-unknown}"
   local active_context active_pid

   active_context="$(clashnivo_service_command_lock_active_context)"
   active_pid="$(clashnivo_service_command_lock_active_pid)"

   printf '{'
   printf '"accepted":false,'
   printf '"busy":true,'
   printf '"status":"busy",'
   printf '"context":"%s",' "${context}"
   printf '"active_command":"%s",' "${active_context}"
   printf '"active_pid":"%s"' "${active_pid}"
   printf '}\n'
}

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

clashnivo_openclash_pid_is_runtime() {
   local pid="${1:-}"
   local cmdline=""

   [ -n "$pid" ] || return 1
   [ -r "/proc/${pid}/cmdline" ] || return 1

   cmdline="$(tr '\000' ' ' < "/proc/${pid}/cmdline" 2>/dev/null)"
   [ -n "$cmdline" ] || return 1

   printf '%s' "$cmdline" | grep -F -q '/etc/openclash/' || return 1
   printf '%s' "$cmdline" | grep -F -q -- '-d /etc/openclash' || return 1
   printf '%s' "$cmdline" | grep -F -q -- '-f /etc/openclash/' || return 1

   return 0
}

clashnivo_openclash_core_pid() {
   local pid

   for pid in $(pidof clash mihomo clash_meta 2>/dev/null); do
      if clashnivo_openclash_pid_is_runtime "$pid"; then
         printf '%s' "$pid"
         return 0
      fi
   done

   return 1
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
