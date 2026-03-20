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

   if [ -n "${selector}" ]; then
      bash "${CLASHNIVO_SUBSCRIPTION_REFRESH_SCRIPT}" "${selector}" >/dev/null 2>&1 &
   else
      bash "${CLASHNIVO_SUBSCRIPTION_REFRESH_SCRIPT}" >/dev/null 2>&1 &
   fi
}

clashnivo_service_subscription_refresh_command() {
   local selector="${1:-}"
   local mode="all"

   if [ -n "${selector}" ]; then
      mode="single"
   fi

   clashnivo_service_subscription_refresh_async "${selector}"
   clashnivo_service_subscription_emit_refresh_json "${mode}" "${selector}"
}
