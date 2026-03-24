#!/bin/bash
. /lib/functions.sh
. /usr/share/clashnivo/log.sh
. /usr/share/clashnivo/uci.sh
. /usr/share/clashnivo/clashnivo_curl.sh
. /usr/share/clashnivo/clashnivo_ps.sh
. /usr/share/clashnivo/core_source.sh

set_lock() {
   exec 872>"/tmp/lock/clashnivo_core.lock" 2>/dev/null
   flock -x 872 2>/dev/null
}

del_lock() {
   flock -u 872 2>/dev/null
   rm -rf "/tmp/lock/clashnivo_core.lock" 2>/dev/null
}

set_lock
inc_job_counter

restart=0
CORE_TYPE="$1"
C_CORE_TYPE=$(uci_get_config "core_type")
SMART_ENABLE=$(uci_get_config "smart_enable" || echo 0)
[ "$SMART_ENABLE" -eq 1 ] && CORE_TYPE="Smart"
[ -z "$CORE_TYPE" ] && CORE_TYPE="Meta"
small_flash_memory=$(uci_get_config "small_flash_memory")
CPU_MODEL=$(uci_get_config "core_version")
RELEASE_BRANCH=$(uci_get_config "release_branch" || echo "master")

/usr/share/clashnivo/clash_version.sh 1 2>/dev/null
if [ ! -f "/tmp/clash_last_version" ]; then
   LOG_ERROR "Could not check the latest 【$CORE_TYPE】 Clash core version."
   SLOG_CLEAN
   del_lock
   exit 0
fi

if [ "$small_flash_memory" != "1" ]; then
   meta_core_path="/etc/clashnivo/core/clash_meta"
   mkdir -p /etc/clashnivo/core
else
   meta_core_path="/tmp/etc/clashnivo/core/clash_meta"
   mkdir -p /tmp/etc/clashnivo/core
fi

CORE_CV=$($meta_core_path -v 2>/dev/null |awk -F ' ' '{print $3}' |head -1)
DOWNLOAD_FILE="/tmp/clash_meta.tar.gz"
TMP_FILE="/tmp/clash_meta"
TARGET_CORE_PATH="$meta_core_path"

if [ "$CORE_TYPE" = "Smart" ]; then
   CORE_URL_PATH="$RELEASE_BRANCH/smart"
   CORE_LV=$(sed -n 2p /tmp/clash_last_version 2>/dev/null)
else
   CORE_URL_PATH="$RELEASE_BRANCH/meta"
   CORE_LV=$(sed -n 1p /tmp/clash_last_version 2>/dev/null)
fi

[ "$C_CORE_TYPE" = "$CORE_TYPE" ] || [ -z "$C_CORE_TYPE" ] && restart=1

