#!/bin/sh

. /usr/share/clashnivo/core_source.sh

clashnivo_service_update_init() {
   CLASHNIVO_UPDATE_PACKAGE_SCRIPT="/usr/share/clashnivo/clashnivo_update.sh"
   CLASHNIVO_UPDATE_PACKAGE_VERSION_SCRIPT="/usr/share/clashnivo/clashnivo_version.sh"
   CLASHNIVO_UPDATE_CORE_SCRIPT="/usr/share/clashnivo/clashnivo_core.sh"
   CLASHNIVO_UPDATE_CORE_VERSION_SCRIPT="/usr/share/clashnivo/clash_version.sh"
   CLASHNIVO_UPDATE_IPDB_SCRIPT="/usr/share/clashnivo/clashnivo_ipdb.sh"
   CLASHNIVO_UPDATE_GEOIP_SCRIPT="/usr/share/clashnivo/clashnivo_geoip.sh"
   CLASHNIVO_UPDATE_GEOSITE_SCRIPT="/usr/share/clashnivo/clashnivo_geosite.sh"
   CLASHNIVO_UPDATE_GEOASN_SCRIPT="/usr/share/clashnivo/clashnivo_geoasn.sh"
   CLASHNIVO_UPDATE_CHNROUTE_SCRIPT="/usr/share/clashnivo/clashnivo_chnroute.sh"
   CLASHNIVO_UPDATE_DASHBOARD_SCRIPT="/usr/share/clashnivo/clashnivo_download_dashboard.sh"
}

clashnivo_service_core_source_mode() {
   clashnivo_core_source_mode
}

clashnivo_service_core_source_selected_mode() {
   local selected

   selected="$(clashnivo_core_source_selected_mode)"
   if [ -n "$selected" ]; then
      printf '%s' "$selected"
      return 0
   fi

   clashnivo_service_core_source_mode
}

clashnivo_service_core_source_branch() {
   clashnivo_core_source_branch
}

clashnivo_service_core_source_base_url() {
   local mode selected

   mode="$(clashnivo_service_core_source_mode)"
   case "$mode" in
      auto)
         selected="$(clashnivo_core_source_selected_base_url)"
         [ -n "$selected" ] && printf '%s' "$selected"
      ;;
      official|jsdelivr|fastly|testingcf|custom)
         clashnivo_core_source_base_url_for_mode "$mode"
      ;;
   esac
}

clashnivo_service_core_source_selected_label() {
   clashnivo_core_source_label "$(clashnivo_service_core_source_selected_mode)"
}

clashnivo_service_update_status_file() {
   local kind="${1:-}"
   local target="${2:-}"

   case "$kind" in
      package)
         printf '%s' "$CLASHNIVO_PACKAGE_UPDATE_STATUS_FILE"
      ;;
      core)
         printf '%s' "$CLASHNIVO_CORE_UPDATE_STATUS_FILE"
      ;;
      assets)
         [ -n "$target" ] && printf '%s' "${CLASHNIVO_ASSETS_UPDATE_STATUS_DIR}/${target}.status" || printf '%s' "$CLASHNIVO_ASSETS_UPDATE_STATUS_FILE"
      ;;
      dashboard)
         [ -n "$target" ] && printf '%s' "${CLASHNIVO_DASHBOARD_UPDATE_STATUS_DIR}/${target}.status" || return 1
      ;;
      *)
         return 1
      ;;
   esac
}

clashnivo_service_update_log_file() {
   local kind="${1:-}"
   local target="${2:-}"

   case "$kind" in
      package)
         printf '%s' "$CLASHNIVO_PACKAGE_UPDATE_LOG_FILE"
      ;;
      core)
         printf '%s' "$CLASHNIVO_CORE_UPDATE_LOG_FILE"
      ;;
      assets)
         [ -n "$target" ] && printf '%s' "${CLASHNIVO_ASSETS_UPDATE_STATUS_DIR}/${target}.log" || printf '%s' "$CLASHNIVO_ASSETS_UPDATE_LOG_FILE"
      ;;
      dashboard)
         [ -n "$target" ] && printf '%s' "${CLASHNIVO_DASHBOARD_UPDATE_STATUS_DIR}/${target}.log" || return 1
      ;;
      *)
         return 1
      ;;
   esac
}

clashnivo_service_update_write_status() {
   local kind="${1:-}"
   local target="${2:-}"
   local state="${3:-idle}"
   local message="${4:-}"
   local status_file

   status_file="$(clashnivo_service_update_status_file "$kind" "$target")" || return 1
   mkdir -p "$(dirname "$status_file")" >/dev/null 2>&1

   {
      printf '%s\n' "$state"
      [ -n "$message" ] && printf '%s\n' "$message"
   } > "$status_file"
}

