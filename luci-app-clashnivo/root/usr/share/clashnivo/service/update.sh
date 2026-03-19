#!/bin/sh

. /usr/share/clashnivo/core_source.sh

clashnivo_service_update_init() {
   CLASHNIVO_UPDATE_PACKAGE_SCRIPT="/usr/share/clashnivo/openclash_update.sh"
   CLASHNIVO_UPDATE_PACKAGE_VERSION_SCRIPT="/usr/share/clashnivo/openclash_version.sh"
   CLASHNIVO_UPDATE_CORE_SCRIPT="/usr/share/clashnivo/openclash_core.sh"
   CLASHNIVO_UPDATE_CORE_VERSION_SCRIPT="/usr/share/clashnivo/clash_version.sh"
   CLASHNIVO_UPDATE_IPDB_SCRIPT="/usr/share/clashnivo/openclash_ipdb.sh"
   CLASHNIVO_UPDATE_GEOIP_SCRIPT="/usr/share/clashnivo/openclash_geoip.sh"
   CLASHNIVO_UPDATE_GEOSITE_SCRIPT="/usr/share/clashnivo/openclash_geosite.sh"
   CLASHNIVO_UPDATE_GEOASN_SCRIPT="/usr/share/clashnivo/openclash_geoasn.sh"
   CLASHNIVO_UPDATE_CHNROUTE_SCRIPT="/usr/share/clashnivo/openclash_chnroute.sh"
}

clashnivo_service_core_source_mode() {
   clashnivo_core_source_mode
}

clashnivo_service_core_source_branch() {
   clashnivo_core_source_branch
}

clashnivo_service_core_source_base_url() {
   local mode

   mode="$(clashnivo_service_core_source_mode)"
   case "$mode" in
      custom)
         clashnivo_core_source_custom_base_url
      ;;
      openclash|clashnivo)
         printf 'https://raw.githubusercontent.com/%s/core' "$(clashnivo_core_source_repo "$mode")"
      ;;
   esac
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
      accepted|running|done|error|nochange|idle)
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
   local status_file log_file

   status_file="$(clashnivo_service_update_status_file "$kind" "$target")" || return 1
   log_file="$(clashnivo_service_update_log_file "$kind" "$target")" || return 1

   mkdir -p "$(dirname "$status_file")" >/dev/null 2>&1
   : > "$log_file"
   clashnivo_service_update_write_status "$kind" "$target" accepted "${accepted_message:-Queued}"

   (
      clashnivo_service_update_write_status "$kind" "$target" running "${accepted_message:-Queued}"
      sh -c "$command_string" >"$log_file" 2>&1
      rc=$?

      if [ "$rc" -eq 0 ]; then
         if grep -Eiq 'No Change|Has Not Been Updated|Stop Continuing Operation' "$log_file" 2>/dev/null; then
            clashnivo_service_update_write_status "$kind" "$target" nochange "No update was required"
         else
            clashnivo_service_update_write_status "$kind" "$target" done "Update completed"
         fi
      else
         clashnivo_service_update_write_status "$kind" "$target" error "Update failed"
      fi
   ) &
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

clashnivo_service_update_core_latest_command() {
   local github_address_mod latest_version core_type line_number source_mode source_base source_branch

   github_address_mod="$(uci_get_config "github_address_mod" || echo 0)"
   if [ "$github_address_mod" != "0" ]; then
      "$CLASHNIVO_UPDATE_CORE_VERSION_SCRIPT" "$github_address_mod" >/dev/null 2>&1
   else
      "$CLASHNIVO_UPDATE_CORE_VERSION_SCRIPT" >/dev/null 2>&1
   fi

   core_type="$(uci_get_config "core_type")"
   [ "$(uci_get_config "smart_enable" || echo 0)" = "1" ] && core_type="Smart"
   [ -z "$core_type" ] && core_type="Meta"

   line_number=1
   [ "$core_type" = "Smart" ] && line_number=2
   latest_version="$(sed -n "${line_number}p" /tmp/clash_last_version 2>/dev/null | tr -d '\n')"
   source_mode="$(clashnivo_service_core_source_mode)"
   source_base="$(clashnivo_service_core_source_base_url)"
   source_branch="$(clashnivo_service_core_source_branch)"

   printf '{'
   printf '"kind":"core",'
   printf '"version":%s,' "$(clashnivo_service_json_string "$latest_version")"
   printf '"core_type":%s,' "$(clashnivo_service_json_string "$core_type")"
   printf '"source_policy":%s,' "$(clashnivo_service_json_string "$source_mode")"
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
      package|core|assets)
         clashnivo_service_update_parse_status "$kind" "$target"
      ;;
      *)
         printf '{"error":"unknown_kind"}\n'
         return 1
      ;;
   esac
}
