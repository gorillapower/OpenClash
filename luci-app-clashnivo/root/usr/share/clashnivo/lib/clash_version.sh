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
github_address_mod=$(uci_get_config "github_address_mod" || echo 0)
if [ -n "$1" ]; then
   github_address_mod="$1"
fi

DOWNLOAD_URL="$(clashnivo_core_source_version_url "$github_address_mod")" || {
   LOG_ERROR "Clash core version check could not resolve a source URL."
   del_lock
   exit 1
}

LOG_INFO "Clash core version check URL: ${DOWNLOAD_URL}"
DOWNLOAD_FILE_CURL "$DOWNLOAD_URL" "$DOWNLOAD_FILE" "$DOWNLOAD_FILE"
del_lock