clashnivo_service_update_timeout_seconds() {
   local kind="${1:-}"
   local target="${2:-}"

   case "${kind}:${target}" in
      core:*|package:*|assets:*|dashboard:*)
         printf '%s' "600"
      ;;
      *)
         printf '%s' "300"
      ;;
   esac
}

clashnivo_service_update_parse_status() {
   local kind="${1:-}"
   local target="${2:-}"
   local status_file log_file status_content first_line second_line normalized

   status_file="$(clashnivo_service_update_status_file "$kind" "$target")" || return 1
   log_file="$(clashnivo_service_update_log_file "$kind" "$target")" || return 1

   if [ ! -f "$status_file" ]; then
      printf '{'
      printf '"kind":%s,' "$(clashnivo_service_json_string "$kind")"
      printf '"target":%s,' "$(clashnivo_service_json_string "$target")"
      printf '"status":"idle",'
      printf '"status_path":%s,' "$(clashnivo_service_json_string "$status_file")"
      printf '"log_path":%s' "$(clashnivo_service_json_string "$log_file")"
      printf '}\n'
      return 0
   fi

   status_content="$(cat "$status_file" 2>/dev/null)"
   first_line="$(printf '%s' "$status_content" | sed -n '1p')"
   second_line="$(printf '%s' "$status_content" | sed -n '2p')"

   case "$first_line" in
      accepted|running|done|error|nochange|idle|busy|cancelled|timed_out)
         normalized="$first_line"
      ;;
      *)
         normalized="idle"
      ;;
   esac

   printf '{'
   printf '"kind":%s,' "$(clashnivo_service_json_string "$kind")"
   printf '"target":%s,' "$(clashnivo_service_json_string "$target")"
   printf '"status":%s,' "$(clashnivo_service_json_string "$normalized")"
   printf '"status_path":%s,' "$(clashnivo_service_json_string "$status_file")"
   printf '"log_path":%s' "$(clashnivo_service_json_string "$log_file")"
   if [ -n "$second_line" ]; then
      printf ',"message":%s' "$(clashnivo_service_json_string "$second_line")"
   fi
   printf '}\n'
}

clashnivo_service_update_run_async() {
   local kind="${1:-}"
   local target="${2:-}"
   local command_string="${3:-}"
   local accepted_message="${4:-}"
   local status_file log_file context worker_pid timeout_seconds timeout_at

   status_file="$(clashnivo_service_update_status_file "$kind" "$target")" || return 1
   log_file="$(clashnivo_service_update_log_file "$kind" "$target")" || return 1

   mkdir -p "$(dirname "$status_file")" >/dev/null 2>&1
   : > "$log_file"

   context="${kind}"
   [ -n "${target}" ] && context="${kind}:${target}"
   timeout_seconds="$(clashnivo_service_update_timeout_seconds "$kind" "$target")"
   timeout_at="$(( $(date +%s) + timeout_seconds ))"

   if ! clashnivo_service_command_lock_acquire "${context}"; then
      clashnivo_service_update_write_status "$kind" "$target" busy "Another Clash Nivo command is already running"
      clashnivo_service_emit_busy_json "${context}"
      return 3
   fi

   clashnivo_service_update_write_status "$kind" "$target" accepted "${accepted_message:-Queued}"

   (
      clashnivo_service_command_lock_set_owner "${context}" "$$"
      clashnivo_service_command_lock_set_job_metadata "$kind" "$target" "true" "$timeout_at" "$status_file" "$log_file"
      trap 'clashnivo_service_command_lock_release' EXIT INT TERM
      clashnivo_service_update_write_status "$kind" "$target" running "${accepted_message:-Queued}"
      setsid env LOG_FILE="$log_file" MIRROR_LOG_FILE="$CLASHNIVO_UPDATE_LOG_FILE" sh -c "exec ${command_string}" >"$log_file" 2>&1 &
      worker_pid=$!
      clashnivo_service_command_lock_set_owner "${context}" "${worker_pid}"

      (
         sleep "${timeout_seconds}"
         if kill -0 "${worker_pid}" >/dev/null 2>&1; then
            clashnivo_service_command_lock_set_final_state "timed_out" "Update timed out."
            printf '%s\n' "Job timed out after ${timeout_seconds} seconds." >> "$log_file"
            clashnivo_service_command_lock_kill_owner "${worker_pid}" >/dev/null 2>&1
         fi
      ) &
      timeout_watcher_pid=$!

      wait "${worker_pid}"
      rc=$?
      kill "${timeout_watcher_pid}" >/dev/null 2>&1

      final_state="$(clashnivo_service_command_lock_final_state)"
      final_message="$(clashnivo_service_command_lock_final_message)"

      if [ "${final_state}" = "cancelled" ]; then
         clashnivo_service_update_write_status "$kind" "$target" cancelled "${final_message:-Cancelled by user.}"
      elif [ "${final_state}" = "timed_out" ]; then
         clashnivo_service_update_write_status "$kind" "$target" timed_out "${final_message:-Update timed out.}"
      elif [ "$rc" -eq 0 ]; then
         if grep -Eiq 'No Change|Has Not Been Updated|Stop Continuing Operation' "$log_file" 2>/dev/null; then
            clashnivo_service_update_write_status "$kind" "$target" nochange "No update was required"
         else
            clashnivo_service_update_write_status "$kind" "$target" done "Update completed"
         fi
      else
         clashnivo_service_update_write_status "$kind" "$target" error "Update failed"
      fi
   ) &
   worker_pid=$!
   clashnivo_service_command_lock_set_owner "${context}" "${worker_pid}"
}

