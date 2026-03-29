#!/bin/sh

clashnivo_service_preview_init() {
   :
}

clashnivo_service_preview_reset_outputs() {
   rm -f "${PREVIEW_CONFIG_FILE}" "${VALIDATION_REPORT_FILE}" >/dev/null 2>&1
}

clashnivo_service_preview_prepare_source() {
   local source_file="${RAW_CONFIG_FILE:-}"

   if [ -z "${source_file}" ] || [ ! -f "${source_file}" ]; then
      CLASHNIVO_PREVIEW_LAST_ERROR="Selected source config does not exist"
      return 1
   fi

   cp "${source_file}" "${TMP_CONFIG_FILE}" 2>/dev/null || {
      CLASHNIVO_PREVIEW_LAST_ERROR="Unable to copy the selected source config"
      return 1
   }
}

clashnivo_service_preview_validate_yaml_file() {
   local yaml_file="${1:-}"
   local error_output

   [ -n "${yaml_file}" ] || {
      CLASHNIVO_PREVIEW_LAST_ERROR="No YAML file was provided for validation"
      return 1
   }

   error_output=$(
      ruby -ryaml -rYAML -I "/usr/share/clashnivo" -E UTF-8 -e '
begin
   YAML.load_file(ARGV[0])
rescue Exception => e
   warn e.message
   exit 1
end
' "${yaml_file}" 2>&1 >/dev/null
   )

   if [ $? -ne 0 ]; then
      CLASHNIVO_PREVIEW_LAST_ERROR="${error_output:-Unable to parse YAML}"
      return 1
   fi

   CLASHNIVO_PREVIEW_LAST_ERROR=""
   return 0
}

clashnivo_service_preview_stage_json() {
   local name="${1:-}"
   local status="${2:-unknown}"
   local message="${3:-}"

   printf '{'
   printf '"name":%s,' "$(clashnivo_service_json_string "${name}")"
   printf '"status":%s,' "$(clashnivo_service_json_string "${status}")"
   printf '"message":%s' "$(clashnivo_service_json_string "${message}")"
   printf '}'
}

clashnivo_service_preview_run_stage() {
   local stage_name="${1:-}"
   local stage_func="${2:-}"
   local stage_status="passed"
   local stage_message=""

   CLASHNIVO_PREVIEW_LAST_ERROR=""

   if ! ${stage_func}; then
      stage_status="failed"
      stage_message="${CLASHNIVO_PREVIEW_LAST_ERROR:-Stage execution failed}"
   elif ! clashnivo_service_preview_validate_yaml_file "${TMP_CONFIG_FILE}"; then
      stage_status="failed"
      stage_message="${CLASHNIVO_PREVIEW_LAST_ERROR:-Generated YAML is invalid after ${stage_name}}"
   fi

   CLASHNIVO_PREVIEW_STAGE_RESULT="$(clashnivo_service_preview_stage_json "${stage_name}" "${stage_status}" "${stage_message}")"
   [ "${stage_status}" = "passed" ]
}

clashnivo_service_preview_write_report() {
   local valid="${1:-false}"
   local failed_layer="${2:-}"
   local preview_path="${3:-}"
   local report_path="${4:-}"
   local stages_json="${5:-[]}"

   mkdir -p "$(dirname "${VALIDATION_REPORT_FILE}")" >/dev/null 2>&1

   {
      printf '{'
      printf '"valid":%s,' "$(clashnivo_service_json_bool "${valid}")"
      printf '"config_name":%s,' "$(clashnivo_service_json_string "${CONFIG_NAME}")"
      printf '"source_path":%s,' "$(clashnivo_service_json_string "${RAW_CONFIG_FILE}")"
      printf '"preview_path":%s,' "$(clashnivo_service_json_string "${preview_path}")"
      printf '"report_path":%s,' "$(clashnivo_service_json_string "${report_path}")"
      printf '"failed_layer":%s,' "$(clashnivo_service_json_string "${failed_layer}")"
      printf '"stages":%s' "${stages_json}"
      printf '}\n'
   } > "${VALIDATION_REPORT_FILE}"
}

clashnivo_service_preview_emit_result() {
   local valid="${1:-false}"
   local failed_layer="${2:-}"
   local stages_json="${3:-[]}"
   local preview_exists="false"
   local preview_content=""

   if [ -f "${PREVIEW_CONFIG_FILE}" ]; then
      preview_exists="true"
      preview_content="$(cat "${PREVIEW_CONFIG_FILE}" 2>/dev/null)"
   fi

   clashnivo_service_preview_write_report "${valid}" "${failed_layer}" "${PREVIEW_CONFIG_FILE}" "${VALIDATION_REPORT_FILE}" "${stages_json}"

   printf '{'
   printf '"valid":%s,' "$(clashnivo_service_json_bool "${valid}")"
   printf '"config_name":%s,' "$(clashnivo_service_json_string "${CONFIG_NAME}")"
   printf '"source_path":%s,' "$(clashnivo_service_json_string "${RAW_CONFIG_FILE}")"
   printf '"preview_path":%s,' "$(clashnivo_service_json_string "${PREVIEW_CONFIG_FILE}")"
   printf '"preview_exists":%s,' "$(clashnivo_service_json_bool "${preview_exists}")"
   printf '"report_path":%s,' "$(clashnivo_service_json_string "${VALIDATION_REPORT_FILE}")"
   printf '"failed_layer":%s,' "$(clashnivo_service_json_string "${failed_layer}")"
   printf '"preview_content":%s,' "$(clashnivo_service_json_string "${preview_content}")"
   printf '"stages":%s' "${stages_json}"
   printf '}\n'
}

