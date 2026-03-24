#!/bin/sh

. /usr/share/clashnivo/uci.sh

CLASHNIVO_DOWNLOAD_SOURCE_PROBE_FILE="/tmp/clashnivo_core_source_probe"
CLASHNIVO_DOWNLOAD_SOURCE_PROBE_TTL="${CLASHNIVO_DOWNLOAD_SOURCE_PROBE_TTL:-1800}"
CLASHNIVO_CORE_SOURCE_REPO="vernesong/OpenClash"

clashnivo_download_source_mode() {
   local mode="${1:-$(uci_get_config "core_source" || echo "auto")}"

   case "$mode" in
      auto|official|jsdelivr|fastly|testingcf|custom)
         printf '%s' "$mode"
      ;;
      *)
         printf '%s' "auto"
      ;;
   esac
}

clashnivo_core_source_mode() {
   clashnivo_download_source_mode "$1"
}

clashnivo_download_source_label() {
   case "$(clashnivo_download_source_mode "$1")" in
      auto)
         printf '%s' "Auto"
      ;;
      official)
         printf '%s' "Official GitHub"
      ;;
      jsdelivr)
         printf '%s' "jsDelivr"
      ;;
      fastly)
         printf '%s' "Fastly jsDelivr"
      ;;
      testingcf)
         printf '%s' "TestingCF jsDelivr"
      ;;
      custom)
         printf '%s' "Custom"
      ;;
      *)
         printf '%s' "Unknown"
      ;;
   esac
}

clashnivo_core_source_label() {
   clashnivo_download_source_label "$1"
}

clashnivo_download_source_branch() {
   printf '%s' "$(uci_get_config "release_branch" || echo "master")"
}

clashnivo_core_source_branch() {
   clashnivo_download_source_branch
}

clashnivo_download_source_custom_prefix() {
   local prefix

   prefix="$(uci_get_config "core_custom_base_url" || true)"
   prefix="${prefix%/}"
   printf '%s' "$prefix"
}

clashnivo_core_source_custom_base_url() {
   clashnivo_download_source_custom_prefix
}

clashnivo_download_source_candidate_modes() {
   printf '%s\n' official jsdelivr testingcf fastly
}

clashnivo_download_source_mirror_prefix_for_mode() {
   case "$(clashnivo_download_source_mode "$1")" in
      official)
         printf '%s' ""
      ;;
      jsdelivr)
         printf '%s' "https://cdn.jsdelivr.net/"
      ;;
      fastly)
         printf '%s' "https://fastly.jsdelivr.net/"
      ;;
      testingcf)
         printf '%s' "https://testingcf.jsdelivr.net/"
      ;;
      custom)
         clashnivo_download_source_custom_prefix
      ;;
      *)
         return 1
      ;;
   esac
}

clashnivo_download_source_rewrite_official_url_for_mode() {
   local mode="${1:-}"
   local official_url="${2:-}"
   local prefix owner repo ref remainder path

   [ -n "$official_url" ] || return 1

   case "$(clashnivo_download_source_mode "$mode")" in
      official)
         printf '%s\n' "$official_url"
      ;;
      custom)
         prefix="$(clashnivo_download_source_custom_prefix)"
         [ -n "$prefix" ] || {
            printf '%s\n' "custom download source requires clashnivo.config.core_custom_base_url" >&2
            return 1
         }
         printf '%s/%s\n' "$prefix" "$official_url"
      ;;
      jsdelivr|fastly|testingcf)
         prefix="$(clashnivo_download_source_mirror_prefix_for_mode "$mode")"
         case "$official_url" in
            https://raw.githubusercontent.com/*)
               remainder="${official_url#https://raw.githubusercontent.com/}"
               owner="${remainder%%/*}"
               remainder="${remainder#*/}"
               repo="${remainder%%/*}"
               remainder="${remainder#*/}"
               ref="${remainder%%/*}"
               path="${remainder#*/}"
               printf '%sgh/%s/%s@%s/%s\n' "$prefix" "$owner" "$repo" "$ref" "$path"
            ;;
            https://github.com/*/releases/latest/download/*)
               remainder="${official_url#https://github.com/}"
               owner="${remainder%%/*}"
               remainder="${remainder#*/}"
               repo="${remainder%%/*}"
               path="${official_url#https://github.com/$owner/$repo/releases/latest/download/}"
               printf '%sgh/%s/%s@release/%s\n' "$prefix" "$owner" "$repo" "$path"
            ;;
            *)
               printf '%s\n' "download source mode '$mode' cannot rewrite unsupported URL: $official_url" >&2
               return 1
            ;;
         esac
      ;;
      *)
         return 1
      ;;
   esac
}