clashnivo_service_cancel_job_command() {
   local active_context active_kind active_target active_status_path active_log_path

   if ! clashnivo_service_command_lock_busy; then
      printf '{"accepted":false,"status":"idle","message":"No active Clash Nivo job is running."}\n'
      return 1
   fi

   active_context="$(clashnivo_service_command_lock_active_context)"
   active_kind="$(clashnivo_service_command_lock_kind)"
   active_target="$(clashnivo_service_command_lock_target)"
   active_status_path="$(clashnivo_service_command_lock_status_path)"
   active_log_path="$(clashnivo_service_command_lock_log_path)"

   if ! clashnivo_service_command_lock_is_cancelable; then
      printf '{'
      printf '"accepted":false,'
      printf '"status":"error",'
      printf '"message":"The active Clash Nivo command cannot be cancelled.",'
      printf '"active_command":%s' "$(clashnivo_service_json_string "${active_context}")"
      printf '}\n'
      return 1
   fi

   clashnivo_service_command_lock_cancel_active_job >/dev/null 2>&1

   printf '{'
   printf '"accepted":true,'
   printf '"status":"accepted",'
   printf '"kind":%s,' "$(clashnivo_service_json_string "${active_kind}")"
   printf '"target":%s,' "$(clashnivo_service_json_string "${active_target}")"
   printf '"active_command":%s,' "$(clashnivo_service_json_string "${active_context}")"
   printf '"status_path":%s,' "$(clashnivo_service_json_string "${active_status_path}")"
   printf '"log_path":%s,' "$(clashnivo_service_json_string "${active_log_path}")"
   printf '"message":"Cancellation requested."'
   printf '}\n'
}

clashnivo_service_update_package_latest_command() {
   local latest_version=""

   rm -f "$CLASHNIVO_LAST_VERSION_FILE" >/dev/null 2>&1
   "$CLASHNIVO_UPDATE_PACKAGE_VERSION_SCRIPT" >/dev/null 2>&1
   latest_version="$(sed -n '1p' "$CLASHNIVO_LAST_VERSION_FILE" 2>/dev/null | tr -d '\n')"

   printf '{'
   printf '"kind":"package",'
   printf '"version":%s,' "$(clashnivo_service_json_string "$latest_version")"
   printf '"source_policy":"package-branch"'
   printf '}\n'
}

clashnivo_service_update_package_command() {
   clashnivo_service_update_run_async \
      package \
      package \
      "$CLASHNIVO_UPDATE_PACKAGE_SCRIPT" \
      "Package update requested"

   printf '{'
   printf '"accepted":true,'
   printf '"kind":"package",'
   printf '"async":true,'
   printf '"status":"accepted",'
   printf '"status_path":%s,' "$(clashnivo_service_json_string "$CLASHNIVO_PACKAGE_UPDATE_STATUS_FILE")"
   printf '"log_path":%s' "$(clashnivo_service_json_string "$CLASHNIVO_PACKAGE_UPDATE_LOG_FILE")"
   printf '}\n'
}