clashnivo_service_preview_run_pipeline() {
   local stages_json="" first_stage=true failed_layer="" valid="false"
   local stage_result=""

   get_config
   clashnivo_service_preview_reset_outputs

   clashnivo_service_preview_run_stage "source" clashnivo_service_preview_prepare_source
   stage_result="${CLASHNIVO_PREVIEW_STAGE_RESULT}"
   stages_json="[${stage_result}"
   first_stage=false
   if ! echo "${stage_result}" | grep -q '"status":"passed"'; then
      failed_layer="source"
      stages_json="${stages_json}]"
      clashnivo_service_preview_emit_result "${valid}" "${failed_layer}" "${stages_json}"
      return 1
   fi

   clashnivo_service_preview_run_stage "normalize" clashnivo_service_composition_normalize_source
   stage_result="${CLASHNIVO_PREVIEW_STAGE_RESULT}"
   stages_json="${stages_json},${stage_result}"
   if ! echo "${stage_result}" | grep -q '"status":"passed"'; then
      failed_layer="normalize"
      stages_json="${stages_json}]"
      cp "${TMP_CONFIG_FILE}" "${PREVIEW_CONFIG_FILE}" 2>/dev/null
      clashnivo_service_preview_emit_result "${valid}" "${failed_layer}" "${stages_json}"
      return 1
   fi

   clashnivo_service_preview_run_stage "custom_proxy_groups" clashnivo_service_composition_append_custom_proxy_groups
   stage_result="${CLASHNIVO_PREVIEW_STAGE_RESULT}"
   stages_json="${stages_json},${stage_result}"
   if ! echo "${stage_result}" | grep -q '"status":"passed"'; then
      failed_layer="custom_proxy_groups"
      stages_json="${stages_json}]"
      cp "${TMP_CONFIG_FILE}" "${PREVIEW_CONFIG_FILE}" 2>/dev/null
      clashnivo_service_preview_emit_result "${valid}" "${failed_layer}" "${stages_json}"
      return 1
   fi

   clashnivo_service_preview_run_stage "custom_rules" clashnivo_service_composition_prepend_custom_rules
   stage_result="${CLASHNIVO_PREVIEW_STAGE_RESULT}"
   stages_json="${stages_json},${stage_result}"
   if ! echo "${stage_result}" | grep -q '"status":"passed"'; then
      failed_layer="custom_rules"
      stages_json="${stages_json}]"
      cp "${TMP_CONFIG_FILE}" "${PREVIEW_CONFIG_FILE}" 2>/dev/null
      clashnivo_service_preview_emit_result "${valid}" "${failed_layer}" "${stages_json}"
      return 1
   fi

   clashnivo_service_preview_run_stage "overwrite" clashnivo_service_composition_apply_overwrite
   stage_result="${CLASHNIVO_PREVIEW_STAGE_RESULT}"
   stages_json="${stages_json},${stage_result}"
   if ! echo "${stage_result}" | grep -q '"status":"passed"'; then
      failed_layer="overwrite"
      stages_json="${stages_json}]"
      cp "${TMP_CONFIG_FILE}" "${PREVIEW_CONFIG_FILE}" 2>/dev/null
      clashnivo_service_preview_emit_result "${valid}" "${failed_layer}" "${stages_json}"
      return 1
   fi

   clashnivo_service_preview_run_stage "generated_runtime" clashnivo_service_composition_validate_generated_config
   stage_result="${CLASHNIVO_PREVIEW_STAGE_RESULT}"
   stages_json="${stages_json},${stage_result}"
   if ! echo "${stage_result}" | grep -q '"status":"passed"'; then
      failed_layer="generated_runtime"
      stages_json="${stages_json}]"
      cp "${TMP_CONFIG_FILE}" "${PREVIEW_CONFIG_FILE}" 2>/dev/null
      clashnivo_service_preview_emit_result "${valid}" "${failed_layer}" "${stages_json}"
      return 1
   fi

   if clashnivo_service_preview_validate_yaml_file "${TMP_CONFIG_FILE}"; then
      stage_result="$(clashnivo_service_preview_stage_json "validation" "passed" "")"
      valid="true"
   else
      failed_layer="validation"
      stage_result="$(clashnivo_service_preview_stage_json "validation" "failed" "${CLASHNIVO_PREVIEW_LAST_ERROR}")"
   fi

   stages_json="${stages_json},${stage_result}]"
   cp "${TMP_CONFIG_FILE}" "${PREVIEW_CONFIG_FILE}" 2>/dev/null
   clashnivo_service_preview_emit_result "${valid}" "${failed_layer}" "${stages_json}"
   [ "${valid}" = "true" ]
}

clashnivo_service_preview_command() {
   clashnivo_service_preview_run_pipeline
}

clashnivo_service_validate_command() {
   clashnivo_service_preview_run_pipeline
}
