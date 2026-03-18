#!/bin/sh

clashnivo_service_routing_init() {
   CLASHNIVO_ROUTING_FWMARK="0x162"
   CLASHNIVO_ROUTING_TABLE="0x162"
   CLASHNIVO_ROUTING_PREF="1888"
   CLASHNIVO_ROUTING_TUN_DEVICE="utun"
}

clashnivo_service_routing_rule_exists_ipv4() {
   ip rule show 2>/dev/null | grep -Fq "fwmark ${CLASHNIVO_ROUTING_FWMARK} lookup ${CLASHNIVO_ROUTING_TABLE}"
}

clashnivo_service_routing_rule_exists_ipv6() {
   ip -6 rule show 2>/dev/null | grep -Fq "fwmark ${CLASHNIVO_ROUTING_FWMARK} lookup ${CLASHNIVO_ROUTING_TABLE}"
}

clashnivo_service_routing_route_exists_local_ipv4() {
   ip route show table "${CLASHNIVO_ROUTING_TABLE}" 2>/dev/null | grep -Fq "local 0.0.0.0/0 dev lo"
}

clashnivo_service_routing_route_exists_local_ipv6() {
   ip -6 route show table "${CLASHNIVO_ROUTING_TABLE}" 2>/dev/null | grep -Fq "local ::/0 dev lo"
}

clashnivo_service_routing_route_exists_tun_ipv4() {
   ip route show table "${CLASHNIVO_ROUTING_TABLE}" 2>/dev/null | grep -Fq "default dev ${CLASHNIVO_ROUTING_TUN_DEVICE}"
}

clashnivo_service_routing_route_exists_tun_ipv6() {
   ip -6 route show table "${CLASHNIVO_ROUTING_TABLE}" 2>/dev/null | grep -Fq "default dev ${CLASHNIVO_ROUTING_TUN_DEVICE}"
}

clashnivo_service_routing_rule_exists_tun_ipv4() {
   ip rule show 2>/dev/null | grep -Fq "fwmark ${CLASHNIVO_ROUTING_FWMARK} lookup ${CLASHNIVO_ROUTING_TABLE} pref ${CLASHNIVO_ROUTING_PREF}"
}

clashnivo_service_routing_rule_exists_tun_ipv6() {
   ip -6 rule show 2>/dev/null | grep -Fq "fwmark ${CLASHNIVO_ROUTING_FWMARK} lookup ${CLASHNIVO_ROUTING_TABLE} pref ${CLASHNIVO_ROUTING_PREF}"
}

clashnivo_service_routing_apply_local_ipv4() {
   clashnivo_service_routing_rule_exists_ipv4 || ip rule add fwmark "$CLASHNIVO_ROUTING_FWMARK" table "$CLASHNIVO_ROUTING_TABLE"
   clashnivo_service_routing_route_exists_local_ipv4 || ip route add local 0.0.0.0/0 dev lo table "$CLASHNIVO_ROUTING_TABLE"
}

clashnivo_service_routing_apply_local_ipv6() {
   clashnivo_service_routing_rule_exists_ipv6 || ip -6 rule add fwmark "$CLASHNIVO_ROUTING_FWMARK" table "$CLASHNIVO_ROUTING_TABLE"
   clashnivo_service_routing_route_exists_local_ipv6 || ip -6 route add local ::/0 dev lo table "$CLASHNIVO_ROUTING_TABLE"
}

clashnivo_service_routing_cleanup_local_ipv4() {
   clashnivo_service_routing_rule_exists_ipv4 && ip rule del fwmark "$CLASHNIVO_ROUTING_FWMARK" table "$CLASHNIVO_ROUTING_TABLE"
   clashnivo_service_routing_route_exists_local_ipv4 && ip route del local 0.0.0.0/0 dev lo table "$CLASHNIVO_ROUTING_TABLE"
}

clashnivo_service_routing_cleanup_local_ipv6() {
   clashnivo_service_routing_rule_exists_ipv6 && ip -6 rule del fwmark "$CLASHNIVO_ROUTING_FWMARK" table "$CLASHNIVO_ROUTING_TABLE"
   clashnivo_service_routing_route_exists_local_ipv6 && ip -6 route del local ::/0 dev lo table "$CLASHNIVO_ROUTING_TABLE"
}

clashnivo_service_routing_apply_tun_ipv4() {
   clashnivo_service_routing_route_exists_tun_ipv4 || ip route add default dev "$CLASHNIVO_ROUTING_TUN_DEVICE" table "$CLASHNIVO_ROUTING_TABLE"
   clashnivo_service_routing_rule_exists_tun_ipv4 || ip rule add fwmark "$CLASHNIVO_ROUTING_FWMARK" table "$CLASHNIVO_ROUTING_TABLE" pref "$CLASHNIVO_ROUTING_PREF"
}

clashnivo_service_routing_apply_tun_ipv6() {
   clashnivo_service_routing_route_exists_tun_ipv6 || ip -6 route add default dev "$CLASHNIVO_ROUTING_TUN_DEVICE" table "$CLASHNIVO_ROUTING_TABLE"
   clashnivo_service_routing_rule_exists_tun_ipv6 || ip -6 rule add fwmark "$CLASHNIVO_ROUTING_FWMARK" table "$CLASHNIVO_ROUTING_TABLE" pref "$CLASHNIVO_ROUTING_PREF"
}

clashnivo_service_routing_cleanup_tun_ipv4() {
   clashnivo_service_routing_rule_exists_tun_ipv4 && ip rule del fwmark "$CLASHNIVO_ROUTING_FWMARK" table "$CLASHNIVO_ROUTING_TABLE" pref "$CLASHNIVO_ROUTING_PREF"
   clashnivo_service_routing_route_exists_tun_ipv4 && ip route del default dev "$CLASHNIVO_ROUTING_TUN_DEVICE" table "$CLASHNIVO_ROUTING_TABLE"
}

clashnivo_service_routing_cleanup_tun_ipv6() {
   clashnivo_service_routing_rule_exists_tun_ipv6 && ip -6 rule del fwmark "$CLASHNIVO_ROUTING_FWMARK" table "$CLASHNIVO_ROUTING_TABLE" pref "$CLASHNIVO_ROUTING_PREF"
   clashnivo_service_routing_route_exists_tun_ipv6 && ip -6 route del default dev "$CLASHNIVO_ROUTING_TUN_DEVICE" table "$CLASHNIVO_ROUTING_TABLE"
}

clashnivo_service_routing_cleanup_tun_core_table_ipv6() {
   local table="${1:-2022}"

   ip -6 rule show 2>/dev/null | grep -Fq "oif ${CLASHNIVO_ROUTING_TUN_DEVICE} lookup ${table}" && ip -6 rule del oif "$CLASHNIVO_ROUTING_TUN_DEVICE" table "$table"
   ip -6 route show table "$table" 2>/dev/null | grep -Fq "default dev ${CLASHNIVO_ROUTING_TUN_DEVICE}" && ip -6 route del default dev "$CLASHNIVO_ROUTING_TUN_DEVICE" table "$table"
}

clashnivo_service_routing_tun_route_present() {
   local ip_cmd="${1:-ip}"

   $ip_cmd route list 2>/dev/null | grep -q "$CLASHNIVO_ROUTING_TUN_DEVICE"
}