clashnivo_service_probe_core_sources_command() {
   local context="probe_core_sources" resolution source_mode selected_mode selected_base selected_latency probe_url configured_label selected_label

   if ! clashnivo_service_command_lock_acquire "${context}"; then
      clashnivo_service_emit_busy_json "${context}"
      return 3
   fi

   trap 'clashnivo_service_command_lock_release' EXIT INT TERM
   clashnivo_service_command_lock_set_owner "${context}" "$$"

   resolution="$(clashnivo_core_source_resolve 1)" || {
      printf '{'
      printf '"accepted":false,'
      printf '"status":"error",'
      printf '"source_policy":%s' "$(clashnivo_service_json_string "$(clashnivo_service_core_source_mode)")"
      printf '}\n'
      return 1
   }

   source_mode="$(clashnivo_service_core_source_mode)"
   selected_mode="$(printf '%s' "$resolution" | cut -d'|' -f1)"
   selected_base="$(printf '%s' "$resolution" | cut -d'|' -f2)"
   selected_latency="$(printf '%s' "$resolution" | cut -d'|' -f3)"
   probe_url="$(printf '%s' "$resolution" | cut -d'|' -f4-)"
   configured_label="$(clashnivo_core_source_label "$source_mode")"
   selected_label="$(clashnivo_core_source_label "$selected_mode")"

   printf '{'
   printf '"accepted":true,'
   printf '"status":"done",'
   printf '"source_policy":%s,' "$(clashnivo_service_json_string "$source_mode")"
   printf '"source_policy_label":%s,' "$(clashnivo_service_json_string "$configured_label")"
   printf '"selected_source":%s,' "$(clashnivo_service_json_string "$selected_mode")"
   printf '"selected_source_label":%s,' "$(clashnivo_service_json_string "$selected_label")"
   printf '"selected_base":%s,' "$(clashnivo_service_json_string "$selected_base")"
   printf '"probe_url":%s,' "$(clashnivo_service_json_string "$probe_url")"
   printf '"latency_ms":%s' "${selected_latency:-0}"
   printf '}\n'
}

clashnivo_service_update_core_latest_command() {
   local latest_version core_type line_number source_mode source_base source_branch selected_source selected_label

   "$CLASHNIVO_UPDATE_CORE_VERSION_SCRIPT" >/dev/null 2>&1

   core_type="$(uci_get_config "core_type")"
   [ "$(uci_get_config "smart_enable" || echo 0)" = "1" ] && core_type="Smart"
   [ -z "$core_type" ] && core_type="Meta"

   line_number=1
   [ "$core_type" = "Smart" ] && line_number=2
   latest_version="$(sed -n "${line_number}p" /tmp/clash_last_version 2>/dev/null | tr -d '\n')"
   source_mode="$(clashnivo_service_core_source_mode)"
   source_base="$(clashnivo_service_core_source_base_url)"
   source_branch="$(clashnivo_service_core_source_branch)"
   selected_source="$(clashnivo_service_core_source_selected_mode)"
   selected_label="$(clashnivo_service_core_source_selected_label)"

   printf '{'
   printf '"kind":"core",'
   printf '"version":%s,' "$(clashnivo_service_json_string "$latest_version")"
   printf '"core_type":%s,' "$(clashnivo_service_json_string "$core_type")"
   printf '"source_policy":%s,' "$(clashnivo_service_json_string "$source_mode")"
    printf '"selected_source":%s,' "$(clashnivo_service_json_string "$selected_source")"
    printf '"selected_source_label":%s,' "$(clashnivo_service_json_string "$selected_label")"
   printf '"source_branch":%s,' "$(clashnivo_service_json_string "$source_branch")"
   printf '"source_base":%s' "$(clashnivo_service_json_string "$source_base")"
   printf '}\n'
}

clashnivo_service_update_core_command() {
   local core_type source_mode source_base source_branch

   core_type="$(uci_get_config "core_type")"
   [ "$(uci_get_config "smart_enable" || echo 0)" = "1" ] && core_type="Smart"
   [ -z "$core_type" ] && core_type="Meta"
   source_mode="$(clashnivo_service_core_source_mode)"
   source_base="$(clashnivo_service_core_source_base_url)"
   source_branch="$(clashnivo_service_core_source_branch)"

   clashnivo_service_update_run_async \
      core \
      core \
      "$CLASHNIVO_UPDATE_CORE_SCRIPT ${core_type}" \
      "Core update requested"

   printf '{'
   printf '"accepted":true,'
   printf '"kind":"core",'
   printf '"target":%s,' "$(clashnivo_service_json_string "$core_type")"
   printf '"async":true,'
   printf '"status":"accepted",'
   printf '"source_policy":%s,' "$(clashnivo_service_json_string "$source_mode")"
   printf '"source_branch":%s,' "$(clashnivo_service_json_string "$source_branch")"
   printf '"source_base":%s,' "$(clashnivo_service_json_string "$source_base")"
   printf '"status_path":%s,' "$(clashnivo_service_json_string "$CLASHNIVO_CORE_UPDATE_STATUS_FILE")"
   printf '"log_path":%s' "$(clashnivo_service_json_string "$CLASHNIVO_CORE_UPDATE_LOG_FILE")"
   printf '}\n'
}

