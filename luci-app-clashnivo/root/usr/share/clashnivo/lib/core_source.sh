#!/bin/sh

. /usr/share/clashnivo/uci.sh

clashnivo_core_source_mode() {
   local mode="${1:-$(uci_get_config "core_source" || echo "openclash")}"

   case "$mode" in
      openclash|clashnivo|custom)
         printf '%s' "$mode"
      ;;
      *)
         printf '%s' "openclash"
      ;;
   esac
}

clashnivo_core_source_branch() {
   printf '%s' "$(uci_get_config "release_branch" || echo "master")"
}

clashnivo_core_source_custom_base_url() {
   local base_url

   base_url="$(uci_get_config "core_custom_base_url" || true)"
   base_url="${base_url%/}"
   printf '%s' "$base_url"
}

clashnivo_core_source_repo() {
   case "$(clashnivo_core_source_mode "$1")" in
      openclash)
         printf '%s' "vernesong/OpenClash"
      ;;
      clashnivo)
         printf '%s' "gorillapower/OpenClash"
      ;;
      custom)
         printf '%s' "custom"
      ;;
   esac
}

clashnivo_core_source_version_path() {
   printf '%s/core_version' "$(clashnivo_core_source_branch)"
}

clashnivo_core_source_artifact_path() {
   local core_url_path="${1:-}"
   local cpu_model="${2:-}"

   [ -n "$core_url_path" ] || return 1
   [ -n "$cpu_model" ] || return 1

   printf '%s/clash-%s.tar.gz' "$core_url_path" "$cpu_model"
}

clashnivo_core_source_url() {
   local relative_path="${1:-}"
   local github_address_mod="${2:-0}"
   local mode repo base_url

   [ -n "$relative_path" ] || return 1

   mode="$(clashnivo_core_source_mode)"

   case "$mode" in
      custom)
         base_url="$(clashnivo_core_source_custom_base_url)"
         [ -n "$base_url" ] || {
            printf '%s\n' "core source mode 'custom' requires clashnivo.config.core_custom_base_url" >&2
            return 1
         }
         printf '%s/%s\n' "$base_url" "$relative_path"
      ;;
      openclash|clashnivo)
         repo="$(clashnivo_core_source_repo "$mode")"
         if [ "$github_address_mod" != "0" ] && [ -n "$github_address_mod" ]; then
            case "$github_address_mod" in
               https://cdn.jsdelivr.net/|https://fastly.jsdelivr.net/|https://testingcf.jsdelivr.net/)
                  printf '%sgh/%s@core/%s\n' "$github_address_mod" "$repo" "$relative_path"
               ;;
               *)
                  printf '%shttps://raw.githubusercontent.com/%s/core/%s\n' "$github_address_mod" "$repo" "$relative_path"
               ;;
            esac
         else
            printf 'https://raw.githubusercontent.com/%s/core/%s\n' "$repo" "$relative_path"
         fi
      ;;
      *)
         return 1
      ;;
   esac
}

clashnivo_core_source_version_url() {
   clashnivo_core_source_url "$(clashnivo_core_source_version_path)" "${1:-0}"
}

clashnivo_core_source_artifact_url() {
   local core_url_path="${1:-}"
   local cpu_model="${2:-}"
   local github_address_mod="${3:-0}"
   local relative_path

   relative_path="$(clashnivo_core_source_artifact_path "$core_url_path" "$cpu_model")" || return 1
   clashnivo_core_source_url "$relative_path" "$github_address_mod"
}
