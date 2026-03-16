#!/bin/sh

uci_get_config() {
    local key="$1"
    local val
    val=$(uci -q get clashnivo.@overwrite[0]."$key" 2>/dev/null)
    if [ -n "$val" ]; then
        echo "$val"
    else
        uci -q get clashnivo.config."$key"
    fi
}