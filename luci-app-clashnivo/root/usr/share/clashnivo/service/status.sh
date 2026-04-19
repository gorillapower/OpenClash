#!/bin/sh

clashnivo_service_json_bool() {
   [ "$1" = "true" ] && printf 'true' || printf 'false'
}

clashnivo_service_json_string() {
   local value="${1:-}"
   value=$(printf '%s' "$value" | sed 's/\\/\\\\/g; s/"/\\"/g')
   printf '"%s"' "$value"
}

clashnivo_service_uci_get() {
   uci -q get "clashnivo.config.$1" 2>/dev/null
}

clashnivo_service_instance_running() {
   local name="${1:-}"

   [ -z "$name" ] && return 1

   ubus call service list "{\"name\":\"${name}\"}" 2>/dev/null | \
      jsonfilter -e "@[\"${name}\"].instances.*.running" 2>/dev/null | \
      grep -q 'true'
}

clashnivo_service_running() {
   clashnivo_service_instance_running "${CLASHNIVO_SERVICE_NAME}"
}

clashnivo_service_watchdog_running() {
   clashnivo_service_instance_running "${CLASHNIVO_WATCHDOG_SERVICE_NAME}"
}

clashnivo_service_pid_matches_runtime() {
   local pid="${1:-}"
   local cmdline=""

   [ -z "$pid" ] && return 1
   [ -r "/proc/${pid}/cmdline" ] || return 1

   cmdline="$(tr '\000' ' ' < "/proc/${pid}/cmdline" 2>/dev/null)"
   [ -n "$cmdline" ] || return 1

   printf '%s' "$cmdline" | grep -F -q '/etc/clashnivo/'
}

clashnivo_service_core_pid() {
   local pid

   for pid in $(pidof clash mihomo 2>/dev/null); do
      if clashnivo_service_pid_matches_runtime "$pid"; then
         printf '%s' "$pid"
         return 0
      fi
   done

   return 1
}

clashnivo_service_core_running() {
   [ -n "$(clashnivo_service_core_pid)" ]
}

clashnivo_service_runtime_state() {
   local enabled="$1"
   local service_running="$2"
   local core_running="$3"
   local watchdog_running="$4"
   local blocked="$5"
   local busy="$6"
   local busy_command="$7"

   if [ "$blocked" = "true" ] && [ "$service_running" != "true" ] && [ "$core_running" != "true" ]; then
      printf 'blocked'
      return
   fi

   if [ "$busy" = "true" ] && [ "$busy_command" = "stop" ]; then
      printf 'stopping'
      return
   fi

   if [ "$busy" = "true" ] && [ "$busy_command" = "restart" ]; then
      printf 'restarting'
      return
   fi

   if [ "$enabled" = "true" ] && [ "$busy" = "true" ] && \
      { [ "$busy_command" = "start" ] || [ "$busy_command" = "reload" ]; }; then
      printf 'starting'
      return
   fi

   if [ "$enabled" = "true" ] && [ "$service_running" = "true" ] && [ "$core_running" = "true" ]; then
      printf 'running'
      return
   fi

   if [ "$service_running" = "true" ] || [ "$core_running" = "true" ] || [ "$watchdog_running" = "true" ]; then
      printf 'degraded'
      return
   fi

   if [ "$enabled" = "true" ]; then
      printf 'stopped'
      return
   fi

   printf 'disabled'
}

clashnivo_service_lifecycle_pending_action() {
   [ -f "${LIFECYCLE_PENDING_ACTION_FILE}" ] && sed -n '1p' "${LIFECYCLE_PENDING_ACTION_FILE}" 2>/dev/null
}

clashnivo_service_lifecycle_pending_pid() {
   [ -f "${LIFECYCLE_PENDING_PID_FILE}" ] && sed -n '1p' "${LIFECYCLE_PENDING_PID_FILE}" 2>/dev/null
}

clashnivo_service_lifecycle_pending_started_at() {
   [ -f "${LIFECYCLE_PENDING_STARTED_AT_FILE}" ] && sed -n '1p' "${LIFECYCLE_PENDING_STARTED_AT_FILE}" 2>/dev/null
}

