#!/bin/sh

clashnivo_service_subscription_init() {
   CLASHNIVO_SUBSCRIPTION_REFRESH_SCRIPT="/usr/share/clashnivo/clashnivo_refresh.sh"
}

clashnivo_service_subscription_resolve_name() {
   local selector="${1:-}"
   local name=""

   if [ -z "${selector}" ]; then
      printf '%s' ""
      return 0
   fi

   case "${selector}" in
      */*)
         name="$(basename "${selector}")"
      ;;
      *)
         name="${selector}"
      ;;
   esac

   name="${name%.yaml}"
   printf '%s' "${name}"
}

clashnivo_service_subscription_source_path() {
   local selector="${1:-}"
   local name

   name="$(clashnivo_service_subscription_resolve_name "${selector}")"
   [ -z "${name}" ] && return 1

   clashnivo_service_config_source_path "${name}.yaml"
}

clashnivo_service_subscription_emit_refresh_json() {
   local mode="${1:-all}"
   local selector="${2:-}"
   local target_name="" source_path=""

   target_name="$(clashnivo_service_subscription_resolve_name "${selector}")"
   if [ -n "${target_name}" ]; then
      source_path="$(clashnivo_service_subscription_source_path "${selector}")"
   fi

   printf '{'
   printf '"accepted":true,'
   printf '"mode":%s,' "$(clashnivo_service_json_string "${mode}")"
   printf '"target_name":%s,' "$(clashnivo_service_json_string "${target_name}")"
   printf '"source_path":%s,' "$(clashnivo_service_json_string "${source_path}")"
   printf '"refresh_scope":"source_artifacts_and_source_metadata",'
   printf '"generated_runtime_preserved":true,'
   printf '"custom_layers_preserved":["custom_proxy_groups","custom_rules","overwrite","preview","validation","generated_runtime"],'
   printf '"async":true'
   printf '}\n'
}

clashnivo_service_subscription_refresh_async() {
   local selector="${1:-}"
   local context="refresh_sources"
   local worker_pid timeout_seconds timeout_at target_name script_selector

   if [ -n "${selector}" ]; then
      target_name="$(clashnivo_service_subscription_resolve_name "${selector}")"
      context="refresh_source:${target_name}"
   else
      target_name="all"
   fi

   timeout_seconds=600
   timeout_at="$(( $(date +%s) + timeout_seconds ))"

   if ! clashnivo_service_command_lock_acquire "${context}"; then
      clashnivo_service_emit_busy_json "${context}"
      return 3
   fi

   script_selector="${selector}"
   worker_pid="$(
      clashnivo_service_spawn_detached <<EOF
#!/bin/sh
. /usr/share/clashnivo/service/env.sh
clashnivo_service_init_env ''
context='${context}'
target_name='${target_name}'
timeout_seconds='${timeout_seconds}'

clashnivo_service_command_lock_set_owner "\${context}" "\$\$"
: > "${CLASHNIVO_SUBSCRIPTION_UPDATE_LOG_FILE}"
clashnivo_service_command_lock_set_job_metadata "subscription" "\${target_name}" "true" "${timeout_at}" "" "${CLASHNIVO_SUBSCRIPTION_UPDATE_LOG_FILE}"
trap 'clashnivo_service_command_lock_release' EXIT INT TERM

if command -v setsid >/dev/null 2>&1; then
$(if [ -n "${script_selector}" ]; then
   printf "   setsid env LOG_FILE='%s' MIRROR_LOG_FILE='%s' bash '%s' '%s' >/dev/null 2>&1 &\n" \
      "${CLASHNIVO_SUBSCRIPTION_UPDATE_LOG_FILE}" "${CLASHNIVO_UPDATE_LOG_FILE}" "${CLASHNIVO_SUBSCRIPTION_REFRESH_SCRIPT}" "${script_selector}"
 else
   printf "   setsid env LOG_FILE='%s' MIRROR_LOG_FILE='%s' bash '%s' >/dev/null 2>&1 &\n" \
      "${CLASHNIVO_SUBSCRIPTION_UPDATE_LOG_FILE}" "${CLASHNIVO_UPDATE_LOG_FILE}" "${CLASHNIVO_SUBSCRIPTION_REFRESH_SCRIPT}"
 fi)
else
$(if [ -n "${script_selector}" ]; then
   printf "   env LOG_FILE='%s' MIRROR_LOG_FILE='%s' bash '%s' '%s' >/dev/null 2>&1 &\n" \
      "${CLASHNIVO_SUBSCRIPTION_UPDATE_LOG_FILE}" "${CLASHNIVO_UPDATE_LOG_FILE}" "${CLASHNIVO_SUBSCRIPTION_REFRESH_SCRIPT}" "${script_selector}"
 else
   printf "   env LOG_FILE='%s' MIRROR_LOG_FILE='%s' bash '%s' >/dev/null 2>&1 &\n" \
      "${CLASHNIVO_SUBSCRIPTION_UPDATE_LOG_FILE}" "${CLASHNIVO_UPDATE_LOG_FILE}" "${CLASHNIVO_SUBSCRIPTION_REFRESH_SCRIPT}"
 fi)
fi
worker_pid=\$!
clashnivo_service_command_lock_set_owner "\${context}" "\${worker_pid}"

(
   sleep "\${timeout_seconds}"
   if kill -0 "\${worker_pid}" >/dev/null 2>&1; then
      clashnivo_service_command_lock_set_final_state "timed_out" "Subscription refresh timed out."
      printf '%s\n' "Subscription refresh timed out after \${timeout_seconds} seconds." >> "${CLASHNIVO_SUBSCRIPTION_UPDATE_LOG_FILE}"
      printf '%s\n' "Subscription refresh timed out after \${timeout_seconds} seconds." >> "${CLASHNIVO_UPDATE_LOG_FILE}"
      clashnivo_service_command_lock_kill_owner "\${worker_pid}" >/dev/null 2>&1
   fi
) </dev/null >/dev/null 2>&1 &
timeout_watcher_pid=\$!

wait "\${worker_pid}"
kill "\${timeout_watcher_pid}" >/dev/null 2>&1
EOF
   )"
   [ -n "${worker_pid}" ] && clashnivo_service_command_lock_set_owner "${context}" "${worker_pid}"
}

clashnivo_service_subscription_refresh_command() {
   local selector="${1:-}"
   local mode="all"

   if [ -n "${selector}" ]; then
      mode="single"
   fi

   if ! clashnivo_service_subscription_refresh_async "${selector}"; then
      return 3
   fi
   clashnivo_service_subscription_emit_refresh_json "${mode}" "${selector}"
}
