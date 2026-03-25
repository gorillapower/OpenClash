#!/bin/sh

clashnivo_service_config_init() {
   CLASHNIVO_CONFIG_ROOT="/etc/clashnivo"
   CLASHNIVO_SOURCE_CONFIG_DIR="${CLASHNIVO_CONFIG_ROOT}/config"
   CLASHNIVO_GENERATED_CONFIG_DIR="${CLASHNIVO_CONFIG_ROOT}"
   CLASHNIVO_CUSTOM_CONFIG_DIR="${CLASHNIVO_CONFIG_ROOT}/custom"
   CLASHNIVO_OVERWRITE_DIR="${CLASHNIVO_CONFIG_ROOT}/overwrite"
   CLASHNIVO_HISTORY_DIR="${CLASHNIVO_CONFIG_ROOT}/history"
   CLASHNIVO_PREVIEW_DIR="${CLASHNIVO_STATE_DIR}/clashnivo-preview"
   CLASHNIVO_VALIDATION_DIR="${CLASHNIVO_STATE_DIR}/clashnivo-validation"
   CLASHNIVO_DEFAULT_SOURCE_CONFIG_NAME="config.yaml"
}

clashnivo_service_config_source_path() {
   local name="${1:-${CLASHNIVO_DEFAULT_SOURCE_CONFIG_NAME}}"
   printf '%s/%s\n' "${CLASHNIVO_SOURCE_CONFIG_DIR}" "${name}"
}

clashnivo_service_config_find_first_source() {
   local file_name
   for file_name in "${CLASHNIVO_SOURCE_CONFIG_DIR}"/*; do
      [ -f "${file_name}" ] && {
         printf '%s\n' "${file_name}"
         return 0
      }
   done
   return 1
}

clashnivo_service_file_mtime() {
   local file_path="${1:-}"
   local mtime=""

   [ -n "${file_path}" ] || return 1
   [ -e "${file_path}" ] || return 1

   mtime="$(stat -c '%Y' "${file_path}" 2>/dev/null)" || mtime=""
   if [ -z "${mtime}" ]; then
      mtime="$(stat -f '%m' "${file_path}" 2>/dev/null)" || mtime=""
   fi
   if [ -z "${mtime}" ] && command -v busybox >/dev/null 2>&1; then
      mtime="$(busybox stat -c '%Y' "${file_path}" 2>/dev/null)" || mtime=""
   fi

   [ -n "${mtime}" ] || return 1
   printf '%s\n' "${mtime}"
}

clashnivo_service_config_assign_paths() {
   RAW_CONFIG_FILE="${1:-}"
   CFG_NAME="$(basename "${RAW_CONFIG_FILE}" 2>/dev/null)"

   if [ -n "${CFG_NAME}" ] && [ "${CFG_NAME}" != "." ] && [ "${CFG_NAME}" != "/" ]; then
      CONFIG_NAME="${CFG_NAME}"
      CONFIG_FILE="${CLASHNIVO_GENERATED_CONFIG_DIR}/${CFG_NAME}"
      TMP_CONFIG_FILE="${CLASHNIVO_STATE_DIR}/yaml_config_tmp_${CFG_NAME}"
      HISTORY_PATH="${CLASHNIVO_HISTORY_DIR}/${CFG_NAME%.*}.db"
      PREVIEW_CONFIG_FILE="${CLASHNIVO_PREVIEW_DIR}/${CFG_NAME}"
      VALIDATION_REPORT_FILE="${CLASHNIVO_VALIDATION_DIR}/${CFG_NAME}.json"
   else
      CONFIG_NAME=""
      CONFIG_FILE=""
      TMP_CONFIG_FILE=""
      HISTORY_PATH=""
      PREVIEW_CONFIG_FILE=""
      VALIDATION_REPORT_FILE=""
   fi
}

clashnivo_service_config_reset_outputs() {
   mkdir -p "${CLASHNIVO_PREVIEW_DIR}" "${CLASHNIVO_VALIDATION_DIR}" >/dev/null 2>&1
}
