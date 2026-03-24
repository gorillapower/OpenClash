#!/bin/bash
. /usr/share/clashnivo/log.sh
. /lib/functions.sh
. /usr/share/clashnivo/clashnivo_curl.sh
. /usr/share/clashnivo/uci.sh

   set_lock() {
      exec 871>"/tmp/lock/clashnivo_dashboard.lock" 2>/dev/null
      flock -x 871 2>/dev/null
   }

   del_lock() {
      flock -u 871 2>/dev/null
      rm -rf "/tmp/lock/clashnivo_dashboard.lock" 2>/dev/null
   }

   set_lock

   DASH_NAME="$1"
   DASH_TYPE="$2"
   DASH_FILE_DIR="/tmp/dash.zip"
   DASH_FILE_TMP="/tmp/dash/"
   if [ "$DASH_NAME" == "Dashboard" ]; then
      UNPACK_FILE_DIR="/usr/share/clashnivo/ui/dashboard/"
      BACKUP_FILE_DIR="/usr/share/clashnivo/ui/dashboard_backup/"
		if [ "$DASH_TYPE" == "Official" ]; then
			DOWNLOAD_PATH="https://codeload.github.com/ayanamist/clash-dashboard/zip/refs/heads/gh-pages"
         FILE_PATH_INCLUDE="clash-dashboard-gh-pages"
      else
			DOWNLOAD_PATH="https://codeload.github.com/MetaCubeX/Razord-meta/zip/refs/heads/gh-pages"
         FILE_PATH_INCLUDE="Razord-meta-gh-pages"
      fi
	elif [ "$DASH_NAME" == "Yacd" ]; then
      UNPACK_FILE_DIR="/usr/share/clashnivo/ui/yacd/"
      BACKUP_FILE_DIR="/usr/share/clashnivo/ui/yacd_backup/"
		if [ "$DASH_TYPE" == "Official" ]; then
			DOWNLOAD_PATH="https://codeload.github.com/haishanh/yacd/zip/refs/heads/gh-pages"
         FILE_PATH_INCLUDE="yacd-gh-pages"
      else
			DOWNLOAD_PATH="https://codeload.github.com/MetaCubeX/Yacd-meta/zip/refs/heads/gh-pages"
         FILE_PATH_INCLUDE="Yacd-meta-gh-pages"
      fi
  elif [ "$DASH_NAME" == "Zashboard" ]; then
      UNPACK_FILE_DIR="/usr/share/clashnivo/ui/zashboard/"
      BACKUP_FILE_DIR="/usr/share/clashnivo/ui/zashboard_backup/"
      DOWNLOAD_PATH="https://codeload.github.com/Zephyruso/zashboard/zip/refs/heads/gh-pages-cdn-fonts"
      FILE_PATH_INCLUDE="zashboard-gh-pages-cdn-fonts"
   else
      UNPACK_FILE_DIR="/usr/share/clashnivo/ui/metacubexd/"
      BACKUP_FILE_DIR="/usr/share/clashnivo/ui/metacubexd_backup/"
		DOWNLOAD_PATH="https://codeload.github.com/MetaCubeX/metacubexd/zip/refs/heads/gh-pages"
      FILE_PATH_INCLUDE="metacubexd-gh-pages"
	fi

   DOWNLOAD_FILE_CURL "$DOWNLOAD_PATH" "$DASH_FILE_DIR" "$UNPACK_FILE_DIR"
   DOWNLOAD_RESULT=$?

   if [ "$DOWNLOAD_RESULT" -eq 0 ] && [ -s "$DASH_FILE_DIR" ]; then
      unzip -qt "$DASH_FILE_DIR" >/dev/null 2>&1
      if [ "$?" -eq "0" ]; then
         cp -rf  "$UNPACK_FILE_DIR".  "$BACKUP_FILE_DIR" >/dev/null 2>&1
         rm -rf "$UNPACK_FILE_DIR" >/dev/null 2>&1
         unzip -q "$DASH_FILE_DIR" -d "$DASH_FILE_TMP" >/dev/null 2>&1
         if [ "$?" -eq "0" ] && [ -d "$DASH_FILE_TMP$FILE_PATH_INCLUDE" ]; then
            cp -rf "$DASH_FILE_TMP$FILE_PATH_INCLUDE"/. "$UNPACK_FILE_DIR" >/dev/null 2>&1
            rm -rf "$DASH_FILE_DIR" >/dev/null 2>&1
            rm -rf "$BACKUP_FILE_DIR" >/dev/null 2>&1
            rm -rf "$DASH_FILE_TMP" >/dev/null 2>&1
            LOG_OUT "Dashboard update: 【$DASH_NAME - $DASH_TYPE】 downloaded successfully." && SLOG_CLEAN
            del_lock
            exit 0
         else
            LOG_OUT "Dashboard update: failed to extract 【$DASH_NAME - $DASH_TYPE】." && SLOG_CLEAN
            cp -rf  "$BACKUP_FILE_DIR".  "$UNPACK_FILE_DIR" >/dev/null 2>&1
            rm -rf "$DASH_FILE_DIR" >/dev/null 2>&1
            rm -rf "$BACKUP_FILE_DIR" >/dev/null 2>&1
            rm -rf "$DASH_FILE_TMP" >/dev/null 2>&1
            del_lock
            exit 2
         fi
      else
         LOG_OUT "Dashboard update: failed to extract 【$DASH_NAME - $DASH_TYPE】." && SLOG_CLEAN
         cp -rf  "$BACKUP_FILE_DIR".  "$UNPACK_FILE_DIR" >/dev/null 2>&1
         rm -rf "$DASH_FILE_DIR" >/dev/null 2>&1
         rm -rf "$BACKUP_FILE_DIR" >/dev/null 2>&1
         rm -rf "$DASH_FILE_TMP" >/dev/null 2>&1
         del_lock
         exit 2
      fi
   elif [ "$DOWNLOAD_RESULT" -eq 2 ]; then
      LOG_OUT "Dashboard update: 【$DASH_NAME - $DASH_TYPE】 downloaded successfully." && SLOG_CLEAN
      del_lock
      exit 0
   else
      cp -rf  "$BACKUP_FILE_DIR".  "$UNPACK_FILE_DIR" >/dev/null 2>&1
      rm -rf "$BACKUP_FILE_DIR" >/dev/null 2>&1
      rm -rf "$DASH_FILE_DIR" >/dev/null 2>&1
      rm -rf "$DASH_FILE_TMP" >/dev/null 2>&1
      LOG_OUT "Dashboard update failed for 【$DASH_NAME - $DASH_TYPE】." && SLOG_CLEAN
      del_lock
      exit 1
   fi

   del_lock