clashnivo_download_source_cache_is_fresh() {
   local ttl="${1:-$CLASHNIVO_DOWNLOAD_SOURCE_PROBE_TTL}"
   local now checked_at

   [ -f "$CLASHNIVO_DOWNLOAD_SOURCE_PROBE_FILE" ] || return 1
   checked_at="$(sed -n '5p' "$CLASHNIVO_DOWNLOAD_SOURCE_PROBE_FILE" 2>/dev/null)"
   [ -n "$checked_at" ] || return 1

   now="$(date +%s 2>/dev/null)"
   [ -n "$now" ] || return 1

   [ $((now - checked_at)) -lt "$ttl" ]
}

clashnivo_download_source_cache_write() {
   local selected_mode="${1:-}"
   local selected_base="${2:-}"
   local latency_ms="${3:-}"
   local probe_url="${4:-}"
   local checked_at

   checked_at="$(date +%s 2>/dev/null)"
   {
      printf '%s\n' "$selected_mode"
      printf '%s\n' "$selected_base"
      printf '%s\n' "$latency_ms"
      printf '%s\n' "$probe_url"
      printf '%s\n' "$checked_at"
   } > "$CLASHNIVO_DOWNLOAD_SOURCE_PROBE_FILE"
}

clashnivo_download_source_cache_field() {
   local field="${1:-1}"
   [ -f "$CLASHNIVO_DOWNLOAD_SOURCE_PROBE_FILE" ] || return 1
   sed -n "${field}p" "$CLASHNIVO_DOWNLOAD_SOURCE_PROBE_FILE" 2>/dev/null
}

clashnivo_core_source_version_path() {
   printf '%s/core_version' "$(clashnivo_download_source_branch)"
}

clashnivo_core_source_artifact_path() {
   local core_url_path="${1:-}"
   local cpu_model="${2:-}"

   [ -n "$core_url_path" ] || return 1
   [ -n "$cpu_model" ] || return 1

   printf '%s/clash-%s.tar.gz' "$core_url_path" "$cpu_model"
}

clashnivo_core_source_official_url() {
   local relative_path="${1:-}"

   [ -n "$relative_path" ] || return 1
   printf 'https://raw.githubusercontent.com/%s/core/%s\n' "$CLASHNIVO_CORE_SOURCE_REPO" "$relative_path"
}

clashnivo_core_source_base_url_for_mode() {
   local mode="${1:-}"

   clashnivo_download_source_rewrite_official_url_for_mode "$mode" "https://raw.githubusercontent.com/${CLASHNIVO_CORE_SOURCE_REPO}/core"
}

clashnivo_download_source_probe_mode() {
   local mode="${1:-}"
   local probe_url raw result_code http_code latency latency_ms base_url

   [ -n "$mode" ] || return 1
   probe_url="$(clashnivo_download_source_rewrite_official_url_for_mode "$mode" "$(clashnivo_core_source_official_url "$(clashnivo_core_source_version_path)")")" || return 1

   raw="$(curl -o /dev/null -sL -w '%{http_code} %{time_total}' --connect-timeout 3 -m 8 --speed-time 3 --speed-limit 1 "$probe_url" 2>/dev/null)"
   result_code=$?
   [ "$result_code" -eq 0 ] || return 1

   http_code="$(printf '%s' "$raw" | awk '{print $1}')"
   latency="$(printf '%s' "$raw" | awk '{print $2}')"
   [ "$http_code" = "200" ] || return 1

   latency_ms="$(printf '%s' "$latency" | awk '{printf "%d", $1 * 1000}')"
   base_url="$(clashnivo_core_source_base_url_for_mode "$mode")"

   printf '%s|%s|%s|%s\n' "$mode" "$base_url" "${latency_ms:-0}" "$probe_url"
}

clashnivo_download_source_probe_configured() {
   local configured_mode candidate best_mode best_base best_latency best_url line mode base latency url

   configured_mode="$(clashnivo_download_source_mode)"

   if [ "$configured_mode" != "auto" ]; then
      clashnivo_download_source_probe_mode "$configured_mode" || return 1
      return 0
   fi

   best_latency=""
   while IFS= read -r candidate; do
      [ -n "$candidate" ] || continue
      line="$(clashnivo_download_source_probe_mode "$candidate" 2>/dev/null)" || continue
      mode="$(printf '%s' "$line" | cut -d'|' -f1)"
      base="$(printf '%s' "$line" | cut -d'|' -f2)"
      latency="$(printf '%s' "$line" | cut -d'|' -f3)"
      url="$(printf '%s' "$line" | cut -d'|' -f4-)"

      if [ -z "$best_latency" ] || [ "$latency" -lt "$best_latency" ]; then
         best_mode="$mode"
         best_base="$base"
         best_latency="$latency"
         best_url="$url"
      fi
   done <<EOF
$(clashnivo_download_source_candidate_modes)
EOF

   [ -n "$best_mode" ] || return 1
   printf '%s|%s|%s|%s\n' "$best_mode" "$best_base" "$best_latency" "$best_url"
}

