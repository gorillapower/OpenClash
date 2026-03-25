#!/bin/sh

CLASH_BIN="${1:-}"
CLASH_DIR="${2:-}"
CONFIG_FILE="${3:-}"
CORE_LOG_FILE="${4:-}"

[ -n "$CLASH_BIN" ] || exit 1
[ -n "$CLASH_DIR" ] || exit 1
[ -n "$CONFIG_FILE" ] || exit 1
[ -n "$CORE_LOG_FILE" ] || exit 1

mkdir -p "$(dirname "$CORE_LOG_FILE")" >/dev/null 2>&1 || true

exec env SAFE_PATHS=/usr/share/clashnivo:/usr/share/clashnivo/ui:/etc/ssl \
   "$CLASH_BIN" -d "$CLASH_DIR" -f "$CONFIG_FILE" >> "$CORE_LOG_FILE" 2>&1
