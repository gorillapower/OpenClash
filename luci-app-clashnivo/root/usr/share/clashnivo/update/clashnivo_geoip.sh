#!/bin/bash
. /usr/share/clashnivo/clashnivo_ps.sh
. /usr/share/clashnivo/log.sh
. /usr/share/clashnivo/clashnivo_curl.sh
. /usr/share/clashnivo/uci.sh
. /usr/share/clashnivo/core_source.sh

set_lock() {
   exec 873>"/tmp/lock/clashnivo_geoip.lock" 2>/dev/null
   flock -x 873 2>/dev/null
}

del_lock() {
   flock -u 873 2>/dev/null
   rm -rf "/tmp/lock/clashnivo_geoip.lock" 2>/dev/null
}

set_lock
inc_job_counter

small_flash_memory=$(uci_get_config "small_flash_memory")
GEOIP_CUSTOM_URL=$(uci_get_config "geoip_custom_url")
restart=0

if [ "$small_flash_memory" != "1" ]; then
   geoip_path="/etc/clashnivo/GeoIP.dat"
   mkdir -p /etc/clashnivo
else
   geoip_path="/tmp/etc/clashnivo/GeoIP.dat"
   mkdir -p /tmp/etc/clashnivo
fi
LOG_OUT "Downloading GeoIP database..."
if [ -z "$GEOIP_CUSTOM_URL" ]; then
   DOWNLOAD_URL="$(clashnivo_download_source_url "https://github.com/Loyalsoldier/v2ray-rules-dat/releases/latest/download/geoip.dat")" || {
      LOG_OUT "GeoIP database update failed because no healthy download source is available."
      SLOG_CLEAN
      dec_job_counter_and_restart "$restart"
      del_lock
      exit 0
   }
else
   DOWNLOAD_URL=$GEOIP_CUSTOM_URL
fi
DOWNLOAD_FILE_CURL "$DOWNLOAD_URL" "/tmp/GeoIP.dat" "$geoip_path"
DOWNLOAD_RESULT=$?
if [ "$DOWNLOAD_RESULT" -eq 0 ] && [ -s "/tmp/GeoIP.dat" ]; then
   LOG_OUT "GeoIP database downloaded. Checking for changes..."
   cmp -s /tmp/GeoIP.dat "$geoip_path"
   if [ "$?" -ne "0" ]; then
      LOG_OUT "GeoIP database changed. Replacing the current file..."
      rm -rf "/etc/clashnivo/geoip.dat"
      mv /tmp/GeoIP.dat "$geoip_path" >/dev/null 2>&1
      LOG_OUT "GeoIP database updated."
      restart=1
   else
      LOG_OUT "GeoIP database is already current."
   fi
elif [ "$DOWNLOAD_RESULT" -eq 2 ]; then
   LOG_OUT "GeoIP database is already current."
else
   LOG_OUT "GeoIP database update failed. Try again later."
fi

rm -rf /tmp/GeoIP.dat >/dev/null 2>&1

SLOG_CLEAN
dec_job_counter_and_restart "$restart"
del_lock