if [ "$CORE_CV" != "$CORE_LV" ] || [ -z "$CORE_CV" ]; then
   if [ "$CPU_MODEL" != 0 ]; then
      LOG_TIP "Clash core update: downloading the latest 【$CORE_TYPE】 core."
      SOURCE_RESOLUTION="$(clashnivo_core_source_resolve 0)" || {
         LOG_ERROR "Clash core update aborted because no healthy source is available."
         SLOG_CLEAN
         del_lock
         exit 0
      }
      SELECTED_SOURCE="$(printf '%s' "$SOURCE_RESOLUTION" | cut -d'|' -f1)"
      SELECTED_BASE="$(printf '%s' "$SOURCE_RESOLUTION" | cut -d'|' -f2)"
      SELECTED_LATENCY_MS="$(printf '%s' "$SOURCE_RESOLUTION" | cut -d'|' -f3)"
      PROBE_URL="$(printf '%s' "$SOURCE_RESOLUTION" | cut -d'|' -f4-)"
      DOWNLOAD_URL="$(clashnivo_core_source_url_for_mode "$SELECTED_SOURCE" "$(clashnivo_core_source_artifact_path "$CORE_URL_PATH" "$CPU_MODEL")")"
      if [ $? -ne 0 ] || [ -z "$DOWNLOAD_URL" ]; then
         LOG_ERROR "Clash core update aborted because the core source policy is invalid."
         SLOG_CLEAN
         del_lock
         exit 0
      fi
      LOG_INFO "Clash core source selected: $(clashnivo_core_source_label "$SELECTED_SOURCE") (${SELECTED_LATENCY_MS:-0} ms)"
      LOG_INFO "Clash core source base: ${SELECTED_BASE}"
      LOG_INFO "Clash core source probe URL: ${PROBE_URL}"
      LOG_INFO "Clash core update URL: ${DOWNLOAD_URL}"

      retry_count=0
      max_retries=3

      while [ "$retry_count" -lt "$max_retries" ]; do
         retry_count=$((retry_count + 1))

         rm -rf "$DOWNLOAD_FILE" "$TMP_FILE" >/dev/null 2>&1

         SHOW_DOWNLOAD_PROGRESS=1 DOWNLOAD_FILE_CURL "$DOWNLOAD_URL" "$DOWNLOAD_FILE" "$TARGET_CORE_PATH"
         DOWNLOAD_RESULT=$?

         if [ "$DOWNLOAD_RESULT" -eq 0 ]; then
            gzip -t "$DOWNLOAD_FILE" >/dev/null 2>&1

            if [ "$?" -eq 0 ]; then
               LOG_TIP "Clash core update: download completed for 【$CORE_TYPE】. Installing it now."
               extract_success=true
               [ -s "$DOWNLOAD_FILE" ] && {
                  tar zxvfo "$DOWNLOAD_FILE" -C /tmp >/dev/null 2>&1 || extract_success=false
                  mv /tmp/clash "$TMP_FILE" >/dev/null 2>&1 || extract_success=false
                  rm -rf "$DOWNLOAD_FILE" >/dev/null 2>&1
                  chmod 4755 "$TMP_FILE" >/dev/null 2>&1 || extract_success=false
                  "$TMP_FILE" -v >/dev/null 2>&1 || extract_success=false
               }

               if [ "$extract_success" != "true" ]; then
                  if [ "$retry_count" -lt "$max_retries" ]; then
                     LOG_ERROR "Clash core update failed for 【$CORE_TYPE】 on attempt 【$retry_count/$max_retries】."
                     rm -rf "$TMP_FILE" >/dev/null 2>&1
                     sleep 2
                     continue
                  else
                     LOG_ERROR "Clash core update failed for 【$CORE_TYPE】. Check flash space and confirm the selected Clash core platform."
                     rm -rf "$TMP_FILE" >/dev/null 2>&1
                     SLOG_CLEAN
                     del_lock
                     exit 0
                  fi
               fi

               mv "$TMP_FILE" "$TARGET_CORE_PATH" >/dev/null 2>&1

               if [ "$?" == "0" ]; then
                  LOG_TIP "Clash core update completed for 【$CORE_TYPE】."
                  SLOG_CLEAN
                  restart=1
                  break
               else
                  if [ "$retry_count" -lt "$max_retries" ]; then
                     LOG_ERROR "Clash core update failed for 【$CORE_TYPE】 on attempt 【$retry_count/$max_retries】."
                     sleep 2
                     continue
                  else
                     LOG_ERROR "Clash core update failed for 【$CORE_TYPE】. Check flash space and try again."
                     SLOG_CLEAN
                     break
                  fi
               fi
            else
               if [ "$retry_count" -lt "$max_retries" ]; then
                  LOG_ERROR "Clash core update failed for 【$CORE_TYPE】 on attempt 【$retry_count/$max_retries】."
                  sleep 2
                  continue
               else
                  LOG_ERROR "Clash core update failed for 【$CORE_TYPE】. Check the network connection and try again later."
                  SLOG_CLEAN
                  break
               fi
            fi
         elif [ "$DOWNLOAD_RESULT" -eq 2 ]; then
            LOG_TIP "Clash core update skipped. 【$CORE_TYPE】 is already current."
            SLOG_CLEAN
         else
            if [ "$retry_count" -lt "$max_retries" ]; then
               LOG_ERROR "Clash core download failed for 【$CORE_TYPE】 on attempt 【$retry_count/$max_retries】."
               sleep 2
               continue
            else
               LOG_ERROR "Clash core download failed for 【$CORE_TYPE】. Check the network connection and try again later."
               SLOG_CLEAN
               break
            fi
         fi
      done
   else
      LOG_WARN "Clash core update skipped because no compiled core target is selected."
      SLOG_CLEAN
   fi
else
   LOG_TIP "Clash core update skipped. 【$CORE_TYPE】 is already current."
   SLOG_CLEAN
fi

rm -rf "$TMP_FILE" >/dev/null 2>&1
dec_job_counter_and_restart "$restart"
del_lock
