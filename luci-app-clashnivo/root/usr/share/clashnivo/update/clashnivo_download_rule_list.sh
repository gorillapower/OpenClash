#!/bin/bash
. /usr/share/clashnivo/log.sh
. /lib/functions.sh
. /usr/share/clashnivo/clashnivo_curl.sh
. /usr/share/clashnivo/uci.sh
. /usr/share/clashnivo/core_source.sh

   urlencode() {
      if [ "$#" -eq 1 ]; then
         echo "$(/usr/share/clashnivo/clashnivo_urlencode.lua "$1")"
      fi
   }

   set_lock() {
      exec 870>"/tmp/lock/clashnivo_rulelist.lock" 2>/dev/null
      flock -x 870 2>/dev/null
   }

   del_lock() {
      flock -u 870 2>/dev/null
      rm -rf "/tmp/lock/clashnivo_rulelist.lock" 2>/dev/null
   }

   set_lock

   RULE_FILE_NAME="$1"
   RELEASE_BRANCH=$(uci_get_config "release_branch" || echo "master")
   if [ -z "$(grep "$RULE_FILE_NAME" /usr/share/clashnivo/res/rule_providers.list 2>/dev/null)" ]; then
      DOWNLOAD_PATH=$(grep -F "$RULE_FILE_NAME" /usr/share/clashnivo/res/game_rules.list |awk -F ',' '{print $2}' 2>/dev/null)
      RULE_FILE_DIR="/etc/clashnivo/game_rules/$RULE_FILE_NAME"
      RULE_TYPE="game"
   else
      DOWNLOAD_PATH=$(echo "$RULE_FILE_NAME" |awk -F ',' '{print $1$2}' 2>/dev/null)
      RULE_FILE_NAME=$(grep -F "$RULE_FILE_NAME" /usr/share/clashnivo/res/rule_providers.list |awk -F ',' '{print $NF}' 2>/dev/null)
      RULE_FILE_DIR="/etc/clashnivo/rule_provider/$RULE_FILE_NAME"
      RULE_TYPE="provider"
   fi

   if [ -z "$DOWNLOAD_PATH" ]; then
      LOG_OUT "Rule list update failed for 【$RULE_FILE_NAME】." && SLOG_CLEAN
      del_lock
      exit 0
   fi

   TMP_RULE_DIR="/tmp/$RULE_FILE_NAME"
   TMP_RULE_DIR_TMP="/tmp/$RULE_FILE_NAME.tmp"
   DOWNLOAD_PATH=$(urlencode "$DOWNLOAD_PATH")

   if [ "$RULE_TYPE" = "game" ]; then
      DOWNLOAD_URL="$(clashnivo_download_source_url "https://raw.githubusercontent.com/FQrabbit/SSTap-Rule/master/rules/${DOWNLOAD_PATH}")" || {
         LOG_OUT "Rule list update failed for 【$RULE_FILE_NAME】 because no healthy download source is available." && SLOG_CLEAN
         del_lock
         exit 0
      }
   elif [ "$RULE_TYPE" = "provider" ]; then
      DOWNLOAD_URL="$(clashnivo_download_source_url "https://raw.githubusercontent.com/${DOWNLOAD_PATH}")" || {
         LOG_OUT "Rule list update failed for 【$RULE_FILE_NAME】 because no healthy download source is available." && SLOG_CLEAN
         del_lock
         exit 0
      }
   fi

   DOWNLOAD_FILE_CURL "$DOWNLOAD_URL" "$TMP_RULE_DIR"

   if [ "$?" -eq 0 ] && [ -s "$TMP_RULE_DIR" ]; then
      if [ "$RULE_TYPE" = "game" ]; then
      	cat "$TMP_RULE_DIR" |sed '/^#/d' 2>/dev/null |sed '/^ *$/d' 2>/dev/null |awk '{print "  - "$0}' > "$TMP_RULE_DIR_TMP" 2>/dev/null
      	sed -i '1i\payload:' "$TMP_RULE_DIR_TMP" 2>/dev/null
      	cmp -s "$TMP_RULE_DIR_TMP" "$RULE_FILE_DIR"
      else
         cmp -s "$TMP_RULE_DIR" "$RULE_FILE_DIR"
      fi
         if [ "$?" -ne "0" ]; then
            if [ "$RULE_TYPE" = "game" ]; then
               mv "$TMP_RULE_DIR_TMP" "$RULE_FILE_DIR" >/dev/null 2>&1
            else
               mv "$TMP_RULE_DIR" "$RULE_FILE_DIR" >/dev/null 2>&1
            fi
            rm -rf "$TMP_RULE_DIR" >/dev/null 2>&1
            LOG_OUT "Rule list update: 【$RULE_FILE_NAME】 downloaded successfully." && SLOG_CLEAN
            del_lock
            exit 1
         else
            LOG_OUT "Rule list update: 【$RULE_FILE_NAME】 is already current." && SLOG_CLEAN
            rm -rf "$TMP_RULE_DIR" >/dev/null 2>&1
            rm -rf "$TMP_RULE_DIR_TMP" >/dev/null 2>&1
            del_lock
            exit 2
         fi
   else
      rm -rf "$TMP_RULE_DIR" >/dev/null 2>&1
      LOG_OUT "Rule list update failed for 【$RULE_FILE_NAME】." && SLOG_CLEAN
      del_lock
      exit 0
   fi

   del_lock