clashnivo_service_update_assets_command() {
   local target="${1:-all}"
   local command_string=""

   case "$target" in
      all)
         command_string="$CLASHNIVO_UPDATE_IPDB_SCRIPT && $CLASHNIVO_UPDATE_GEOIP_SCRIPT && $CLASHNIVO_UPDATE_GEOSITE_SCRIPT && $CLASHNIVO_UPDATE_GEOASN_SCRIPT && $CLASHNIVO_UPDATE_CHNROUTE_SCRIPT"
      ;;
      ipdb)
         command_string="$CLASHNIVO_UPDATE_IPDB_SCRIPT"
      ;;
      geoip)
         command_string="$CLASHNIVO_UPDATE_GEOIP_SCRIPT"
      ;;
      geosite)
         command_string="$CLASHNIVO_UPDATE_GEOSITE_SCRIPT"
      ;;
      geoasn)
         command_string="$CLASHNIVO_UPDATE_GEOASN_SCRIPT"
      ;;
      chnroute)
         command_string="$CLASHNIVO_UPDATE_CHNROUTE_SCRIPT"
      ;;
      *)
         printf '{"accepted":false,"kind":"assets","target":%s,"error":"unknown_target"}\n' "$(clashnivo_service_json_string "$target")"
         return 1
      ;;
   esac

   clashnivo_service_update_run_async \
      assets \
      "$target" \
      "$command_string" \
      "Asset update requested"

   if [ "$target" = "all" ]; then
      clashnivo_service_update_write_status assets "" accepted "Asset update requested"
   fi

   printf '{'
   printf '"accepted":true,'
   printf '"kind":"assets",'
   printf '"target":%s,' "$(clashnivo_service_json_string "$target")"
   printf '"async":true,'
   printf '"status":"accepted",'
   printf '"status_path":%s,' "$(clashnivo_service_json_string "$(clashnivo_service_update_status_file assets "$target")")"
   printf '"log_path":%s' "$(clashnivo_service_json_string "$(clashnivo_service_update_log_file assets "$target")")"
   printf '}\n'
}

clashnivo_service_update_dashboard_command() {
   local target="${1:-}"
   local dashboard_name=""
   local dashboard_type=""
   local command_string=""

   case "$target" in
      dashboard_official)
         dashboard_name="Dashboard"
         dashboard_type="Official"
      ;;
      dashboard_meta)
         dashboard_name="Dashboard"
         dashboard_type="Meta"
      ;;
      yacd_official)
         dashboard_name="Yacd"
         dashboard_type="Official"
      ;;
      yacd_meta)
         dashboard_name="Yacd"
         dashboard_type="Meta"
      ;;
      metacubexd)
         dashboard_name="MetaCubeXD"
         dashboard_type="Official"
      ;;
      zashboard)
         dashboard_name="Zashboard"
         dashboard_type="Official"
      ;;
      *)
         printf '{"accepted":false,"kind":"dashboard","target":%s,"error":"unknown_target"}\n' "$(clashnivo_service_json_string "$target")"
         return 1
      ;;
   esac

   command_string="$CLASHNIVO_UPDATE_DASHBOARD_SCRIPT ${dashboard_name} ${dashboard_type}"

   clashnivo_service_update_run_async \
      dashboard \
      "$target" \
      "$command_string" \
      "Dashboard download requested"

   printf '{'
   printf '"accepted":true,'
   printf '"kind":"dashboard",'
   printf '"target":%s,' "$(clashnivo_service_json_string "$target")"
   printf '"async":true,'
   printf '"status":"accepted",'
   printf '"status_path":%s,' "$(clashnivo_service_json_string "$(clashnivo_service_update_status_file dashboard "$target")")"
   printf '"log_path":%s' "$(clashnivo_service_json_string "$(clashnivo_service_update_log_file dashboard "$target")")"
   printf '}\n'
}

clashnivo_service_update_status_command() {
   local kind="${1:-all}"
   local target="${2:-}"

   case "$kind" in
      all)
         printf '{'
         printf '"package":%s,' "$(clashnivo_service_update_parse_status package package)"
         printf '"core":%s,' "$(clashnivo_service_update_parse_status core core)"
         printf '"assets":%s' "$(clashnivo_service_update_parse_status assets "${target:-all}")"
         printf '}\n'
      ;;
      package|core|assets|dashboard)
         clashnivo_service_update_parse_status "$kind" "$target"
      ;;
      *)
         printf '{"error":"unknown_kind"}\n'
         return 1
      ;;
   esac
}
