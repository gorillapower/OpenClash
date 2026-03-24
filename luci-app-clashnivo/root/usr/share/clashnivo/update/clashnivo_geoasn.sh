#!/bin/bash
. /usr/share/clashnivo/clashnivo_ps.sh
. /usr/share/clashnivo/log.sh
. /usr/share/clashnivo/clashnivo_curl.sh
. /usr/share/clashnivo/uci.sh
. /usr/share/clashnivo/core_source.sh

set_lock() {
   exec 874>"/tmp/lock/clashnivo_geoasn.lock" 2>/dev/null
   flock -x 874 2>/dev/null
}

del_lock() {
   flock -u 874 2>/dev/null
   rm -rf "/tmp/lock/clashnivo_geoasn.lock" 2>/dev/null
}

set_lock
inc_job_counter

small_flash_memory=$(uci_get_config "small_flash_memory")
GEOASN_CUSTOM_URL=$(uci_get_config "geoasn_custom_url")
restart=0

if [ "$small_flash_memory" != "1" ]; then
   geoasn_path="/etc/clashnivo/ASN.mmdb"
   mkdir -p /etc/clashnivo
else
   geoasn_path="/tmp/etc/clashnivo/ASN.mmdb"
   mkdir -p /tmp/etc/clashnivo
fi
LOG_OUT "Downloading Geo ASN database..."
if [ -z "$GEOASN_CUSTOM_URL" ]; then
   DOWNLOAD_URL="$(clashnivo_download_source_url "https://github.com/xishang0128/geoip/releases/latest/download/GeoLite2-ASN.mmdb")" || {
      LOG_OUT "Geo ASN database update failed because no healthy download source is available."
      SLOG_CLEAN
      dec_job_counter_and_restart "$restart"
      del_lock
      exit 0
   }
else
   DOWNLOAD_URL=$GEOASN_CUSTOM_URL
fi
DOWNLOAD_FILE_CURL "$DOWNLOAD_URL" "/tmp/GeoLite2-ASN.mmdb" "$geoasn_path"
DOWNLOAD_RESULT=$?
if [ "$DOWNLOAD_RESULT" -eq 0 ] && [ -s "/tmp/GeoLite2-ASN.mmdb" ]; then
   LOG_OUT "Geo ASN database downloaded. Checking for changes..."
   cmp -s /tmp/GeoLite2-ASN.mmdb "$geoasn_path"
   if [ "$?" -ne "0" ]; then
      LOG_OUT "Geo ASN database changed. Replacing the current file..."
      rm -rf "/etc/clashnivo/GeoLite2-ASN.mmdb"
      mv /tmp/GeoLite2-ASN.mmdb "$geoasn_path" >/dev/null 2>&1
      LOG_OUT "Geo ASN database updated."
      restart=1
   else
      LOG_OUT "Geo ASN database is already current."
   fi
elif [ "$DOWNLOAD_RESULT" -eq 2 ]; then
   LOG_OUT "Geo ASN database is already current."
else
   LOG_OUT "Geo ASN database update failed. Try again later."
fi

rm -rf /tmp/GeoLite2-ASN.mmdb >/dev/null 2>&1

SLOG_CLEAN
dec_job_counter_and_restart "$restart"
del_lock
