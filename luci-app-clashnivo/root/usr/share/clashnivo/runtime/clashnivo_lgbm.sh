#!/bin/bash
. /usr/share/clashnivo/clashnivo_ps.sh
. /usr/share/clashnivo/log.sh
. /usr/share/clashnivo/clashnivo_curl.sh
. /usr/share/clashnivo/uci.sh

set_lock() {
   exec 868>"/tmp/lock/clashnivo_lgbm.lock" 2>/dev/null
   flock -x 868 2>/dev/null
}

del_lock() {
   flock -u 868 2>/dev/null
   rm -rf "/tmp/lock/clashnivo_lgbm.lock" 2>/dev/null
}

set_lock
inc_job_counter

small_flash_memory=$(uci_get_config "small_flash_memory")
LGBM_CUSTOM_URL=$(uci_get_config "lgbm_custom_url")
restart=0

if [ "$small_flash_memory" != "1" ]; then
   lgbm_path="/etc/clashnivo/Model.bin"
   mkdir -p /etc/clashnivo
else
   lgbm_path="/tmp/etc/clashnivo/Model.bin"
   mkdir -p /tmp/etc/clashnivo
fi
LOG_OUT "Downloading LightGBM model..."
if [ -z "$LGBM_CUSTOM_URL" ]; then
   DOWNLOAD_URL="https://github.com/vernesong/mihomo/releases/download/LightGBM-Model/Model.bin"
else
   DOWNLOAD_URL=$LGBM_CUSTOM_URL
fi
DOWNLOAD_FILE_CURL "$DOWNLOAD_URL" "/tmp/Model.bin" "$lgbm_path"
DOWNLOAD_RESULT=$?
if [ "$DOWNLOAD_RESULT" -eq 0 ] && [ -s "/tmp/Model.bin" ]; then
   LOG_OUT "LightGBM model downloaded. Checking for changes..."
   cmp -s /tmp/Model.bin "$lgbm_path"
   if [ "$?" -ne "0" ]; then
      LOG_OUT "LightGBM model changed. Replacing the current file..."
      rm -rf "/etc/clashnivo/Model.bin"
      mv /tmp/Model.bin "$lgbm_path" >/dev/null 2>&1
      LOG_OUT "LightGBM model updated."
      restart=1
   else
      LOG_OUT "LightGBM model is already current."
   fi
elif [ "$DOWNLOAD_RESULT" -eq 2 ]; then
   LOG_OUT "LightGBM model is already current."
else
   LOG_OUT "LightGBM model update failed. Try again later."
fi

rm -rf /tmp/Model.bin >/dev/null 2>&1

SLOG_CLEAN
dec_job_counter_and_restart "$restart"
del_lock