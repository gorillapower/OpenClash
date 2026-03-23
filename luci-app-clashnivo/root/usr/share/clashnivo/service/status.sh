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

clashnivo_service_core_pid() {
   local pid
   pid=$(pidof clash mihomo 2>/dev/null | awk '{print $1}')
   [ -n "$pid" ] && printf '%s' "$pid"
}

clashnivo_service_core_running() {
   [ -n "$(clashnivo_service_core_pid)" ]
}

clashnivo_service_status_json() {
   local enabled service_running watchdog_running core_running openclash_installed openclash_enabled openclash_active
   local openclash_service_running openclash_watchdog_running openclash_core_running
   local blocked blocked_reason can_start core_pid active_config core_type proxy_mode run_mode openclash_core_pid

   enabled="false"
   [ "$(clashnivo_service_uci_get enable)" = "1" ] && enabled="true"

   service_running="false"
   clashnivo_service_running && service_running="true"

   watchdog_running="false"
   clashnivo_service_watchdog_running && watchdog_running="true"

   core_pid="$(clashnivo_service_core_pid)"
   core_running="false"
   [ -n "$core_pid" ] && core_running="true"
   [ "$service_running" != "true" ] && [ "$core_running" = "true" ] && service_running="true"

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
