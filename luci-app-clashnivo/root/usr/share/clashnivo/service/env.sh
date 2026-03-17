#!/bin/sh

clashnivo_service_init_env() {
   local ipkg_instroot="${1:-}"

   . "${ipkg_instroot}/usr/share/clashnivo/service/state.sh"
   . "${ipkg_instroot}/usr/share/clashnivo/service/status.sh"
   . "${ipkg_instroot}/usr/share/clashnivo/openclash_ps.sh"
   . "${ipkg_instroot}/usr/share/clashnivo/ruby.sh"
   . "${ipkg_instroot}/usr/share/clashnivo/log.sh"
   . "${ipkg_instroot}/usr/share/clashnivo/uci.sh"

   clashnivo_service_init_state

   [ -f /etc/openwrt_release ] && {
      FW4=$(command -v fw4)
      DEFAULT_DNSMASQ_CFGID="$(uci -q show "dhcp.@dnsmasq[0]" | awk 'NR==1 {split($0, conf, /[.=]/); print conf[2]}')"
      if [ -f "/tmp/etc/dnsmasq.conf.$DEFAULT_DNSMASQ_CFGID" ]; then
         DNSMASQ_CONF_DIR="$(awk -F '=' '/^conf-dir=/ {print $2}' "/tmp/etc/dnsmasq.conf.$DEFAULT_DNSMASQ_CFGID")"
      else
         DNSMASQ_CONF_DIR="/tmp/dnsmasq.d"
      fi
      DNSMASQ_CONF_DIR=${DNSMASQ_CONF_DIR%*/}
   }

   CLASH="/etc/clashnivo/clash"
   CLASH_CONFIG="/etc/clashnivo"
   CRON_FILE="/etc/crontabs/root"
   CACHE_PATH="/etc/clashnivo/cache.db"
   PROXY_FWMARK="0x162"
   PROXY_ROUTE_TABLE="0x162"
   QUICK_START_CHECK=false
   QUICK_START=true
}
