#!/bin/sh

clashnivo_service_dns_init() {
   CLASHNIVO_DNS_DNSMASQ_CONF_DIR="${DNSMASQ_CONF_DIR%/}"
   CLASHNIVO_DNS_CUSTOM_DOMAIN_CONF="${CLASHNIVO_DNS_DNSMASQ_CONF_DIR}/dnsmasq_clashnivo_custom_domain.conf"
   CLASHNIVO_DNS_CHNROUTE_PASS_CONF="${CLASHNIVO_DNS_DNSMASQ_CONF_DIR}/dnsmasq_clashnivo_chnroute_pass.conf"
   CLASHNIVO_DNS_CHNROUTE6_PASS_CONF="${CLASHNIVO_DNS_DNSMASQ_CONF_DIR}/dnsmasq_clashnivo_chnroute6_pass.conf"
}

clashnivo_service_dns_save_server() {
   if [ -z "$1" ] || [ "$1" = "127.0.0.1#${dns_port}" ]; then
      return
   fi

   uci -q add_list clashnivo.config.dnsmasq_server="$1"
}

clashnivo_service_dns_restore_server() {
   if [ -z "$1" ] || [ "$1" = "127.0.0.1#${dns_port}" ]; then
      return
   fi

   uci -q add_list dhcp.@dnsmasq[0].server="$1"
}

clashnivo_service_dns_cleanup_files() {
   rm -rf \
      "${CLASHNIVO_DNS_CUSTOM_DOMAIN_CONF}" \
      "${CLASHNIVO_DNS_CHNROUTE_PASS_CONF}" \
      "${CLASHNIVO_DNS_CHNROUTE6_PASS_CONF}"
}

clashnivo_service_dns_apply() {
   change_dns "$@"
}

clashnivo_service_dns_restore() {
   revert_dns "$@"
}

clashnivo_service_dns_restore_runtime_state() {
   get_config
   redirect_dns=$(uci_get_config "redirect_dns")
   dnsmasq_server=$(uci_get_config "dnsmasq_server")
   dnsmasq_noresolv=$(uci_get_config "dnsmasq_noresolv")
   dnsmasq_resolvfile=$(uci_get_config "dnsmasq_resolvfile")
   cachesize_dns=$(uci_get_config "cachesize_dns")
   dnsmasq_cachesize=$(uci_get_config "dnsmasq_cachesize")
   filter_aaaa_dns=$(uci_get_config "filter_aaaa_dns")
   dnsmasq_filter_aaaa=$(uci_get_config "dnsmasq_filter_aaaa")
   default_resolvfile=$(uci_get_config "default_resolvfile")

   clashnivo_service_dns_restore \
      "$redirect_dns" "$enable" "$default_resolvfile" "$dnsmasq_noresolv" "$dnsmasq_resolvfile" \
      "$cachesize_dns" "$dnsmasq_cachesize" "$filter_aaaa_dns" "$dnsmasq_filter_aaaa" "$dnsmasq_server"
}
