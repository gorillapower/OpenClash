#!/bin/bash
. /usr/share/clashnivo/clashnivo_ps.sh
. /usr/share/clashnivo/log.sh
. /usr/share/clashnivo/clashnivo_curl.sh
. /usr/share/clashnivo/uci.sh
. /usr/share/clashnivo/core_source.sh

set_lock() {
   exec 880>"/tmp/lock/clashnivo_ipdb.lock" 2>/dev/null
   flock -x 880 2>/dev/null
}

del_lock() {
   flock -u 880 2>/dev/null
   rm -rf "/tmp/lock/clashnivo_ipdb.lock" 2>/dev/null
}

set_lock
inc_job_counter

small_flash_memory=$(uci_get_config "small_flash_memory")
GEOIP_CUSTOM_URL=$(uci_get_config "geo_custom_url")
restart=0

if [ "$small_flash_memory" != "1" ]; then
   geoip_path="/etc/clashnivo/Country.mmdb"
   mkdir -p /etc/clashnivo
else
   geoip_path="/tmp/etc/clashnivo/Country.mmdb"
   mkdir -p /tmp/etc/clashnivo
fi
LOG_OUT "Downloading IP database..."
if [ -z "$GEOIP_CUSTOM_URL" ]; then
   DOWNLOAD_URL="$(clashnivo_download_source_url "https://raw.githubusercontent.com/alecthw/mmdb_china_ip_list/release/lite/Country.mmdb")" || {
      LOG_OUT "IP database update failed because no healthy download source is available."
      SLOG_CLEAN
      dec_job_counter_and_restart "$restart"
      del_lock
      exit 0
   }
else
   DOWNLOAD_URL=$GEOIP_CUSTOM_URL
fi
DOWNLOAD_FILE_CURL "$DOWNLOAD_URL" "/tmp/Country.mmdb" "$geoip_path"
DOWNLOAD_RESULT=$?
if [ "$DOWNLOAD_RESULT" -eq 0 ] && [ -s "/tmp/Country.mmdb" ]; then
   LOG_OUT "IP database downloaded. Checking for changes..."
   cmp -s /tmp/Country.mmdb "$geoip_path"
   if [ "$?" -ne 0 ]; then
      LOG_OUT "IP database changed. Replacing the current file..."
      mv /tmp/Country.mmdb "$geoip_path" >/dev/null 2>&1
      LOG_OUT "IP database updated."
      restart=1
   else
      LOG_OUT "IP database is already current."
   fi
elif [ "$DOWNLOAD_RESULT" -eq 2 ]; then
   LOG_OUT "IP database is already current."
else
   LOG_OUT "IP database update failed. Try again later."
fi

rm -rf /tmp/Country.mmdb >/dev/null 2>&1

SLOG_CLEAN
dec_job_counter_and_restart "$restart"
del_lock
