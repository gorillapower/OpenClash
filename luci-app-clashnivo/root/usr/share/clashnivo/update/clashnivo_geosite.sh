#!/bin/bash
. /usr/share/clashnivo/clashnivo_ps.sh
. /usr/share/clashnivo/log.sh
. /usr/share/clashnivo/clashnivo_curl.sh
. /usr/share/clashnivo/uci.sh
. /usr/share/clashnivo/core_source.sh

set_lock() {
   exec 874>"/tmp/lock/clashnivo_geosite.lock" 2>/dev/null
   flock -x 874 2>/dev/null
}

del_lock() {
   flock -u 874 2>/dev/null
   rm -rf "/tmp/lock/clashnivo_geosite.lock" 2>/dev/null
}

set_lock
inc_job_counter

small_flash_memory=$(uci_get_config "small_flash_memory")
GEOSITE_CUSTOM_URL=$(uci_get_config "geosite_custom_url")
restart=0

if [ "$small_flash_memory" != "1" ]; then
   geosite_path="/etc/clashnivo/GeoSite.dat"
   mkdir -p /etc/clashnivo
else
   geosite_path="/tmp/etc/clashnivo/GeoSite.dat"
   mkdir -p /tmp/etc/clashnivo
fi
LOG_OUT "Downloading GeoSite database..."
if [ -z "$GEOSITE_CUSTOM_URL" ]; then
   DOWNLOAD_URL="$(clashnivo_download_source_url "https://github.com/Loyalsoldier/v2ray-rules-dat/releases/latest/download/geosite.dat")" || {
      LOG_OUT "GeoSite database update failed because no healthy download source is available."
      SLOG_CLEAN
      dec_job_counter_and_restart "$restart"
      del_lock
      exit 0
   }
else
   DOWNLOAD_URL=$GEOSITE_CUSTOM_URL
fi
DOWNLOAD_FILE_CURL "$DOWNLOAD_URL" "/tmp/GeoSite.dat" "$geosite_path"
DOWNLOAD_RESULT=$?
if [ "$DOWNLOAD_RESULT" -eq 0 ] && [ -s "/tmp/GeoSite.dat" ]; then
   LOG_OUT "GeoSite database downloaded. Checking for changes..."
   cmp -s /tmp/GeoSite.dat "$geosite_path"
   if [ "$?" -ne "0" ]; then
      LOG_OUT "GeoSite database changed. Replacing the current file..."
      rm -rf "/etc/clashnivo/geosite.dat"
      mv /tmp/GeoSite.dat "$geosite_path" >/dev/null 2>&1
      LOG_OUT "GeoSite database updated."
      restart=1
   else
      LOG_OUT "GeoSite database is already current."
   fi
elif [ "$DOWNLOAD_RESULT" -eq 2 ]; then
   LOG_OUT "GeoSite database is already current."
else
   LOG_OUT "GeoSite database update failed. Try again later."
fi

rm -rf /tmp/GeoSite.dat >/dev/null 2>&1

SLOG_CLEAN
dec_job_counter_and_restart "$restart"
del_lock