clashnivo_service_lifecycle_pending_cleanup_stale() {
   local pid started_at now

   [ -d "${LIFECYCLE_PENDING_DIR}" ] || return 0

   pid="$(clashnivo_service_lifecycle_pending_pid)"
   if [ -n "${pid}" ] && kill -0 "${pid}" 2>/dev/null; then
      return 0
   fi

   if [ -z "${pid}" ]; then
      started_at="$(clashnivo_service_lifecycle_pending_started_at)"
      now="$(date +%s 2>/dev/null)"
      if [ -n "${started_at}" ] && [ -n "${now}" ] && [ $((now - started_at)) -lt 15 ] 2>/dev/null; then
         return 0
      fi
   fi

   rm -rf "${LIFECYCLE_PENDING_DIR}"
}

clashnivo_service_lifecycle_pending_busy() {
   clashnivo_service_lifecycle_pending_cleanup_stale
   [ -d "${LIFECYCLE_PENDING_DIR}" ]
}

clashnivo_service_status_json() {
   local enabled service_running watchdog_running core_running openclash_installed openclash_enabled openclash_active
   local openclash_service_running openclash_watchdog_running openclash_core_running
   local blocked blocked_reason can_start core_pid active_config core_type proxy_mode run_mode openclash_core_pid
   local busy busy_command busy_pid busy_started_at runtime_state runtime_healthy pending_action pending_pid pending_started_at
   local active_job_kind active_job_target active_job_cancelable active_job_timeout_at active_job_status_path active_job_log_path

   enabled="false"
   [ "$(clashnivo_service_uci_get enable)" = "1" ] && enabled="true"

   service_running="false"
   clashnivo_service_running && service_running="true"

   watchdog_running="false"
   clashnivo_service_watchdog_running && watchdog_running="true"

   core_pid="$(clashnivo_service_core_pid)"
   core_running="false"
   [ -n "$core_pid" ] && core_running="true"

   openclash_installed="false"
   clashnivo_openclash_installed && openclash_installed="true"

   openclash_enabled="false"
   clashnivo_openclash_enabled && openclash_enabled="true"

   openclash_service_running="false"
   clashnivo_openclash_service_running && openclash_service_running="true"

   openclash_watchdog_running="false"
   clashnivo_openclash_watchdog_running && openclash_watchdog_running="true"

   openclash_core_pid="$(clashnivo_openclash_core_pid)"
   openclash_core_running="false"
   [ -n "$openclash_core_pid" ] && openclash_core_running="true"

   openclash_active="false"
   clashnivo_openclash_active && openclash_active="true"

   busy="false"
   if clashnivo_service_command_lock_busy; then
      busy="true"
   fi
   busy_command="$(clashnivo_service_command_lock_active_context)"
   busy_pid="$(clashnivo_service_command_lock_active_pid)"
   busy_started_at="$(clashnivo_service_command_lock_started_at)"

   if [ "${busy}" != "true" ] && clashnivo_service_lifecycle_pending_busy; then
      pending_action="$(clashnivo_service_lifecycle_pending_action)"
      pending_pid="$(clashnivo_service_lifecycle_pending_pid)"
      pending_started_at="$(clashnivo_service_lifecycle_pending_started_at)"
      busy="true"
      busy_command="${pending_action}"
      busy_pid="${pending_pid}"
      busy_started_at="${pending_started_at}"
   fi

   active_job_kind="$(clashnivo_service_command_lock_kind)"
   active_job_target="$(clashnivo_service_command_lock_target)"
   active_job_cancelable="false"
   clashnivo_service_command_lock_is_cancelable && active_job_cancelable="true"
   active_job_timeout_at="$(clashnivo_service_command_lock_timeout_at)"
   active_job_status_path="$(clashnivo_service_command_lock_status_path)"
   active_job_log_path="$(clashnivo_service_command_lock_log_path)"

   blocked="false"
   blocked_reason="$(clashnivo_service_read_blocked_reason)"
   can_start="true"
   if [ "$openclash_active" = "true" ] && [ "$service_running" != "true" ]; then
      blocked="true"
      [ -z "$blocked_reason" ] && blocked_reason="openclash_active"
      can_start="false"
   else
      blocked_reason=""
   fi

   runtime_state="$(clashnivo_service_runtime_state "$enabled" "$service_running" "$core_running" "$watchdog_running" "$blocked" "$busy" "$busy_command")"
   runtime_healthy="false"
   [ "$runtime_state" = "running" ] && runtime_healthy="true"

   active_config="$(clashnivo_service_uci_get config_path)"
   core_type="$(clashnivo_service_uci_get core_type)"
   proxy_mode="$(clashnivo_service_uci_get proxy_mode)"
   run_mode="$(clashnivo_service_uci_get en_mode)"

   printf '{'
   printf '"enabled":%s,' "$(clashnivo_service_json_bool "$enabled")"
   printf '"service_running":%s,' "$(clashnivo_service_json_bool "$service_running")"
   printf '"core_running":%s,' "$(clashnivo_service_json_bool "$core_running")"
   printf '"watchdog_running":%s,' "$(clashnivo_service_json_bool "$watchdog_running")"
   printf '"openclash_installed":%s,' "$(clashnivo_service_json_bool "$openclash_installed")"
    printf '"openclash_enabled":%s,' "$(clashnivo_service_json_bool "$openclash_enabled")"
   printf '"openclash_service_running":%s,' "$(clashnivo_service_json_bool "$openclash_service_running")"
   printf '"openclash_watchdog_running":%s,' "$(clashnivo_service_json_bool "$openclash_watchdog_running")"
   printf '"openclash_core_running":%s,' "$(clashnivo_service_json_bool "$openclash_core_running")"
   printf '"openclash_active":%s,' "$(clashnivo_service_json_bool "$openclash_active")"
   printf '"blocked":%s,' "$(clashnivo_service_json_bool "$blocked")"
   printf '"blocked_reason":%s,' "$(clashnivo_service_json_string "$blocked_reason")"
   printf '"can_start":%s,' "$(clashnivo_service_json_bool "$can_start")"
   printf '"running":%s,' "$(clashnivo_service_json_bool "$runtime_healthy")"
   printf '"state":%s,' "$(clashnivo_service_json_string "$runtime_state")"
   printf '"busy":%s,' "$(clashnivo_service_json_bool "$busy")"
   printf '"busy_command":%s,' "$(clashnivo_service_json_string "$busy_command")"
   printf '"busy_pid":%s,' "$(clashnivo_service_json_string "$busy_pid")"
   printf '"busy_started_at":%s,' "$(clashnivo_service_json_string "$busy_started_at")"
   printf '"active_job_kind":%s,' "$(clashnivo_service_json_string "$active_job_kind")"
   printf '"active_job_target":%s,' "$(clashnivo_service_json_string "$active_job_target")"
   printf '"active_job_cancelable":%s,' "$(clashnivo_service_json_bool "$active_job_cancelable")"
   printf '"active_job_timeout_at":%s,' "$(clashnivo_service_json_string "$active_job_timeout_at")"
   printf '"active_job_status_path":%s,' "$(clashnivo_service_json_string "$active_job_status_path")"
   printf '"active_job_log_path":%s,' "$(clashnivo_service_json_string "$active_job_log_path")"
   printf '"core_pid":%s,' "$(clashnivo_service_json_string "$core_pid")"
   printf '"openclash_core_pid":%s,' "$(clashnivo_service_json_string "$openclash_core_pid")"
   printf '"active_config":%s,' "$(clashnivo_service_json_string "$active_config")"
   printf '"core_type":%s,' "$(clashnivo_service_json_string "$core_type")"
   printf '"proxy_mode":%s,' "$(clashnivo_service_json_string "$proxy_mode")"
   printf '"run_mode":%s' "$(clashnivo_service_json_string "$run_mode")"
   printf '}\n'
}

clashnivo_service_status_exit_code() {
   local service_running openclash_active

   service_running="false"
   clashnivo_service_running && service_running="true"

   openclash_active="false"
   clashnivo_openclash_active && openclash_active="true"

   if [ "$service_running" = "true" ] || clashnivo_service_core_running; then
      return 0
   fi

   if [ "$openclash_active" = "true" ]; then
      return 2
   fi

   return 1
}
