#!/bin/sh

clashnivo_service_network_reset() {
   CLASHNIVO_NETWORK_CONFIG_LOADED=0

   CLASHNIVO_NETWORK_ENABLE=""
   CLASHNIVO_NETWORK_RUN_MODE=""
   CLASHNIVO_NETWORK_PROXY_MODE=""
   CLASHNIVO_NETWORK_PROXY_PORT=""
   CLASHNIVO_NETWORK_TPROXY_PORT=""
   CLASHNIVO_NETWORK_MIXED_PORT=""
   CLASHNIVO_NETWORK_DNS_PORT=""
   CLASHNIVO_NETWORK_HTTP_PORT=""
   CLASHNIVO_NETWORK_SOCKS_PORT=""
   CLASHNIVO_NETWORK_IPV6_ENABLE=""
   CLASHNIVO_NETWORK_IPV6_DNS=""
   CLASHNIVO_NETWORK_ENABLE_REDIRECT_DNS=""
   CLASHNIVO_NETWORK_DISABLE_UDP_QUIC=""
   CLASHNIVO_NETWORK_STACK_TYPE=""
   CLASHNIVO_NETWORK_STACK_TYPE_V6=""
   CLASHNIVO_NETWORK_CHINA_IP_ROUTE=""
   CLASHNIVO_NETWORK_CHINA_IP6_ROUTE=""
   CLASHNIVO_NETWORK_INTERFACE_NAME=""
   CLASHNIVO_NETWORK_COMMON_PORTS=""
   CLASHNIVO_NETWORK_ROUTER_SELF_PROXY=""
   CLASHNIVO_NETWORK_APPEND_WAN_DNS=""
   CLASHNIVO_NETWORK_APPEND_WAN_DNS6=""
   CLASHNIVO_NETWORK_LAN_DHCPV6=""
   CLASHNIVO_DNSMASQ_PORT=""
   CLASHNIVO_DNSMASQ_NORESOLV=""
   CLASHNIVO_DNSMASQ_RESOLVFILE=""
   CLASHNIVO_DNSMASQ_CACHESIZE=""
   CLASHNIVO_DNSMASQ_FILTER_AAAA=""
}

clashnivo_service_network_get() {
   local key="$1"
   local default="${2:-}"
   local value

   config_get value config "$key" "$default"
   printf '%s' "$value"
}

clashnivo_service_network_load() {
   local dnsmasq_section

   clashnivo_service_network_reset

   config_load "clashnivo"
   config_load "dhcp"

   CLASHNIVO_NETWORK_ENABLE="$(clashnivo_service_network_get "enable" "0")"
   CLASHNIVO_NETWORK_RUN_MODE="$(clashnivo_service_network_get "en_mode" "fake-ip")"
   CLASHNIVO_NETWORK_PROXY_MODE="$(clashnivo_service_network_get "proxy_mode" "rule")"
   CLASHNIVO_NETWORK_PROXY_PORT="$(clashnivo_service_network_get "proxy_port" "7892")"
   CLASHNIVO_NETWORK_TPROXY_PORT="$(clashnivo_service_network_get "tproxy_port" "7895")"
   CLASHNIVO_NETWORK_MIXED_PORT="$(clashnivo_service_network_get "mixed_port" "7893")"
   CLASHNIVO_NETWORK_DNS_PORT="$(clashnivo_service_network_get "dns_port" "7874")"
   CLASHNIVO_NETWORK_HTTP_PORT="$(clashnivo_service_network_get "http_port" "7890")"
   CLASHNIVO_NETWORK_SOCKS_PORT="$(clashnivo_service_network_get "socks_port" "7891")"
   CLASHNIVO_NETWORK_IPV6_ENABLE="$(clashnivo_service_network_get "ipv6_enable" "0")"
   CLASHNIVO_NETWORK_IPV6_DNS="$(clashnivo_service_network_get "ipv6_dns" "0")"
   CLASHNIVO_NETWORK_ENABLE_REDIRECT_DNS="$(clashnivo_service_network_get "enable_redirect_dns" "1")"
   CLASHNIVO_NETWORK_DISABLE_UDP_QUIC="$(clashnivo_service_network_get "disable_udp_quic" "1")"
   CLASHNIVO_NETWORK_STACK_TYPE="$(clashnivo_service_network_get "stack_type" "")"
   CLASHNIVO_NETWORK_STACK_TYPE_V6="$(clashnivo_service_network_get "stack_type_v6" "system")"
   CLASHNIVO_NETWORK_CHINA_IP_ROUTE="$(clashnivo_service_network_get "china_ip_route" "0")"
   CLASHNIVO_NETWORK_CHINA_IP6_ROUTE="$(clashnivo_service_network_get "china_ip6_route" "0")"
   CLASHNIVO_NETWORK_INTERFACE_NAME="$(clashnivo_service_network_get "interface_name" "0")"
   CLASHNIVO_NETWORK_COMMON_PORTS="$(clashnivo_service_network_get "common_ports" "0")"
   CLASHNIVO_NETWORK_ROUTER_SELF_PROXY="$(clashnivo_service_network_get "router_self_proxy" "1")"
   CLASHNIVO_NETWORK_APPEND_WAN_DNS="$(clashnivo_service_network_get "append_wan_dns" "0")"
   CLASHNIVO_NETWORK_APPEND_WAN_DNS6="$(clashnivo_service_network_get "append_wan_dns6" "0")"
   config_get CLASHNIVO_NETWORK_LAN_DHCPV6 lan dhcpv6 ""

   case "$CLASHNIVO_NETWORK_CHINA_IP_ROUTE" in
      0|1|2) ;;
      *) CLASHNIVO_NETWORK_CHINA_IP_ROUTE="0" ;;
   esac

   case "$CLASHNIVO_NETWORK_CHINA_IP6_ROUTE" in
      0|1|2) ;;
      *) CLASHNIVO_NETWORK_CHINA_IP6_ROUTE="0" ;;
   esac

   dnsmasq_section="${DEFAULT_DNSMASQ_CFGID:-@dnsmasq[0]}"
   config_get CLASHNIVO_DNSMASQ_PORT "$dnsmasq_section" port "53"
   config_get CLASHNIVO_DNSMASQ_NORESOLV "$dnsmasq_section" noresolv "0"
   config_get CLASHNIVO_DNSMASQ_RESOLVFILE "$dnsmasq_section" resolvfile ""
   config_get CLASHNIVO_DNSMASQ_CACHESIZE "$dnsmasq_section" cachesize ""
   config_get CLASHNIVO_DNSMASQ_FILTER_AAAA "$dnsmasq_section" filter_aaaa "0"

   CLASHNIVO_NETWORK_CONFIG_LOADED=1
}

clashnivo_service_network_ensure_loaded() {
   [ "${CLASHNIVO_NETWORK_CONFIG_LOADED:-0}" -eq 1 ] || clashnivo_service_network_load
}