clashnivo_download_source_resolve() {
   local force_probe="${1:-0}"
   local configured_mode selected_mode selected_base latency probe_url line

   configured_mode="$(clashnivo_download_source_mode)"

   if [ "$configured_mode" != "auto" ]; then
      if [ "$force_probe" = "1" ]; then
         line="$(clashnivo_download_source_probe_configured)" || return 1
         selected_mode="$(printf '%s' "$line" | cut -d'|' -f1)"
         selected_base="$(printf '%s' "$line" | cut -d'|' -f2)"
         latency="$(printf '%s' "$line" | cut -d'|' -f3)"
         probe_url="$(printf '%s' "$line" | cut -d'|' -f4-)"
         clashnivo_download_source_cache_write "$selected_mode" "$selected_base" "$latency" "$probe_url"
      else
         selected_mode="$configured_mode"
         selected_base="$(clashnivo_core_source_base_url_for_mode "$selected_mode")" || return 1
         latency=""
         probe_url="$(clashnivo_download_source_rewrite_official_url_for_mode "$selected_mode" "$(clashnivo_core_source_official_url "$(clashnivo_core_source_version_path)")")" || return 1
      fi
   else
      if [ "$force_probe" != "1" ] && clashnivo_download_source_cache_is_fresh; then
         selected_mode="$(clashnivo_download_source_cache_field 1)"
         selected_base="$(clashnivo_download_source_cache_field 2)"
         latency="$(clashnivo_download_source_cache_field 3)"
         probe_url="$(clashnivo_download_source_cache_field 4)"
      else
         line="$(clashnivo_download_source_probe_configured)" || return 1
         selected_mode="$(printf '%s' "$line" | cut -d'|' -f1)"
         selected_base="$(printf '%s' "$line" | cut -d'|' -f2)"
         latency="$(printf '%s' "$line" | cut -d'|' -f3)"
         probe_url="$(printf '%s' "$line" | cut -d'|' -f4-)"
         clashnivo_download_source_cache_write "$selected_mode" "$selected_base" "$latency" "$probe_url"
      fi
   fi

   printf '%s|%s|%s|%s\n' "$selected_mode" "$selected_base" "$latency" "$probe_url"
}

clashnivo_core_source_resolve() {
   clashnivo_download_source_resolve "$1"
}

clashnivo_download_source_selected_mode() {
   local configured

   configured="$(clashnivo_download_source_mode)"
   if [ "$configured" = "auto" ]; then
      clashnivo_download_source_cache_is_fresh && clashnivo_download_source_cache_field 1
      return 0
   fi
   printf '%s' "$configured"
}

clashnivo_core_source_selected_mode() {
   clashnivo_download_source_selected_mode
}

clashnivo_download_source_selected_base_url() {
   local configured

   configured="$(clashnivo_download_source_mode)"
   if [ "$configured" = "auto" ]; then
      clashnivo_download_source_cache_is_fresh && clashnivo_download_source_cache_field 2
      return 0
   fi
   clashnivo_core_source_base_url_for_mode "$configured"
}

clashnivo_core_source_selected_base_url() {
   clashnivo_download_source_selected_base_url
}

clashnivo_download_source_url() {
   local official_url="${1:-}"
   local selected_mode

   [ -n "$official_url" ] || return 1
   selected_mode="$(clashnivo_download_source_resolve 0 | cut -d'|' -f1)" || return 1
   clashnivo_download_source_rewrite_official_url_for_mode "$selected_mode" "$official_url"
}

clashnivo_core_source_url_for_mode() {
   local mode="${1:-}"
   local relative_path="${2:-}"

   clashnivo_download_source_rewrite_official_url_for_mode "$mode" "$(clashnivo_core_source_official_url "$relative_path")"
}

clashnivo_core_source_url() {
   local relative_path="${1:-}"

   clashnivo_download_source_url "$(clashnivo_core_source_official_url "$relative_path")"
}

clashnivo_core_source_version_url() {
   clashnivo_core_source_url "$(clashnivo_core_source_version_path)"
}

clashnivo_core_source_artifact_url() {
   local core_url_path="${1:-}"
   local cpu_model="${2:-}"
   local relative_path

   relative_path="$(clashnivo_core_source_artifact_path "$core_url_path" "$cpu_model")" || return 1
   clashnivo_core_source_url "$relative_path"
}
