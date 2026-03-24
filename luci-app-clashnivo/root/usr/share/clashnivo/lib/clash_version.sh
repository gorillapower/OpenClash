#!/bin/bash
. /usr/share/clashnivo/log.sh
. /usr/share/clashnivo/clashnivo_curl.sh
. /usr/share/clashnivo/uci.sh
. /usr/share/clashnivo/core_source.sh

set_lock() {
   exec 884>"/tmp/lock/clashnivo_clash_version.lock" 2>/dev/null
   flock -x 884 2>/dev/null
}

del_lock() {
   flock -u 884 2>/dev/null
   rm -rf "/tmp/lock/clashnivo_clash_version.lock" 2>/dev/null
}

set_lock

DOWNLOAD_FILE="/tmp/clash_last_version"
RELEASE_BRANCH=$(uci_get_config "release_branch" || echo "master")
SOURCE_RESOLUTION="$(clashnivo_core_source_resolve "${1:-0}")" || {
   LOG_ERROR "Clash core version check could not select a healthy source."
   del_lock
   exit 1
}

SELECTED_SOURCE="$(printf '%s' "$SOURCE_RESOLUTION" | cut -d'|' -f1)"
SELECTED_BASE="$(printf '%s' "$SOURCE_RESOLUTION" | cut -d'|' -f2)"
SELECTED_LATENCY_MS="$(printf '%s' "$SOURCE_RESOLUTION" | cut -d'|' -f3)"
PROBE_URL="$(printf '%s' "$SOURCE_RESOLUTION" | cut -d'|' -f4-)"

DOWNLOAD_URL="$(clashnivo_core_source_url_for_mode "$SELECTED_SOURCE" "$(clashnivo_core_source_version_path)")" || {
   LOG_ERROR "Clash core version check could not resolve a source URL."
   del_lock
   exit 1
}

LOG_INFO "Clash core source selected: $(clashnivo_core_source_label "$SELECTED_SOURCE") (${SELECTED_LATENCY_MS:-0} ms)"
LOG_INFO "Clash core source base: ${SELECTED_BASE}"
LOG_INFO "Clash core source probe URL: ${PROBE_URL}"
LOG_INFO "Clash core version check URL: ${DOWNLOAD_URL}"
DOWNLOAD_FILE_CURL "$DOWNLOAD_URL" "$DOWNLOAD_FILE" "$DOWNLOAD_FILE"
del_lock
